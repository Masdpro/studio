'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase/client';

export type UserRole = 'customer' | 'vendor' | 'delivery_agent';

export type AppUserProfile = {
  uid: string;
  email: string | null;
  role: UserRole;
  displayName?: string;
};

type AuthContextValue = {
  user: User | null;
  profile: AppUserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    const currentAuth = auth;
    const currentDb = db;
    if (!currentAuth || !currentDb) return; // Firebase not configured yet — stay signed-out.

    const unsubscribe = onAuthStateChanged(currentAuth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const snap = await getDoc(doc(currentDb, 'users', firebaseUser.uid));
        setProfile(snap.exists() ? (snap.data() as AppUserProfile) : null);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const requireFirebase = () => {
    if (!auth || !db) {
      throw new Error(
        'Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* keys to .env.local (see .env.example).'
      );
    }
    return { auth, db };
  };

  const signIn = async (email: string, password: string) => {
    const { auth } = requireFirebase();
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, role: UserRole) => {
    const { auth, db } = requireFirebase();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const newProfile: AppUserProfile = { uid: cred.user.uid, email: cred.user.email, role };
    await setDoc(doc(db, 'users', cred.user.uid), newProfile);
    setProfile(newProfile);
  };

  const signOut = async () => {
    const { auth } = requireFirebase();
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
