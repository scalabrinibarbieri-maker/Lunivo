import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function text(file) { return readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'); }

test('Ciao usa uma imagem PNG valida, por referencia nativa Metro', () => {
  const bytes = readFileSync(new URL('../assets/lessons/ciao-greeting.png', import.meta.url));
  assert.deepEqual([...bytes.subarray(0,8)], [137,80,78,71,13,10,26,10]);
  assert.ok(bytes.byteLength >= 1000);
  assert.match(text('src/features/courses/localInfoImage.ts'), /require\('\.\.\/\.\.\/\.\.\/assets\/lessons\/ciao-greeting\.png'\)/);
  assert.match(text('src/features/courses/CourseProvider.tsx'), /url: LOCAL_CIAO_IMAGE_URI/);
  assert.doesNotMatch(text('src/features/courses/CourseProvider.tsx'), /data:image/);
});

test('a tela de info diferencia imagem local e URL remota HTTPS', () => {
  const source = text('src/app/lesson/[lessonId].tsx');
  assert.match(source, /localInfoImageSource\(question\.image\.url\) \?\? \{ uri: imageUri\(lesson\.id, question\.image\.url\) \}/);
});

test('conteudo online continua separado do material embarcado e nao e cacheado', () => {
  const source = text('src/features/courses/CourseProvider.tsx');
  assert.match(source, /Cache-Control':'no-store/);
  assert.match(source, /return attachBundledInfo\(base,parseBundledInfo/);
  assert.match(source, /return base;/);
});
