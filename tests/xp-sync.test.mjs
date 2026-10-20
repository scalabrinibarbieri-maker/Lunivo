import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyLessonCompletion, EMPTY_PROGRESS, isStudentProgress } from '../src/features/progress/logic.ts';
import { mergeCloudXp, parseRemoteProgress, xpToImport } from '../src/features/progress/syncLogic.ts';

test('migracao: XP de aparelho antigo e preservado separado dos novos pontos', () => {
  const old = { completedLessonIds: ['it-a1-01'], totalXp: 50, lastStudiedAt: null };
  assert.equal(isStudentProgress(old), true);
  assert.equal(xpToImport(old), 50);
  const second = applyLessonCompletion(old, 'it-a1-02', 3, 4, '2026-10-20T12:00:00Z').next;
  assert.equal(second.totalXp, 80);
  assert.equal(xpToImport(second), 50);
  assert.deepEqual(second.pendingXpAwards, [{ lessonId: 'it-a1-02', xp: 30 }]);
});
test('apos sincronizar, pontos da nuvem substituem somente premiacoes confirmadas', () => {
  const initial = { ...EMPTY_PROGRESS, totalXp: 50, pendingXpAwards: [
    {lessonId:'it-a1-02',xp:30}, {lessonId:'it-a1-03',xp:40} ] };
  const confirmed = mergeCloudXp(initial, {
    completedLessonIds:['it-a1-01','it-a1-02'], totalXp:80, legacyXpImported:true,
  }, [{lessonId:'it-a1-02',xp:30}]);
  assert.equal(confirmed.totalXp, 120);
  assert.deepEqual(confirmed.pendingXpAwards, [{lessonId:'it-a1-03',xp:40}]);
  assert.equal(xpToImport(confirmed),0);
});
test('nao gera XP duplicado ao repetir uma licao', () => {
  const first = applyLessonCompletion(EMPTY_PROGRESS,'it-a1-01',4,10,'2026-10-20').next;
  const second = applyLessonCompletion(first,'it-a1-01',10,10,'2026-10-20');
  assert.equal(second.earnedXp,0);
  assert.deepEqual(second.next.pendingXpAwards,[{lessonId:'it-a1-01',xp:40}]);
});
test('resposta da nuvem precisa de totalXp e legacyXpImported validos',()=>{
  const p={completedLessonIds:['it-a1-01'],totalXp:40,legacyXpImported:false};
  assert.deepEqual(parseRemoteProgress(p),p);
  for (const q of [{completedLessonIds:[],totalXp:-1,legacyXpImported:false},
    {completedLessonIds:[],totalXp:1}, {completedLessonIds:'x',totalXp:0,legacyXpImported:false}]) {
    assert.throws(()=>parseRemoteProgress(q));
  }
});
