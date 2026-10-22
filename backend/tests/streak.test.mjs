import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_DAYS_PER_SYNC, parseStudyDays } from '../src/streak.ts';
test('aceita datas reais e dias independentes da ordem', () => {
  assert.deepEqual(parseStudyDays({studyDays:['2026-10-21','2026-10-20']}, new Date('2026-10-21T21:00:00Z')), ['2026-10-21','2026-10-20']);
  assert.equal(MAX_DAYS_PER_SYNC,60);
});
test('recusa datas impossiveis, repetidas, futuras e arbitrarias', () => {
  for(const days of [['2026-02-30'], ['2026-10-22','2026-10-22'], ['2030-01-01'],['2020-01-01'], ['hello']]) {
    assert.throws(()=>parseStudyDays({studyDays:days}, new Date('2026-10-21T21:00:00Z')));
  }
  assert.throws(()=>parseStudyDays({studyDays:[],userId:'outra-conta'}, new Date()));
});
