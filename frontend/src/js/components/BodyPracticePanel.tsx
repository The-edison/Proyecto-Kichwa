import { useState, type CSSProperties } from 'react';
import { CheckCircle2, RotateCcw, Volume2 } from 'lucide-react';
import { mediaUrl } from './ExerciseCard';
import { useLessonAudio, type LessonAudioClip } from '../hooks/useLessonAudio';
import type { Exercise, ExerciseAnswer, ExerciseFeedback } from '../types';
import '../../css/body-practice.css';

const activityNumbers: Record<string, number> = { locate: 1, details: 2, recognize: 3, listen: 4, understand: 5, order: 7 };
const cells: Record<string, number> = { 'b-nawi': 0, 'b-rinri': 1, 'b-shimi': 2, 'b-kiru': 3, 'b-hallu': 4, 'b-chaki-washa': 5, 'b-kunkuri': 6, 'b-wiksa': 7, 'b-washa': 8, 'b-sentence-head': 9, 'b-sentence-belly': 10, 'b-sentence-foot': 11, 'b-sentence-throat': 12 };
const audioClips: Record<string, LessonAudioClip> = { 'b-audio-1': 'body-rinri', 'b-audio-2': 'body-maki', 'b-audio-3': 'body-chaki-washa', 'b-sentence-head': 'body-sentence-head', 'b-sentence-belly': 'body-sentence-belly', 'b-sentence-foot': 'body-example', 'b-sentence-throat': 'body-sentence-throat' };
const positions: Record<string, { point: [number, number]; slot: [number, number]; width: number }> = {
    'b-uma': { point: [29.5, 5.5], slot: [1, 7], width: 18 },
    'b-kunka': { point: [29.4, 16], slot: [44, 14], width: 18 },
    'b-rikra': { point: [19.5, 35], slot: [0, 33], width: 16 },
    'b-maki': { point: [16, 51], slot: [0, 55], width: 15 },
    'b-wiksa': { point: [29.3, 42], slot: [44, 42], width: 18 },
    'b-kunkuri': { point: [25, 69], slot: [1, 70], width: 18 },
    'b-chaki': { point: [23, 91], slot: [1, 91], width: 18 },
    'b-washa': { point: [74.3, 21], slot: [84, 26], width: 16 },
    'b-ruka': { point: [69.3, 64], slot: [54, 61], width: 14 },
    'b-sillu': { point: [74.7, 57.3], slot: [84, 63], width: 16 },
};

export function BodyPracticeScene({ image, id, description }: { image?: string; id: string; description: string }) {
    const cell = cells[id] ?? 0;
    const x = [10, 323, 638, 948][cell % 4];
    const [y, height] = [[10, 284], [310, 245], [566, 300], [879, 342]][Math.floor(cell / 4)];
    const width = 294;
    return <span className="body-practice-scene" role="img" aria-label={description} style={{ backgroundImage: `url("${mediaUrl(image)}")`, backgroundSize: `${1254 / width * 100}% ${1254 / height * 100}%`, backgroundPosition: `${x / (1254 - width) * 100}% ${y / (1254 - height) * 100}%` }}/>
}

export function BodyPracticePanel({ exercises, answers, feedback, busy, onChange }: {
    exercises: Exercise[]; answers: Record<number, ExerciseAnswer>; feedback: Record<number, ExerciseFeedback | undefined>;
    busy: boolean; onChange: (exercise: Exercise, answer: ExerciseAnswer) => void;
}) {
    const { state, play } = useLessonAudio();
    const [selectedWord, setSelectedWord] = useState('');
    return <section className={`body-practice-panel${exercises.length === 2 ? ' has-two' : ''}`} aria-label={`Panel ${exercises[0]?.config?.body_panel} de 4: ejercicios del cuerpo humano`}>
        {exercises.map(exercise => {
            const activity = exercise.config?.body_activity ?? '';
            const number = activityNumbers[activity];
            const result = feedback[exercise.id];
            const disabled = busy || result?.is_correct === true;
            const values = answers[exercise.id]?.textos ?? {};
            const correct = Object.values(result?.item_results ?? {}).filter(Boolean).length;
            const fill = (id: string, value: string) => { if (!disabled) onChange(exercise, { textos: { ...values, [id]: value } }); };
            function place(id: string, word: string) {
                if (disabled || !exercise.elements.find(element => element.id === id)?.opciones?.includes(word)) return;
                const next = { ...values };
                for (const key of Object.keys(next)) if (next[key] === word) next[key] = '';
                next[id] = word;
                onChange(exercise, { textos: next }); setSelectedWord('');
            }
            function target(id: string, index: number) {
                const rowResult = result?.item_results?.[id] ?? result?.is_correct;
                return <button data-answer-correct={rowResult} type="button" className={`body-drop${rowResult === true ? ' is-correct' : rowResult === false ? ' is-incorrect' : ''}${selectedWord ? ' is-ready' : ''}`} disabled={disabled} aria-label={`Zona ${index + 1} del ejercicio ${number}: ${values[id] || 'sin etiqueta'}`} aria-invalid={rowResult === false} onDragOver={event => { if (!disabled) event.preventDefault(); }} onDrop={event => { event.preventDefault(); place(id, event.dataTransfer.getData('text/plain')); }} onClick={() => selectedWord ? place(id, selectedWord) : fill(id, '')}>
                    <span className="body-target-number">{index + 1}</span><span lang="qu">{values[id] || 'Coloca aquí'}</span>{rowResult !== undefined && <><span className="body-drop-mark" aria-hidden="true">{rowResult ? '✓' : '!'}</span><span className="sr-only">{rowResult ? 'Correcta' : 'Revisa esta respuesta'}</span></>}
                </button>;
            }
            const bank = <div className="body-word-bank" role="group" aria-label={`Palabras del ejercicio ${number}`}>{exercise.elements[0]?.opciones?.map(word => <button type="button" key={word} lang="qu" disabled={disabled || Object.values(values).includes(word)} draggable={!disabled && !Object.values(values).includes(word)} aria-pressed={selectedWord === word} onDragStart={event => { if (!disabled) { setSelectedWord(word); event.dataTransfer.setData('text/plain', word); } }} onClick={() => setSelectedWord(previous => previous === word ? '' : word)}>{word}</button>)}</div>;
            return <article data-exercise-correct={result?.is_correct} className={`body-practice-card body-practice-${activity}${result?.is_correct ? ' is-correct' : ''}`} key={exercise.id}>
                <header className="body-practice-card-header"><div><span className="body-activity-number">Actividad {String(number).padStart(2, '0')}</span><h2>{exercise.config?.title}</h2></div><strong className="body-practice-count" aria-label={`${correct} de ${exercise.elements.length} respuestas correctas`}>{correct} de {exercise.elements.length}</strong></header>
                <p className="body-practice-instructions">{exercise.prompt}</p>
                {activity === 'locate' ? <div className="body-locate-layout">
                    <div className="body-map"><div className="body-map-picture">
                        <img src={mediaUrl(exercise.elements[0]?.imagen)} alt="Cuerpo de frente, cuerpo de espaldas y detalle de una mano. Las zonas están numeradas del 1 al 10." width={1536} height={1024} decoding="async"/>
                        <svg className="body-map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{exercise.elements.map(element => { const { point, slot, width } = positions[element.id]; return <line key={element.id} x1={point[0]} y1={point[1]} x2={slot[0] < point[0] ? slot[0] + width : slot[0]} y2={slot[1]} />; })}</svg>
                        {exercise.elements.map((element, index) => { const { point } = positions[element.id]; return <span key={element.id} className="body-map-pin" aria-hidden="true" style={{ left: `${point[0]}%`, top: `${point[1]}%` }}>{index + 1}</span>; })}
                    </div><div className="body-map-slots">{exercise.elements.map((element, index) => { const { slot, width } = positions[element.id]; return <div key={element.id} className="body-map-slot" style={{ '--slot-x': `${slot[0]}%`, '--slot-y': `${slot[1]}%`, '--slot-width': `${width}%` } as CSSProperties}>{target(element.id, index)}</div>; })}</div></div>
                    <aside className="body-map-bank"><p>Toca una palabra y luego su zona, o arrástrala.</p>{bank}<button type="button" className="body-reset" disabled={disabled || !Object.values(values).some(Boolean)} onClick={() => { if (!disabled) { onChange(exercise, { textos: {} }); setSelectedWord(''); } }}><RotateCcw size={17} aria-hidden="true"/>Reiniciar etiquetas</button></aside>
                </div> : <>
                    <div className="body-practice-rows">{exercise.elements.map((element, index) => {
                        const value = values[element.id] ?? '';
                        const rowResult = result?.item_results?.[element.id] ?? result?.is_correct;
                        const clip = activity === 'listen' || activity === 'understand' ? audioClips[element.id] : undefined;
                        const active = state.clip === clip && ['loading', 'playing'].includes(state.phase);
                        const words = value.trim() ? value.trim().split(/\s+/) : [];
                        return <div data-answer-correct={rowResult} key={element.id} className={`body-practice-row${rowResult === true ? ' is-correct' : rowResult === false ? ' is-incorrect' : ''}`}>
                            {activity !== 'details' && <span className="body-practice-row-number" aria-hidden="true">{index + 1}</span>}
                            {['details', 'recognize', 'order'].includes(activity) && <BodyPracticeScene image={element.imagen} id={element.id} description={activity === 'order' ? element.texto : `Parte del cuerpo ${index + 1} para reconocer`}/>}
                            <div className="body-practice-row-content">
                                {clip && <button type="button" className={`body-practice-audio${active ? ' is-playing' : ''}`} aria-label={`Escuchar audio ${index + 1} del ejercicio ${number}`} aria-pressed={active} onClick={() => play(clip)}><Volume2 size={21} aria-hidden="true"/><span>{activity === 'understand' ? <span lang="qu">{element.texto}</span> : element.texto}</span></button>}
                                {activity === 'details' ? target(element.id, index) : activity === 'listen' ? <label className="body-practice-writing"><span className="sr-only">Palabra del audio {index + 1}</span><input type="text" lang="qu" aria-label={`Palabra del audio ${index + 1}`} disabled={disabled} value={value} onChange={event => fill(element.id, event.target.value)} maxLength={80} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="Escribe aquí"/></label>
                                : activity === 'order' ? <>
                                    <p className="body-practice-meaning">{element.texto}</p>
                                    <div className="body-order-slots" role="group" aria-label={`Oración ${index + 1} construida`}>{element.opciones?.map((_, slot) => <button data-answer-control={Boolean(words[slot])} type="button" key={slot} disabled={disabled || !words[slot]} aria-label={words[slot] ? `Quitar ${words[slot]} de la oración ${index + 1}` : `Posición ${slot + 1} vacía de la oración ${index + 1}`} onClick={() => fill(element.id, words.filter((__, position) => position !== slot).join(' '))}>{words[slot] || <span aria-hidden="true">···</span>}</button>)}</div>
                                    <div className="body-order-bank">{element.opciones?.map(word => <button type="button" key={word} disabled={disabled || words.includes(word)} onClick={() => fill(element.id, [...words, word].join(' '))}>{word}</button>)}<button type="button" className="body-order-reset" disabled={disabled || !value} aria-label={`Reiniciar oración ${index + 1}`} onClick={() => fill(element.id, '')}><RotateCcw size={18} aria-hidden="true"/></button></div>
                                </> : <label className="body-practice-choice"><span className="sr-only">{activity === 'recognize' ? 'Nombre de la zona' : 'Significado de la oración'} {index + 1}</span><select disabled={disabled} aria-label={`${activity === 'recognize' ? 'Nombre de la zona' : 'Significado de la oración'} ${index + 1}`} value={value} onChange={event => fill(element.id, event.target.value)}><option value="">{activity === 'recognize' ? 'Selecciona' : 'Elige el significado'}</option>{element.opciones?.map(option => <option key={option} value={option}>{option}</option>)}</select></label>}
                                {clip && state.clip === clip && state.phase !== 'idle' && <p className={`body-practice-audio-status${state.phase === 'error' ? ' is-error' : ''}`} role="status">{state.phase === 'error' ? 'No se pudo reproducir el audio. Pulsa Escuchar para reintentar.' : state.phase === 'loading' ? 'Cargando audio…' : 'Escuchando…'}</p>}
                            </div>
                            {rowResult !== undefined && activity !== 'details' && <span className={`body-practice-row-result ${rowResult ? 'is-correct' : 'is-incorrect'}`} role="status">{rowResult ? 'Correcta' : 'Revisa esta respuesta'}</span>}
                        </div>;
                    })}</div>
                    {activity === 'details' && bank}
                </>}
                {result && <p className={`body-practice-result${result.is_correct ? ' is-correct' : ' is-incorrect'}`} role="status">{result.is_correct && <CheckCircle2 size={17} aria-hidden="true"/>}{result.is_correct ? `Actividad ${number}: correcta` : `Actividad ${number}: revisa las respuestas marcadas`}</p>}
            </article>;
        })}
    </section>;
}
