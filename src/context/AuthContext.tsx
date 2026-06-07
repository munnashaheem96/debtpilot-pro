'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { UserProfile } from '@/types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isMockMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfileName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER: UserProfile = {
  uid: 'demo-user-123',
  email: 'demo@debtpilot.pro',
  displayName: 'Alex Mercer',
  photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
  createdAt: new Date().toISOString(),
  onboarded: true,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMockMode, setIsMockMode] = useState<boolean>(!isFirebaseConfigured);

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'Pilot User',
            photoURL: firebaseUser.photoURL || null,
            createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
            onboarded: true,
          });
          setIsMockMode(false);
        } else {
          setUser(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // Offline / Local Mock Mode check
      const localUser = localStorage.getItem('debtpilot_mock_user');
      if (localUser) {
        try {
          setUser(JSON.parse(localUser));
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    if (isFirebaseConfigured && auth) {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      // Mock Login
      setLoading(true);
      const simulatedUser: UserProfile = {
        ...DEMO_USER,
        email: email,
        displayName: email.split('@')[0].toUpperCase(),
      };
      localStorage.setItem('debtpilot_mock_user', JSON.stringify(simulatedUser));
      setUser(simulatedUser);
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    if (isFirebaseConfigured && auth) {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      // Wait for name update if needed
      setUser({
        uid: credential.user.uid,
        email: credential.user.email,
        displayName: name,
        photoURL: null,
        createdAt: new Date().toISOString(),
        onboarded: true,
      });
    } else {
      // Mock Register
      setLoading(true);
      const simulatedUser: UserProfile = {
        ...DEMO_USER,
        email: email,
        displayName: name,
      };
      localStorage.setItem('debtpilot_mock_user', JSON.stringify(simulatedUser));
      setUser(simulatedUser);
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    if (isFirebaseConfigured && auth) {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } else {
      // Mock Google Login
      setLoading(true);
      localStorage.setItem('debtpilot_mock_user', JSON.stringify(DEMO_USER));
      setUser(DEMO_USER);
      setLoading(false);
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    } else {
      localStorage.removeItem('debtpilot_mock_user');
      setUser(null);
    }
  };

  const resetPassword = async (email: string) => {
    if (isFirebaseConfigured && auth) {
      await sendPasswordResetEmail(auth, email);
    } else {
      // Mock password reset
      console.log(`Password reset email simulated to ${email}`);
    }
  };

  const updateProfileName = async (name: string) => {
    if (user) {
      const updated = { ...user, displayName: name };
      setUser(updated);
      if (!isFirebaseConfigured) {
        localStorage.setItem('debtpilot_mock_user', JSON.stringify(updated));
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isMockMode,
        login,
        register,
        loginWithGoogle,
        logout,
        resetPassword,
        updateProfileName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
