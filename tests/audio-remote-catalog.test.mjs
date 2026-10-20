import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCloudAudioManifest, cloudClipForExercise } from '../src/features/audio/manifestLogic.ts';

const valid = { id:'it-a1-grazie-v1', exerciseId:'q03', text:'Grazie', locale:'it-IT',
  storageKey:'it-IT/a1/it-a1-grazie-v1.mp3', sizeBytes:11000 };
test('parseia manifesto vazio e seleciona a gravação por exercício', () => {
  assert.deepEqual(parseCloudAudioManifest({version:1,clips:[]}),{version:1,clips:[]});
  const m = parseCloudAudioManifest({version:1,clips:[valid]});
  assert.deepEqual(cloudClipForExercise(m,'q03'),valid);
  assert.equal(cloudClipForExercise(m,'q99'),null);
});
test('recusa caminhos arbitrários, ficheiros fora do padrão e pares inconsistentes', () => {
  for (const storageKey of ['/etc/passwd','../ciao.mp3','it-IT/a1/other.mp3','https://host/grazie.mp3']) {
    assert.throws(() => parseCloudAudioManifest({version:1,clips:[{...valid,storageKey}]}),/AUDIO_INVALIDO/);
  }
});
test('não permite modificar q01/q02 nem duplicar exercícios', () => {
  for (const exerciseId of ['q01','q02']) {
    assert.throws(() => parseCloudAudioManifest({version:1,clips:[{...valid,exerciseId}]}),/AUDIO_INVALIDO/);
  }
  assert.throws(() => parseCloudAudioManifest({version:1,clips:[valid,{...valid,id:'outro-id',storageKey:'it-IT/a1/outro-id.mp3'}]}), /AUDIO_INVALIDO/);
});
test('não aceita catálogo inválido, arquivo vazio ou maior que 2 MiB', () => {
  for (const m of [{version:2,clips:[]}, {version:1,clips:[{...valid,sizeBytes:0}]},
    {version:1,clips:[{...valid,sizeBytes:3*1024*1024}]}]) {
    assert.throws(() => parseCloudAudioManifest(m));
  }
});
