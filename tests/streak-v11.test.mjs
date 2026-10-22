import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addStudyDay, computeStreak, daysFromLegacy, isStudyDay, localStudyDay, previousStudyDay } from '../src/features/progress/streak.ts';
import { applyLessonCompletion, EMPTY_PROGRESS, isStudentProgress } from '../src/features/progress/logic.ts';

test('dias locais aceitam ano bissexto e recusam datas inexistentes', () => {
  assert.equal(isStudyDay('2028-02-29'), true);
  assert.equal(isStudyDay('2027-02-29'), false);
  assert.equal(previousStudyDay('2027-01-01'), '2026-12-31');
  assert.equal(previousStudyDay('2028-03-01'), '2028-02-29');
  assert.equal(localStudyDay(new Date(2026,9,21,23,58)), '2026-10-21');
});
test('conta apenas um dia, e ontem conserva streak ativa', () => {
  const days = ['2026-10-18', '2026-10-19', '2026-10-19', '2026-10-20'];
  assert.deepEqual(computeStreak(days, '2026-10-21'), { current: 3, longest: 3, studiedToday: false, lastDay: '2026-10-20' });
  assert.equal(computeStreak(days, '2026-10-22').current, 0);
  assert.equal(computeStreak(addStudyDay(days,'2026-10-21'), '2026-10-21').current, 4);
});
test('repetir aula num novo dia renova streak mas nao XP', () => {
  const a = applyLessonCompletion(EMPTY_PROGRESS,'it-a1-01',2,3,'2026-10-20T15:00:00.000Z','2026-10-20');
  const b = applyLessonCompletion(a.next,'it-a1-01',3,3,'2026-10-21T20:00:00.000Z','2026-10-21');
  assert.equal(b.earnedXp,0);
  assert.equal(b.next.totalXp,20);
  assert.deepEqual(b.next.completedLessonIds,['it-a1-01']);
  assert.equal(computeStreak(b.next.studyDays,'2026-10-21').current,2);
  const c = applyLessonCompletion(b.next,'it-a1-01',1,3,'2026-10-21T22:00:00.000Z','2026-10-21');
  assert.deepEqual(c.next,b.next);
});
test('migracao so recupera um ultimo dia conhecido', () => {
  assert.deepEqual(daysFromLegacy('2026-10-20T12:00:00.000Z', undefined), ['2026-10-20']);
  assert.deepEqual(daysFromLegacy('2026-10-20T12:00:00.000Z', ['2026-10-19']), ['2026-10-19']);
  assert.equal(isStudentProgress({ ...EMPTY_PROGRESS, studyDays:['2026-02-30'] }), false);
});
