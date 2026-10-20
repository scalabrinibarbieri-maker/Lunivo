import type { Exercise, MatchExercise } from './types';

export function normalizeAnswer(input: string): string {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR').replace(/[.,!?;:]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Pares codificados em string para manter a interface única de correção das lições. */
export function encodeMatches(matches: Readonly<Record<string, string>>): string {
  return Object.entries(matches).sort(([a], [b]) => a.localeCompare(b))
    .map(([left, right]) => `${left}:${right}`).join('|');
}

export function gradeMatchingExercise(exercise: MatchExercise, answer: string): boolean {
  if (!answer) return false;
  const expected = new Set(exercise.pairs.map(p => p.id));
  const entries = answer.split('|').map(part => part.split(':'));
  if (entries.length !== exercise.pairs.length) return false;
  const lefts = new Set<string>();
  const rights = new Set<string>();
  for (const entry of entries) {
    if (entry.length !== 2) return false;
    const [left, right] = entry;
    if (!left || !right || !expected.has(left) || !expected.has(right) || lefts.has(left) || rights.has(right)) return false;
    lefts.add(left);
    rights.add(right);
    if (left !== right) return false;
  }
  return lefts.size === expected.size && rights.size === expected.size;
}

export function gradeExercise(exercise: Exercise, answer: string): boolean {
  if (exercise.type === 'match') return gradeMatchingExercise(exercise, answer);
  if (exercise.type === 'choice' || exercise.type === 'listen_choice') return answer === exercise.correctOptionId;
  const normalized = normalizeAnswer(answer);
  return normalized.length > 0 && exercise.acceptedAnswers.some(a => normalizeAnswer(a) === normalized);
}

export function correctAnswerLabel(exercise: Exercise): string {
  if (exercise.type === 'match') return exercise.pairs.map(p => `${p.left} — ${p.right}`).join(' · ');
  if (exercise.type === 'write' || exercise.type === 'listen_write') return exercise.sampleAnswer;
  return exercise.options.find(o => o.id === exercise.correctOptionId)?.label ?? '';
}
