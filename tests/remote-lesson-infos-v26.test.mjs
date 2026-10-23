import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseBundledInfo, attachBundledInfo } from '../src/features/courses/bundledInfo.ts';

const page = readFileSync(new URL('../src/features/courses/CourseProvider.tsx', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../backend/src/courses.ts', import.meta.url), 'utf8');
const info = {id:'q7604',type:'info',category:'culture',instruction:'Apresentações na Itália',prompt:'Piacere di conoscerti!',explanation:'Piacere significa prazer.'};
const base = {id:'it-a1-04',title:'Apresentações',subtitle:'Nomes',unit:2,exercises:[
  {id:'q19',type:'choice',instruction:'Escolha',prompt:'Come ti chiami?',options:[{id:'a',label:'Como se chama?'},{id:'b',label:'Olá'}],correctOptionId:'a',explanation:'Teste'},
  {id:'q20',type:'write',instruction:'Escreva',prompt:'Meu nome é Luca',acceptedAnswers:['mi chiamo luca'],sampleAnswer:'Mi chiamo Luca',explanation:'Teste'}
]};
const document={version:1,revision:1,lessonId:'it-a1-04',entries:[{beforeExerciseId:'__first__',exercise:info}]};

test('a info remota é recebida na lição 04 antes de q19, preservando as perguntas',()=>{
  const parsed=parseBundledInfo(document,'it-a1-04');
  const result=attachBundledInfo(base,parsed);
  assert.deepEqual(result.exercises.map(x=>x.id),['q7604','q19','q20']);
  assert.deepEqual(result.exercises.slice(1),base.exercises);
  assert.deepEqual(base.exercises.map(x=>x.id),['q19','q20']);
});

test('mantém compatibilidade com infos antes e depois de exercícios da lição 02',()=>{
  const original={...base,id:'it-a1-02'};
  const overlay={version:1,revision:2,lessonId:'it-a1-02',entries:[
    {beforeExerciseId:'q19',exercise:{...info,id:'q7605'}},
    {afterExerciseId:'q20',exercise:{...info,id:'q7606'}}
  ]};
  assert.deepEqual(attachBundledInfo(original,parseBundledInfo(overlay,'it-a1-02')).exercises.map(x=>x.id),
    ['q7605','q19','q20','q7606']);
});

test('recusa ID duplicado, lição trocada e âncora de encerramento inválida',()=>{
  assert.throws(()=>parseBundledInfo({...document,lessonId:'it-a1-07'},'it-a1-04'));
  assert.throws(()=>parseBundledInfo({...document,entries:[{afterExerciseId:'__first__',exercise:info}]},'it-a1-04'));
  assert.deepEqual(attachBundledInfo(base,parseBundledInfo({...document,entries:[{beforeExerciseId:'__first__',exercise:{...info,id:'q19'}}]},'it-a1-04')),base);
});

test('o app busca suplementos também na unidade remota e mantém a lição original em falha',()=>{
  assert.match(page,/return withRemoteInfos\(match\)/);
  assert.match(page,/return withRemoteInfos\(base\)/);
  assert.match(page,/catch\s*\{\s*\/\/ Offline or unavailable server:/);
  assert.match(worker,/const BUNDLED_INFO = .*\[a-z\]/);
});
