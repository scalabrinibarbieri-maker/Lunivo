import type { User } from 'firebase/auth';
import { parseRemoteProgress } from './syncLogic';

// URL publica de testes. Nenhuma senha, segredo nem chave administrativa no aplicativo.
const BASE_URL = 'https://lunivo-api-dev.scalabrinibarbieri.workers.dev';

async function requestProgress(user: User, method: 'GET' | 'POST', ids?: readonly string[]): Promise<string[]> {
  const token = await user.getIdToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${BASE_URL}/v1/progress${method === 'POST' ? '/sync' : ''}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(method === 'POST' ? { body: JSON.stringify({ completedLessonIds: ids ?? [] }) } : {}),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`API_INDISPONIVEL_${response.status}`);
    const body: unknown = await response.json();
    return parseRemoteProgress(body);
  } finally {
    clearTimeout(timeout);
  }
}

export const fetchCloudProgress = (user: User) => requestProgress(user, 'GET');
export const uploadCloudProgress = (user: User, ids: readonly string[]) => requestProgress(user, 'POST', ids);
