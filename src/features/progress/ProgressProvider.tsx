import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import { useAuth } from '../auth/AuthProvider';
import { firebaseAuth } from '../auth/firebase';
import { LESSONS } from '../learning/data';
import { applyLessonCompletion, EMPTY_PROGRESS, isStudentProgress, type StudentProgress } from './logic';
import { progressKeyForUid } from './keys';
import { fetchCloudProgress, uploadCloudProgress } from './syncApi';
import { planProgressSync } from './syncLogic';

const LESSON_IDS = LESSONS.map(lesson => lesson.id);
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
  const uid = user?.uid ?? null;
  const key = progressKeyForUid(uid);
  const keyRef = useRef(key);
  keyRef.current = key;
  const [progress, setProgress] = useState<StudentProgress>(EMPTY_PROGRESS);
  const progressRef = useRef<StudentProgress>(EMPTY_PROGRESS);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('guest');
  const ready = authReady && loadedKey === key;

  // Serializa gravacoes locais para que resposta da nuvem e conclusao de licao
  // nunca sobrescrevam uma a outra. Cada usuario tem sua chave propria.
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
      } catch (error) {
        console.warn('Falha ao ler o progresso local:', error);
        if (active) { progressRef.current = EMPTY_PROGRESS; setProgress(EMPTY_PROGRESS); }
      } finally {
        if (active) setLoadedKey(key);
      }
    })();
    return () => { active = false; };
  }, [authReady, key, uid]);

  const syncNow = useCallback((): Promise<boolean> => {
    if (!ready || !uid || !user || firebaseAuth.currentUser?.uid !== uid) {
      return Promise.resolve(false);
    }
    const existing = flightRef.current;
    if (existing?.key === key) {
      repeatKeyRef.current = key;
      return existing.promise;
    }
    setSyncStatus('syncing');
    const task = (async (): Promise<boolean> => {
      try {
        // O servidor extrai a identidade de um JWT Firebase verificado.
        const remote = await fetchCloudProgress(user);
        await writeTailRef.current;
        if (keyRef.current !== key || firebaseAuth.currentUser?.uid !== uid) return false;

        const plan = planProgressSync(progressRef.current.completedLessonIds, remote, LESSON_IDS);
        // API aceita no maximo 25 IDs por chamada; com as tres licoes da V1 basta uma.
        if (plan.uploadIds.length > 25) throw new Error('CURSO_MAIOR_QUE_LOTE');
        const confirmed = plan.needsUpload ? await uploadCloudProgress(user, plan.uploadIds) : remote;
        if (keyRef.current !== key || firebaseAuth.currentUser?.uid !== uid) return false;

        // A fusao usa SEMPRE o estado mais recente, inclusive se uma licao
        // terminou enquanto o servidor respondia. XP local nao e alterado.
        await updateLocal(key, current => {
          const merged = planProgressSync(current.completedLessonIds, confirmed, LESSON_IDS).mergedLocalIds;
          if (merged.length === current.completedLessonIds.length &&
              merged.every((id, i) => id === current.completedLessonIds[i])) return current;
          return { ...current, completedLessonIds: merged };
        });
        if (keyRef.current === key) setSyncStatus('synced');
        return true;
      } catch (error) {
        console.warn('Sincronizacao indisponivel; progresso permanece no celular:',
          error instanceof Error ? error.message : 'erro');
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
  }, [key, ready, uid, updateLocal, user]);
  syncNowRef.current = syncNow;

  // Ao fazer login, reconciliar progresso local dessa conta com o D1.
  useEffect(() => {
    if (ready && uid) void syncNow();
  }, [ready, uid, syncNow]);

  // Tentar novamente ao voltar para o aplicativo (inclusive depois de estudar offline).
  useEffect(() => {
    if (!ready || !uid) return;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void syncNowRef.current();
    });
    return () => subscription.remove();
  }, [ready, uid]);

  const completeLesson = useCallback(async (id: string, correct: number, total: number): Promise<number> => {
    if (!ready) throw new Error('Progresso ainda nao carregado');
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
  }, [key, ready, uid, updateLocal]);

  return <ProgressContext.Provider value={{ progress, ready, syncStatus, syncNow, completeLesson }}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) throw new Error('useProgress deve estar dentro de ProgressProvider');
  return context;
}
