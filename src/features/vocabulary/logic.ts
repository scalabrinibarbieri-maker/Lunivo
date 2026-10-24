import type { Exercise } from '../learning/types.ts';
import { BUNDLED_VOCABULARY } from '../learning/data.ts';

/** Palavras e expressões rastreadas por idioma. Nunca derivar a identidade do número da questão. */
export type VocabularyWord = { id: string; term: string; meaning: string; language: string };
export type WordMemory = VocabularyWord & {
  learnedAt: string;
  reviewedAt: string;
  correctReviews: number;
  attempts: number;
  intervalDays: number;
  lastWasCorrect: boolean;
};
export type VocabularyMemory = Record<string, WordMemory>;
export type WordStrength = 'strong' | 'medium' | 'weak';

const DAY_MS = 86_400_000;
const MAX_ITEMS = 2000;
const ID_PREFIX = /^[a-z]{2}-[A-Z]{2}:/;
const LIMIT = 90;
const normalize = (term: string) => term.trim().normalize('NFC').toLocaleLowerCase('it-IT').replace(/\s+/g, ' ');

export function makeVocabularyWord(term: string, meaning: string, language = 'it-IT'): VocabularyWord | null {
  const safeTerm = term.trim().normalize('NFC').replace(/\s+/g, ' ');
  const safeMeaning = meaning.trim().normalize('NFC').replace(/\s+/g, ' ');
  if (!/^[a-z]{2}-[A-Z]{2}$/.test(language) || !safeTerm || !safeMeaning ||
      safeTerm.length > LIMIT || safeMeaning.length > LIMIT ||
      /[\u0000-\u001f]/.test(safeTerm + safeMeaning)) return null;
  return { id: `${language}:${normalize(safeTerm)}`, term: safeTerm, meaning: safeMeaning, language };
}

function generalCandidates(ex: Exercise): Array<readonly [string,string]> {
  if (ex.type === 'match') return ex.pairs.map(p => [p.left, p.right] as const);
  if (ex.type === 'write' && /italiano/i.test(ex.instruction)) return [[ex.sampleAnswer, ex.prompt]];
  if (ex.type === 'choice') {
    const option = ex.options.find(o => o.id === ex.correctOptionId);
    return option && ex.prompt.length <= LIMIT && !/^(qual|quais|onde|como|quem|o que|você|voce|escolha|traduza|complete|escreva)\b/i.test(ex.prompt) && /tradu[çc][ãa]o|significa|escolha/i.test(ex.instruction)
      ? [[ex.prompt, option.label]] : [];
  }
  if (ex.type === 'listen_write') return [[ex.sampleAnswer, 'Expressão do ditado']];
  return [];
}

/** Resolve vocabulário a partir dos exercícios, inclusive os de unidades online.
 * O conteúdo online pode ser aprimorado com mapeamentos editoriais sem tocar no mecanismo de retenção. */
export function wordsForExercise(lessonId: string, ex: Exercise): VocabularyWord[] {
  const pairs = lessonId === 'it-a1-01' || lessonId === 'it-a1-02' || lessonId === 'it-a1-03'
    ? (BUNDLED_VOCABULARY[ex.id] ?? []) : generalCandidates(ex);
  const result = new Map<string,VocabularyWord>();
  const language = lessonId.startsWith('en-') ? 'en-US' : lessonId.startsWith('es-') ? 'es-ES' : 'it-IT';
  for (const [term,meaning] of pairs) {
    const item = makeVocabularyWord(term, meaning, language);
    if (item) result.set(item.id, item);
  }
  // Em infos online das lições iniciais, não adivinhar vocabulário a partir de textos longos.
  return [...result.values()];
}

export function strengthOf(record: WordMemory, now = new Date()): WordStrength {
  if (!record.lastWasCorrect) return 'weak';
  const last = Date.parse(record.reviewedAt);
  if (!Number.isFinite(last)) return 'weak';
  const elapsed = Math.max(0, (now.getTime() - last) / DAY_MS);
  return elapsed <= record.intervalDays * 0.65 ? 'strong'
    : elapsed <= record.intervalDays * 1.35 ? 'medium' : 'weak';
}

export function isVocabularyMemory(value: unknown): value is VocabularyMemory {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const records = Object.entries(value);
  if (records.length > MAX_ITEMS) return false;
  return records.every(([key, item]) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const w = item as Partial<WordMemory>;
    return typeof key === 'string' && ID_PREFIX.test(key) && key.length <= 110 && w.id === key &&
      typeof w.term === 'string' && !!w.term.trim() && w.term.length <= LIMIT &&
      typeof w.meaning === 'string' && !!w.meaning.trim() && w.meaning.length <= LIMIT &&
      typeof w.language === 'string' && /^[a-z]{2}-[A-Z]{2}$/.test(w.language) &&
      key === `${w.language}:${normalize(w.term)}` &&
      typeof w.learnedAt === 'string' && Number.isFinite(Date.parse(w.learnedAt)) &&
      typeof w.reviewedAt === 'string' && Number.isFinite(Date.parse(w.reviewedAt)) &&
      Number.isSafeInteger(w.correctReviews) && Number(w.correctReviews) >= 0 &&
      Number.isSafeInteger(w.attempts) && Number(w.attempts) >= 1 && Number(w.attempts) >= Number(w.correctReviews) &&
      Number.isSafeInteger(w.intervalDays) && Number(w.intervalDays) >= 1 && Number(w.intervalDays) <= 60 &&
      typeof w.lastWasCorrect === 'boolean';
  });
}

/** Uma resposta certa aumenta o intervalo; erro derruba para fraco imediatamente. */
export function applyVocabularyReview(current: VocabularyMemory, words: readonly VocabularyWord[],
  correct: boolean, atIso: string): VocabularyMemory {
  if (!Number.isFinite(Date.parse(atIso))) throw new Error('DATA_REVISAO_INVALIDA');
  if (!words.length) return current;
  const next = { ...current };
  for (const word of words) {
    const valid = makeVocabularyWord(word.term, word.meaning, word.language);
    if (!valid || valid.id !== word.id) continue;
    const existing = next[word.id];
    if (!existing && Object.keys(next).length >= MAX_ITEMS) continue;
    const intervalDays = correct ?
      existing?.lastWasCorrect ? Math.min(60, Math.max(4, Math.round(existing.intervalDays * 1.7))) : 4 :
      1;
    next[word.id] = {
      ...valid,
      learnedAt: existing?.learnedAt ?? atIso,
      reviewedAt: atIso,
      attempts: (existing?.attempts ?? 0) + 1,
      correctReviews: (existing?.correctReviews ?? 0) + (correct ? 1 : 0),
      intervalDays,
      lastWasCorrect: correct,
    };
  }
  return next;
}

export function vocabularyStats(memory: VocabularyMemory, now = new Date()) {
  const values = Object.values(memory);
  const counts = { strong: 0, medium: 0, weak: 0 };
  for (const word of values) counts[strengthOf(word, now)]++;
  return { ...counts, total: values.length };
}
