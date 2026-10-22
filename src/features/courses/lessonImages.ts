import type { CourseUnit } from './schema';

export const MAX_LESSON_IMAGE_BYTES = 3 * 1024 * 1024;
export const MAX_IMAGES_PER_UNIT = 30;

/** Chave estável, sem incluir parâmetros de URL ou caminhos externos no sistema de arquivos. */
export function imageFileName(url: string): string {
  let first = 2166136261;
  let second = 2166136261;
  for (let i = 0; i < url.length; i++) {
    first = Math.imul(first ^ url.charCodeAt(i), 16777619) >>> 0;
    second = Math.imul(second ^ url.charCodeAt(url.length - 1 - i), 16777619) >>> 0;
  }
  const suffix = /\.(png|jpe?g|webp)(?:[?#]|$)/i.exec(url)?.[1]?.toLowerCase() ?? 'jpg';
  const extension = suffix === 'jpeg' ? 'jpg' : suffix;
  return `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}.${extension}`;
}

/** Imagens de etapas explicativas: valores validados por parseCourseUnit. */
export function listUnitImages(unit: CourseUnit): string[] {
  const unique = new Set<string>();
  for (const lesson of unit.lessons) {
    for (const exercise of lesson.exercises) {
      if (exercise.type === 'info' && exercise.image) unique.add(exercise.image.url);
    }
  }
  if (unique.size > MAX_IMAGES_PER_UNIT) throw new Error('IMAGENS_LIMITE_POR_UNIDADE');
  return [...unique];
}
