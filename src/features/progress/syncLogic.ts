import type { PendingXpAward, StudentProgress } from './logic';
/** Contrato remoto XP (soma do historico migrado + premiacoes por licao). */
export type RemoteProgress = {
  completedLessonIds: string[];
  totalXp: number;
  legacyXpImported: boolean;
};
export function parseRemoteProgress(body: unknown): RemoteProgress {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('RESPOSTA_INVALIDA');
  const b = body as Partial<RemoteProgress>;
  if (!Array.isArray(b.completedLessonIds) || b.completedLessonIds.some(id => typeof id !== 'string') ||
      !Number.isSafeInteger(b.totalXp) || (b.totalXp ?? -1) < 0 || typeof b.legacyXpImported !== 'boolean')
    throw new Error('RESPOSTA_INVALIDA');
  return { completedLessonIds: b.completedLessonIds, totalXp: b.totalXp!, legacyXpImported: b.legacyXpImported };
}
/** Sincronizacao aditiva: preserva lições locais que ainda não aparecem no catalogo. */
export function planProgressSync(local: readonly string[], remote: readonly string[], known: readonly string[]) {
  const knownSet = new Set(known);
  const localSet = new Set(local.filter(id => knownSet.has(id)));
  const remoteSet = new Set(remote.filter(id => knownSet.has(id)));
  const uploadIds = known.filter(id => localSet.has(id) || remoteSet.has(id));
  const preservedLocalUnknown = local.filter(id => !knownSet.has(id));
  return {
    uploadIds,
    mergedLocalIds: [...uploadIds, ...new Set(preservedLocalUnknown)],
    needsUpload: uploadIds.some(id => !remoteSet.has(id)),
  };
}
/** Distingue XP historico de premiacoes geradas depois da atualização. */
export function xpToImport(progress: StudentProgress): number {
  if (progress.legacyXpImported) return 0;
  return progress.legacyXpBaseline ?? Math.max(0, progress.totalXp -
    (progress.pendingXpAwards ?? []).reduce((sum, p) => sum + p.xp, 0));
}
export function mergeCloudXp(progress: StudentProgress, remote: RemoteProgress,
  submitted: readonly PendingXpAward[]): StudentProgress {
  const submittedIds = new Set(submitted.map(item => item.lessonId));
  const remaining = (progress.pendingXpAwards ?? []).filter(item => !submittedIds.has(item.lessonId));
  return {
    ...progress,
    legacyXpImported: true,
    legacyXpBaseline: 0,
    pendingXpAwards: remaining,
    totalXp: remote.totalXp + remaining.reduce((sum, item) => sum + item.xp, 0),
  };
}
