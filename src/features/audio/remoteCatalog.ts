import Storage from 'expo-sqlite/kv-store';
import { parseCloudAudioManifest, type CloudAudioManifest } from './manifestLogic';
export { cloudClipForExercise } from './manifestLogic';
export type { CloudAudioClip, CloudAudioManifest } from './manifestLogic';

export const LUNIVO_AUDIO_API = 'https://lunivo-api-dev.scalabrinibarbieri.workers.dev';
const MANIFEST_STORE_KEY = 'lunivo:audio:manifest:v1';
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

let localManifest: CloudAudioManifest = { version: 1, clips: [] };
let loadedFromDisk = false;
let diskLoad: Promise<CloudAudioManifest> | null = null;
let inFlight: Promise<CloudAudioManifest> | null = null;
let lastAttempt = 0;

export async function readCachedAudioManifest(): Promise<CloudAudioManifest> {
  if (loadedFromDisk) return localManifest;
  if (diskLoad) return diskLoad;
  diskLoad = (async () => {
    try {
      const raw = await Storage.getItem(MANIFEST_STORE_KEY);
      if (raw) localManifest = parseCloudAudioManifest(JSON.parse(raw));
    } catch (error) {
      console.warn('Catálogo de áudio salvo não pôde ser carregado:', error);
    }
    loadedFromDisk = true;
    return localManifest;
  })();
  return diskLoad;
}

/** O JSON é armazenado no aparelho para que as associacoes continuem visiveis offline. */
export async function refreshAudioManifest(force = false): Promise<CloudAudioManifest> {
  await readCachedAudioManifest();
  if (inFlight) return inFlight;
  if (!force && Date.now() - lastAttempt < REFRESH_INTERVAL_MS) return localManifest;
  lastAttempt = Date.now();
  inFlight = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${LUNIVO_AUDIO_API}/v1/audio/manifest`, { signal: controller.signal });
      if (!response.ok) throw new Error(`MANIFESTO_HTTP_${response.status}`);
      const json: unknown = await response.json();
      const manifest = parseCloudAudioManifest(json);
      await Storage.setItem(MANIFEST_STORE_KEY, JSON.stringify(manifest));
      localManifest = manifest;
    } catch (error) {
      console.warn('Catálogo remoto indisponível; usando o catálogo salvo:', error);
    } finally {
      clearTimeout(timeout);
    }
    return localManifest;
  })();
  try { return await inFlight; } finally { inFlight = null; }
}
