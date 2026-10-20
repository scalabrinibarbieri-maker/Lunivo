import type { Persistence } from 'firebase/auth';

/**
 * Firebase JS SDK 12: a funcao existe no bundle React Native, mas algumas
 * resolucoes de tipos de `firebase/auth` enxergam apenas o bundle Web.
 * Expo/Metro seleciona o bundle React Native em Android e iOS.
 * Declaracao de tipos somente: nao cria implementacao falsa em runtime.
 */
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
