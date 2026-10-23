import { addStudyDay, daysFromLegacy, isStudyDay } from './streak.ts';
import { isVocabularyMemory, type VocabularyMemory } from '../vocabulary/logic.ts';

/** Novos campos sao opcionais para recuperar o progresso salvo em versoes antigas. */
export type PendingXpAward = { lessonId: string; xp: number };
export type StudentProgress = {
  completedLessonIds: string[];
  totalXp: number;
  lastStudiedAt: string | null;
  studyDays?: string[];
  vocabulary?: VocabularyMemory;
  lastVocabularyReviewedAt?: string;
  pendingXpAwards?: PendingXpAward[];
  legacyXpBaseline?: number;
  legacyXpImported?: boolean;
};
export const EMPTY_PROGRESS: StudentProgress = { completedLessonIds: [], totalXp: 0, lastStudiedAt: null };
export function canStartLesson(lessonId: string, orderedIds: readonly string[], progress: StudentProgress): boolean {
  const index = orderedIds.indexOf(lessonId);
  return index >= 0 && (index === 0 || progress.completedLessonIds.includes(orderedIds[index - 1]!));
}
/** A repeticao conta para streak, mas nunca concede XP novamente. */
export function applyLessonCompletion(progress: StudentProgress, lessonId: string,
  correctCount: number, totalQuestions: number, isoDate: string, localDay?: string): { next: StudentProgress; earnedXp: number } {
  if (!lessonId || !Number.isInteger(correctCount) || !Number.isInteger(totalQuestions) ||
      totalQuestions < 1 || correctCount < 0 || correctCount > totalQuestions) {
    throw new Error('Resultado da lição inválido');
  }
  const day = localDay ?? isoDate.slice(0, 10);
  if (!isStudyDay(day)) throw new Error('Dia de estudo inválido');
  const previousDays = daysFromLegacy(progress.lastStudiedAt, progress.studyDays);
  const nextDays = addStudyDay(previousDays, day);
  const dayAdded = nextDays.length !== previousDays.length;
  const alreadyCompleted = progress.completedLessonIds.includes(lessonId);
  if (alreadyCompleted) {
    if (!dayAdded) return { next: progress, earnedXp: 0 };
    return { next: { ...progress, studyDays: nextDays, lastStudiedAt: isoDate }, earnedXp: 0 };
  }
  const earnedXp = correctCount * 10;
  return { next: {
    ...progress, studyDays: nextDays,
    completedLessonIds: [...progress.completedLessonIds, lessonId],
    totalXp: progress.totalXp + earnedXp,
    lastStudiedAt: isoDate,
    legacyXpBaseline: progress.legacyXpBaseline ?? (progress.legacyXpImported ? 0 : progress.totalXp),
    pendingXpAwards: [...(progress.pendingXpAwards ?? []), { lessonId, xp: earnedXp }],
  }, earnedXp };
}
export function isStudentProgress(value: unknown): value is StudentProgress {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<StudentProgress>;
  const valid = Array.isArray(v.completedLessonIds) && v.completedLessonIds.every(id => typeof id === 'string') &&
    typeof v.totalXp === 'number' && Number.isSafeInteger(v.totalXp) && v.totalXp >= 0 &&
    (v.lastStudiedAt === null || typeof v.lastStudiedAt === 'string');
  if (!valid) return false;
  if (v.studyDays !== undefined && (!Array.isArray(v.studyDays) || v.studyDays.some(day => !isStudyDay(day)))) return false;
  if (v.vocabulary !== undefined && !isVocabularyMemory(v.vocabulary)) return false;
  if (v.lastVocabularyReviewedAt !== undefined && (typeof v.lastVocabularyReviewedAt !== 'string' || !Number.isFinite(Date.parse(v.lastVocabularyReviewedAt)))) return false;
  if (v.legacyXpBaseline !== undefined && (!Number.isSafeInteger(v.legacyXpBaseline) || v.legacyXpBaseline < 0)) return false;
  if (v.legacyXpImported !== undefined && typeof v.legacyXpImported !== 'boolean') return false;
  if (v.pendingXpAwards !== undefined && (!Array.isArray(v.pendingXpAwards) ||
      v.pendingXpAwards.some(a => !a || typeof a.lessonId !== 'string' || !Number.isSafeInteger(a.xp) || a.xp < 0))) return false;
  return true;
}
