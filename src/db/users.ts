import { db } from './index.ts';
import { users } from './schema.ts';
import { eq, and, isNotNull } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, displayName?: string, photoUrl?: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        photoUrl: photoUrl || '',
        role: 'admin',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(displayName ? { displayName } : {}),
          ...(photoUrl ? { photoUrl } : {}),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Failed to get or create user:', error);
    throw new Error('Database error while saving user profile', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const result = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('Failed to get user by uid:', error);
    throw new Error('Database error while fetching user', { cause: error });
  }
}

export async function getUserByEmail(email: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const result = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('Failed to get user by email:', error);
    throw new Error('Database error while fetching user', { cause: error });
  }
}

export async function getUserByIdentifier(identifier: string) {
  try {
    const clean = identifier.trim().toLowerCase();
    // 1. Direct email match
    const byEmail = await db.select().from(users).where(eq(users.email, clean)).limit(1);
    if (byEmail[0]) return byEmail[0];

    // 2. Display Name match (case-insensitive)
    const allUsers = await db.select().from(users);
    const byName = allUsers.find(
      (u) =>
        u.displayName?.trim().toLowerCase() === clean ||
        u.email.toLowerCase().split('@')[0] === clean
    );
    return byName || null;
  } catch (error) {
    console.error('Failed to get user by identifier:', error);
    throw new Error('Database error while fetching user', { cause: error });
  }
}

export async function countAdminsWithPassword() {
  try {
    const list = await db.select().from(users).where(
      and(
        eq(users.role, 'admin'),
        isNotNull(users.passwordHash)
      )
    );
    return list.length;
  } catch (error) {
    console.error('Failed to count admins with password:', error);
    return 0;
  }
}

export async function setupInitialAdminAccount(email: string, passwordHash: string, displayName?: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    // Check if an account with this email already exists
    const existing = await getUserByEmail(normalizedEmail);
    if (existing) {
      const result = await db.update(users).set({
        passwordHash,
        role: 'admin',
        ...(displayName ? { displayName } : {}),
      }).where(eq(users.id, existing.id)).returning();
      return result[0];
    } else {
      const result = await db.insert(users).values({
        uid: `admin_${Date.now()}`,
        email: normalizedEmail,
        displayName: displayName || 'Admin',
        role: 'admin',
        passwordHash,
      }).returning();
      return result[0];
    }
  } catch (error) {
    console.error('Failed to setup initial admin:', error);
    throw new Error('Database error while setting up admin account', { cause: error });
  }
}

export async function createAdminAccount(email: string, passwordHash: string, displayName?: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await getUserByEmail(normalizedEmail);
    if (existing) {
      throw new Error('An account with this email already exists');
    }

    const result = await db.insert(users).values({
      uid: `admin_${Date.now()}`,
      email: normalizedEmail,
      displayName: displayName || normalizedEmail.split('@')[0],
      role: 'admin',
      passwordHash,
    }).returning();

    return result[0];
  } catch (error: any) {
    console.error('Failed to create admin user:', error);
    throw new Error(error.message || 'Database error while creating admin user', { cause: error });
  }
}
