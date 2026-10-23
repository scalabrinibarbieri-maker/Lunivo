import type { Lesson } from '../learning/types.ts';
import type { StudentProgress } from '../progress/logic.ts';
import { daysFromLegacy, localStudyDay } from '../progress/streak.ts';
import { strengthOf, wordsForExercise, type VocabularyMemory, type VocabularyWord } from './logic.ts';

const DAY = 86_400_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Diferença em dias de calendário local, evitando falsos positivos por fuso e horário. */
export function daysWithoutPractice(progress: Pick<StudentProgress, 'lastStudiedAt' | 'studyDays' | 'lastVocabularyReviewedAt'>,
  now = new Date()): number | null {
  const days = daysFromLegacy(progress.lastStudiedAt, progress.studyDays);
  const review = progress.lastVocabularyReviewedAt;
  if (review && Number.isFinite(Date.parse(review))) {
    days.push(localStudyDay(new Date(review)));
  }
  if (!days.length) return null;
  const last = [...days].sort().at(-1)!;
  const today = localStudyDay(now);
  if (!DATE.test(last) || !DATE.test(today)) return null;
  const delta = Math.round((Date.parse(today + 'T00:00:00Z') - Date.parse(last + 'T00:00:00Z')) / DAY);
  return Math.max(0, delta);
}

export function shouldOfferReview(progress: Pick<StudentProgress, 'lastStudiedAt' | 'studyDays' | 'lastVocabularyReviewedAt'>,
  now = new Date()): boolean {
  const days = daysWithoutPractice(progress, now);
  return days !== null && days >= 3;
}

/** Só deriva palavras de lições efetivamente concluídas; nunca presume acerto ou força. */
export function generalReviewWords(completedLessonIds: readonly string[], lessons: readonly Lesson[],
  memory: VocabularyMemory, now = new Date(), limit = 60): VocabularyWord[] {
  const allowed = new Set(completedLessonIds);
  const seen = new Map<string, VocabularyWord>();
  for (const lesson of lessons) {
    if (!allowed.has(lesson.id)) continue;
    for (const exercise of lesson.exercises) {
      if (exercise.type === 'info') continue;
      for (const word of wordsForExercise(lesson.id, exercise)) {
        if (!seen.has(word.id)) seen.set(word.id, word);
      }
    }
  }
  const priority = (word: VocabularyWord) => {
    const entry = memory[word.id];
    if (!entry) return 0;  // Palavra ainda sem histórico neste aparelho: revisar primeiro.
    return strengthOf(entry, now) === 'weak' ? 1 : strengthOf(entry, now) === 'medium' ? 2 : 3;
  };
  // Empates preservam a ordem curricular; não exibimos palavras de lições bloqueadas.
  return [...seen.values()].sort((a, b) => priority(a) - priority(b)).slice(0, Math.max(0, Math.min(100, limit)));
}
