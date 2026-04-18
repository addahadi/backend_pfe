import bcrypt      from 'bcrypt';
import jwt         from 'jsonwebtoken';
import nodemailer  from 'nodemailer';
import sql         from '../../config/database.js';
import crypto      from 'crypto';
import { ConflictError, AuthError, NotFoundError } from '../../utils/AppError.js';

/*
Helper: fetch the active subscription snapshot for a userId.
Attached to login/register response so the frontend can gate UI
immediately without an extra request.
Returns null if no active subscription exists.
*/
const getActiveSubscriptionSnapshot = async (userId) => {
  const rows = await sql`
    SELECT
      s.subscription_id,
      s.end_date,
      s.features_snapshot,
      p.name_en AS plan_name,
      p.plan_id
    FROM subscriptions s
    JOIN plans p ON p.plan_id = s.plan_id
    WHERE s.user_id = ${userId}
      AND s.status  = 'ACTIVE'
    LIMIT 1
  `;

  if (!rows.length) return null;

  const row = rows[0];
  return {
    subscription_id:   row.subscription_id,
    plan_id:           row.plan_id,
    plan_name:         row.plan_name,
    end_date:          row.end_date,
    features_snapshot: row.features_snapshot,
  };
};

/*
========================
REGISTER
========================
*/
export const register = async ({ name, email, password }) => {
  const users = await sql`SELECT id FROM users WHERE email = ${email}`;

  if (users.length > 0) {
    throw new ConflictError('Email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await sql`
    INSERT INTO users (name, email, password)
    VALUES (${name}, ${email}, ${hashedPassword})
    RETURNING id, role
  `;

  const userId = newUser[0].id;

  const accessToken = jwt.sign(
    { userId, role: newUser[0].role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  const hashedToken    = await bcrypt.hash(refreshToken, 10);
  const refreshTokenId = crypto.randomUUID();

  await sql`
    INSERT INTO refresh_tokens (id, user_id, token, expires_at)
    VALUES (
      ${refreshTokenId},
      ${userId},
      ${hashedToken},
      NOW() + interval '7 days'
    )
  `;

  // New user has no subscription yet → null
  // Frontend will redirect to /choose-plan when subscription is null
  return {
    user: {
      id:   userId,
      name,
      email,
      role: newUser[0].role,
    },
    accessToken,
    refreshToken,
    subscription: null,
  };
};

/*
========================
LOGIN
========================
*/
export const login = async ({ email, password }) => {
  const users = await sql`SELECT * FROM users WHERE email = ${email}`;

  if (!users.length) {
    throw new NotFoundError('User not found');
  }

  const user = users[0];

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    throw new AuthError('Invalid credentials');
  }

  // Rotate: one session at a time
  await sql`DELETE FROM refresh_tokens WHERE user_id = ${user.id}`;

  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  const hashedToken = await bcrypt.hash(refreshToken, 10);
  await sql`
    INSERT INTO refresh_tokens (id, user_id, token, expires_at)
    VALUES (
      ${crypto.randomUUID()},
      ${user.id},
      ${hashedToken},
      NOW() + interval '7 days'
    )
  `;

  // Include subscription snapshot so frontend can hydrate store immediately
  const subscription = await getActiveSubscriptionSnapshot(user.id);

  return {
    accessToken,
    refreshToken,
    user: {
      id:    user.id,
      email: user.email,
      role:  user.role,
      name:  user.name,
    },
    subscription, // null → redirect to /choose-plan
  };
};

/*
========================
REFRESH
========================
*/
export const refresh = async (refreshToken) => {
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const tokens = await sql`
      SELECT * FROM refresh_tokens
      WHERE user_id = ${payload.userId}
    `;

    let validToken = null;
    for (const t of tokens) {
      const isMatch = await bcrypt.compare(refreshToken, t.token);
      if (isMatch) { validToken = t; break; }
    }

    if (!validToken) throw new AuthError('Invalid refresh token');

    if (new Date(validToken.expires_at) < new Date()) {
      throw new AuthError('Refresh token expired');
    }

    const accessToken = jwt.sign(
      { userId: payload.userId },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    return { accessToken };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError('Invalid or expired refresh token');
  }
};

/*
========================
LOGOUT
========================
*/
export const logout = async (refreshToken) => {
  const tokens = await sql`SELECT * FROM refresh_tokens`;

  let tokenId = null;
  for (const t of tokens) {
    const isMatch = await bcrypt.compare(refreshToken, t.token);
    if (isMatch) { tokenId = t.id; break; }
  }

  if (!tokenId) throw new NotFoundError('Token not found');

  await sql`DELETE FROM refresh_tokens WHERE id = ${tokenId}`;

  return { message: 'Logged out successfully' };
};

/*
========================
FORGOT PASSWORD
========================
*/
export const forgotPassword = async ({ email }) => {
  const users = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (!users.length) return { message: 'If email exists, a link was sent' };

  const userId = users[0].id;

  const rawToken    = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt   = new Date(Date.now() + 15 * 60 * 1000);

  await sql`DELETE FROM password_reset_tokens WHERE user_id = ${userId}`;
  await sql`
    INSERT INTO password_reset_tokens (user_id, token, expires_at)
    VALUES (${userId}, ${hashedToken}, ${expiresAt})
  `;

  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}`;
  try {
    await sendResetEmail(email, resetLink);
  } catch (emailErr) {
    console.warn('[forgot-password] Email send failed:', emailErr.message);
  }

  return { message: 'If email exists, a link was sent' };
};

/*
========================
VERIFY RESET TOKEN
========================
*/
export const verifyResetToken = async ({ token }) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const rows = await sql`
    SELECT id FROM password_reset_tokens
    WHERE token = ${hashedToken} AND expires_at > NOW()
  `;

  if (!rows.length) throw new AuthError('Reset token is invalid or has expired');

  return { message: 'Token valid' };
};

/*
========================
RESET PASSWORD
========================
*/
export const resetPassword = async ({ token, newPassword }) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const rows = await sql`
    SELECT user_id FROM password_reset_tokens
    WHERE token = ${hashedToken} AND expires_at > NOW()
  `;

  if (!rows.length) throw new AuthError('Reset token is invalid or has expired');

  const userId = rows[0].user_id;

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await sql`UPDATE users SET password = ${hashedPassword} WHERE id = ${userId}`;

  await sql`DELETE FROM password_reset_tokens WHERE user_id = ${userId}`;
  await sql`DELETE FROM refresh_tokens WHERE user_id = ${userId}`;

  return { message: 'Password reset successful' };
};

/*
========================
SEND RESET EMAIL
========================
*/
const sendResetEmail = async (email, resetLink) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from:    process.env.SMTP_USER,
    to:      email,
    subject: 'Reset Your Password',
    html: `
      <h2>Reset Your Password</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>This link expires in 15 minutes.</p>
    `,
  });
};

/*
========================
GET ME
========================
*/
export const getMe = async (userId) => {
  const rows = await sql`
    SELECT id, name, email, role, status, created_at
    FROM users
    WHERE id = ${userId}
  `;

  if (!rows.length) throw new NotFoundError('User not found');

  return rows[0];
};
