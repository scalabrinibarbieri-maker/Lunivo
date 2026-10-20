import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Storage from 'expo-sqlite/kv-store';
import { useAuth } from '../auth/AuthProvider';
import { applyLessonCompletion, EMPTY_PROGRESS, isStudentProgress, type StudentProgress } from './logic';

import { progressKeyForUid } from './keys';

type ProgressContextType = {
  progress: StudentProgress;
  ready: boolean;
  completeLesson: (id: string, correct: number, total: number) => Promise<number>;
};
const ProgressContext = createContext<ProgressContextType | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const key = progressKeyForUid(user?.uid ?? null);
  const [progress, setProgress] = useState<StudentProgress>(EMPTY_PROGRESS);
  const progressRef = useRef<StudentProgress>(EMPTY_PROGRESS);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const ready = authReady && loadedKey === key;

  useEffect(() => {
    if (!authReady) return;
    let active = true;
    (async () => {
      try {
        const value = await Storage.getItem(key);
        const parsed: unknown = value ? JSON.parse(value) : null;
        const restored = isStudentProgress(parsed) ? parsed : EMPTY_PROGRESS;
        if (active) {
          progressRef.current = restored;
          setProgress(restored);
        }
      } catch (error) {
        console.warn('Falha ao ler o progresso local:', error);
        if (active) {
          progressRef.current = EMPTY_PROGRESS;
          setProgress(EMPTY_PROGRESS);
        }
      } finally {
        if (active) setLoadedKey(key);
      }
    })();
    return () => { active = false; };
  }, [authReady, key]);

  const completeLesson = useCallback(async (id: string, correct: number, total: number): Promise<number> => {
    if (!ready) throw new Error('Progresso ainda nao carregado');
    const { next, earnedXp } = applyLessonCompletion(progressRef.current, id, correct, total, new Date().toISOString());
    if (next !== progressRef.current) {
      await Storage.setItem(key, JSON.stringify(next));
      progressRef.current = next;
      setProgress(next);
    }
    return earnedXp;
  }, [key, ready]);

  return <ProgressContext.Provider value={{ progress, ready, completeLesson }}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) throw new Error('useProgress deve estar dentro de ProgressProvider');
  return context;
}
