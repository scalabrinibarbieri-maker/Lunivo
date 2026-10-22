import React, {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {Directory,File,Paths} from 'expo-file-system';
import Storage from 'expo-sqlite/kv-store';
import {LESSONS} from '../learning/data';
import type {Lesson} from '../learning/types';
import {clipForExercise} from '../audio/catalog';
import {cloudClipForExercise,readCachedAudioManifest,refreshAudioManifest} from '../audio/remoteCatalog';
import {prepareCloudAudio} from '../audio/remoteCache';
import {allImagesAvailable,localImageUri,prepareUnitImages,removeUnitImages} from './imageCache';
import {EMPTY_CATALOG,parseCourseCatalog,parseCourseUnit,type CourseCatalog,type CourseUnit,type CourseUnitSummary} from './schema';
import {attachBundledInfo,parseBundledInfo} from './bundledInfo';
import {LOCAL_CIAO_IMAGE_URI} from './localInfoImage';

const BASE_URL='https://lunivo-api-dev.scalabrinibarbieri.workers.dev';
const LOCAL_CATALOG_KEY='lunivo:courses:catalog:v1';
const CONTENT_DIR = new Directory(Paths.document,'lunivo-courses-v1');
const CACHE_TIMEOUT_MS=12000;

type CourseContextType={
  catalog:CourseCatalog; ready:boolean; refreshing:boolean;
  refresh:()=>Promise<void>; downloaded:(unit:CourseUnitSummary)=>boolean;
  download:(unit:CourseUnitSummary)=>Promise<void>; remove:(unit:CourseUnitSummary)=>Promise<void>;
  loadUnit:(unit:CourseUnitSummary)=>Promise<CourseUnit>;
  lesson:(id:string)=>Lesson|undefined; loadLesson:(id:string)=>Promise<Lesson>;
  imageUri:(lessonId:string,url:string)=>string;
  lessonIds:string[];
};
const Context=createContext<CourseContextType|null>(null);
function fileFor(unit:CourseUnitSummary){return new File(CONTENT_DIR,`${unit.id}-r${unit.revision}.json`);}
async function fetchJson(url:string):Promise<unknown>{
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),CACHE_TIMEOUT_MS);
  try{const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw new Error(`CURSO_HTTP_${response.status}`);
    const text=await response.text();if(text.length>512*1024)throw new Error('CURSO_MUITO_GRANDE');return JSON.parse(text);
  }finally{clearTimeout(timeout);}
}
const keyOf=(u:CourseUnitSummary)=>`${u.id}-r${u.revision}`;

function withLessonInfo(lesson: Lesson): Lesson {
  if (lesson.id !== 'it-a1-01') return lesson;
  if (lesson.exercises[0]?.type === 'info' && lesson.exercises[0]?.id === 'q00') return lesson;
  return {
    ...lesson,
    exercises: [
      {
        id: 'q00',
        type: 'info',
        category: 'culture',
        instruction: 'Descubra o clima por trás do ciao',
        prompt: 'Ciao: uma saudação pequena, mas cheia de estilo',
        explanation:
          'Na Itália, “ciao” é muito mais do que um simples “oi”. A palavra costuma soar calorosa, próxima e informal — e serve tanto para cumprimentar quanto para se despedir. Entre amigos, familiares ou pessoas com quem o clima é leve, dizer “ciao” transmite naturalidade, simpatia e aquele toque de vida cotidiana italiana que parece espontâneo e elegante ao mesmo tempo.',
        image: {
          url: LOCAL_CIAO_IMAGE_URI,
          alt: 'Ilustração de duas pessoas se cumprimentando com um aceno amigável.',
          caption: '“Ciao” costuma aparecer em contextos leves, próximos e informais.',
        },
      },
      ...lesson.exercises,
    ],
  };
}
export function CourseProvider({children}:{children:React.ReactNode}){
  const [catalog,setCatalog]=useState<CourseCatalog>(EMPTY_CATALOG);
  const [ready,setReady]=useState(false);
  const [refreshing,setRefreshing]=useState(false);
  const [packages,setPackages]=useState<Record<string,CourseUnit>>({});
  const [stored,setStored]=useState<Record<string,boolean>>({});
  const busy=useRef<Record<string,Promise<CourseUnit>>>({});
  const refresh=useCallback(async()=>{
    setRefreshing(true);
    try{
      const data=parseCourseCatalog(await fetchJson(`${BASE_URL}/v1/courses/catalog`));
      await Storage.setItem(LOCAL_CATALOG_KEY,JSON.stringify(data));
      setCatalog(data);
    }catch(err){console.warn('Catálogo de cursos indisponível, mantendo a cópia local:',err instanceof Error?err.message:'erro');}
    finally{setRefreshing(false);}
  },[]);
  useEffect(()=>{
    let active=true;
    void (async()=>{
      try{
        const raw=await Storage.getItem(LOCAL_CATALOG_KEY);
        if(raw&&active)setCatalog(parseCourseCatalog(JSON.parse(raw)));
      }catch(e){console.warn('Não foi possível abrir o catálogo salvo:',e);}
      finally{if(active)setReady(true);}
      if(active)await refresh();
    })();
    return ()=>{active=false;};
  },[refresh]);
  useEffect(()=>{
    let active=true;
    void (async()=>{
      const found:Record<string,boolean>={};
      for(const unit of catalog.units){
        try{
          const file=fileFor(unit);
          if(!file.exists)continue;
          // Uma unidade salva antes da V15 pode ter imagens ausentes. Nessa situação
          // não será apresentada como totalmente offline até baixar de novo.
          const parsed=parseCourseUnit(JSON.parse(await file.text()),unit);
          if(allImagesAvailable(parsed,keyOf(unit)))found[keyOf(unit)]=true;
        }catch{/* arquivos inválidos ou mídia ausente não recebem selo offline */}
      }
      if(active)setStored(found);
    })();
    return ()=>{active=false;};
  },[catalog]);

  const loadUnit=useCallback((unit:CourseUnitSummary):Promise<CourseUnit>=>{
    const key=keyOf(unit);
    if(packages[key])return Promise.resolve(packages[key]);
    if(busy.current[key])return busy.current[key];
    const task=(async()=>{
      const saved=fileFor(unit);
      if(saved.exists){
        try{
          const parsed=parseCourseUnit(JSON.parse(await saved.text()),unit);
          setPackages(old=>({...old,[key]:parsed}));return parsed;
        }catch(e){console.warn('Unidade salva inválida, tentando versão online',e);}
      }
      const parsed=parseCourseUnit(await fetchJson(`${BASE_URL}/v1/courses/unit/${unit.id}/${unit.revision}`),unit);
      setPackages(old=>({...old,[key]:parsed}));return parsed;
    })();
    busy.current[key]=task;
    void task.finally(()=>{delete busy.current[key];}).catch(()=>{});
    return task;
  },[packages]);
  const download=useCallback(async(unit:CourseUnitSummary)=>{
    const content=await loadUnit(unit);
    // Mantém a garantia anterior para todas as gravações de escuta.
    const manifest=await refreshAudioManifest(true).catch(()=>readCachedAudioManifest());
    const toFetch=new Map<string,ReturnType<typeof cloudClipForExercise>>();
    for(const lesson of content.lessons){
      for(const exercise of lesson.exercises){
        const target=(exercise.type==='listen_choice'||exercise.type==='listen_write')?exercise.audioExerciseId:exercise.id;
        if(exercise.type==='info'||clipForExercise(target))continue;
        const cloud=cloudClipForExercise(manifest,target);
        if((exercise.type==='listen_choice'||exercise.type==='listen_write')&&!cloud)throw new Error('AUDIO_OBRIGATORIO_NAO_PUBLICADO');
        if(cloud)toFetch.set(cloud.id,cloud);
      }
    }
    for(const audio of toFetch.values()){if(audio)await prepareCloudAudio(audio);}
    // A transferência das imagens é OBRIGATÓRIA antes de confirmar offline.
    await prepareUnitImages(content,keyOf(unit));
    if(!CONTENT_DIR.exists)CONTENT_DIR.create({idempotent:true,intermediates:true});
    const file=fileFor(unit);
    file.write(JSON.stringify(content),{encoding:'utf8'});
    setStored(prev=>({...prev,[keyOf(unit)]:true}));
  },[loadUnit]);
  const remove=useCallback(async(unit:CourseUnitSummary)=>{
    const file=fileFor(unit);if(file.exists)file.delete();
    removeUnitImages(keyOf(unit));
    setStored(prev=>{const next={...prev};delete next[keyOf(unit)];return next;});
    // Áudios compartilhados permanecem no cache local, como na V14.
  },[]);
  const lesson=useCallback((id:string):Lesson|undefined=>{
    const included=LESSONS.find(x=>x.id===id);if(included)return withLessonInfo(included);
    const meta=catalog.units.find(u=>u.lessons.some(l=>l.id===id));
    return meta?packages[keyOf(meta)]?.lessons.find(l=>l.id===id):undefined;
  },[catalog,packages]);
  const loadLesson=useCallback(async(id:string):Promise<Lesson>=>{
    const included=LESSONS.find(x=>x.id===id);
    if(included){
      const base=withLessonInfo(included);
      // Network-only supplement. Never cache it locally: offline means NO remote infos.
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),3500);
      try{
        const response=await fetch(`${BASE_URL}/v1/courses/bundled/${encodeURIComponent(id)}/infos`,{
          signal:controller.signal,
          headers:{'Cache-Control':'no-store','Pragma':'no-cache'},
        });
        if(!response.ok)return base;
        const raw=await response.text();
        if(raw.length>48*1024)return base;
        return attachBundledInfo(base,parseBundledInfo(JSON.parse(raw),id));
      }catch{
        // Offline or unavailable server: preserve the original bundled lesson.
        return base;
      }finally{clearTimeout(timeout);}
    }
    const unit=catalog.units.find(u=>u.lessons.some(l=>l.id===id));
    if(!unit)throw new Error('LICAO_NAO_PUBLICADA');
    const data=await loadUnit(unit);
    const match=data.lessons.find(l=>l.id===id);
    if(!match)throw new Error('LICAO_NAO_PUBLICADA');
    return match;
  },[catalog,loadUnit]);
  const imageUri=useCallback((lessonId:string,url:string):string=>{
    const unit=catalog.units.find(u=>u.lessons.some(l=>l.id===lessonId));
    return unit?localImageUri(keyOf(unit),url)??url:url;
  },[catalog]);
  const lessonIds=useMemo(()=>[...LESSONS.map(l=>l.id),...catalog.units.flatMap(u=>u.lessons.map(l=>l.id))],[catalog]);
  const value=useMemo(()=>({catalog,ready,refreshing,refresh,downloaded:(u:CourseUnitSummary)=>Boolean(stored[keyOf(u)]),download,remove,loadUnit,lesson,loadLesson,imageUri,lessonIds}),
    [catalog,ready,refreshing,refresh,stored,download,remove,loadUnit,lesson,loadLesson,imageUri,lessonIds]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCourses(){const ctx=useContext(Context);if(!ctx)throw new Error('useCourses requer CourseProvider');return ctx;}
