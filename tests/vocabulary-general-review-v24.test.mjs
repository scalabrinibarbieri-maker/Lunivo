import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { daysWithoutPractice, shouldOfferReview, generalReviewWords } from '../src/features/vocabulary/generalReview.ts';
import { makeVocabularyWord, applyVocabularyReview } from '../src/features/vocabulary/logic.ts';
import { isStudentProgress, applyLessonCompletion } from '../src/features/progress/logic.ts';
const origin = new Date(2026, 9, 22, 13, 0, 0);
const localDay = (delta) => { const d=new Date(origin);d.setDate(d.getDate()+delta);return d; };
const progress = {completedLessonIds:['it-a1-01'],totalXp:10,lastStudiedAt:new Date(2026,9,18,11).toISOString(),studyDays:['2026-10-18']};
const lesson1 = {id:'it-a1-01',title:'Primeiras palavras',subtitle:'Saudações',unit:1, exercises:[
 {type:'choice',id:'q01',prompt:'Ciao!',instruction:'Escolha a tradução',options:[{id:'a',label:'Olá'}],correctOptionId:'a',explanation:''},
 {type:'write',id:'q03',prompt:'Grazie',instruction:'Escreva em português',acceptedAnswers:['Obrigado'],sampleAnswer:'Obrigado',explanation:''}
]};
const lesson2 = {id:'it-a1-02',title:'Como você está?',subtitle:'Perguntas',unit:1,exercises:[
 {type:'choice',id:'q07',prompt:'Come stai?',instruction:'Escolha a tradução',options:[{id:'a',label:'Como você está?'}],correctOptionId:'a',explanation:''}
]};

test('sugere revisão após três dias de calendário, não antes',()=>{
 assert.equal(daysWithoutPractice(progress,localDay(-2)),2);
 assert.equal(shouldOfferReview(progress,localDay(-2)),false);
 assert.equal(daysWithoutPractice(progress,localDay(-1)),3);
 assert.equal(shouldOfferReview(progress,localDay(-1)),true);
});
test('revisão registrada hoje faz a sugestão desaparecer sem alterar streak',()=>{
 const old={...progress,lastVocabularyReviewedAt:new Date(2026,9,21,16).toISOString()};
 assert.equal(daysWithoutPractice(old,localDay(0)),1);
 assert.equal(shouldOfferReview(old,localDay(0)),false);
 assert.equal(daysWithoutPractice({...old,lastVocabularyReviewedAt:new Date(2026,9,22,10).toISOString()},localDay(0)),0);
});
test('progresso sem data não gera aviso inventado',()=>{
 assert.equal(daysWithoutPractice({lastStudiedAt:null,studyDays:[]},localDay(0)),null);
 assert.equal(shouldOfferReview({lastStudiedAt:null,studyDays:[]},localDay(0)),false);
});
test('a revisão geral utiliza apenas lições concluídas, sem inventar domínio das palavras',()=>{
 const words=generalReviewWords(['it-a1-01'],[lesson1,lesson2],{},origin);
 assert.deepEqual(words.map(x=>x.term),['Ciao','Grazie']);
 assert.equal(words.find(x=>x.term==='Come stai?'),undefined);
});
test('recupera lista em aparelho novo com progresso sincronizado e histórico vazio',()=>{
 const recovered=generalReviewWords(['it-a1-01','it-a1-02'],[lesson1,lesson2],{},origin);
 assert.deepEqual(recovered.map(w=>w.term),['Ciao','Grazie','Come stai?']);
 const learned=applyVocabularyReview({},[recovered[0]],false,origin.toISOString());
 assert.equal(learned[recovered[0].id].lastWasCorrect,false);
 assert.equal(learned[recovered[0].id].attempts,1);
});
test('prioriza palavras sem histórico e palavras fracas; elimina duplicatas entre exercícios',()=>{
 const ciao=makeVocabularyWord('Ciao','Olá / Tchau');
 const learned=applyVocabularyReview({},[ciao],true,origin.toISOString());
 const result=generalReviewWords(['it-a1-01'],[lesson1,{...lesson1,exercises:[...lesson1.exercises,lesson1.exercises[0]]}],learned,origin);
 assert.deepEqual(result.map(x=>x.term),['Grazie','Ciao']);
 assert.equal(result.length,2);
});
test('progresso legado e revisão opcional são válidos, XP e streak não se perdem',()=>{
 assert.ok(isStudentProgress(progress));
 const withReview={...progress,lastVocabularyReviewedAt:'2026-10-22T15:00:00.000Z'};
 assert.ok(isStudentProgress(withReview));
 assert.ok(!isStudentProgress({...withReview,lastVocabularyReviewedAt:'broken'}));
 const result=applyLessonCompletion(withReview,'it-a1-01',1,1,'2026-10-22T16:00:00Z','2026-10-22');
 assert.equal(result.next.lastVocabularyReviewedAt,withReview.lastVocabularyReviewedAt);
 assert.equal(result.next.totalXp,10);
});
test('interface não mostra avisos técnicos de versão, migração ou Cloudflare',()=>{
 const panel=readFileSync(new URL('../src/components/VocabularyPanel.tsx',import.meta.url),'utf8');
 const profile=readFileSync(new URL('../src/app/profile.tsx',import.meta.url),'utf8');
 for(const text of [panel,profile]) {
   assert.doesNotMatch(text,/antes desta atualização|será adicionada separadamente|Cloudflare D1|Conta Firebase/);
 }
 assert.match(panel,/Começar revisão geral/);
 assert.match(panel,/REVISÃO GERAL/);
});
test('revisão manual atualiza data, mas revisão em lição não marca retorno',()=>{
 const src=readFileSync(new URL('../src/features/progress/ProgressProvider.tsx',import.meta.url),'utf8');
 assert.match(src,/source === 'review'/);
 assert.match(src,/lastVocabularyReviewedAt: now/);
 const profile=readFileSync(new URL('../src/app/profile.tsx',import.meta.url),'utf8');
 assert.match(profile,/recordVocabulary\(words, correct, 'review'\)/);
});
