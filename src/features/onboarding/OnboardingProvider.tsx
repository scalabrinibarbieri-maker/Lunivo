import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Storage from 'expo-sqlite/kv-store';
import { activateDailyReminder, undoDailyReminder, type ReminderActivation } from './reminders';
import { makeOnboardingSettings, ONBOARDING_STORAGE_KEY, parseOnboardingSettings,
  type OnboardingSelection, type OnboardingSettings } from './model';

type OnboardingContextValue = {
  ready: boolean;
  completed: boolean;
  settings: OnboardingSettings | null;
  finish: (selection: OnboardingSelection) => Promise<ReminderActivation['reason'] | 'off'>;
};
const Context = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<OnboardingSettings | null>(null);
  const saving = useRef(false);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const raw = await Storage.getItem(ONBOARDING_STORAGE_KEY);
        const parsed = raw ? parseOnboardingSettings(JSON.parse(raw)) : null;
        if (mounted) setSettings(parsed);
      } catch (error) {
        console.warn('Não foi possível restaurar o onboarding Lunivo:', error);
        // Em caso de erro de leitura, acesso continua bloqueado: não liberar sem prova de conclusão.
      } finally { if (mounted) setReady(true); }
    })();
    return () => { mounted = false; };
  }, []);

  const finish = useCallback(async (selection: OnboardingSelection): Promise<ReminderActivation['reason'] | 'off'> => {
    if (!ready || saving.current) throw new Error('A configuração ainda está sendo salva.');
    saving.current = true;
    let notificationId: string | null = null;
    try {
      // Valida tudo antes de solicitar permissão ou criar notificações.
      makeOnboardingSettings(selection, null);
      const reminder = selection.remindersWanted
        ? await activateDailyReminder(selection.hour, selection.minute)
        : { notificationId: null, reason: 'off' as const };
      notificationId = reminder.notificationId;
      const next = makeOnboardingSettings(selection, notificationId);
      // Persistir primeiro: só libera as demais rotas depois da escrita ser confirmada.
      await Storage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(next));
      setSettings(next);
      return reminder.reason;
    } catch (error) {
      if (notificationId) await undoDailyReminder(notificationId);
      throw error;
    } finally { saving.current = false; }
  }, [ready]);

  const value = useMemo<OnboardingContextValue>(() => ({
    ready, completed: settings?.completed === true, settings, finish,
  }), [ready, settings, finish]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const value = useContext(Context);
  if (!value) throw new Error('useOnboarding exige OnboardingProvider');
  return value;
}
