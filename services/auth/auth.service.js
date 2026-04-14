import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import sql from '../../config/database.js';
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
  /*
  const accessToken = jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
*/
const accessToken = jwt.sign(
  { userId: user.id, role: user.role },
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

  
  // access token
  /*
  const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: '15m',
  });
*/
const accessToken = jwt.sign(
  { userId, role: newUser[0].role },
  process.env.JWT_ACCESS_SECRET,
  { expiresIn: '15m' }
);
  
  // refresh token
  const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });

  // hash refresh token
  const hashedToken = await bcrypt.hash(refreshToken, 10);
  const refreshTokenId = crypto.randomUUID();

  await sql`
    INSERT INTO refresh_tokens (id, user_id, token, expires_at)
    VALUES (
      ${refreshTokenId},
      ${user.id},
      ${hashedToken},
      NOW() + interval '7 days'
    )
  `;

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
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
    throw new Error(error.message);
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
