import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { imageFileName, listUnitImages, MAX_LESSON_IMAGE_BYTES } from '../src/features/courses/lessonImages.ts';
import { parseCourseUnit, parseCourseCatalog } from '../src/features/courses/schema.ts';

const meta = { id:'it-a1-u02', language:'it', level:'A1', order:2, revision:1, title:'Cultura', subtitle:'Conheça a Itália',
  lessons:[{ id:'it-a1-04',title:'História',subtitle:'Cultura',exerciseCount:2 }] };
const link='https://imagens.exemplo.org/aula/coliseu.webp';
const unit = {version:1,unitId:meta.id,revision:1,lessons:[{id:'it-a1-04',title:'História',subtitle:'Cultura',unit:2,exercises:[
  { id:'q19',type:'info',instruction:'Cultura',prompt:'Roma',explanation:'O Coliseu foi um anfiteatro.',category:'culture',image:{url:link,alt:'Coliseu',caption:'Roma, Itália'} },
  { id:'q20',type:'choice',instruction:'Traduza',prompt:'Ciao!',explanation:'Saudação',options:[{id:'a',label:'Olá'},{id:'b',label:'Não'}],correctOptionId:'a' },
]}]};
const read=(name)=>readFileSync(new URL(name,import.meta.url),'utf8');

test('imagem de explicação é reconhecida sem alterar o contrato de cursos v1',()=>{
  const summary=parseCourseCatalog({version:1,units:[meta]}).units[0];
  const parsed=parseCourseUnit(unit,summary);
  assert.deepEqual(listUnitImages(parsed),[link]);
  assert.equal(parsed.lessons[0].exercises[0].type,'info');
});

test('nome persistente da imagem tem extensão suportada e não inclui URL externa',()=>{
  assert.match(imageFileName(link),/^[a-f0-9]{16}\.webp$/);
  assert.equal(imageFileName(link),imageFileName(link));
  assert.notEqual(imageFileName(link),imageFileName('https://imagens.exemplo.org/aula/outra.webp'));
  assert.equal(MAX_LESSON_IMAGE_BYTES,3*1024*1024);
});

test('download só considera unidade offline após baixar áudios, imagens e JSON',()=>{
  const code=read('../src/features/courses/CourseProvider.tsx');
  const img=code.indexOf('await prepareUnitImages(content,keyOf(unit));');
  const json=code.indexOf('file.write(JSON.stringify(content)');
  const badge=code.indexOf('setStored(prev=>({...prev,[keyOf(unit)]:true}));');
  assert.ok(img>=0 && json>img && badge>json);
  assert.match(code,/allImagesAvailable\(parsed,keyOf\(unit\)\)/);
  assert.match(code,/removeUnitImages\(keyOf\(unit\)\)/);
  assert.match(code,/localImageUri\(keyOf\(unit\),url\)\?\?url/);
});

test('imagens são armazenadas em documentos e downloads têm limites e limpeza',()=>{
  const code=read('../src/features/courses/imageCache.ts');
  assert.match(code,/Paths\.document/);
  assert.match(code,/File\.downloadFileAsync/);
  assert.match(code,/downloaded\.size/);
  assert.match(code,/downloaded\.bytes\(\)/);
  assert.match(code,/controller\.abort\(\)/);
  assert.match(code,/file\.delete\(\)/);
  assert.match(code,/dir\.delete\(\)/);
});

test('tela explicativa utiliza imagem local primeiro, com fallback online',()=>{
  const ui=read('../src/app/lesson/[lessonId].tsx');
  assert.match(ui,/imageUri\(lesson\.id, question\.image\.url\)/);
});

test('Home remove símbolos genéricos e apresenta detalhes em painel animado',()=>{
  const home=read('../src/app/index.tsx');
  const result=read('../src/app/result.tsx');
  assert.doesNotMatch(home,/🔥/);
  assert.doesNotMatch(result,/🔥|✦/);
  assert.match(home,/PremiumInsightSheet/);
  assert.match(home,/setInsight\('streak'\)/);
  assert.match(home,/setInsight\('xp'\)/);
  assert.match(read('../src/components/PremiumInsightSheet.tsx'),/Animated\.spring/);
});

test('perfil e cursos mantêm ações originais com identidade visual renovada',()=>{
  const profile=read('../src/app/profile.tsx');
  const courses=read('../src/app/courses.tsx');
  for(const token of ['syncNow','logOut','resendVerification','router.push(\'/auth\')','progress.totalXp','PremiumEmblem'])
    assert.ok(profile.includes(token), `Perfil perdeu ${token}`);
  for(const token of ['download(u)','remove(u)','loadUnit(u)','refresh()','canStartLesson','router.push({pathname:\'/lesson/[lessonId]\''])
    assert.ok(courses.includes(token), `Cursos perdeu ${token}`);
  assert.doesNotMatch(profile,/✦/);
});
