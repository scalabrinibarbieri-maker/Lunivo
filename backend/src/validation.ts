/** V1: IDs publicados no curso inicial. Atualizar ao publicar novos cursos. */
export const KNOWN_LESSON_IDS = new Set(['it-a1-01', 'it-a1-02', 'it-a1-03']);
export const MAX_COMPLETIONS_PER_REQUEST = 25;

export function parseCompletionSync(value: unknown): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('BODY_INVALIDO');
  }
  const object = value as Record<string, unknown>;
  if (Object.keys(object).length !== 1 || !Object.prototype.hasOwnProperty.call(object, 'completedLessonIds')) {
    throw new Error('CAMPOS_INVALIDOS');
  }
  const ids = object.completedLessonIds;
  if (!Array.isArray(ids) || ids.length > MAX_COMPLETIONS_PER_REQUEST) {
    throw new Error('LISTA_INVALIDA');
  }
  if (!ids.every((id): id is string => typeof id === 'string' && KNOWN_LESSON_IDS.has(id))) {
    throw new Error('LICAO_DESCONHECIDA');
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error('LICAO_DUPLICADA');
  }
  return ids;
}
