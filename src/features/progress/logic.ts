export type StudentProgress = { completedLessonIds: string[]; totalXp: number; lastStudiedAt: string | null };
export const EMPTY_PROGRESS: StudentProgress = { completedLessonIds: [], totalXp: 0, lastStudiedAt: null };
export function canStartLesson(lessonId: string, orderedIds: readonly string[], progress: StudentProgress): boolean {
  const index = orderedIds.indexOf(lessonId);
  return index >= 0 && (index === 0 || progress.completedLessonIds.includes(orderedIds[index - 1]!));
}
export function applyLessonCompletion(progress: StudentProgress, lessonId: string, correctCount: number, totalQuestions: number, isoDate: string): { next: StudentProgress; earnedXp: number } {
  if (!lessonId || !Number.isInteger(correctCount) || !Number.isInteger(totalQuestions) || totalQuestions < 1 || correctCount < 0 || correctCount > totalQuestions) {
    throw new Error('Resultado da lição inválido');
  }
  if (progress.completedLessonIds.includes(lessonId)) return { next: progress, earnedXp: 0 };
  const earnedXp = correctCount * 10;
  return { next: { completedLessonIds: [...progress.completedLessonIds, lessonId], totalXp: progress.totalXp + earnedXp, lastStudiedAt: isoDate }, earnedXp };
}
export function isStudentProgress(value: unknown): value is StudentProgress {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<StudentProgress>;
  return Array.isArray(v.completedLessonIds) && v.completedLessonIds.every((id) => typeof id === 'string') &&
    typeof v.totalXp === 'number' && Number.isFinite(v.totalXp) && v.totalXp >= 0 &&
    (v.lastStudiedAt === null || typeof v.lastStudiedAt === 'string');
}
