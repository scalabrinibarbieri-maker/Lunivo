import type { AudioClipId } from './catalog';

/**
 * Arquivos mínimos incluídos no aplicativo: funcionam mesmo sem internet.
 * Metro requer require() de caminhos LITERAIS. Não construir caminhos em runtime.
 * Quando ativarmos R2, o resolvedor consultará o download persistido antes deste fallback.
 */
export const SEED_AUDIO_ASSETS: Readonly<Record<AudioClipId, number>> = {
  'it-a1-ciao-v1': require('../../../assets/audio/it-IT/it-a1-ciao-v1.mp3'),
  'it-a1-buongiorno-v1': require('../../../assets/audio/it-IT/it-a1-buongiorno-v1.mp3'),
};
