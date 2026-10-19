import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyLessonCompletion, canStartLesson, EMPTY_PROGRESS, isStudentProgress } from '../src/features/progress/logic.ts';
const ids = ['it-a1-01','it-a1-02','it-a1-03'];
test('somente a primeira lição fica desbloqueada no começo',()=>{
  assert.equal(canStartLesson(ids[0], ids, EMPTY_PROGRESS), true);
  assert.equal(canStartLesson(ids[1], ids, EMPTY_PROGRESS), false);
  assert.equal(canStartLesson('não-existe', ids, EMPTY_PROGRESS), false);
});
test('completar salva progresso e desbloqueia próxima lição',()=>{
  const { next, earnedXp } = applyLessonCompletion(EMPTY_PROGRESS, ids[0], 5, 6, '2026-10-19T12:00:00.000Z');
  assert.equal(earnedXp,50); assert.equal(next.totalXp,50);
  assert.equal(canStartLesson(ids[1], ids, next), true);
});
test('repetição não duplica XP',()=>{
  const first = applyLessonCompletion(EMPTY_PROGRESS, ids[0], 5, 6, '2026-10-19T12:00:00.000Z');
  const second = applyLessonCompletion(first.next, ids[0], 6, 6, '2026-10-19T14:00:00.000Z');
  assert.equal(second.earnedXp, 0); assert.deepEqual(first.next, second.next);
});
test('rejeita resultado impossível e estado corrompido',()=>{
  assert.throws(()=>applyLessonCompletion(EMPTY_PROGRESS, ids[0], 7, 6, 'x'));
  assert.equal(isStudentProgress({ completedLessonIds:'x',totalXp:-1,lastStudiedAt:null }), false);
  assert.equal(isStudentProgress(EMPTY_PROGRESS), true);
});
