import { Directory, File, Paths } from 'expo-file-system';
import { LUNIVO_AUDIO_API } from './remoteCatalog';
import type { CloudAudioClip } from './manifestLogic';

// Paths.document persiste entre inicializações e não é eliminado pela limpeza de cache do OS.
// As sementes Ciao e Buongiorno não são armazenadas aqui: já estão no APK.
const audioDirectory = new Directory(Paths.document, 'lunivo-audio-v1');
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
const activeDownloads = new Map<string, Promise<string>>();

export async function savedAudioUri(clip: CloudAudioClip): Promise<string | null> {
  const file = new File(audioDirectory, `${clip.id}.mp3`);
  if (!file.exists) return null;
  // Arquivo parcial ou antiga versão não deve ser reproduzido.
  if (file.size !== clip.sizeBytes) {
    try { file.delete(); } catch { /* arquivo será sobrescrito no download */ }
    return null;
  }
  return file.uri;
}

/** Baixa só na primeira vez; evita downloads simultâneos do mesmo arquivo. */
export async function prepareCloudAudio(clip: CloudAudioClip): Promise<string> {
  const cached = await savedAudioUri(clip);
  if (cached) return cached;
  const ongoing = activeDownloads.get(clip.id);
  if (ongoing) return ongoing;
  const task = (async () => {
    const directory = audioDirectory;
    if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
    const file = new File(directory, `${clip.id}.mp3`);
    const url = `${LUNIVO_AUDIO_API}/v1/audio/file/${clip.storageKey}`;
    try {
      const downloaded = await File.downloadFileAsync(url, file, { idempotent: true });
      if (downloaded.size !== clip.sizeBytes || downloaded.size < 1 || downloaded.size > MAX_AUDIO_BYTES) {
        throw new Error('AUDIO_TAMANHO_INVALIDO');
      }
      return downloaded.uri;
    } catch (error) {
      // Android pode deixar um arquivo incompleto; não reproduzir nem reutilizar.
      if (file.exists) { try { file.delete(); } catch { /* tentativa de limpeza */ } }
      throw error;
    }
  })();
  activeDownloads.set(clip.id, task);
  try { return await task; } finally { activeDownloads.delete(clip.id); }
}
