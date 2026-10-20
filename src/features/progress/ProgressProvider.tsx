import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import { useAuth } from '../auth/AuthProvider';
import { firebaseAuth } from '../auth/firebase';
import { useCourses } from '../courses/CourseProvider';
import { applyLessonCompletion, EMPTY_PROGRESS, isStudentProgress, type StudentProgress } from './logic';
import { progressKeyForUid } from './keys';
import { fetchCloudProgress, uploadCloudProgress } from './syncApi';
import { planProgressSync } from './syncLogic';

type SyncStatus = 'guest' | 'idle' | 'syncing' | 'synced' | 'error';
type ProgressContextType = {
  progress: StudentProgress; ready: boolean; syncStatus: SyncStatus;
  syncNow: () => Promise<boolean>; completeLesson: (id:string, correct:number, total:number)=>Promise<number>;
};
const ProgressContext=createContext<ProgressContextType|null>(null);
export function ProgressProvider({ children }:{ children:React.ReactNode }) {
  const { user, ready:authReady }=useAuth();
  const {lessonIds}=useCourses();
  const uid=user?.uid??null;
  const key=progressKeyForUid(uid);
  const keyRef=useRef(key);keyRef.current=key;
  const [progress,setProgress]=useState<StudentProgress>(EMPTY_PROGRESS);
  const progressRef=useRef<StudentProgress>(EMPTY_PROGRESS);
  const [loadedKey,setLoadedKey]=useState<string|null>(null);
  const [syncStatus,setSyncStatus]=useState<SyncStatus>('guest');
  const ready=authReady&&loadedKey===key;
  const writeTailRef=useRef<Promise<void>>(Promise.resolve());
  const updateLocal=useCallback((targetKey:string,change:(current:StudentProgress)=>StudentProgress)=>{
    const op=writeTailRef.current.catch(()=>{}).then(async()=>{
      if(keyRef.current!==targetKey)return;
      const current=progressRef.current;
      const next=change(current);
      if(next===current)return;
      await Storage.setItem(targetKey,JSON.stringify(next));
      if(keyRef.current===targetKey){progressRef.current=next;setProgress(next);}
    });
    writeTailRef.current=op.catch(()=>{});
    return op;
  },[]);
  const flightRef=useRef<{key:string;promise:Promise<boolean>}|null>(null);
  const repeatKeyRef=useRef<string|null>(null);
  const syncNowRef=useRef<()=>Promise<boolean>>(async()=>false);
  useEffect(()=>{
    if(!authReady)return;
    let active=true;
    setSyncStatus(uid?'idle':'guest');
    (async()=>{
      try{
        const value=await Storage.getItem(key);
        const parsed:unknown=value?JSON.parse(value):null;
        const restored=isStudentProgress(parsed)?parsed:EMPTY_PROGRESS;
        if(active){progressRef.current=restored;setProgress(restored);}
      }catch(err){console.warn('Falha ao ler progresso local:',err);if(active){progressRef.current=EMPTY_PROGRESS;setProgress(EMPTY_PROGRESS);}}
      finally{if(active)setLoadedKey(key);}
    })();
    return()=>{active=false;};
  },[authReady,key,uid]);
  const syncNow=useCallback(():Promise<boolean>=>{
    if(!ready||!uid||!user||firebaseAuth.currentUser?.uid!==uid)return Promise.resolve(false);
    const existing=flightRef.current;
    if(existing?.key===key){repeatKeyRef.current=key;return existing.promise;}
    setSyncStatus('syncing');
    const task=(async()=>{
      try{
        const remote=await fetchCloudProgress(user);
        await writeTailRef.current;
        if(keyRef.current!==key||firebaseAuth.currentUser?.uid!==uid)return false;
        const plan=planProgressSync(progressRef.current.completedLessonIds,remote,lessonIds);
        const remoteSet=new Set(remote);
        const missing=plan.uploadIds.filter(id=>!remoteSet.has(id));
        // O backend aceita no maximo 25 IDs por requisição; cursos novos nao quebram o sync.
        let confirmed=remote;
        for(let i=0;i<missing.length;i+=25){
          confirmed=await uploadCloudProgress(user,missing.slice(i,i+25));
          if(keyRef.current!==key||firebaseAuth.currentUser?.uid!==uid)return false;
        }
        await updateLocal(key,current=>{
          const merged=planProgressSync(current.completedLessonIds,confirmed,lessonIds).mergedLocalIds;
          if(merged.length===current.completedLessonIds.length&&merged.every((id,i)=>id===current.completedLessonIds[i]))return current;
          return {...current,completedLessonIds:merged};
        });
        if(keyRef.current===key)setSyncStatus('synced');
        return true;
      }catch(err){
        console.warn('Sincronização indisponível; progresso local preservado:',err instanceof Error?err.message:'erro');
        if(keyRef.current===key)setSyncStatus('error');
        return false;
      }
    })();
    flightRef.current={key,promise:task};
    void task.finally(()=>{
      if(flightRef.current?.promise!==task)return;
      flightRef.current=null;
      if(repeatKeyRef.current===key&&keyRef.current===key){repeatKeyRef.current=null;setTimeout(()=>{void syncNowRef.current();},0);}
    });
    return task;
  },[key,ready,uid,updateLocal,user,lessonIds]);
  syncNowRef.current=syncNow;
  // Quando o catalogo traz novas lições, sua identidade entra na reconciliação.
  useEffect(()=>{if(ready&&uid)void syncNow();},[ready,uid,syncNow]);
  useEffect(()=>{
    if(!ready||!uid)return;
    const s=AppState.addEventListener('change',state=>{if(state==='active')void syncNowRef.current();});
    return()=>s.remove();
  },[ready,uid]);
  const completeLesson=useCallback(async(id:string,correct:number,total:number):Promise<number>=>{
    if(!ready)throw new Error('Progresso ainda não carregado');
    if(!lessonIds.includes(id))throw new Error('Lição não publicada');
    let earnedXp=0;
    await updateLocal(key,current=>{
      const outcome=applyLessonCompletion(current,id,correct,total,new Date().toISOString());
      earnedXp=outcome.earnedXp;
      return outcome.next;
    });
    if(uid){if(flightRef.current?.key===key)repeatKeyRef.current=key;else void syncNowRef.current();}
    return earnedXp;
  },[key,ready,uid,updateLocal,lessonIds]);
  return <ProgressContext.Provider value={{progress,ready,syncStatus,syncNow,completeLesson}}>{children}</ProgressContext.Provider>;
}
export function useProgress(){const c=useContext(ProgressContext);if(!c)throw new Error('useProgress deve estar dentro de ProgressProvider');return c;}
