import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRemoteProgress, planProgressSync } from '../src/features/progress/syncLogic.ts';
const known = ['it-a1-01','it-a1-02','it-a1-03'];
test('restaura licoes de outro celular preservando os IDs',()=>{
  assert.deepEqual(planProgressSync([],['it-a1-01','it-a1-02'],known),{
    uploadIds:['it-a1-01','it-a1-02'],mergedLocalIds:['it-a1-01','it-a1-02'],needsUpload:false,
  });
});
test('envia somente novos IDs locais',()=>{
  assert.deepEqual(planProgressSync(['it-a1-03'],['it-a1-01'],known),{
    uploadIds:['it-a1-01','it-a1-03'],mergedLocalIds:['it-a1-01','it-a1-03'],needsUpload:true,
  });
});
test('preserva IDs locais futuros',()=>{
  assert.deepEqual(planProgressSync(['it-a1-01','future-01'],[],known),{
    uploadIds:['it-a1-01'],mergedLocalIds:['it-a1-01','future-01'],needsUpload:true,
  });
});
test('uniao ordenada sem duplicatas',()=>{
  assert.deepEqual(planProgressSync(['it-a1-03','it-a1-03','it-a1-01'],['it-a1-02'],known).uploadIds,known);
});
test('rejeita respostas invalidas e aceita XP da nuvem',()=>{
  for(const body of [null, {}, [], {completedLessonIds:'a',totalXp:0,legacyXpImported:false},
    {completedLessonIds:[2],totalXp:0,legacyXpImported:false}, {completedLessonIds:[],totalXp:-1,legacyXpImported:false},
    {completedLessonIds:[],totalXp:10}])assert.throws(()=>parseRemoteProgress(body));
  assert.deepEqual(parseRemoteProgress({completedLessonIds:['it-a1-01'],totalXp:50,legacyXpImported:true}),
    {completedLessonIds:['it-a1-01'],totalXp:50,legacyXpImported:true});
});
