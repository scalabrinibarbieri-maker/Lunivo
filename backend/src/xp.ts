/** Recompensas por licao (idempotentes) e migracao unitaria do XP antigo. */
export type XpAward = { lessonId: string; xp: number };
export type XpSummary = { totalXp: number; legacyXpImported: boolean };
const MAX_AWARDS = 25;
const MAX_LEGACY_XP = 600000;
const BUILTIN_LIMITS: Record<string, number> = {
  'it-a1-01': 100,
  'it-a1-02': 40,
  'it-a1-03': 40,
};

function objectOf(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('XP_BODY_INVALIDO');
  return input as Record<string, unknown>;
}
export function parseXpAwards(input: unknown, published: ReadonlySet<string>): XpAward[] {
  const obj = objectOf(input);
  if (Object.keys(obj).length !== 1 || !Array.isArray(obj.awards) || obj.awards.length > MAX_AWARDS) {
    throw new Error('XP_LISTA_INVALIDA');
  }
  const seen = new Set<string>();
  return obj.awards.map((raw: unknown) => {
    const award = objectOf(raw);
    if (Object.keys(award).length !== 2 || typeof award.lessonId !== 'string' ||
        !published.has(award.lessonId) || seen.has(award.lessonId) ||
        !Number.isSafeInteger(award.xp) || (award.xp as number) < 0 ||
        (award.xp as number) > (BUILTIN_LIMITS[award.lessonId] ?? 300) ||
        (award.xp as number) % 10 !== 0) throw new Error('XP_RECOMPENSA_INVALIDA');
    seen.add(award.lessonId);
    return { lessonId: award.lessonId, xp: award.xp as number };
  });
}
export function parseLegacyXp(input: unknown): number {
  const obj = objectOf(input);
  if (Object.keys(obj).length !== 1 || !Number.isSafeInteger(obj.totalXp) ||
      (obj.totalXp as number) <= 0 || (obj.totalXp as number) > MAX_LEGACY_XP ||
      (obj.totalXp as number) % 10 !== 0) throw new Error('XP_HISTORICO_INVALIDO');
  return obj.totalXp as number;
}

export async function getXpSummary(db: D1Database, uid: string): Promise<XpSummary> {
  const row = await db.prepare(`
    SELECT
      COALESCE((SELECT SUM(xp) FROM lesson_xp_awards WHERE user_id = ?), 0) +
      COALESCE((SELECT xp FROM legacy_xp_imports WHERE user_id = ?), 0) AS total_xp,
      EXISTS(SELECT 1 FROM legacy_xp_imports WHERE user_id = ?) AS has_legacy
  `).bind(uid, uid, uid).first<{total_xp: number; has_legacy: number}>();
  return { totalXp: row?.total_xp ?? 0, legacyXpImported: Boolean(row?.has_legacy) };
}

/** IDs de licoes ja registradas devem existir ANTES de serem premiadas. */
export async function saveXpAwards(db: D1Database, uid: string, awards: XpAward[]): Promise<void> {
  if (!awards.length) return;
  const existing = await db.prepare('SELECT lesson_id FROM completed_lessons WHERE user_id = ?')
    .bind(uid).all<{lesson_id: string}>();
  const completed = new Set(existing.results.map(row => row.lesson_id));
  if (awards.some(award => !completed.has(award.lessonId))) throw new Error('XP_LICAO_NAO_CONCLUIDA');
  await db.batch(awards.map(award => db.prepare(
    `INSERT OR IGNORE INTO lesson_xp_awards(user_id, lesson_id, xp)
     VALUES (?, ?, ?)`
  ).bind(uid, award.lessonId, award.xp)));
}

/** Resgate limitado ao numero de licoes ja comprovadamente registrado no D1. */
export async function importLegacyXp(db: D1Database, uid: string, oldXp: number): Promise<void> {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM completed_lessons WHERE user_id = ?')
    .bind(uid).first<{n: number}>();
  if (!row?.n || oldXp > row.n * 300) throw new Error('XP_HISTORICO_ACIMA_LIMITE');
  await db.prepare('INSERT OR IGNORE INTO legacy_xp_imports(user_id, xp) VALUES (?, ?)')
    .bind(uid, oldXp).run();
}
