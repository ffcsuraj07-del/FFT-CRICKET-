import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { apiFetch, setAdminSessionToken, getAdminSessionToken } from '../lib/api.ts';

export interface AdminUser {
  uid?: string;
  email: string;
  displayName?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  adminUser: AdminUser | null;
  isAdmin: boolean;
  loading: boolean;
  isInitialSetupNeeded: boolean;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
  setupInitialAdmin: (email: string, password: string, displayName?: string) => Promise<void>;
  refreshAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  adminUser: null,
  isAdmin: false,
  loading: true,
  isInitialSetupNeeded: false,
  loginWithPassword: async () => {},
  signInWithGoogle: async () => {},
  logOut: async () => {},
  setupInitialAdmin: async () => {},
  refreshAuthStatus: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isInitialSetupNeeded, setIsInitialSetupNeeded] = useState(false);

  // Check server auth status
  const checkStatus = async () => {
    try {
      const status = await apiFetch('/api/auth/status');
      setIsInitialSetupNeeded(!!status.isInitialSetupNeeded);
      if (status.isAuthenticated && status.isAdmin && status.user) {
        setAdminUser(status.user);
        setIsAdmin(true);
      } else if (!getAdminSessionToken() && !auth.currentUser) {
        setAdminUser(null);
        setIsAdmin(false);
      }
    } catch (e) {
      console.warn('Could not verify server auth status:', e);
    }
  };

  useEffect(() => {
    // 1. Initial server status check (for sessionStorage tokens)
    checkStatus().finally(() => setLoading(false));

    // 2. Firebase Auth Listener
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const syncRes = await apiFetch('/api/auth/sync', {
            method: 'POST',
            body: JSON.stringify({
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoUrl: currentUser.photoURL,
            }),
          });
          if (syncRes && syncRes.role === 'admin') {
            setAdminUser({
              uid: syncRes.uid,
              email: syncRes.email,
              displayName: syncRes.displayName,
              role: syncRes.role,
            });
            setIsAdmin(true);
          }
        } catch (err) {
          console.error('Failed to sync Firebase user:', err);
        }
      } else if (!getAdminSessionToken()) {
        // If not logged in via custom admin session token
        setAdminUser(null);
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithPassword = async (email: string, password: string) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (res.token && res.user) {
      setAdminSessionToken(res.token);
      setAdminUser(res.user);
      setIsAdmin(true);
      setIsInitialSetupNeeded(false);
    } else {
      throw new Error('Invalid authentication response from server');
    }
  };

  const setupInitialAdmin = async (email: string, password: string, displayName?: string) => {
    const res = await apiFetch('/api/auth/setup-admin', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });

    if (res.token && res.user) {
      setAdminSessionToken(res.token);
      setAdminUser(res.user);
      setIsAdmin(true);
      setIsInitialSetupNeeded(false);
    } else {
      throw new Error('Invalid setup response from server');
    }
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
      await checkStatus();
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      throw error;
    }
  };

  const logOut = async () => {
    try {
      setAdminSessionToken(null);
      setAdminUser(null);
      setIsAdmin(false);
      if (auth.currentUser) {
        await signOut(auth);
      }
      setUser(null);
      await checkStatus();
    } catch (error) {
      console.error('Sign out error:', error);
      // Ensure local state is wiped regardless
      setAdminSessionToken(null);
      setAdminUser(null);
      setIsAdmin(false);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        adminUser,
        isAdmin,
        loading,
        isInitialSetupNeeded,
        loginWithPassword,
        signInWithGoogle,
        logOut,
        setupInitialAdmin,
        refreshAuthStatus: checkStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
