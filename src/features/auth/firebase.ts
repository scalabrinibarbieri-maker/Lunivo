import Storage from 'expo-sqlite/kv-store';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';

// Identificadores PUBLICOS de um aplicativo registrado no Firebase.
// Nunca colocar contas de servico ou segredos administrativos no app.
const config = {
  apiKey: 'AIzaSyCYvmiV-Bb1VbhsbM_uZlSl40ZOyRA8-Sc',
  authDomain: 'lunivo-25675.firebaseapp.com',
  projectId: 'lunivo-25675',
  storageBucket: 'lunivo-25675.firebasestorage.app',
  messagingSenderId: '952414419183',
  appId: '1:952414419183:web:517955efc3443ea6e4c31a',
};

const app = getApps().length ? getApp() : initializeApp(config);

// O expo-sqlite ja faz parte do Lunivo. Seu kv-store implementa a interface
// assíncrona de armazenamento esperada pela persistencia Firebase no RN.
const persistenceStorage = {
  getItem: (key: string) => Storage.getItem(key),
  setItem: (key: string, value: string) => Storage.setItem(key, value),
  removeItem: (key: string) => Storage.removeItem(key),
};

function createAuth() {
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(persistenceStorage) });
  } catch (error: unknown) {
    // Evita falha em Hot Reload caso o Auth ja tenha sido inicializado.
    if (typeof error === 'object' && error !== null &&
        'code' in error && error.code === 'auth/already-initialized') {
      return getAuth(app);
    }
    throw error;
  }
}

export const firebaseAuth = createAuth();
