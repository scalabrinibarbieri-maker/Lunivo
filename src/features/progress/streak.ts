/** Dias civis no fuso horario do estudante; nunca usar UTC para delimitar o dia. */
export type StudyDay = string;
const KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
export function isStudyDay(value: unknown): value is StudyDay {
  if (typeof value !== 'string') return false;
  const match = KEY.exec(value);
  if (!match) return false;
  const y = Number(match[1]), m = Number(match[2]), d = Number(match[3]);
  const date = new Date(Date.UTC(y, m - 1, d));
  return y >= 2000 && y <= 2100 && date.getUTCFullYear() === y && date.getUTCMonth() + 1 === m && date.getUTCDate() === d;
}
export function localStudyDay(date: Date): StudyDay {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function normalizeStudyDays(values: readonly string[]): StudyDay[] {
  return [...new Set(values.filter(isStudyDay))].sort();
}
/** Garante antecessor real no calendario, inclusive fevereiro e ano bissexto. */
export function previousStudyDay(day: StudyDay): StudyDay {
  if (!isStudyDay(day)) throw Error('DATA_DE_ESTUDO_INVALIDA');
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d! - 1));
  return date.toISOString().slice(0, 10);
}
export type StreakStats = {
  current: number;
  longest: number;
  studiedToday: boolean;
  lastDay: StudyDay | null;
};
export function computeStreak(input: readonly string[], today: StudyDay): StreakStats {
  if (!isStudyDay(today)) throw Error('DATA_DE_ESTUDO_INVALIDA');
  const days = normalizeStudyDays(input).filter(day => day <= today);
  let longest = 0, run = 0, prior: string | null = null;
  for (const day of days) {
    run = prior && previousStudyDay(day) === prior ? run + 1 : 1;
    if (run > longest) longest = run;
    prior = day;
  }
  const lastDay = days[days.length - 1] ?? null;
  const studiedToday = lastDay === today;
  // Ontem ainda conta como sequencia ativa; o usuario tem o dia de hoje para continuar.
  const current = lastDay === today || lastDay === previousStudyDay(today) ? run : 0;
  return { current, longest, studiedToday, lastDay };
}
/** Migracao segura: somente o ultimo dia com registro legado, nunca inventar dias anteriores. */
export function daysFromLegacy(lastStudiedAt: string | null, existing: readonly string[] | undefined): StudyDay[] {
  const dates = normalizeStudyDays(existing ?? []);
  if (dates.length) return dates;
  if (!lastStudiedAt) return dates;
  const time = new Date(lastStudiedAt);
  return Number.isNaN(time.getTime()) ? dates : [localStudyDay(time)];
}
export function addStudyDay(days: readonly string[], day: StudyDay): StudyDay[] {
  if (!isStudyDay(day)) throw Error('DATA_DE_ESTUDO_INVALIDA');
  return normalizeStudyDays([...days, day]);
}
