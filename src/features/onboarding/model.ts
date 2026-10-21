/** Dados locais do primeiro acesso, separados do XP, da conta e do progresso. */
export const ONBOARDING_STORAGE_KEY = 'lunivo:onboarding:v1';
export const DAILY_GOALS = [5, 10, 15, 20, 30] as const;
export type DailyGoal = (typeof DAILY_GOALS)[number];

export type OnboardingSelection = {
  language: 'it' | null;
  dailyGoalMinutes: DailyGoal | null;
  remindersWanted: boolean | null;
  hour: number;
  minute: number;
};

export type OnboardingSettings = {
  version: 1;
  completed: true;
  language: 'it';
  dailyGoalMinutes: DailyGoal;
  reminders: {
    requested: boolean;
    enabled: boolean;
    hour: number | null;
    minute: number | null;
    notificationId: string | null;
  };
};

export function validClock(hour: number, minute: number): boolean {
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 && Number.isInteger(minute) && minute >= 0 && minute <= 59;
}

export function formatClock(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function makeOnboardingSettings(
  selection: OnboardingSelection,
  notificationId: string | null,
): OnboardingSettings {
  if (selection.language !== 'it' || selection.dailyGoalMinutes === null ||
      !DAILY_GOALS.includes(selection.dailyGoalMinutes) || selection.remindersWanted === null ||
      (selection.remindersWanted && !validClock(selection.hour, selection.minute))) {
    throw new Error('Preencha todas as etapas para iniciar seu curso.');
  }
  const wanted = selection.remindersWanted;
  return {
    version: 1, completed: true, language: 'it', dailyGoalMinutes: selection.dailyGoalMinutes,
    reminders: {
      requested: wanted,
      enabled: wanted && notificationId !== null,
      hour: wanted ? selection.hour : null,
      minute: wanted ? selection.minute : null,
      notificationId: wanted ? notificationId : null,
    },
  };
}

/** Não aceita registros parciais ou danificados como onboarding concluído. */
export function parseOnboardingSettings(raw: unknown): OnboardingSettings | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<OnboardingSettings>;
  if (item.version !== 1 || item.completed !== true || item.language !== 'it' ||
      !DAILY_GOALS.some(goal => goal === item.dailyGoalMinutes)) return null;
  const reminders = item.reminders;
  if (!reminders || typeof reminders !== 'object' ||
      typeof reminders.requested !== 'boolean' || typeof reminders.enabled !== 'boolean') return null;
  if (reminders.requested) {
    if (!validClock(reminders.hour as number, reminders.minute as number)) return null;
  } else if (reminders.hour !== null || reminders.minute !== null || reminders.enabled) return null;
  if (reminders.enabled && (!reminders.requested || typeof reminders.notificationId !== 'string' || !reminders.notificationId)) return null;
  if (!reminders.enabled && reminders.notificationId !== null) return null;
  return item as OnboardingSettings;
}
