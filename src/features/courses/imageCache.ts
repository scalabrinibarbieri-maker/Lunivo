import { Directory, File, Paths } from 'expo-file-system';
import type { CourseUnit } from './schema';
import { imageFileName, listUnitImages, MAX_LESSON_IMAGE_BYTES } from './lessonImages';

/** As imagens offline ficam em document, não em cache, para sobreviver à limpeza do sistema. */
const ROOT = new Directory(Paths.document, 'lunivo-lesson-images-v1');
const pending = new Map<string, Promise<string>>();
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;

function folder(unitKey: string): Directory {
  if (!/^[a-z]{2}-(?:a1|a2|b1|b2|c1|c2)-u[0-9]{2,4}-r[0-9]{1,5}$/.test(unitKey)) {
    throw new Error('IMAGEM_UNIDADE_INVALIDA');
  }
  return new Directory(ROOT, unitKey);
}
function destination(unitKey: string, url: string) { return new File(folder(unitKey), imageFileName(url)); }

export function localImageUri(unitKey: string, url: string): string | null {
  try {
    const file = destination(unitKey, url);
    return file.exists && file.size > 0 && file.size <= MAX_LESSON_IMAGE_BYTES ? file.uri : null;
  } catch { return null; }
}

export function allImagesAvailable(unit: CourseUnit, unitKey: string): boolean {
  return listUnitImages(unit).every(url => localImageUri(unitKey, url) !== null);
}

async function downloadImage(unitKey: string, url: string): Promise<string> {
  const previous = localImageUri(unitKey, url);
  if (previous) return previous;
  const file = destination(unitKey, url);
  const key = file.uri;
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const task = (async () => {
    const dir = folder(unitKey);
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      // A consulta HEAD é uma proteção extra; URLs que não oferecem HEAD podem
      // baixar normalmente e são verificadas depois da transferência.
      try {
        const headController = new AbortController();
        const headTimeout = setTimeout(() => headController.abort(), 5500);
        try {
          const response = await fetch(url, { method: 'HEAD', signal: headController.signal });
          if (response.ok) {
            const announced = Number(response.headers.get('content-length'));
            const mime = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
            if ((Number.isFinite(announced) && announced > MAX_LESSON_IMAGE_BYTES) ||
              (mime && !['image/png', 'image/jpeg', 'image/webp'].includes(mime))) {
              throw new Error('IMAGEM_FORMATO_OU_TAMANHO_INVALIDO');
            }
          }
        } finally { clearTimeout(headTimeout); }
      } catch (err) {
        if (err instanceof Error && err.message === 'IMAGEM_FORMATO_OU_TAMANHO_INVALIDO') throw err;
      }
      const downloaded = await File.downloadFileAsync(url, file, {
        idempotent: true,
        signal: controller.signal,
        onProgress: event => { if (event.bytesWritten > MAX_LESSON_IMAGE_BYTES) controller.abort(); },
      });
      if (downloaded.size < 1 || downloaded.size > MAX_LESSON_IMAGE_BYTES) {
        throw new Error('IMAGEM_FORMATO_OU_TAMANHO_INVALIDO');
      }
      const bytes = await downloaded.bytes();
      const png = bytes.length > 8 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
      const jpeg = bytes.length > 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const webp = bytes.length > 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
        String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
      if (!png && !jpeg && !webp) throw new Error('IMAGEM_FORMATO_OU_TAMANHO_INVALIDO');
      return downloaded.uri;
    } catch (err) {
      if (file.exists) { try { file.delete(); } catch { /* não reutilizar parcial */ } }
      throw err;
    } finally { clearTimeout(timeout); }
  })();
  pending.set(key, task);
  try { return await task; } finally { pending.delete(key); }
}

/** Downloads completos são exigidos antes de registrar a unidade como offline. */
export async function prepareUnitImages(unit: CourseUnit, unitKey: string): Promise<void> {
  const urls = listUnitImages(unit);
  let total = 0;
  for (const url of urls) {
    const uri = await downloadImage(unitKey, url);
    if (!uri) throw new Error('IMAGEM_OBRIGATORIA_NAO_DISPONIVEL');
    total += destination(unitKey, url).size;
    if (total > MAX_TOTAL_BYTES) throw new Error('IMAGENS_LIMITE_POR_UNIDADE');
  }
  if (!allImagesAvailable(unit, unitKey)) throw new Error('IMAGEM_OBRIGATORIA_NAO_DISPONIVEL');
}

export function removeUnitImages(unitKey: string): void {
  const dir = folder(unitKey);
  if (dir.exists) dir.delete();
}
