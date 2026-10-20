/** A identidade nao autenticada mantem a chave da V1 para nao perder historico. */
export const GUEST_PROGRESS_KEY = 'lunivo:progress:v1';

/** Chave distinta por conta. Nunca mistura licoes de alunos diferentes. */
export function progressKeyForUid(uid: string | null): string {
  return uid ? `lunivo:progress:firebase:${encodeURIComponent(uid)}` : GUEST_PROGRESS_KEY;
}
