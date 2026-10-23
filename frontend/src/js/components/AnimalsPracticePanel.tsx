import { useState, type CSSProperties } from 'react';
import { CheckCircle2, RotateCcw, Volume2 } from 'lucide-react';
import { useLessonAudio, type LessonAudioClip } from '../hooks/useLessonAudio';
import { mediaUrl } from './ExerciseCard';
import type { Exercise, ExerciseAnswer, ExerciseFeedback } from '../types';
import '../../css/animals-practice.css';

const cells: Record<string, number> = {
    'd-dog': 0, 'd-cat': 1, 'd-hen': 2, 'd-sheep': 3, 'd-cuy': 4, 'd-cow': 5,
    'd-audio-1': 6, 'd-audio-2': 7, 'd-audio-3': 8, 'd-audio-4': 9,
    'd-mama': 10, 'd-boy': 11, 'd-jose': 12,
    'w-deer': 0, 'w-mouse': 1, 'w-partridge': 2, 'w-dove': 3, 'w-weasel': 4, 'w-opossum': 5,
    'w-audio-1': 6, 'w-audio-2': 7, 'w-audio-3': 8, 'w-beetle': 9, 'w-monkey': 10, 'w-vulture': 11,
    'w-butterfly': 6, 'w-frog': 7, 'w-hummingbird': 8, 'w-wolf': 15, 'w-chimborazo': 13, 'w-cotopaxi': 14,
};
const clips: Record<string, LessonAudioClip> = {
    'd-audio-1': 'animal-kuchi', 'd-audio-2': 'animal-kunu', 'd-audio-3': 'animal-apiw', 'd-audio-4': 'animal-chantasu',
    'd-sentence-1': 'm2-domestic-1', 'd-sentence-2': 'm2-domestic-2', 'd-sentence-3': 'm2-domestic-3',
    'w-audio-1': 'animal-pilpintu', 'w-audio-2': 'animal-hampatu', 'w-audio-3': 'animal-kinti',
    'w-frog': 'animal-hampatu', 'w-butterfly': 'animal-pilpintu', 'w-hummingbird': 'animal-kinti',
};
const references: Record<string, string[]> = { domestic: ['Cerdo', 'Conejo', 'Caballo', 'Burro'], wild: ['Mariposa', 'Rana', 'Colibrí'] };
export function AnimalScene({ image, id, description }: { image?: string; id: string; description: string }) {
    const cell = cells[id] ?? 0;
    return <span className="animals-practice-scene" role="img" aria-label={description} style={{ backgroundImage: `url("${mediaUrl(image)}")`,
        backgroundPosition: `${(cell % 4) * 100 / 3}% ${Math.floor(cell / 4) * 100 / 3}%` } as CSSProperties} />;
}

export function AnimalsPracticePanel({ exercise, answer, feedback, busy, onChange }: {
    exercise: Exercise; answer: ExerciseAnswer; feedback?: ExerciseFeedback; busy: boolean; onChange: (answer: ExerciseAnswer) => void;
}) {
    const { state, play } = useLessonAudio();
    const [selectedLabel, setSelectedLabel] = useState('');
    const activity = exercise.config?.animal_activity;
    const combined = activity === 'understand-complete';
    const group = exercise.config?.animal_group ?? 'domestic';
    const disabled = busy || feedback?.is_correct === true;
    const values = answer.textos ?? {};
    const correct = Object.values(feedback?.item_results ?? {}).filter(Boolean).length;
    const counts: Record<string, number> = group === 'domestic' ? { identify: 1, listen: 2, understand: 3, complete: 3, 'understand-complete': 3, order: 4 } : { identify: 1, listen: 2, labels: 3, write: 4, order: 4 };
    const rows = combined ? exercise.elements.filter((_, index) => index % 2 === 0) : exercise.elements;
    function fill(id: string, value: string) { if (!disabled) onChange({ textos: { ...values, [id]: value } }); }
    function place(id: string, word: string) {
        if (disabled || !exercise.elements.find(item => item.id === id)?.opciones?.includes(word)) return;
        const next = { ...values };
        for (const key of Object.keys(next)) if (next[key] === word) next[key] = '';
        next[id] = word; onChange({ textos: next }); setSelectedLabel('');
    }
    return <section data-exercise-correct={feedback?.is_correct} className={`animals-practice animals-practice-${activity}`} aria-label={`${group === 'domestic' ? 'Animales domésticos' : 'Animales salvajes'}: ${exercise.config?.title}`}>
        <div className="animals-practice-meta"><span>{group === 'domestic' ? 'Animales domésticos' : 'Animales salvajes'} · Actividad {counts[activity ?? '']} de 4</span><strong aria-label={`${correct} de ${exercise.elements.length} respuestas correctas`}>{correct} de {exercise.elements.length}</strong></div>
        <div className="animals-practice-rows">{rows.map((element, index) => {
            const value = values[element.id] ?? '';
            const parts = value.trim() ? value.trim().split(/\s+/) : [];
            const meaningResult = feedback?.item_results?.[element.id] ?? feedback?.is_correct;
            const completion = combined ? exercise.elements[index * 2 + 1] : undefined;
            const completionResult = completion ? feedback?.item_results?.[completion.id] ?? feedback?.is_correct : undefined;
            const rowResult = combined ? meaningResult === undefined || completionResult === undefined ? undefined : meaningResult && completionResult : meaningResult;
            const clip = clips[element.id];
            const active = state.clip === clip && ['loading', 'playing'].includes(state.phase);
            const [meaning, sentence] = element.texto.split(' · ');
            return <div data-answer-correct={rowResult} key={element.id} className={`animals-practice-row${rowResult === true ? ' is-correct' : rowResult === false ? ' is-incorrect' : ''}`}>
                <span className="animals-practice-number" aria-hidden="true">{index + 1}</span>
                {(['identify', 'complete', 'order', 'labels', 'write'].includes(activity ?? '') || combined) && <AnimalScene image={element.imagen} id={completion?.id ?? element.id} description={combined ? `Escena de la oración ${index + 1}` : activity === 'identify' || activity === 'write' ? `Animal ${index + 1} para reconocer` : meaning} />}
                <div className="animals-practice-row-content">
                    {clip && <button type="button" className={`animals-practice-audio${active ? ' is-playing' : ''}`} aria-label={`Escuchar ${activity === 'understand' || combined ? 'oración' : 'audio'} ${index + 1}`} aria-pressed={active} onClick={() => play(clip)}><Volume2 size={23} aria-hidden="true" /><span>{combined ? 'Escuchar oración' : activity === 'understand' ? <span lang="qu">{element.texto}</span> : activity === 'write' ? 'Escuchar' : element.texto}</span></button>}
                    {combined && completion ? <>
                        <label data-answer-correct={completionResult} className="animals-practice-choice is-sentence animals-practice-combined-sentence">
                            <span className="sr-only">Completar oración {index + 1}</span>
                            <span><span lang="qu">{completion.texto.split('_____')[0]}</span><select aria-label={`Completar oración ${index + 1}`} aria-invalid={completionResult === false} disabled={disabled} value={values[completion.id] ?? ''} onChange={event => fill(completion.id, event.target.value)}><option value="">Selecciona</option>{completion.opciones?.map(option => <option key={option} value={option}>{option}</option>)}</select><span lang="qu">{completion.texto.split('_____')[1]}</span></span>
                            {completionResult !== undefined && <span className={`animals-practice-row-result ${completionResult ? 'is-correct' : 'is-incorrect'}`} role="status">{completionResult ? 'Palabra correcta' : 'Revisa la palabra que falta'}</span>}
                        </label>
                        <label data-answer-correct={meaningResult} className="animals-practice-choice animals-practice-combined-meaning">
                            <span className="sr-only">Significado de la oración {index + 1}</span>
                            <select aria-label={`Significado de la oración ${index + 1}`} aria-invalid={meaningResult === false} disabled={disabled} value={value} onChange={event => fill(element.id, event.target.value)}><option value="">Elige el significado</option>{element.opciones?.map(option => <option key={option} value={option}>{option}</option>)}</select>
                            {meaningResult !== undefined && <span className={`animals-practice-row-result ${meaningResult ? 'is-correct' : 'is-incorrect'}`} role="status">{meaningResult ? 'Significado correcto' : 'Revisa el significado'}</span>}
                        </label>
                    </> : activity === 'order' ? <>
                        <p className="animals-practice-meaning">{element.texto}</p>
                        <div className="animals-practice-slots" role="group" aria-label={`Tu oración ${index + 1}`}>
                            {(element.opciones ?? []).map((_, slot) => <span className="animals-practice-slot" key={slot}>{parts[slot] ? <button data-answer-control type="button" disabled={disabled} aria-label={`Quitar ${parts[slot]} de la oración ${index + 1}`} onClick={() => fill(element.id, parts.filter((__, position) => position !== slot).join(' '))}>{parts[slot]}</button> : <span aria-label={`Posición ${slot + 1} vacía`} />}</span>)}
                        </div>
                        <div className="animals-practice-word-bank">{element.opciones?.map(word => <button type="button" key={word} disabled={disabled || parts.includes(word)} onClick={() => fill(element.id, [...parts, word].join(' '))}>{word}</button>)}<button type="button" disabled={disabled || !value} className="animals-practice-reset" aria-label={`Reiniciar oración ${index + 1}`} onClick={() => fill(element.id, '')}><RotateCcw size={20} aria-hidden="true" /></button></div>
                    </> : activity === 'labels' ? <><span className="animals-practice-meaning">{element.texto}</span><button data-answer-control={Boolean(value)} type="button" className={`animals-practice-drop${selectedLabel ? ' is-ready' : ''}`} disabled={disabled} aria-label={`Etiqueta de ${element.texto}: ${value || 'sin colocar'}`} onDragOver={event => { if (!disabled) event.preventDefault(); }} onDrop={event => { event.preventDefault(); place(element.id, event.dataTransfer.getData('text/plain')); }} onClick={() => selectedLabel ? place(element.id, selectedLabel) : fill(element.id, '')}>{value || 'Coloca el nombre aquí'}</button></>
                    : activity === 'write' ? <label className="sr-label"><span className="sr-only">Nombre en kichwa del animal {index + 1}</span><input lang="qu" aria-label={`Nombre en kichwa del animal ${index + 1}`} type="text" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={80} disabled={disabled} value={value} placeholder="Escribe aquí" onChange={event => fill(element.id, event.target.value)} /></label>
                    : <label className={`animals-practice-choice${activity === 'complete' ? ' is-sentence' : ''}`}>
                        <span className={activity === 'complete' ? 'animals-practice-meaning' : 'sr-only'}>{activity === 'complete' ? meaning : activity === 'identify' ? `Nombre en kichwa del animal ${index + 1}` : `Respuesta ${index + 1}`}</span>
                        <span>{activity === 'complete' && <span lang="qu">{sentence?.split('_____')[0]}</span>}<select aria-label={`${activity === 'complete' ? 'Completar oración' : activity === 'identify' ? 'Identificar animal' : 'Respuesta'} ${index + 1}`} disabled={disabled} value={value} onChange={event => fill(element.id, event.target.value)}><option value="">{activity === 'listen' ? 'Elige el animal' : activity === 'understand' ? 'Elige el significado' : 'Selecciona'}</option>{element.opciones?.map(option => <option key={option} value={option}>{option}</option>)}</select>{activity === 'complete' && <span lang="qu">{sentence?.split('_____')[1]}</span>}</span>
                    </label>}
                    {clip && state.clip === clip && state.message && <p className={`animals-practice-audio-status${state.phase === 'error' ? ' is-error' : ''}`} role="status">{state.message}</p>}
                </div>
                {!combined && rowResult !== undefined && <span className={`animals-practice-row-result ${rowResult ? 'is-correct' : 'is-incorrect'}`} role="status">{rowResult ? <CheckCircle2 size={18} aria-hidden="true" /> : null}{rowResult ? 'Correcta' : 'Revisa esta respuesta'}</span>}
            </div>;
        })}</div>
        {activity === 'listen' && <div className="animals-practice-references" aria-label="Animales disponibles">{references[group].map((name, index) => <figure key={name}><AnimalScene image={exercise.elements[0]?.imagen} id={`${group === 'domestic' ? 'd' : 'w'}-audio-${index + 1}`} description={name} /><figcaption>{name}</figcaption></figure>)}</div>}
        {activity === 'identify' && <p className="animals-practice-options">Opciones: {[...new Set(exercise.elements.flatMap(element => element.opciones ?? []))].join(' · ')}</p>}
        {activity === 'identify' && group === 'wild' && <p className="animals-practice-help">Chukuri: comadreja · Chucha: raposa.</p>}
        {activity === 'labels' && <div className="animals-practice-label-bank" aria-label="Nombres disponibles">{exercise.elements[0]?.opciones?.map(word => <button type="button" key={word} draggable={!disabled && !Object.values(values).includes(word)} disabled={disabled || Object.values(values).includes(word)} aria-pressed={selectedLabel === word} onDragStart={event => { if (disabled) return; setSelectedLabel(word); event.dataTransfer.setData('text/plain', word); }} onClick={() => setSelectedLabel(previous => previous === word ? '' : word)}>{word}</button>)}</div>}
    </section>;
}
