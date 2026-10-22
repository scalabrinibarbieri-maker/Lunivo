import { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { colors } from '../../constants/theme';
import { AUDIO_CATALOG, clipForExercise, type AudioClipId } from './catalog';
import { SEED_AUDIO_ASSETS } from './sources';
import { cloudClipForExercise, readCachedAudioManifest, refreshAudioManifest, type CloudAudioClip } from './remoteCatalog';
import { prepareCloudAudio, savedAudioUri } from './remoteCache';

/**
 * onReadyChange informa disponibilidade real, sem oscilar ao repetir o áudio.
 * onUnavailableChange só vira true diante de erro confirmado.
 */
type AudioCallbacks = {
  onReadyChange?: (ready: boolean) => void;
  onUnavailableChange?: (unavailable: boolean) => void;
};

function PlaybackButtons({ text, source, concealText, onReadyChange, onUnavailableChange }: {
  text: string; source: number | string;
  concealText: boolean;
} & AudioCallbacks) {
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);
  const [playbackError, setPlaybackError] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  // expo-audio pode sinalizar isLoaded=false por um instante durante seekTo(0).
  // Depois da primeira carga bem-sucedida, não revogamos o estado apenas por
  // essa oscilação — uma falha verdadeira é indicada por status.error/catch.
  useEffect(() => {
    if (status.isLoaded) setLoadedOnce(true);
  }, [status.isLoaded]);

  const failed = playbackError || Boolean(status.error);
  useEffect(() => {
    onReadyChange?.(loadedOnce && !failed);
  }, [loadedOnce, failed, onReadyChange]);
  useEffect(() => {
    onUnavailableChange?.(failed);
  }, [failed, onUnavailableChange]);

  const replay = async (speed: number) => {
    if (!loadedOnce || !status.isLoaded) return;
    try {
      setPlaybackError(false);
      player.setPlaybackRate(speed);
      await player.seekTo(0);
      player.play();
    } catch (err) {
      console.warn('Falha ao reproduzir pronúncia:', err);
      setPlaybackError(true);
    }
  };

  const label = concealText ? 'a gravação' : text;
  return <View style={styles.container}>
    <Text style={styles.label}>{concealText ? 'ESCUTE COM ATENÇÃO' : 'OUÇA A PRONÚNCIA'}</Text>
    <View style={styles.controls}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Ouvir ${label} na velocidade normal`}
        disabled={!loadedOnce} onPress={() => { void replay(1); }}
        style={({ pressed }) => [styles.primary, pressed && styles.pressed, !loadedOnce && styles.waiting]}>
        <Text style={styles.primaryText}>🔊  Ouvir</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Ouvir ${label} mais devagar`}
        disabled={!loadedOnce} onPress={() => { void replay(0.8); }}
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed, !loadedOnce && styles.waiting]}>
        <Text style={styles.secondaryText}>0,8×  Devagar</Text>
      </Pressable>
    </View>
    {failed && <Text style={styles.error}>Não foi possível tocar. Tente novamente.</Text>}
  </View>;
}

function CloudAudioControls({ clip, concealText, onReadyChange, onUnavailableChange }: {
  clip: CloudAudioClip;
  concealText: boolean;
} & AudioCallbacks) {
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
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

  useEffect(() => {
    onUnavailableChange?.(error);
  }, [error, onUnavailableChange]);

  if (uri) return <PlaybackButtons text={clip.text} source={uri} concealText={concealText}
    onReadyChange={onReadyChange} onUnavailableChange={onUnavailableChange} />;

  return <View style={styles.container}>
    <Text style={styles.label}>ESCUTE A PRONÚNCIA</Text>
    <Pressable accessibilityRole="button" disabled={loading}
      onPress={() => {
        setError(false);
        setLoading(true);
        void prepareCloudAudio(clip).then(downloaded => { setUri(downloaded); setError(false); })
          .catch(() => setError(true)).finally(() => setLoading(false));
      }}
      style={[styles.secondary, { minHeight: 49 }, loading && styles.waiting]}>
      <Text style={styles.secondaryText}>{loading ? 'Preparando áudio…' : 'Tentar baixar áudio novamente'}</Text>
    </Pressable>
    {error && <Text style={styles.error}>Não foi possível baixar a gravação. Verifique sua conexão.</Text>}
  </View>;
}

/** IDs com escuta podem apontar para gravações já incluídas no APK. */
export function ExercisePronunciation({ exerciseId, concealText = false, onReadyChange, onUnavailableChange }: {
  exerciseId: string;
  concealText?: boolean;
} & AudioCallbacks) {
  const seedId: AudioClipId | null = clipForExercise(exerciseId);
  const [remoteClip, setRemoteClip] = useState<CloudAudioClip | null>(null);

  useEffect(() => {
    if (seedId) return;
    let mounted = true;
    const load = async () => {
      try {
        const cached = await readCachedAudioManifest();
        if (!mounted) return;
        const savedClip = cloudClipForExercise(cached, exerciseId);
        if (savedClip) { setRemoteClip(savedClip); onUnavailableChange?.(false); }
        const fresh = await refreshAudioManifest();
        if (!mounted) return;
        const current = cloudClipForExercise(fresh, exerciseId) ?? savedClip;
        setRemoteClip(current);
        // Manifestações sem gravação após consulta: falha real, não um blink.
        onUnavailableChange?.(!current);
      } catch (err) {
        if (mounted) {
          console.warn('Manifesto de áudio indisponível:', err);
          onUnavailableChange?.(true);
        }
      }
    };
    void load();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void load(); });
    return () => { mounted = false; listener.remove(); };
  }, [exerciseId, seedId, onUnavailableChange]);

  if (seedId) return <PlaybackButtons key={seedId} text={AUDIO_CATALOG[seedId].text}
    source={SEED_AUDIO_ASSETS[seedId]} concealText={concealText}
    onReadyChange={onReadyChange} onUnavailableChange={onUnavailableChange} />;
  return remoteClip ? <CloudAudioControls key={remoteClip.id} clip={remoteClip}
    concealText={concealText} onReadyChange={onReadyChange} onUnavailableChange={onUnavailableChange} /> : null;
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
  pressed: { opacity: 0.75 }, waiting: { opacity: 0.55 },
  error: { color: colors.red, fontSize: 12, marginTop: 9 },
});
