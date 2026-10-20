import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseXpAwards, parseLegacyXp } from '../src/xp.ts';
const known = new Set(['it-a1-01','it-a1-02','it-a1-03','it-a1-04']);
test('servidor aceita XP por licao dentro do limite',()=>{
  assert.deepEqual(parseXpAwards({awards:[{lessonId:'it-a1-01',xp:80}]},known), [{lessonId:'it-a1-01',xp:80}]);
  assert.deepEqual(parseXpAwards({awards:[]},known),[]);
});
test('servidor recusa XP arbitrario, duplicado ou de licao desconhecida',()=>{
  for(const awards of [[{lessonId:'it-a1-01',xp:9999}], [{lessonId:'it-a1-02',xp:50}],
    [{lessonId:'it-a1-04',xp:301}], [{lessonId:'it-a1-99',xp:10}],
    [{lessonId:'it-a1-01',xp:20},{lessonId:'it-a1-01',xp:30}]]){
    assert.throws(()=>parseXpAwards({awards},known));
  }
});
test('importacao historica tem formato restrito e limite global',()=>{
  assert.equal(parseLegacyXp({totalXp:50}),50);
  for(const v of [0,-10,33,600010,'100',null])assert.throws(()=>parseLegacyXp({totalXp:v}));
  assert.throws(()=>parseLegacyXp({totalXp:50,other:true}));
});
