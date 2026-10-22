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

const CIAO_INFO_IMAGE = 'data:image/png;base64,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';

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
          url: CIAO_INFO_IMAGE,
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
    const included=LESSONS.find(x=>x.id===id);if(included)return withLessonInfo(included);
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
