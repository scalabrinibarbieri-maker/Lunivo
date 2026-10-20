import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { colors } from '../../constants/theme';
import { AUDIO_CATALOG, clipForExercise, type AudioClipId } from './catalog';
import { SEED_AUDIO_ASSETS } from './sources';

function ClipControls({ clipId }: { clipId: AudioClipId }) {
  const clip = AUDIO_CATALOG[clipId];
  // Um player por exercício; o hook libera recursos ao desmontar o componente.
  const player = useAudioPlayer(SEED_AUDIO_ASSETS[clipId]);
  const status = useAudioPlayerStatus(player);
  const [error, setError] = useState(false);

  const replay = async (speed: number) => {
    if (!status.isLoaded) return;
    try {
      setError(false);
      player.setPlaybackRate(speed);
      await player.seekTo(0);
      player.play();
    } catch (e) {
      console.warn('Não foi possível reproduzir o áudio de pronúncia:', e);
      setError(true);
    }
  };

  return <View style={styles.container}>
    <Text style={styles.label}>OUÇA A PRONÚNCIA</Text>
    <View style={styles.controls}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ouvir ${clip.text} na velocidade normal`}
        disabled={!status.isLoaded}
        onPress={() => { void replay(1); }}
        style={({ pressed }) => [styles.primary, pressed && styles.pressed, !status.isLoaded && styles.waiting]}>
        <Text style={styles.primaryText}>🔊  Ouvir</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ouvir ${clip.text} mais devagar`}
        disabled={!status.isLoaded}
        onPress={() => { void replay(0.8); }}
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed, !status.isLoaded && styles.waiting]}>
        <Text style={styles.secondaryText}>0,8×  Devagar</Text>
      </Pressable>
    </View>
    {(error || !!status.error) && <Text style={styles.error}>Não foi possível tocar. Tente novamente.</Text>}
  </View>;
}

/** Não mostra botão em exercícios que ainda não possuem gravação revisada. */
export function ExercisePronunciation({ exerciseId }: { exerciseId: string }) {
  const clipId = clipForExercise(exerciseId);
  return clipId ? <ClipControls key={clipId} clipId={clipId} /> : null;
}

const styles = StyleSheet.create({
  container: { marginTop: 24, marginBottom: 2 },
  label: { fontSize: 11, fontWeight: '900', letterSpacing: 1.25, color: colors.muted, marginBottom: 11 },
  controls: { flexDirection: 'row', gap: 10 },
  primary: { backgroundColor: colors.primary, borderRadius: 15, minHeight: 51, paddingHorizontal: 17,
    alignItems: 'center', justifyContent: 'center', flex: 1 },
  primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  secondary: { backgroundColor: colors.primarySoft, borderRadius: 15, minHeight: 51, paddingHorizontal: 13,
    alignItems: 'center', justifyContent: 'center', flex: 1 },
  secondaryText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  pressed: { opacity: 0.75 },
  waiting: { opacity: 0.55 },
  error: { color: colors.red, fontSize: 12, marginTop: 9 },
});
