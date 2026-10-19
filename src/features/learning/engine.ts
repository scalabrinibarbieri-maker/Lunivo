import type { Exercise } from './types';
export function normalizeAnswer(input: string): string {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR').replace(/[.,!?;:]+/g, ' ').replace(/\s+/g, ' ').trim();
}
export function gradeExercise(exercise: Exercise, answer: string): boolean {
  if (exercise.type === 'choice') return answer === exercise.correctOptionId;
  const normalized = normalizeAnswer(answer);
  return normalized.length > 0 && exercise.acceptedAnswers.some(a => normalizeAnswer(a) === normalized);
}
export function correctAnswerLabel(exercise: Exercise): string {
  if (exercise.type === 'write') return exercise.sampleAnswer;
  return exercise.options.find(o => o.id === exercise.correctOptionId)?.label ?? '';
}
