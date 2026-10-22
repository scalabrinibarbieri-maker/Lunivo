/** Registro por dia local: JSON idempotente, isolado pelo uid verificado no Firebase. */
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
export const MAX_DAYS_PER_SYNC = 60;
function validDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const x = DAY.exec(value); if (!x) return false;
  const year = Number(x[1]), month = Number(x[2]), day = Number(x[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 2000 && year <= 2100 && date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}
export function parseStudyDays(input: unknown, now = new Date()): string[] {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('STREAK_BODY_INVALIDO');
  const obj = input as Record<string, unknown>;
  if (Object.keys(obj).length !== 1 || !Array.isArray(obj.studyDays) || obj.studyDays.length > MAX_DAYS_PER_SYNC) throw Error('STREAK_DIAS_INVALIDOS');
  const earliest = new Date(now); earliest.setUTCFullYear(now.getUTCFullYear() - 5);
  const latest = new Date(now); latest.setUTCDate(now.getUTCDate() + 1);
  const low = earliest.toISOString().slice(0, 10), high = latest.toISOString().slice(0, 10);
  const dates = obj.studyDays;
  if (dates.some(day => !validDate(day) || day < low || day > high) || new Set(dates).size !== dates.length) {
    throw Error('STREAK_DIAS_INVALIDOS');
  }
  return dates as string[];
}
export async function getStudyDays(db: D1Database, uid: string): Promise<string[]> {
  const days = await db.prepare('SELECT study_date FROM study_days WHERE user_id = ? ORDER BY study_date')
    .bind(uid).all<{study_date: string}>();
  return days.results.map(row => row.study_date);
}
export async function saveStudyDays(db: D1Database, uid: string, days: readonly string[]): Promise<void> {
  if (!days.length) return;
  await db.batch([
    db.prepare('INSERT OR IGNORE INTO users (user_id) VALUES (?)').bind(uid),
    ...days.map(day => db.prepare('INSERT OR IGNORE INTO study_days (user_id, study_date) VALUES (?, ?)').bind(uid, day)),
  ]);
}
