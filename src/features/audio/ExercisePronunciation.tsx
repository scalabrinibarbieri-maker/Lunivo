import { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { colors } from '../../constants/theme';
import { AUDIO_CATALOG, clipForExercise, type AudioClipId } from './catalog';
import { SEED_AUDIO_ASSETS } from './sources';
import {
  cloudClipForExercise, readCachedAudioManifest, refreshAudioManifest,
  type CloudAudioClip,
} from './remoteCatalog';
import { prepareCloudAudio, savedAudioUri } from './remoteCache';

function PlaybackButtons({ text, source }: { text: string; source: number | string }) {
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);
  const [error, setError] = useState(false);
  const replay = async (speed: number) => {
    if (!status.isLoaded) return;
    try {
      setError(false);
      player.setPlaybackRate(speed);
      await player.seekTo(0);
      player.play();
    } catch (err) {
      console.warn('Falha ao reproduzir pronúncia:', err);
      setError(true);
    }
  };
  return <View style={styles.container}>
    <Text style={styles.label}>OUÇA A PRONÚNCIA</Text>
    <View style={styles.controls}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Ouvir ${text} na velocidade normal`}
        disabled={!status.isLoaded} onPress={() => { void replay(1); }}
        style={({ pressed }) => [styles.primary, pressed && styles.pressed, !status.isLoaded && styles.waiting]}>
        <Text style={styles.primaryText}>🔊  Ouvir</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Ouvir ${text} mais devagar`}
        disabled={!status.isLoaded} onPress={() => { void replay(0.8); }}
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed, !status.isLoaded && styles.waiting]}>
        <Text style={styles.secondaryText}>0,8×  Devagar</Text>
      </Pressable>
    </View>
    {(error || !!status.error) && <Text style={styles.error}>Não foi possível tocar. Tente novamente.</Text>}
  </View>;
}

function CloudAudioControls({ clip }: { clip: CloudAudioClip }) {
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        // Prioridade ao arquivo já baixado, inclusive quando estiver offline.
        const localUri = await savedAudioUri(clip);
        if (localUri) {
          if (mounted) { setUri(localUri); setLoading(false); setError(false); }
          return;
        }
        if (mounted) setLoading(true);
        const downloaded = await prepareCloudAudio(clip);
        if (mounted) { setUri(downloaded); setError(false); }
      } catch (err) {
        console.warn('Não foi possível baixar o áudio do R2:', err);
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [clip.id, clip.storageKey, clip.sizeBytes]);

  if (uri) return <PlaybackButtons text={clip.text} source={uri} />;
  return <View style={styles.container}>
    <Text style={styles.label}>OUÇA A PRONÚNCIA</Text>
    <Pressable accessibilityRole="button" disabled={loading}
      onPress={() => { setError(false); setLoading(true); void prepareCloudAudio(clip).then(setUri).catch(() => setError(true)).finally(() => setLoading(false)); }}
      style={[styles.secondary, { minHeight: 49 }, loading && styles.waiting]}>
      <Text style={styles.secondaryText}>{loading ? 'Preparando áudio…' : 'Tentar baixar áudio novamente'}</Text>
    </Pressable>
    {error && <Text style={styles.error}>Áudio ainda não disponível offline. Conecte-se à internet para baixá-lo.</Text>}
  </View>;
}

/** Ciao e Buongiorno: assets nativos; todos os outros: manifesto e R2. */
export function ExercisePronunciation({ exerciseId }: { exerciseId: string }) {
  const seedId: AudioClipId | null = clipForExercise(exerciseId);
  const [remoteClip, setRemoteClip] = useState<CloudAudioClip | null>(null);
  useEffect(() => {
    if (seedId) return;
    let mounted = true;
    const setFromManifest = (manifest: Awaited<ReturnType<typeof readCachedAudioManifest>>) => {
      if (mounted) setRemoteClip(cloudClipForExercise(manifest, exerciseId));
    };
    const load = () => {
      void readCachedAudioManifest().then(setFromManifest);
      void refreshAudioManifest().then(setFromManifest);
    };
    load();
    const listener = AppState.addEventListener('change', s => { if (s === 'active') load(); });
    return () => { mounted = false; listener.remove(); };
  }, [exerciseId, seedId]);

  if (seedId) {
    return <PlaybackButtons key={seedId} text={AUDIO_CATALOG[seedId].text} source={SEED_AUDIO_ASSETS[seedId]} />;
  }
  return remoteClip ? <CloudAudioControls key={remoteClip.id} clip={remoteClip} /> : null;
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
