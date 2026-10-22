import { useCallback } from 'react';
import { useAudioPlayer } from 'expo-audio';

/** Efeitos originais curtos incluídos no APK: não requer rede, permissão ou nova biblioteca. */
export function useFeedbackSounds() {
  const successPlayer = useAudioPlayer(require('../../../assets/sfx/correct.wav'));
  const errorPlayer = useAudioPlayer(require('../../../assets/sfx/incorrect.wav'));

  const playFeedback = useCallback((correct: boolean) => {
    const player = correct ? successPlayer : errorPlayer;
    // Mesmo em respostas consecutivas, começa o som do início. Áudio é secundário:
    // falhas de reprodução nunca impedem correção, avanço, pontuação ou offline.
    void player.seekTo(0).then(() => player.play()).catch(error => {
      console.warn('Lunivo: efeito de correção indisponível:', error);
    });
  }, [successPlayer, errorPlayer]);

  return playFeedback;
}
