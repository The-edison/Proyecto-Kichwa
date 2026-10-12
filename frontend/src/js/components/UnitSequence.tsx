import {useEffect, useState} from 'react';
import {Head, Link} from '../navigation';
import {AppLayout} from '../layouts/AppLayout';
import {ExerciseCard} from './ExerciseCard';
import {ErrorState,LoadingState} from './States';
import {useApi} from '../hooks/useApi';
import type {Exercise,EvaluationResult,Unit} from '../types';
interface Sequence {exercises:Array<Exercise & {completed:boolean}>; completed_count:number; total:number; unlocked:boolean; evaluation_id:number|null; first_score:number|null; best_score:number|null; passed:boolean; result:EvaluationResult|null;}
export function UnitSequence({unit}:{unit:Unit}) {
    const sequence=useApi<Sequence>('/units/'+unit.id+'/sequence');
    const contents=useApi<{data:Array<{id:number}>}>('/units/'+unit.id+'/contents');
    const introId=contents.data?.data[0]?.id;
    const introduction=useApi<{body:string}>(introId?'/units/'+unit.id+'/topics/'+introId:null);
    const [active,setActive]=useState(0);const [initialized,setInitialized]=useState(false);
    useEffect(()=>{if(sequence.data && !initialized){const next=sequence.data.exercises.findIndex(e=>!e.completed);setActive(next<0?6:next);setInitialized(true);}},[sequence.data,initialized]);
    const current=sequence.data?.exercises[active];
    return <AppLayout title={unit.title} subtitle="Siete actividades para reconocer, relacionar y escribir tus primeras palabras."><Head title={unit.title}/>
        <Link className="font-bold text-forest" href={'/aprender/modulo/'+unit.module_id}>← Volver al módulo</Link>
        <div className="mt-5 space-y-5"><section className="glass-panel p-5 sm:p-7"><h2 className="font-serif text-2xl">Antes de practicar</h2>{contents.loading || introduction.loading ? <LoadingState/> : contents.error || introduction.error ? <ErrorState message={contents.error || introduction.error || ''}/> : <p className="mt-4 whitespace-pre-line leading-7 text-muted">{introduction.data?.body ?? unit.description}</p>}</section>
        {sequence.loading ? <LoadingState/> : sequence.error ? <ErrorState message={sequence.error}/> : sequence.data && <>
            <section className="glass-panel space-y-4 p-5"><p role="status" className="font-bold">{sequence.data.completed_count} de {sequence.data.total} actividades acertadas</p><div className="progress-track"><div className="progress-fill" style={{width:sequence.data.completed_count/sequence.data.total*100+'%'}}/></div><nav className="flex flex-wrap gap-2" aria-label="Actividades de la unidad">{sequence.data.exercises.map((exercise,index)=><button type="button" key={exercise.id} aria-current={active===index?'step':undefined} className={active===index?'primary-button':'secondary-button'} onClick={()=>setActive(index)} aria-label={'Actividad '+(index+1)+': '+exercise.config?.title}>{index+1}{exercise.completed?' ✓':''}</button>)}</nav></section>
            {current ? <ExerciseCard key={current.id} exercise={current} index={active} onFeedback={()=>void sequence.refresh()}/> : <p className="glass-panel p-5">El administrador está preparando los recursos de esta actividad.</p>}
            <div className="flex flex-wrap justify-between gap-3"><button type="button" className="secondary-button" disabled={active===0} onClick={()=>setActive(old=>old-1)}>Actividad anterior</button>{active<6 && <button type="button" className="primary-button" disabled={!current?.completed} onClick={()=>setActive(old=>old+1)}>Siguiente actividad →</button>}</div>
            {active===6 && (sequence.data.unlocked && sequence.data.evaluation_id ? <section className="glass-panel space-y-4 border-2 border-forest p-6"><h2 className="font-serif text-2xl">Prueba de la Unidad 1</h2><p>Seis preguntas · Un punto por pregunta · Apruebas con cinco aciertos · 3–5 minutos.</p><Link className="primary-button inline-block" href={'/aprender/evaluacion/'+sequence.data.evaluation_id}>{sequence.data.result?'Reintentar la prueba':'Iniciar la prueba'}</Link>{sequence.data.result && <p>Primer resultado: {sequence.data.first_score}% · Mejor resultado: {sequence.data.best_score}% · {sequence.data.passed?'Unidad aprobada':'Puedes practicar y reintentar.'}</p>}</section> : <p className="glass-panel p-5">La prueba aparecerá cuando hayas acertado las siete actividades y esté publicada.</p>)}
        </>}</div>
    </AppLayout>;
}
