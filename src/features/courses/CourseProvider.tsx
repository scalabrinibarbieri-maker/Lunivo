import React, {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {Directory,File,Paths} from 'expo-file-system';
import Storage from 'expo-sqlite/kv-store';
import {LESSONS} from '../learning/data';
import type {Lesson,Exercise} from '../learning/types';
import {clipForExercise} from '../audio/catalog';
import {cloudClipForExercise,readCachedAudioManifest,refreshAudioManifest} from '../audio/remoteCatalog';
import {prepareCloudAudio} from '../audio/remoteCache';
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
  lessonIds:string[];
};
const Context=createContext<CourseContextType|null>(null);
function fileFor(unit:CourseUnitSummary){return new File(CONTENT_DIR,`${unit.id}-r${unit.revision}.json`);}
async function fetchJson(url:string):Promise<unknown>{
  const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),CACHE_TIMEOUT_MS);
  try{const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw new Error(`CURSO_HTTP_${response.status}`);
    const text=await response.text();if(text.length>512*1024)throw new Error('CURSO_MUITO_GRANDE');return JSON.parse(text);
  }finally{clearTimeout(timeout);}
}
const keyOf=(u:CourseUnitSummary)=>`${u.id}-r${u.revision}`;
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
    const found:Record<string,boolean>={};
    for(const unit of catalog.units){try{if(fileFor(unit).exists)found[keyOf(unit)]=true;}catch{/* proteção filesystem */}}
    setStored(found);
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
          setPackages(old=>({...old,[key]:parsed}));
          return parsed;
        }catch(e){console.warn('Unidade salva inválida, tentando versão online',e);}
      }
      const parsed=parseCourseUnit(await fetchJson(`${BASE_URL}/v1/courses/unit/${unit.id}/${unit.revision}`),unit);
      setPackages(old=>({...old,[key]:parsed}));
      return parsed;
    })();
    busy.current[key]=task;
    void task.finally(()=>{delete busy.current[key];}).catch(()=>{});
    return task;
  },[packages]);
  const download=useCallback(async(unit:CourseUnitSummary)=>{
    const content=await loadUnit(unit);
    // Baixa primeiro cada fala necessária para um exercício de escuta. Não declara
    // unidade offline se qualquer áudio obrigatório estiver ausente.
    const manifest=await refreshAudioManifest(true).catch(()=>readCachedAudioManifest());
    const toFetch=new Map<string,ReturnType<typeof cloudClipForExercise>>();
    for(const lesson of content.lessons){
      for(const exercise of lesson.exercises){
        const target=(exercise.type==='listen_choice'||exercise.type==='listen_write')?exercise.audioExerciseId:exercise.id;
        if(clipForExercise(target))continue;
        const cloud=cloudClipForExercise(manifest,target);
        if((exercise.type==='listen_choice'||exercise.type==='listen_write')&&!cloud)throw new Error('AUDIO_OBRIGATORIO_NAO_PUBLICADO');
        if(cloud)toFetch.set(cloud.id,cloud);
      }
    }
    for(const audio of toFetch.values()){if(audio)await prepareCloudAudio(audio);}
    if(!CONTENT_DIR.exists)CONTENT_DIR.create({idempotent:true,intermediates:true});
    const file=fileFor(unit);
    file.write(JSON.stringify(content),{encoding:'utf8'});
    setStored(prev=>({...prev,[keyOf(unit)]:true}));
  },[loadUnit]);
  const remove=useCallback(async(unit:CourseUnitSummary)=>{
    const file=fileFor(unit);if(file.exists)file.delete();
    setStored(prev=>{const next={...prev};delete next[keyOf(unit)];return next;});
    // Gravações compartilhadas por diferentes lições ficam no cache de áudio.
  },[]);
  const lesson=useCallback((id:string):Lesson|undefined=>{
    const included=LESSONS.find(x=>x.id===id);if(included)return included;
    const meta=catalog.units.find(u=>u.lessons.some(l=>l.id===id));
    return meta?packages[keyOf(meta)]?.lessons.find(l=>l.id===id):undefined;
  },[catalog,packages]);
  const loadLesson=useCallback(async(id:string):Promise<Lesson>=>{
    const included=LESSONS.find(x=>x.id===id);if(included)return included;
    const unit=catalog.units.find(u=>u.lessons.some(l=>l.id===id));
    if(!unit)throw new Error('LICAO_NAO_PUBLICADA');
    const data=await loadUnit(unit);
    const match=data.lessons.find(l=>l.id===id);
    if(!match)throw new Error('LICAO_NAO_PUBLICADA');
    return match;
  },[catalog,loadUnit]);
  const lessonIds=useMemo(()=>[...LESSONS.map(l=>l.id),...catalog.units.flatMap(u=>u.lessons.map(l=>l.id))],[catalog]);
  const value=useMemo(()=>({catalog,ready,refreshing,refresh,downloaded:(u:CourseUnitSummary)=>Boolean(stored[keyOf(u)]),download,remove,loadUnit,lesson,loadLesson,lessonIds}),
    [catalog,ready,refreshing,refresh,stored,download,remove,loadUnit,lesson,loadLesson,lessonIds]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCourses(){const ctx=useContext(Context);if(!ctx)throw new Error('useCourses requer CourseProvider');return ctx;}
