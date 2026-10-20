/** v1.1: campos opcionais permitem ler todos os progressos salvos pela versao anterior. */
export type PendingXpAward = { lessonId: string; xp: number };
export type StudentProgress = {
  completedLessonIds: string[];
  totalXp: number;
  lastStudiedAt: string | null;
  pendingXpAwards?: PendingXpAward[];
  legacyXpBaseline?: number;
  legacyXpImported?: boolean;
};
export const EMPTY_PROGRESS: StudentProgress = { completedLessonIds: [], totalXp: 0, lastStudiedAt: null };
export function canStartLesson(lessonId: string, orderedIds: readonly string[], progress: StudentProgress): boolean {
  const index = orderedIds.indexOf(lessonId);
  return index >= 0 && (index === 0 || progress.completedLessonIds.includes(orderedIds[index - 1]!));
}
export function applyLessonCompletion(progress: StudentProgress, lessonId: string,
  correctCount: number, totalQuestions: number, isoDate: string): { next: StudentProgress; earnedXp: number } {
  if (!lessonId || !Number.isInteger(correctCount) || !Number.isInteger(totalQuestions) ||
      totalQuestions < 1 || correctCount < 0 || correctCount > totalQuestions) {
    throw new Error('Resultado da lição inválido');
  }
  if (progress.completedLessonIds.includes(lessonId)) return { next: progress, earnedXp: 0 };
  const earnedXp = correctCount * 10;
  return { next: {
    ...progress,
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
  if (v.legacyXpBaseline !== undefined && (!Number.isSafeInteger(v.legacyXpBaseline) || v.legacyXpBaseline < 0)) return false;
  if (v.legacyXpImported !== undefined && typeof v.legacyXpImported !== 'boolean') return false;
  if (v.pendingXpAwards !== undefined && (!Array.isArray(v.pendingXpAwards) ||
      v.pendingXpAwards.some(a => !a || typeof a.lessonId !== 'string' || !Number.isSafeInteger(a.xp) || a.xp < 0))) return false;
  return true;
}
