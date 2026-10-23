import type { InfoExercise, Lesson } from '../learning/types';

/** Supplemental lessons in R2. Nothing here is persisted or bundled in an offline unit. */
export type OnlineLessonInfo = {
  version: 1;
  revision: number;
  lessonId: string;
  entries: { beforeExerciseId?: string; afterExerciseId?: string; exercise: InfoExercise }[];
};

// Valid for bundled and R2 lessons. Published lesson IDs are checked by the catalog/publisher.
const LESSON_ID = /^[a-z]{2}-(?:a1|a2|b1|b2|c1|c2)-[0-9]{2,4}$/;
const FIRST = '__first__';
const ID = /^q[0-9]{2,6}$/;
const TEXT = (value: unknown, max: number): value is string =>
  typeof value === 'string' && Boolean(value.trim()) && value.length <= max && !/[\u0000-\u001f]/.test(value);
const OBJECT = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function validImage(value: unknown): value is NonNullable<InfoExercise['image']> {
  if (!OBJECT(value) || !TEXT(value.url, 700) || !TEXT(value.alt, 180) ||
      (value.caption !== undefined && !TEXT(value.caption, 240)) ||
      Object.keys(value).some(key => !['url', 'alt', 'caption'].includes(key))) return false;
  try {
    const url = new URL(value.url);
    return url.protocol === 'https:' && url.origin === 'https://lunivo-api-dev.scalabrinibarbieri.workers.dev' &&
      /^\/v1\/courses\/bundled\/assets\/[a-z0-9][a-z0-9-]{0,70}\.png$/.test(url.pathname) &&
      !url.search && !url.hash && !url.username && !url.password && !url.port;
  } catch { return false; }
}

/** Reject untrusted or oversized remote documents before they reach React Native. */
export function parseBundledInfo(input: unknown, lessonId: string): OnlineLessonInfo {
  if (!LESSON_ID.test(lessonId) || !OBJECT(input) ||
      Object.keys(input).some(key => !['version', 'revision', 'lessonId', 'entries'].includes(key)) ||
      input.version !== 1 || input.lessonId !== lessonId || !Number.isSafeInteger(input.revision) ||
      Number(input.revision) < 1 || Number(input.revision) > 99999 ||
      !Array.isArray(input.entries) || input.entries.length > 12) {
    throw new Error('BUNDLED_INFO_INVALID');
  }
  const seen = new Set<string>();
  for (const entry of input.entries) {
    if (!OBJECT(entry) || Object.keys(entry).some(key => !['beforeExerciseId', 'afterExerciseId', 'exercise'].includes(key)) ||
        ('beforeExerciseId' in entry) === ('afterExerciseId' in entry) || !OBJECT(entry.exercise)) {
      throw new Error('BUNDLED_INFO_INVALID');
    }
    const anchor = entry.beforeExerciseId ?? entry.afterExerciseId;
    if (!TEXT(anchor, 16) || !(ID.test(anchor) || (anchor === FIRST && 'beforeExerciseId' in entry))) throw new Error('BUNDLED_INFO_INVALID');
    const ex = entry.exercise;
    if (ex.type !== 'info' || !TEXT(ex.id, 16) || !ID.test(ex.id) || seen.has(ex.id) ||
        !TEXT(ex.prompt, 500) || !TEXT(ex.instruction, 150) || !TEXT(ex.explanation, 1800) ||
        (ex.category !== undefined && !['vocabulary', 'culture', 'grammar', 'tip'].includes(String(ex.category))) ||
        (ex.image !== undefined && !validImage(ex.image)) ||
        Object.keys(ex).some(key => !['type', 'id', 'prompt', 'instruction', 'explanation', 'category', 'image'].includes(key))) {
      throw new Error('BUNDLED_INFO_INVALID');
    }
    seen.add(ex.id);
  }
  return input as unknown as OnlineLessonInfo;
}

/** Anchors must exist. All existing question IDs, answers and ordering are preserved. */
export function attachBundledInfo(base: Lesson, online: OnlineLessonInfo): Lesson {
  if (base.id !== online.lessonId) return base;
  const allIds = new Set(base.exercises.map(ex => ex.id));
  const anchors = new Set(base.exercises.filter(ex => ex.type !== 'info').map(ex => ex.id));
  if (online.entries.some(entry => {
    const anchor = entry.beforeExerciseId ?? entry.afterExerciseId ?? '';
    return (anchor !== FIRST && !anchors.has(anchor)) || allIds.has(entry.exercise.id);
  })) return base;
  const before = new Map<string, InfoExercise[]>();
  const after = new Map<string, InfoExercise[]>();
  for (const entry of online.entries) {
    const anchor = entry.beforeExerciseId ?? entry.afterExerciseId!;
    const additions = entry.beforeExerciseId ? before : after;
    const items = additions.get(anchor) ?? [];
    items.push(entry.exercise);
    additions.set(anchor, items);
  }
  return { ...base, exercises: [...(before.get(FIRST) ?? []), ...base.exercises.flatMap(ex => [
    ...(before.get(ex.id) ?? []), ex, ...(after.get(ex.id) ?? []),
  ])] };
}
