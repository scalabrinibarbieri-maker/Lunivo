import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import { useAuth } from '../auth/AuthProvider';
import { firebaseAuth } from '../auth/firebase';
import { useCourses } from '../courses/CourseProvider';
import { applyLessonCompletion, EMPTY_PROGRESS, isStudentProgress, type StudentProgress, type PendingXpAward } from './logic';
import { progressKeyForUid } from './keys';
import { fetchCloudProgress, uploadCloudProgress, uploadXpAwards, importOldXp } from './syncApi';
import { mergeCloudXp, planProgressSync, xpToImport } from './syncLogic';

type SyncStatus = 'guest' | 'idle' | 'syncing' | 'synced' | 'error';
type ProgressContextType = {
  progress: StudentProgress;
  ready: boolean;
  syncStatus: SyncStatus;
  syncNow: () => Promise<boolean>;
  completeLesson: (id: string, correct: number, total: number) => Promise<number>;
};
const ProgressContext = createContext<ProgressContextType | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const { lessonIds } = useCourses();
  const uid = user?.uid ?? null;
  const key = progressKeyForUid(uid);
  const keyRef = useRef(key);
  keyRef.current = key;
  const [progress, setProgress] = useState<StudentProgress>(EMPTY_PROGRESS);
  const progressRef = useRef<StudentProgress>(EMPTY_PROGRESS);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('guest');
  const ready = authReady && loadedKey === key;

  // Uma fila de gravacao por aparelho evita sobrescrever o XP conquistado offline
  // quando a nuvem responde no mesmo instante de uma conclusao de licao.
  const writeTailRef = useRef<Promise<void>>(Promise.resolve());
  const updateLocal = useCallback((targetKey: string, change: (current: StudentProgress) => StudentProgress) => {
    const op = writeTailRef.current.catch(() => {}).then(async () => {
      if (keyRef.current !== targetKey) return;
      const current = progressRef.current;
      const next = change(current);
      if (next === current) return;
      await Storage.setItem(targetKey, JSON.stringify(next));
      if (keyRef.current === targetKey) {
        progressRef.current = next;
        setProgress(next);
      }
    });
    writeTailRef.current = op.catch(() => {});
    return op;
  }, []);
  const flightRef = useRef<{ key: string; promise: Promise<boolean> } | null>(null);
  const repeatKeyRef = useRef<string | null>(null);
  const syncNowRef = useRef<() => Promise<boolean>>(async () => false);

  useEffect(() => {
    if (!authReady) return;
    let active = true;
    setSyncStatus(uid ? 'idle' : 'guest');
    (async () => {
      try {
        const value = await Storage.getItem(key);
        const parsed: unknown = value ? JSON.parse(value) : null;
        const restored = isStudentProgress(parsed) ? parsed : EMPTY_PROGRESS;
        if (active) { progressRef.current = restored; setProgress(restored); }
      } catch (err) {
        console.warn('Falha ao ler progresso local:', err);
        if (active) { progressRef.current = EMPTY_PROGRESS; setProgress(EMPTY_PROGRESS); }
      } finally { if (active) setLoadedKey(key); }
    })();
    return () => { active = false; };
  }, [authReady, key, uid]);

  const syncNow = useCallback((): Promise<boolean> => {
    if (!ready || !uid || !user || firebaseAuth.currentUser?.uid !== uid) return Promise.resolve(false);
    const existing = flightRef.current;
    if (existing?.key === key) { repeatKeyRef.current = key; return existing.promise; }
    setSyncStatus('syncing');
    const task = (async (): Promise<boolean> => {
      try {
        let remote = await fetchCloudProgress(user);
        await writeTailRef.current;
        if (keyRef.current !== key || firebaseAuth.currentUser?.uid !== uid) return false;

        const plan = planProgressSync(progressRef.current.completedLessonIds, remote.completedLessonIds, lessonIds);
        const knownRemote = new Set(remote.completedLessonIds);
        const missing = plan.uploadIds.filter(id => !knownRemote.has(id));
        // Compatibilidade com a API existente: o servidor aceita ate 25 IDs por requisicao.
        for (let i = 0; i < missing.length; i += 25) {
          remote = await uploadCloudProgress(user, missing.slice(i, i + 25));
          if (keyRef.current !== key || firebaseAuth.currentUser?.uid !== uid) return false;
        }

        // Uma unica importacao dos pontos anteriores a esta versao; nunca importa o
        // novo XP adquirido depois da atualizacao como se fosse XP historico.
        const oldXp = xpToImport(progressRef.current);
        if (oldXp > 0 && !remote.legacyXpImported) {
          remote = await importOldXp(user, oldXp);
          if (keyRef.current !== key || firebaseAuth.currentUser?.uid !== uid) return false;
        }

        const known = new Set(lessonIds);
        const pending: PendingXpAward[] = (progressRef.current.pendingXpAwards ?? [])
          .filter(award => known.has(award.lessonId));
        const submitted: PendingXpAward[] = [];
        for (let i = 0; i < pending.length; i += 25) {
          const batch = pending.slice(i, i + 25);
          remote = await uploadXpAwards(user, batch);
          submitted.push(...batch);
          if (keyRef.current !== key || firebaseAuth.currentUser?.uid !== uid) return false;
        }

        // Releitura evita consolidar uma resposta antiga enquanto outro celular
        // adiciona pontos ou o usuário termina outra lição durante o upload.
        remote = await fetchCloudProgress(user);
        if (keyRef.current !== key || firebaseAuth.currentUser?.uid !== uid) return false;
        await updateLocal(key, current => {
          const mergedLessons = planProgressSync(current.completedLessonIds, remote.completedLessonIds, lessonIds).mergedLocalIds;
          return { ...mergeCloudXp(current, remote, submitted), completedLessonIds: mergedLessons };
        });
        if (keyRef.current === key) setSyncStatus('synced');
        return true;
      } catch (err) {
        console.warn('Sincronizacao de XP indisponivel; progresso local preservado:',
          err instanceof Error ? err.message : 'erro');
        if (keyRef.current === key) setSyncStatus('error');
        return false;
      }
    })();
    flightRef.current = { key, promise: task };
    void task.finally(() => {
      if (flightRef.current?.promise !== task) return;
      flightRef.current = null;
      if (repeatKeyRef.current === key && keyRef.current === key) {
        repeatKeyRef.current = null;
        setTimeout(() => { void syncNowRef.current(); }, 0);
      }
    });
    return task;
  }, [key, ready, uid, updateLocal, user, lessonIds]);
  syncNowRef.current = syncNow;

  useEffect(() => { if (ready && uid) void syncNow(); }, [ready, uid, syncNow]);
  useEffect(() => {
    if (!ready || !uid) return;
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') void syncNowRef.current();
    });
    return () => sub.remove();
  }, [ready, uid]);

  const completeLesson = useCallback(async (id: string, correct: number, total: number): Promise<number> => {
    if (!ready) throw new Error('Progresso ainda nao carregado');
    if (!lessonIds.includes(id)) throw new Error('Licao nao publicada');
    let earnedXp = 0;
    await updateLocal(key, current => {
      const outcome = applyLessonCompletion(current, id, correct, total, new Date().toISOString());
      earnedXp = outcome.earnedXp;
      return outcome.next;
    });
    if (uid) {
      if (flightRef.current?.key === key) repeatKeyRef.current = key;
      else void syncNowRef.current();
    }
    return earnedXp;
  }, [key, ready, uid, updateLocal, lessonIds]);

  return <ProgressContext.Provider value={{ progress, ready, syncStatus, syncNow, completeLesson }}>
    {children}
  </ProgressContext.Provider>;
}
export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) throw new Error('useProgress deve estar dentro de ProgressProvider');
  return context;
}
