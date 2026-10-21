import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { validClock } from './model';

const STUDY_CHANNEL = 'lunivo-estudo-diario';
const STUDY_NOTIFICATION_ID = 'lunivo-estudo-diario-v7';

// Notificações locais também devem aparecer enquanto o aplicativo está aberto.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type ReminderActivation = {
  notificationId: string | null;
  reason: 'active' | 'denied' | 'failed';
};

/** Só agenda quando o aluno explicitamente escolhe Sim e confirma o curso. */
export async function activateDailyReminder(hour: number, minute: number): Promise<ReminderActivation> {
  if (!validClock(hour, minute)) throw new Error('Horário inválido para lembrete');
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(STUDY_CHANNEL, {
        name: 'Estudo diário Lunivo',
        description: 'Seu lembrete diário para estudar idiomas',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 150, 250],
      });
    }
    const current = await Notifications.getPermissionsAsync();
    const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
    if (!permission.granted) return { notificationId: null, reason: 'denied' };

    // Identificador fixo evita acumular lembretes após tentativas interrompidas.
    await Notifications.cancelScheduledNotificationAsync(STUDY_NOTIFICATION_ID).catch(() => {});
    const notificationId = await Notifications.scheduleNotificationAsync({
      identifier: STUDY_NOTIFICATION_ID,
      content: {
        title: 'Seu momento de evoluir ✦',
        body: 'Uma pequena lição hoje aproxima você do seu objetivo. Vamos estudar italiano?',
        sound: 'default',
        data: { destination: 'home', course: 'it' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        ...(Platform.OS === 'android' ? { channelId: STUDY_CHANNEL } : {}),
      },
    });
    return { notificationId, reason: 'active' };
  } catch (error) {
    console.warn('Lembrete diário Lunivo indisponível:', error instanceof Error ? error.message : 'erro');
    return { notificationId: null, reason: 'failed' };
  }
}

export async function undoDailyReminder(notificationId: string): Promise<void> {
  try { await Notifications.cancelScheduledNotificationAsync(notificationId); }
  catch (error) { console.warn('Não foi possível cancelar lembrete provisório:', error); }
}
