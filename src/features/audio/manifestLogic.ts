/** Funções puras: contrato entre catálogo R2, Worker e exercícios. */
export type CloudAudioClip = {
  id: string;
  exerciseId: string;
  text: string;
  locale: string;
  storageKey: string;
  sizeBytes: number;
};
export type CloudAudioManifest = { version: 1; clips: CloudAudioClip[] };

const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
const MAX_CLIPS = 300;
export function parseCloudAudioManifest(value: unknown): CloudAudioManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('MANIFESTO_INVALIDO');
  const source = value as { version?: unknown; clips?: unknown };
  if (source.version !== 1 || !Array.isArray(source.clips) || source.clips.length > MAX_CLIPS) throw new Error('MANIFESTO_INVALIDO');
  const ids = new Set<string>();
  const exercises = new Set<string>();
  const clips: CloudAudioClip[] = [];
  for (const raw of source.clips) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('AUDIO_INVALIDO');
    const clip = raw as Partial<CloudAudioClip>;
    if (typeof clip.id !== 'string' || !/^[a-z0-9-]{3,100}$/.test(clip.id) ||
        typeof clip.exerciseId !== 'string' || !/^q[0-9]{2,6}$/.test(clip.exerciseId) ||
        clip.exerciseId === 'q01' || clip.exerciseId === 'q02' ||
        typeof clip.text !== 'string' || clip.text.length < 1 || clip.text.length > 160 ||
        typeof clip.locale !== 'string' || !/^[a-z]{2}-[A-Z]{2}$/.test(clip.locale) ||
        typeof clip.storageKey !== 'string' ||
        !new RegExp(`^${clip.locale}/[a-z0-9-]{1,32}/${clip.id}\\.mp3$`).test(clip.storageKey) ||
        typeof clip.sizeBytes !== 'number' || !Number.isSafeInteger(clip.sizeBytes) ||
        clip.sizeBytes < 1 || clip.sizeBytes > MAX_AUDIO_BYTES ||
        ids.has(clip.id) || exercises.has(clip.exerciseId)) throw new Error('AUDIO_INVALIDO');
    ids.add(clip.id);
    exercises.add(clip.exerciseId);
    clips.push({ id: clip.id, exerciseId: clip.exerciseId, text: clip.text, locale: clip.locale,
      storageKey: clip.storageKey, sizeBytes: clip.sizeBytes });
  }
  return { version: 1, clips };
}

export function cloudClipForExercise(manifest: CloudAudioManifest, exerciseId: string): CloudAudioClip | null {
  return manifest.clips.find(clip => clip.exerciseId === exerciseId) ?? null;
}
