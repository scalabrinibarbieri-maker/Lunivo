import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleCourseRequest } from '../src/courses.ts';

const origin='https://lunivo-api-dev.scalabrinibarbieri.workers.dev';
const overlay={version:1,revision:1,lessonId:'it-a1-01',entries:[]};
const payload=JSON.stringify(overlay);
const object={size:new TextEncoder().encode(payload).length, body:new Response(payload).body};
const bucket={get:async key=>key==='courses/v1/bundled/it-a1-01/infos.json'?object:null};

test('infos das lições embutidas são públicas e nunca cacheadas',async()=>{
  const response=await handleCourseRequest(new Request(origin+'/v1/courses/bundled/it-a1-01/infos'),bucket);
  assert.equal(response.status,200);
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.deepEqual(await response.json(),overlay);
});

test('sem suplemento publicado, retorna 404 sem inventar conteúdo',async()=>{
  const response=await handleCourseRequest(new Request(origin+'/v1/courses/bundled/it-a1-02/infos'),bucket);
  assert.equal(response.status,404);
  assert.equal(response.headers.get('Cache-Control'),'no-store');
});

test('rejeita rotas de imagens fora do padrão',async()=>{
  const response=await handleCourseRequest(new Request(origin+'/v1/courses/bundled/assets/../../secret'),bucket);
  assert.equal(response.status,404);
});
