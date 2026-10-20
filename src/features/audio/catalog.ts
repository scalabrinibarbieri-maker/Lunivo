/**
 * Catálogo durável de pronúncias do Lunivo.
 * ID e storageKey não mudam quando o mesmo áudio passa de embutido para o R2.
 * Não há dependência de APIs nativas neste arquivo (pode ser validado no CI).
 */
export const AUDIO_CATALOG = {
  'it-a1-ciao-v1': {
    id: 'it-a1-ciao-v1',
    text: 'Ciao!',
    locale: 'it-IT',
    voiceId: 'it-voice-ciao-01',
    storageKey: 'it-IT/a1/it-a1-ciao-v1.mp3',
    format: 'mp3',
    offlineSeed: true,
  },
  'it-a1-buongiorno-v1': {
    id: 'it-a1-buongiorno-v1',
    text: 'Buongiorno',
    locale: 'it-IT',
    voiceId: 'it-voice-buongiorno-01',
    storageKey: 'it-IT/a1/it-a1-buongiorno-v1.mp3',
    format: 'mp3',
    offlineSeed: true,
  },
} as const;

export type AudioClipId = keyof typeof AUDIO_CATALOG;

/** Associação explícita, sem sintetizar palavras no aparelho ou depender de texto normalizado. */
export const EXERCISE_AUDIO: Readonly<Record<string, AudioClipId>> = {
  q01: 'it-a1-ciao-v1',
  q02: 'it-a1-buongiorno-v1',
};

export function clipForExercise(exerciseId: string): AudioClipId | null {
  return EXERCISE_AUDIO[exerciseId] ?? null;
}
