import jwt from 'jsonwebtoken';

interface TokenPayload {
  userId: string;
  email: string;
  name?: string;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const JWT_SECRET = process.env['JWT_SECRET'] || 'your-super-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env['JWT_REFRESH_SECRET'] || 'your-refresh-secret-key';
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Generate JWT access and refresh tokens
 */
export async function generateTokens(payload: TokenPayload): Promise<Tokens> {
  const accessToken = jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      type: 'access',
    },
    JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: 'pdf-studio-api',
      audience: 'pdf-studio-client',
    }
  );

  const refreshToken = jwt.sign(
    {
      userId: payload.userId,
      type: 'refresh',
    },
    JWT_REFRESH_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRY,
      issuer: 'pdf-studio-api',
      audience: 'pdf-studio-client',
    }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: 3600, // 1 hour in seconds
  };
}

/**
 * Verify and decode access token
 */
export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'pdf-studio-api',
      audience: 'pdf-studio-client',
    }) as any;

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
    };
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Verify and decode refresh token
 */
export async function verifyRefreshToken(token: string): Promise<{ userId: string }> {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'pdf-studio-api',
      audience: 'pdf-studio-client',
    }) as any;

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return {
      userId: decoded.userId,
    };
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1] || null;
}
