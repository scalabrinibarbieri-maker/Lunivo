import type { User } from 'firebase/auth';
import type { PendingXpAward } from './logic';
import { parseRemoteProgress, type RemoteProgress } from './syncLogic';

const BASE_URL = 'https://lunivo-api-dev.scalabrinibarbieri.workers.dev';
async function requestProgress(user: User, method: 'GET' | 'POST', suffix = '', payload?: unknown): Promise<RemoteProgress> {
  const token = await user.getIdToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${BASE_URL}/v1/progress${suffix}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(method === 'POST' ? { body: JSON.stringify(payload) } : {}),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`API_INDISPONIVEL_${response.status}`);
    return parseRemoteProgress(await response.json());
  } finally { clearTimeout(timeout); }
}
export const fetchCloudProgress = (user: User) => requestProgress(user, 'GET');
export const uploadCloudProgress = (user: User, ids: readonly string[]) =>
  requestProgress(user, 'POST', '/sync', { completedLessonIds: ids });
export const uploadXpAwards = (user: User, awards: readonly PendingXpAward[]) =>
  requestProgress(user, 'POST', '/awards', { awards });
export const importOldXp = (user: User, totalXp: number) =>
  requestProgress(user, 'POST', '/legacy-xp', { totalXp });
