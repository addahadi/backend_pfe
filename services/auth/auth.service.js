// استيراد مكتبة تشفير كلمات المرور
import bcrypt from 'bcrypt';

// استيراد مكتبة إنشاء JWT tokens
import jwt from 'jsonwebtoken';

// استيراد مكتبة إرسال الإيميلات
import nodemailer from 'nodemailer';

// استيراد الاتصال بقاعدة البيانات
import sql from '../../config/database.js';

// UUID
import crypto from 'crypto';
import { ConflictError, AuthError, NotFoundError } from '../../utils/AppError.js';

/*
========================
REGISTER
========================
*/
export const register = async ({ name, email, password }) => {
  // 1️⃣ check email
  const users = await sql`
    SELECT id FROM users WHERE email = ${email}
  `;

  if (users.length > 0) {
    throw new ConflictError('Email already exists');
  }

  // 2️⃣ hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // 3️⃣ create user
  const newUser = await sql`
    INSERT INTO users (name,email,password)
    VALUES (${name}, ${email}, ${hashedPassword})
    RETURNING id, role
  `;

  const userId = newUser[0].id;

  // 4️⃣ access token
  const accessToken = jwt.sign(
    { userId: newUser[0].id, role: newUser[0].role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
  // 5️⃣ refresh token
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

  // 6️⃣ hash refresh token
  const hashedToken = await bcrypt.hash(refreshToken, 10);
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

  return {
    user: {
      id: userId,
      name,
      email,
      role: newUser[0].role,
    },
    accessToken,
    refreshToken,
  };
};

/*
========================
LOGIN
========================
*/
export const login = async ({ email, password }) => {
  const users = await sql`
    SELECT * FROM users WHERE email = ${email}
  `;

  if (!users.length) {
    throw new NotFoundError('User not found');
  }

  const user = users[0];

  const validPassword = await bcrypt.compare(password, user.password);

  if (!validPassword) {
    throw new AuthError('Invalid credentials');
  }

  // Bug 3 fix: rotate — delete ALL previous refresh tokens for this user
  // so only ONE valid session exists at a time.
  await sql`DELETE FROM refresh_tokens WHERE user_id = ${user.id}`;

  // access token
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  // refresh token
  const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });

  // hash & persist refresh token
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

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, role: user.role },
  };
};

/*
========================
REFRESH
========================
*/
export const refresh = async (refreshToken) => {
  try {
    // 1️⃣ verify JWT
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // 2️⃣ get all user tokens
    const tokens = await sql`
      SELECT * FROM refresh_tokens 
      WHERE user_id = ${payload.userId}
    `;

    let validToken = null;

    // 3️⃣ compare hashed tokens
    for (const t of tokens) {
      const isMatch = await bcrypt.compare(refreshToken, t.token);
      if (isMatch) {
        validToken = t;
        break;
      }
    }

    if (!validToken) {
      throw new AuthError('Invalid refresh token');
    }

    // 4️⃣ check expiration
    if (new Date(validToken.expires_at) < new Date()) {
      throw new AuthError('Refresh token expired');
    }

    // 5️⃣ create new access token
    const accessToken = jwt.sign({ userId: payload.userId }, process.env.JWT_ACCESS_SECRET, {
      expiresIn: '15m',
    });

    return { accessToken };
  } catch (error) {
    // Bug 1 fix: surface jwt errors as 401, not 500
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
  const tokens = await sql`
    SELECT * FROM refresh_tokens
  `;

  let tokenId = null;

  for (const t of tokens) {
    const isMatch = await bcrypt.compare(refreshToken, t.token);
    if (isMatch) {
      tokenId = t.id;
      break;
    }
  }

  if (!tokenId) {
    throw new NotFoundError('Token not found');
  }

  await sql`
    DELETE FROM refresh_tokens WHERE id = ${tokenId}
  `;

  return { message: 'Logged out successfully' };
};


/*
========================
FORGOT PASSWORD
========================
*/
export const forgotPassword = async ({ email }) => {
  // 1. Find the user — don't reveal existence (security)
  const users = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (!users.length) return { message: 'If email exists, a link was sent' };

  const userId = users[0].id;

  // 2. Generate a random token and store its SHA-256 hash
  const rawToken    = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt   = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // 3. Delete any existing reset tokens for this user, then insert new one
  //    Uses dedicated password_reset_tokens table (NOT users columns)
  await sql`DELETE FROM password_reset_tokens WHERE user_id = ${userId}`;
  await sql`
    INSERT INTO password_reset_tokens (user_id, token, expires_at)
    VALUES (${userId}, ${hashedToken}, ${expiresAt})
  `;

  // 4. Send email (non-fatal — token is saved even if SMTP is not configured yet)
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}`;
  try {
    await sendResetEmail(email, resetLink);
  } catch (emailErr) {
    console.warn('[forgot-password] Email send failed (SMTP not configured?):', emailErr.message);
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
    WHERE token = ${hashedToken}
      AND expires_at > NOW()
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

  // 1. Validate token against password_reset_tokens table
  const rows = await sql`
    SELECT user_id FROM password_reset_tokens
    WHERE token = ${hashedToken}
      AND expires_at > NOW()
  `;

  if (!rows.length) throw new AuthError('Reset token is invalid or has expired');

  const userId = rows[0].user_id;

  // 2. Hash new password and update user
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await sql`UPDATE users SET password = ${hashedPassword} WHERE id = ${userId}`;

  // 3. Invalidate reset token (single-use)
  await sql`DELETE FROM password_reset_tokens WHERE user_id = ${userId}`;

  // 4. Invalidate all sessions (security: force re-login)
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
    from: process.env.SMTP_USER,
    to: email,
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
    FROM   users
    WHERE  id = ${userId}
  `;

  if (!rows.length) throw new NotFoundError('User not found');

  return rows[0];
};
