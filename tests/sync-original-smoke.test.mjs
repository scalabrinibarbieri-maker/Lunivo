import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseRemoteProgress,planProgressSync,mergeCloudXp,xpToImport} from '../src/features/progress/syncLogic.ts';
import {applyLessonCompletion,EMPTY_PROGRESS} from '../src/features/progress/logic.ts';
test('contrato XP cloud antigo continua igual',()=>{
const p={completedLessonIds:['it-a1-01'],totalXp:40,legacyXpImported:false};
assert.deepEqual(parseRemoteProgress(p),p);
assert.deepEqual(parseRemoteProgress({...p,studyDays:['2026-10-20']}),{...p,studyDays:['2026-10-20']});
assert.deepEqual(planProgressSync(['it-a1-01'],['it-a1-02'],['it-a1-01','it-a1-02']).mergedLocalIds,['it-a1-01','it-a1-02']);
assert.equal(applyLessonCompletion(EMPTY_PROGRESS,'it-a1-01',4,5,'2026-10-20').earnedXp,40);
});
