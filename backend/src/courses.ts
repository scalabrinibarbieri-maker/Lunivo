/** Conteudo curricular publico; objetos R2 sao privados, publicados pelo catalogo. */
const CATALOG_KEY = 'courses/v1/catalog.json';
const MAX_CATALOG = 64 * 1024;
const MAX_UNIT = 512 * 1024;
const UNIT = /^\/v1\/courses\/unit\/([a-z]{2}-(?:a1|a2|b1|b2|c1|c2)-u[0-9]{2,4})\/([1-9][0-9]{0,4})$/;
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: {
  'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*',
  'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=300',
} });
async function readCatalog(bucket: R2Bucket): Promise<{version:1; units: unknown[]}> {
  const file = await bucket.get(CATALOG_KEY);
  if (!file) return {version:1, units:[]};
  if (file.size > MAX_CATALOG) throw new Error('COURSE_CATALOG_INVALID');
  const json: unknown = JSON.parse(await file.text());
  if (!json || typeof json !== 'object' || Array.isArray(json) || (json as {version?:unknown}).version !== 1 ||
      !Array.isArray((json as {units?:unknown}).units) || (json as {units:unknown[]}).units.length > 100) throw new Error('COURSE_CATALOG_INVALID');
  return json as {version:1;units:unknown[]};
}
export async function publishedCourseLessonIds(bucket?: R2Bucket): Promise<Set<string>> {
  const ids = new Set<string>(['it-a1-01','it-a1-02','it-a1-03']);
  if (!bucket) return ids;
  const manifest = await readCatalog(bucket);
  for (const raw of manifest.units) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const lessons: unknown = (raw as {lessons?:unknown}).lessons;
    if (!Array.isArray(lessons)) continue;
    for (const lesson of lessons) {
      const id = lesson && typeof lesson === 'object' ? (lesson as {id?:unknown}).id : undefined;
      if (typeof id === 'string' && /^[a-z]{2}-(?:a1|a2|b1|b2|c1|c2)-[0-9]{2,4}$/.test(id)) ids.add(id);
    }
  }
  return ids;
}
export async function handleCourseRequest(request: Request, bucket?: R2Bucket): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/v1/courses/')) return null;
  if (!['GET','HEAD'].includes(request.method)) return respond({error:'METODO_INVALIDO'},405);
  if (!bucket) return respond({error:'CURSOS_NAO_CONFIGURADOS'},503);
  try {
    const manifest = await readCatalog(bucket);
    if (url.pathname === '/v1/courses/catalog') return request.method === 'HEAD' ? new Response(null,{status:200}) : respond(manifest);
    const matched = UNIT.exec(url.pathname);
    if (!matched) return respond({error:'UNIDADE_NAO_ENCONTRADA'},404);
    const [,_id,_rev] = matched;
    const id = _id!;const rev = Number(_rev);
    const published = manifest.units.some(x => Boolean(x) && typeof x === 'object' &&
      (x as {id?:unknown}).id === id && (x as {revision?:unknown}).revision === rev);
    if (!published) return respond({error:'UNIDADE_NAO_ENCONTRADA'},404);
    const key = `courses/v1/units/${id}-r${rev}.json`;
    const file = await bucket.get(key);
    if (!file) return respond({error:'UNIDADE_NAO_ENCONTRADA'},404);
    if (!file.size || file.size > MAX_UNIT) return respond({error:'UNIDADE_INVALIDA'},502);
    return new Response(request.method === 'HEAD'?null:file.body,{status:200,headers:{
      'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*',
      'X-Content-Type-Options':'nosniff','Content-Length':String(file.size),
      'Cache-Control':'public, max-age=31536000, immutable',
    }});
  } catch {
    return respond({error:'CATALOGO_DE_CURSOS_INVALIDO'},502);
  }
}
