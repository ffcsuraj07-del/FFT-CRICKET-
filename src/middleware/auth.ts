import type { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { verifyAdminToken, type AdminPayload } from '../lib/auth-utils.ts';
import { getUserByUid, getUserByEmail } from '../db/users.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  adminUser?: {
    uid: string;
    email: string;
    role: string;
    displayName?: string;
  };
}

/**
 * Strict server-side verification:
 * Only requests with a valid, non-expired signed Admin token or valid Firebase Admin token
 * where user has role === 'admin' in the database are allowed through.
 * Rejects with 401 Unauthorized if missing/invalid token.
 * Rejects with 403 Forbidden if user lacks admin role.
 */
export const requireAdminAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication required' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
  }

  // 1. Try our HMAC-signed admin JWT token first
  const adminPayload = verifyAdminToken(token);
  if (adminPayload) {
    if (adminPayload.role === 'admin') {
      req.adminUser = adminPayload;
      return next();
    } else {
      return res.status(403).json({ error: 'Forbidden: Admin privileges required' });
    }
  }

  // 2. Try Firebase ID Token
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;

    // Verify in database that this user possesses admin role
    const dbUser = (await getUserByUid(decodedToken.uid)) || (decodedToken.email ? await getUserByEmail(decodedToken.email) : null);
    if (!dbUser || dbUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Your account does not have administrator privileges' });
    }

    req.adminUser = {
      uid: dbUser.uid,
      email: dbUser.email,
      role: dbUser.role,
      displayName: dbUser.displayName || undefined,
    };
    return next();
  } catch (firebaseErr) {
    // Both custom token and Firebase token validation failed
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired authentication token' });
  }
};

/**
 * Optional auth: parses token if provided, but does not block visitors.
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return next();
  }

  const adminPayload = verifyAdminToken(token);
  if (adminPayload) {
    req.adminUser = adminPayload;
    return next();
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    const dbUser = (await getUserByUid(decodedToken.uid)) || (decodedToken.email ? await getUserByEmail(decodedToken.email) : null);
    if (dbUser && dbUser.role === 'admin') {
      req.adminUser = {
        uid: dbUser.uid,
        email: dbUser.email,
        role: dbUser.role,
        displayName: dbUser.displayName || undefined,
      };
    }
  } catch (error) {
    // Continue as guest
  }
  next();
};
