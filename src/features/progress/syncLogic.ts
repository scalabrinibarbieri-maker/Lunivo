/** Sincronizacao aditiva: nunca apaga licoes nem envia XP calculado no celular. */
export type RemoteProgress = { completedLessonIds: string[] };

export function parseRemoteProgress(body: unknown): string[] {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      !('completedLessonIds' in body)) throw new Error('RESPOSTA_INVALIDA');
  const ids = (body as RemoteProgress).completedLessonIds;
  if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) {
    throw new Error('RESPOSTA_INVALIDA');
  }
  return ids;
}

/** Mantem licoes locais desconhecidas, mas transmite apenas IDs publicados nesta versao. */
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
