import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCourseCatalog,parseCourseUnit,unitObjectKey} from '../src/features/courses/schema.ts';
const overview={version:1,units:[{id:'it-a1-u02',language:'it',level:'A1',order:2,revision:1,title:'Apresentações',subtitle:'Aprenda a se apresentar',
  lessons:[{id:'it-a1-04',title:'Meu nome',subtitle:'Diga seu nome',exerciseCount:2}]}]};
const doc={version:1,unitId:'it-a1-u02',revision:1,lessons:[{id:'it-a1-04',title:'Meu nome',subtitle:'Diga seu nome',unit:2,exercises:[
  {type:'choice',id:'q19',instruction:'Escolha o significado',prompt:'Come ti chiami?',options:[{id:'a',label:'Como você se chama?'},{id:'b',label:'Onde você está?'}],correctOptionId:'a',explanation:'É uma pergunta informal.'},
  {type:'write',id:'q20',instruction:'Escreva em italiano',prompt:'Meu nome é Luca',acceptedAnswers:['mi chiamo Luca'],sampleAnswer:'Mi chiamo Luca',explanation:'Mi chiamo significa me chamo.'}
]}]};
test('catalogo remoto de unidades valido',()=>{const c=parseCourseCatalog(overview);assert.equal(c.units[0].id,'it-a1-u02');assert.equal(unitObjectKey(c.units[0]),'courses/v1/units/it-a1-u02-r1.json');});
test('contem exercicios jogaveis coerentes com o catalogo',()=>{const unit=parseCourseUnit(doc,parseCourseCatalog(overview).units[0]);assert.equal(unit.lessons[0].exercises.length,2);});
test('nao publica ID de licao que ja veio no APK',()=>{const bad=structuredClone(overview);bad.units[0].lessons[0].id='it-a1-03';assert.throws(()=>parseCourseCatalog(bad));});
test('recusa catalogo com IDs duplicados',()=>{const bad=structuredClone(overview);bad.units.push(structuredClone(bad.units[0]));assert.throws(()=>parseCourseCatalog(bad));});
test('recusa versao divergente da unidade',()=>{const bad=structuredClone(doc);bad.revision=2;assert.throws(()=>parseCourseUnit(bad,parseCourseCatalog(overview).units[0]));});
test('recusa alternativas que nao existem e exercicios desconhecidos',()=>{const bad=structuredClone(doc);bad.lessons[0].exercises[0].correctOptionId='x';assert.throws(()=>parseCourseUnit(bad,parseCourseCatalog(overview).units[0]));const unknown=structuredClone(doc);unknown.lessons[0].exercises[1].type='eval-js';assert.throws(()=>parseCourseUnit(unknown,parseCourseCatalog(overview).units[0]));});
