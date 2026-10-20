# Lunivo Firebase Auth V2 — compatibilidade React Native

A importacao de `getReactNativePersistence` de `firebase/auth` encontra o
export no bundle React Native, mas o TypeScript do Firebase JS SDK 12 pode
resolver declaracoes do bundle Web, onde nao ha esse export. O arquivo
`src/types/firebase-auth-react-native.d.ts` complementa apenas os tipos,
nao cria uma implementacao artificial e nao desliga a verificacao de tipos.

O armazenamento continua sendo `expo-sqlite/kv-store`. A integracao real,
a persistencia apos reiniciar o aplicativo e os fluxos de login precisam ser
confirmados em um APK construido pelo GitHub.

A configuracao publica Firebase pertence ao app; nunca adicionar chaves
privadas ou credenciais administrativas ao ZIP.
