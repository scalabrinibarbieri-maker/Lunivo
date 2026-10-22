import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyVocabularyReview, isVocabularyMemory, makeVocabularyWord, strengthOf, vocabularyStats, wordsForExercise } from '../src/features/vocabulary/logic.ts';
const day = (offset) => new Date(Date.parse('2026-10-01T12:00:00Z') + offset * 86400000);
const ciao = makeVocabularyWord('Ciao', 'Olá / Tchau');

test('palavra nova correta começa forte e envelhece para média e fraca', () => {
  const memory = applyVocabularyReview({}, [ciao], true, day(0).toISOString());
  assert.equal(strengthOf(memory[ciao.id], day(0)), 'strong');
  assert.equal(strengthOf(memory[ciao.id], day(3)), 'medium');
  assert.equal(strengthOf(memory[ciao.id], day(7)), 'weak');
});

test('revisão correta restaura forte e alonga intervalo de retenção', () => {
  const first = applyVocabularyReview({}, [ciao], true, day(0).toISOString());
  const revived = applyVocabularyReview(first, [ciao], true, day(7).toISOString());
  assert.equal(revived[ciao.id].intervalDays, 7);
  assert.equal(strengthOf(revived[ciao.id], day(7)), 'strong');
  assert.equal(strengthOf(revived[ciao.id], day(11)), 'strong');
});

test('erro imediatamente enfraquece termo, mesmo que estudado agora', () => {
  const first = applyVocabularyReview({}, [ciao], true, day(0).toISOString());
  const wrong = applyVocabularyReview(first, [ciao], false, day(0).toISOString());
  assert.equal(strengthOf(wrong[ciao.id], day(0)), 'weak');
  const recovered = applyVocabularyReview(wrong, [ciao], true, day(1).toISOString());
  assert.equal(strengthOf(recovered[ciao.id], day(1)), 'strong');
  assert.equal(recovered[ciao.id].attempts, 3);
  assert.equal(recovered[ciao.id].correctReviews, 2);
});

test('repetir termo na lição não cria entradas duplicadas', () => {
  let memory = applyVocabularyReview({}, [ciao], true, day(0).toISOString());
  memory = applyVocabularyReview(memory, [ciao], true, day(1).toISOString());
  assert.equal(Object.keys(memory).length, 1);
  assert.equal(vocabularyStats(memory, day(1)).total, 1);
});

test('resumo conta fortes, médias e fracas pela data real', () => {
  const grazie = makeVocabularyWord('Grazie','Obrigado(a)');
  const acqua = makeVocabularyWord('Acqua','Água');
  let memory = applyVocabularyReview({}, [ciao], true, day(0).toISOString());
  memory = applyVocabularyReview(memory, [grazie], true, day(4).toISOString());
  memory = applyVocabularyReview(memory, [acqua], true, day(6).toISOString());
  assert.deepEqual(vocabularyStats(memory, day(7)), { strong: 1, medium: 1, weak: 1, total: 3 });
});

test('progressão de memória não concede XP e não modifica streak', () => {
  const file = readFileSync(new URL('../src/features/progress/ProgressProvider.tsx',import.meta.url),'utf8');
  assert.match(file, /recordVocabulary\s*=\s*useCallback/);
  assert.match(file, /vocabulary:\s*applyVocabularyReview/);
  assert.match(file, /updateLocal\(key, current =>/);
  const lesson = readFileSync(new URL('../src/app/lesson/[lessonId].tsx', import.meta.url), 'utf8');
  assert.match(lesson, /recordVocabulary\(wordsForExercise\(lesson\.id, question\), right\)/);
  assert.match(lesson, /completeLesson\(lesson\.id, count, lesson\.exercises\.length\)/);
});

test('associa mesma palavra entre lições e escolhe idioma corretamente', () => {
  const grazie1 = wordsForExercise('it-a1-01',{ type: 'write', id: 'q03', instruction: 'Escreva em português', prompt: 'Grazie', explanation: '',acceptedAnswers: ['obrigado'],sampleAnswer: 'Obrigado'});
  const grazie2 = wordsForExercise('it-a1-01',{ type: 'write', id: 'q05', instruction: 'Escreva em italiano', prompt: 'Obrigado', explanation: '',acceptedAnswers: ['grazie'],sampleAnswer: 'Grazie'});
  assert.equal(grazie1[0].id, grazie2[0].id);
  assert.equal(grazie2[0].term, 'Grazie');
});

test('lição 03 inclui água e expressões do café sem usar palavras em português', () => {
  const acqua = wordsForExercise('it-a1-03',{ type: 'write', id: 'q12', instruction: 'Escreva em italiano', prompt: 'Água', explanation: '',acceptedAnswers: ['acqua'],sampleAnswer: 'Acqua'});
  assert.deepEqual(acqua.map(w=>w.term),['Acqua']);
  assert.equal(acqua[0].meaning,'Água');
});

test('lições remotas escolhem vocabulário de exercícios compreensíveis', () => {
  const items=wordsForExercise('it-a1-04',{type:'choice',id:'q130',instruction:'Escolha a tradução',prompt:'Buonasera',explanation:'',options:[{id:'a',label:'Boa noite'},{id:'b',label:'Bom dia'}],correctOptionId:'a'});
  assert.deepEqual(items.map(x=>x.term),['Buonasera']);
});

test('valida recuperação de histórico e rejeita objetos corrompidos',()=>{
  const memory=applyVocabularyReview({},[ciao],true,day(0).toISOString());
  assert.ok(isVocabularyMemory(memory));
  assert.ok(!isVocabularyMemory({[ciao.id]:{...memory[ciao.id], reviewedAt:'invalid'}}));
  assert.ok(!isVocabularyMemory({[ciao.id]:{...memory[ciao.id], id:'malicious'}}));
  assert.equal(isVocabularyMemory({}),true);
});

test('progresso legado sem vocabulário é aceito; histórico novo permanece válido', async () => {
  const { isStudentProgress } = await import('../src/features/progress/logic.ts');
  const old = {completedLessonIds:['it-a1-01'],totalXp:50,lastStudiedAt:'2026-10-01T12:00:00.000Z'};
  assert.equal(isStudentProgress(old),true);
  const remembered = applyVocabularyReview({}, [ciao], true, day(1).toISOString());
  assert.equal(isStudentProgress({...old,vocabulary:remembered}),true);
  assert.equal(isStudentProgress({...old,vocabulary:[]}),false);
});

test('concluir lição preserva o histórico de vocabulário sem alterar o XP calculado', async () => {
  const { applyLessonCompletion } = await import('../src/features/progress/logic.ts');
  const vocabulary=applyVocabularyReview({},[ciao],true,'2026-10-01T12:00:00Z');
  const previous={completedLessonIds:[],totalXp:0,lastStudiedAt:null,vocabulary};
  const {next,earnedXp}=applyLessonCompletion(previous,'it-a1-01',2,3,'2026-10-01T12:05:00Z','2026-10-01');
  assert.equal(earnedXp,20);
  assert.deepEqual(next.vocabulary,vocabulary);
  assert.equal(next.studyDays?.[0],'2026-10-01');
});
