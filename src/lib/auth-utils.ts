import crypto from 'crypto';

// Secret key for HMAC signing
const JWT_SECRET = process.env.SESSION_SECRET || process.env.SQL_PASSWORD || 'ffc-cricket-super-secure-admin-secret-2026';

export interface AdminPayload {
  uid: string;
  email: string;
  role: string;
  displayName?: string;
  exp: number; // unix timestamp in seconds
}

/**
 * Hash password using PBKDF2 with a random 16-byte salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a plain text password against a stored salt:hash string
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) {
    return false;
  }
  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) {
    return false;
  }
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(originalHash, 'hex'), Buffer.from(verifyHash, 'hex'));
}

/**
 * Generate a signed admin token (valid for 7 days)
 */
export function generateAdminToken(user: { uid: string; email: string; role: string; displayName?: string }): string {
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days
  const payload: AdminPayload = {
    uid: user.uid,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    exp,
  };

  const headerB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const dataToSign = `${headerB64}.${payloadB64}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(dataToSign).digest('base64url');

  return `${dataToSign}.${signature}`;
}

/**
 * Verify signed admin token and ensure it has not expired
 */
export function verifyAdminToken(token: string): AdminPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signature] = parts;
  const dataToSign = `${headerB64}.${payloadB64}`;
  const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(dataToSign).digest('base64url');

  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload: AdminPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch (err) {
    return null;
  }
}
