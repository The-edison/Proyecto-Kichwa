import { useState, type CSSProperties } from 'react';
import { CheckCircle2, Paintbrush, RotateCcw, Volume2 } from 'lucide-react';
import { ColorObjectVisual, practiceColors } from './ColorObjectVisual';
import { useLessonAudio, type LessonAudioClip } from '../hooks/useLessonAudio';
import type { Exercise, ExerciseAnswer, ExerciseFeedback } from '../types';
import '../../css/colors-practice.css';

const clips: Record<string, LessonAudioClip> = {
    'c-audio-1': 'color-waylla', 'c-audio-2': 'color-waminsi', 'c-audio-3': 'color-paku',
    'c-hat': 'color-sentence-hat', 'c-cat': 'animal-color-example', 'c-pants': 'color-sentence-pants',
    'c-shawl': 'color-sentence-shawl', 'c-necklace': 'color-sentence-necklace', 'c-shoes': 'color-sentence-shoes',
    'c-understand-pants': 'color-sentence-pants', 'c-understand-hat': 'color-sentence-hat', 'c-understand-cat': 'animal-color-example',
};
const numbers: Record<string, number> = { apply: 1, listen: 3, understand: 4, interpret: 5, meaning: 6, complete: 7, order: 8 };
const picturedColors: Record<string, string> = { 'c-hat': 'yurak', 'c-pants': 'yana', 'c-shawl': 'puka' };

export function ColorsPracticePanel({ exercises, answers, feedback, busy, onChange }: {
    exercises: Exercise[]; answers: Record<number, ExerciseAnswer>; feedback: Record<number, ExerciseFeedback | undefined>;
    busy: boolean; onChange: (exercise: Exercise, answer: ExerciseAnswer) => void;
}) {
    const { state, play } = useLessonAudio();
    const [selectedColor, setSelectedColor] = useState('');
    return <section className={`colors-panel${exercises.length === 2 ? ' has-two' : ''}`} aria-label={`Panel ${exercises[0]?.config?.color_panel} de 5: ejercicios de colores`}>
        {exercises.map(exercise => {
            const activity = exercise.config?.color_activity ?? '';
            const result = feedback[exercise.id];
            const disabled = busy || result?.is_correct === true;
            const values = answers[exercise.id]?.textos ?? {};
            const correct = Object.values(result?.item_results ?? {}).filter(Boolean).length;
            const painting = activity === 'apply' || activity === 'interpret';
            const fill = (id: string, value: string) => { if (!disabled) onChange(exercise, { textos: { ...values, [id]: value } }); };
            function swatches(options: string[], selected: string, choose: (color: string) => void, labels: boolean) {
                return options.map(color => <button type="button" key={color} className={`color-swatch${selected === color ? ' is-selected' : ''}`} style={{ '--swatch': practiceColors[color]?.hex } as CSSProperties} disabled={disabled} aria-label={`${practiceColors[color]?.meaning ?? color}${labels ? ` (${color})` : ''}`} aria-pressed={selected === color} onClick={() => choose(color)}><span aria-hidden="true">{selected === color && <CheckCircle2 size={18}/>}</span>{labels && <small lang="qu">{color}</small>}</button>);
            }
            return <article data-exercise-correct={result?.is_correct} key={exercise.id} className={`colors-card colors-${activity}${result?.is_correct ? ' is-correct' : ''}`}>
                <header className="colors-card-header"><div><span className="colors-activity-number">Actividad {String(numbers[activity]).padStart(2, '0')}</span><h2>{exercise.config?.title}</h2></div><strong className="colors-count" aria-label={`${correct} de ${exercise.elements.length} respuestas correctas`}>{correct} de {exercise.elements.length}</strong></header>
                <p className="colors-instructions">{exercise.prompt}</p>
                <div className="colors-rows">{exercise.elements.map((element, index) => {
                    const value = values[element.id] ?? '';
                    const rowResult = result?.item_results?.[element.id] ?? result?.is_correct;
                    const clip = (activity === 'listen' || activity === 'understand' || activity === 'interpret') ? clips[element.id] : undefined;
                    const active = state.clip === clip && ['loading', 'playing'].includes(state.phase);
                    const words = value.trim() ? value.trim().split(/\s+/) : [];
                    return <div data-answer-correct={rowResult} key={element.id} className={`colors-row${rowResult === true ? ' is-correct' : rowResult === false ? ' is-incorrect' : ''}`}>
                        <span className="colors-row-number" aria-hidden="true">{index + 1}</span>
                        {painting ? <button data-answer-control={Boolean(value)} type="button" className={`colors-paint-object${value ? ' is-painted' : ''}`} disabled={disabled || !selectedColor} aria-label={`Pintar objeto ${index + 1} del ejercicio ${numbers[activity]}${selectedColor ? ` con ${practiceColors[selectedColor]?.meaning.toLowerCase()}` : ': elige un color'}`} onClick={() => { if (selectedColor && element.opciones?.includes(selectedColor)) fill(element.id, selectedColor); }}>
                            <ColorObjectVisual object={element.id.slice(2)} color={value || undefined}/>{activity === 'apply' && <strong lang="qu">{element.texto}</strong>}<span className="sr-only">{value ? `Color aplicado: ${practiceColors[value]?.meaning}` : 'Sin pintar'}</span>
                        </button> : activity === 'complete' ? <ColorObjectVisual object={element.id.slice(2)} color={picturedColors[element.id]}/> : null}
                        <div className="colors-row-content">
                            {clip && <button type="button" className={`colors-audio${active ? ' is-playing' : ''}`} aria-label={`Escuchar audio ${index + 1} del ejercicio ${numbers[activity]}`} aria-pressed={active} onClick={() => play(clip)}><Volume2 size={20} aria-hidden="true"/><span>{activity === 'interpret' ? 'Escuchar' : element.texto}</span></button>}
                            {activity === 'interpret' && <p className="colors-sentence" lang="qu">{element.texto}</p>}
                            {activity === 'listen' ? <div className="colors-listening-options" role="group" aria-label={`Muestras para el audio ${index + 1}`}>{swatches(element.opciones ?? [], value, color => fill(element.id, color), false)}</div>
                            : activity === 'understand' || activity === 'meaning' ? <label className="colors-select">
                                {activity === 'meaning' && <span className="colors-sentence" lang="qu">{element.texto}</span>}<span className="sr-only">Significado de la oración {index + 1} del ejercicio {numbers[activity]}</span>
                                <select disabled={disabled} aria-label={`Significado de la oración ${index + 1} del ejercicio ${numbers[activity]}`} value={value} onChange={event => fill(element.id, event.target.value)}><option value="">Elige el significado</option>{element.opciones?.map(option => <option key={option} value={option}>{option}</option>)}</select>
                            </label> : activity === 'complete' ? <label className="colors-complete"><span className="sr-only">Color que falta en la oración {index + 1}</span><span lang="qu">{element.texto.split('_____')[0]}</span><span><input type="text" lang="qu" maxLength={40} autoComplete="off" autoCapitalize="none" spellCheck={false} disabled={disabled} aria-label={`Color que falta en la oración ${index + 1}`} value={value} placeholder="Escribe aquí" onChange={event => fill(element.id, event.target.value)}/><span lang="qu">{element.texto.split('_____')[1]}</span></span></label>
                            : activity === 'order' ? <>
                                <p className="colors-sentence">{element.texto}</p>
                                <div className="colors-order-slots" role="group" aria-label={`Oración ${index + 1} construida`}>{element.opciones?.map((_, slot) => <button data-answer-control={Boolean(words[slot])} type="button" key={slot} disabled={disabled || !words[slot]} aria-label={words[slot] ? `Quitar ${words[slot]} de la oración ${index + 1}` : `Posición ${slot + 1} vacía de la oración ${index + 1}`} onClick={() => fill(element.id, words.filter((__, position) => position !== slot).join(' '))}>{words[slot] || <span aria-hidden="true">···</span>}</button>)}</div>
                                <div className="colors-order-bank">{element.opciones?.map(word => <button type="button" key={word} disabled={disabled || words.includes(word)} onClick={() => fill(element.id, [...words, word].join(' '))}>{word}</button>)}<button type="button" className="colors-reset" disabled={disabled || !value} aria-label={`Reiniciar oración ${index + 1}`} onClick={() => fill(element.id, '')}><RotateCcw size={19} aria-hidden="true"/></button></div>
                            </> : null}
                            {clip && state.clip === clip && state.phase !== 'idle' && <p className={`colors-audio-status${state.phase === 'error' ? ' is-error' : ''}`} role="status">{state.phase === 'error' ? 'No se pudo reproducir el audio. Vuelve a pulsar Escuchar para reintentar.' : state.phase === 'loading' ? 'Cargando audio…' : 'Escuchando…'}</p>}
                        </div>
                        {rowResult !== undefined && <span className={`colors-row-result${rowResult ? ' is-correct' : ' is-incorrect'}`} role="status">{rowResult ? 'Correcta' : 'Revisa esta respuesta'}</span>}
                    </div>;
                })}</div>
                {painting && <div className="colors-palette"><p><Paintbrush size={16} aria-hidden="true"/>{selectedColor ? `Color elegido: ${practiceColors[selectedColor]?.meaning}. Toca un objeto.` : 'Elige un color y toca un objeto.'}</p><div role="group" aria-label={`Paleta del ejercicio ${numbers[activity]}`}>{swatches(exercise.elements[0]?.opciones ?? [], selectedColor, setSelectedColor, activity === 'interpret')}</div></div>}
                {activity === 'complete' && <p className="colors-tip">Completa con la forma terminada en <strong>-mi</strong>.</p>}
                {result && <p className={`colors-exercise-result${result.is_correct ? ' is-correct' : ' is-incorrect'}`} role="status">{result.is_correct ? 'Ejercicio completo' : 'Revisa las respuestas marcadas'}</p>}
            </article>;
        })}
    </section>;
}
