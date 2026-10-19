import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Storage from 'expo-sqlite/kv-store';
import { applyLessonCompletion, EMPTY_PROGRESS, isStudentProgress, type StudentProgress } from './logic';
const KEY = 'lunivo:progress:v1';
type ProgressContextType = {
  progress: StudentProgress;
  ready: boolean;
  completeLesson: (id: string, correct: number, total: number) => Promise<number>;
};
const ProgressContext = createContext<ProgressContextType | null>(null);
export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<StudentProgress>(EMPTY_PROGRESS);
  const progressRef = useRef<StudentProgress>(EMPTY_PROGRESS);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const value = await Storage.getItem(KEY);
        const parsed: unknown = value ? JSON.parse(value) : null;
        const stored = isStudentProgress(parsed) ? parsed : EMPTY_PROGRESS;
        if (active) { progressRef.current = stored; setProgress(stored); }
      } catch (error) {
        console.warn('Falha na leitura do progresso salvo:', error);
      } finally { if (active) setReady(true); }
    })();
    return () => { active = false; };
  }, []);
  const completeLesson = useCallback(async (id: string, correct: number, total: number): Promise<number> => {
    if (!ready) throw new Error('Progresso ainda não carregado');
    const { next, earnedXp } = applyLessonCompletion(progressRef.current, id, correct, total, new Date().toISOString());
    if (next !== progressRef.current) {
      // Confirma gravação em disco antes de exibir a recompensa.
      await Storage.setItem(KEY, JSON.stringify(next));
      progressRef.current = next;
      setProgress(next);
    }
    return earnedXp;
  }, [ready]);
  return <ProgressContext.Provider value={{ progress, ready, completeLesson }}>{children}</ProgressContext.Provider>;
}
export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) throw new Error('useProgress deve estar dentro de ProgressProvider');
  return context;
}
