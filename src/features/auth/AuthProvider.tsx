import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { firebaseAuth } from './firebase';

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  logOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      nextUser => { setUser(nextUser); setReady(true); },
      error => { console.warn('Falha ao restaurar a sessao Firebase', error); setReady(true); },
    );
    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    ready,
    async signIn(email, password) {
      await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
    },
    async signUp(email, password) {
      const result = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
      try { await sendEmailVerification(result.user); return true; }
      catch (error) {
        console.warn('Conta criada, mas nao foi possivel enviar verificacao:', error);
        return false;
      }
    },
    async resetPassword(email) { await sendPasswordResetEmail(firebaseAuth, email.trim()); },
    async resendVerification() {
      const current = firebaseAuth.currentUser;
      if (!current || current.emailVerified) return;
      await sendEmailVerification(current);
    },
    async logOut() { await signOut(firebaseAuth); },
  }), [ready, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth deve estar dentro do AuthProvider');
  return value;
}

export function messageForAuthError(error: unknown): string {
  const code = (typeof error === 'object' && error !== null && 'code' in error) ? String(error.code) : '';
  switch (code) {
    case 'auth/invalid-email': return 'Confira o endereco de e-mail.';
    case 'auth/email-already-in-use': return 'Ja existe uma conta com esse e-mail. Tente entrar.';
    case 'auth/weak-password': return 'Use uma senha mais forte, com pelo menos 6 caracteres.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'E-mail ou senha incorretos.';
    case 'auth/too-many-requests': return 'Muitas tentativas. Aguarde um pouco antes de tentar novamente.';
    case 'auth/network-request-failed': return 'Sem conexao. Confira sua internet e tente novamente.';
    case 'auth/operation-not-allowed': return 'Login por e-mail ainda nao esta habilitado no Firebase.';
    default: return 'Nao foi possivel concluir a operacao. Tente novamente.';
  }
}
