import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { MorphemePractice } from './MorphemePractice';
import { TimeMorphemeIllustration } from './TimeMorphemeIllustration';
import type { Exercise, ExerciseAnswer, ExerciseFeedback, ExerciseElement } from '../types';
import '../../css/time-morpheme-practice.css';

export function TimeMorphemePractice({ exercise, answer, feedback, busy, onChange }: { exercise: Exercise; answer: ExerciseAnswer; feedback?: ExerciseFeedback; busy: boolean; onChange: (answer: ExerciseAnswer) => void }) {
    const activity = exercise.config?.time_practice;
    const disabled = busy || feedback?.is_correct === true;
    const [comparisonWord, setComparisonWord] = useState('samari');
    if (activity === 2 || activity === 3 || activity === 6) return <div className="time-practice"><MorphemePractice exercise={exercise} answer={answer} feedback={feedback} busy={busy} onChange={onChange} /></div>;
    const update = (id: string, value: string) => onChange({ textos: { ...answer.textos, [id]: value } });
    function timeOptions(item: ExerciseElement, sentenceChoice = false) {
        const options = sentenceChoice ? [['rka', 'Kayna ñuka llankarkani.'], ['sha', 'Kaya ñuka llankasha.']] : [['rka', 'Pasado'], ['sha', 'Futuro']];
        return <fieldset className={`time-integrator-options${sentenceChoice ? ' is-sentence' : ''}`} disabled={disabled}><legend className="sr-only">{sentenceChoice ? 'Elige la oración que significa mañana trabajaré' : `Elige el tiempo de ${item.texto}`}</legend>{options.map(([value, label]) => {
            const selected = answer.textos?.[item.id] === value;
            return <label className={selected ? 'is-selected' : ''} key={value} data-answer-correct={selected ? feedback?.item_results?.[item.id] ?? feedback?.is_correct : undefined}><input type="radio" name={`time-${exercise.id}-${item.id}`} value={value} checked={selected} onChange={() => update(item.id, value)} /><span lang={sentenceChoice ? 'qu' : undefined}>{label}</span></label>;
        })}</fieldset>;
    }
    function field(item: ExerciseElement) {
        const result = feedback?.item_results?.[item.id] ?? feedback?.is_correct;
        return item.opciones?.length ? <select aria-label={item.texto} value={answer.textos?.[item.id] ?? ''} disabled={disabled} data-answer-correct={result} onChange={event => update(item.id, event.target.value)}><option value="" disabled>Elige</option>{item.opciones.map(option => <option key={option} value={option}>{activity === 8 && item.id !== 'sentence' ? `-${option}` : option}</option>)}</select> : <input lang="qu" aria-label={item.texto} value={answer.textos?.[item.id] ?? ''} disabled={disabled} data-answer-correct={result} onChange={event => update(item.id, event.target.value)} placeholder={activity === 5 ? 'Palabra completa' : 'Escribe aquí'} autoComplete="off" spellCheck={false} maxLength={80} />;
    }
    function sentence(item: ExerciseElement, cell?: number) {
        const [before, after] = item.texto.split('___');
        return <div className="time-practice-sentence" key={item.id}><label><span lang="qu">{before}</span>{field(item)}<span>{after}</span></label>{cell !== undefined && <TimeMorphemeIllustration cell={cell} description={cell === 2 ? 'Una persona llega a la comunidad.' : 'Una persona en el mercado.'} />}</div>;
    }
    return <section className={`morpheme-practice time-practice time-practice-${activity}`} data-exercise-correct={feedback?.is_correct} aria-label={exercise.config?.title}>
        {activity === 4 && <div className="time-practice-sentences">{exercise.elements.map((item, index) => sentence(item, index === 0 ? 2 : 3))}</div>}
        {activity === 5 && <div className="time-future-layout"><div className="time-future-words">{exercise.elements.map(item => <label key={item.id}><strong lang="qu">{item.texto}</strong><ArrowRight size={22} aria-hidden="true" />{field(item)}</label>)}</div><TimeMorphemeIllustration cell={8} description="Una mujer andina cose una tela bordada." /></div>}
        {activity === 7 && <><nav className="time-comparison-nav" aria-label="Acción para completar">{[['samari', 'Descansar'], ['chaya', 'Llegar'], ['sira', 'Coser']].map(([root, label]) => {
            const completed = ['past', 'future'].filter(tense => answer.textos?.[`${root}-${tense}`]?.trim()).length;
            return <button key={root} type="button" aria-pressed={comparisonWord === root} onClick={() => setComparisonWord(root)}>{label}<span aria-label={`${completed} de 2 respuestas`}>{completed}/2</span></button>;
        })}</nav><div className="time-comparison-cards">{[
            { root: 'samari', action: 'descansar', present: 'samarini', meaning: 'descanso', cell: 0 },
            { root: 'chaya', action: 'llegar', present: 'chayani', meaning: 'llego', cell: 2 },
            { root: 'sira', action: 'coser', present: 'sirani', meaning: 'coso', cell: 8 },
        ].map(row => <article className={`time-comparison-card${comparisonWord === row.root ? ' is-active' : ''}`} key={row.root} aria-label={`Conjuga ${row.action}`}>
            <div className="time-comparison-action"><TimeMorphemeIllustration cell={row.cell} description={row.action} /><div><h2>{row.action}</h2><span className="time-root" lang="qu">{row.root}</span></div></div>
            <div className="time-comparison-tenses">
                <div className="time-tense is-present"><div className="time-tense-heading"><span className="time-tense-dot" aria-hidden="true" /><strong>Presente</strong></div><span className="time-tense-person">Yo · ahora</span><div className="time-present-word"><strong lang="qu">{row.present}</strong><span>{row.meaning}</span></div></div>
                <label className="time-tense is-past"><span className="time-tense-heading"><span className="time-tense-dot" aria-hidden="true" /><strong>Pasado</strong></span><span className="time-tense-person">Él/ella · <b>-rka</b></span>{field(exercise.elements.find(item => item.id === `${row.root}-past`)!)}</label>
                <label className="time-tense is-future"><span className="time-tense-heading"><span className="time-tense-dot" aria-hidden="true" /><strong>Futuro</strong></span><span className="time-tense-person">Yo · <b>-sha</b></span>{field(exercise.elements.find(item => item.id === `${row.root}-future`)!)}</label>
            </div>
        </article>)}</div></>}
        {activity === 8 && <>
            <div className="time-integrator-heading"><span className="time-integrator-step" aria-hidden="true">1</span><h2>¿Pasado o futuro?</h2></div>
            <div className="time-integrator-key"><span><b>-rka</b> Pasado · ya pasó</span><span><b>-sha</b> Futuro · pasará después</span></div>
            <div className="time-integrator-cards">{exercise.elements.filter(item => item.id !== 'sentence').map((item, index) => <article key={item.id} className="time-integrator-card">
                <div className="time-integrator-word"><TimeMorphemeIllustration cell={[0, 7, 3, 6][index]} description={item.texto} /><strong lang="qu">{item.texto.replace(/(rka|sha)$/i, '')}<mark>{item.texto.match(/(rka|sha)$/i)?.[0]}</mark></strong></div>
                {timeOptions(item)}
            </article>)}</div>
            <div className="time-integrator-heading"><span className="time-integrator-step" aria-hidden="true">2</span><h2>Elige la oración en kichwa.</h2></div>
            <article className="time-integrator-challenge"><TimeMorphemeIllustration cell={5} description="Una persona trabaja en el campo." /><div><p className="time-integrator-target">Mañana trabajaré.</p>{timeOptions(exercise.elements.find(item => item.id === 'sentence')!, true)}</div></article>
        </>}
    </section>;
}
