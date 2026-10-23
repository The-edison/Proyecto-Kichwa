import { CheckCircle2, RotateCcw, Volume2 } from 'lucide-react';
import { useLessonAudio, type LessonAudioClip } from '../hooks/useLessonAudio';
import { feedbackMessage, mediaUrl } from './ExerciseCard';
import type { Exercise, ExerciseAnswer, ExerciseFeedback } from '../types';
import '../../css/pronouns-practice.css';

const scenes: Record<string, { cell: number; description: string }> = {
    yo: { cell: 0, description: 'Una mujer se señala a sí misma.' },
    tu: { cell: 1, description: 'Un joven habla directamente con una mujer.' },
    el: { cell: 2, description: 'Un joven señala a otro hombre.' },
    nosotros: { cell: 3, description: 'El hablante se incluye en un grupo de tres amigos.' },
    ustedes: { cell: 4, description: 'Una mujer se dirige a dos personas.' },
    ellos: { cell: 5, description: 'Un joven señala a un grupo separado de él.' },
    trabajamos: { cell: 6, description: 'Tres personas trabajan juntas en un huerto.' },
    'no-trabajan': { cell: 7, description: 'Un joven habla con dos personas que no están trabajando.' },
    vigilan: { cell: 8, description: 'Un grupo observa el paisaje con binoculares.' },
    comer: { cell: 0, description: 'Una mujer representa a la persona que habla: yo.' },
};
const clips: Record<string, LessonAudioClip> = { audio1: 'u3-audio-1', audio2: 'u3-audio-2', audio3: 'u3-audio-3' };

export function PronounsPracticePanel({ exercises, answers, feedback, busy, start, onChange }: {
    exercises: Exercise[];
    answers: Record<number, ExerciseAnswer>;
    feedback: Record<number, ExerciseFeedback | undefined>;
    busy: boolean;
    start: number;
    onChange: (exercise: Exercise, answer: ExerciseAnswer) => void;
}) {
    const { state, play } = useLessonAudio();
    return <section className="pronouns-panel" aria-label={`Panel ${Math.ceil(start / 2)} de 3: dos ejercicios de pronombres`}>
        {exercises.map((exercise, index) => {
            const activity = exercise.config?.pronouns_activity;
            const listening = activity === 'listening' || activity === 'listening-pronouns';
            const ordering = activity === 'order';
            const answer = answers[exercise.id] ?? {};
            const result = feedback[exercise.id];
            const disabled = busy || result?.is_correct === true;
            const filled = exercise.elements.filter(element => {
                const text = answer.textos?.[element.id]?.trim();
                return ordering ? Boolean(text && text.split(/\s+/).length === element.opciones?.length) : Boolean(text);
            }).length;
            const fill = (id: string, value: string) => {
                if (!disabled) onChange(exercise, { textos: { ...answer.textos, [id]: value } });
            };
            return <article data-exercise-correct={result?.is_correct} className={`pronouns-card${result ? result.is_correct ? ' is-correct' : ' is-incorrect' : ''}`} key={exercise.id}>
                <header className="pronouns-card-heading">
                    <div><h2><span>{start + index}.</span> {exercise.config?.title}</h2><p>{exercise.prompt}</p></div>
                    <span className="pronouns-counter" aria-label={`${filled} de 3 respuestas completas`}>{result?.is_correct ? <CheckCircle2 size={15} aria-hidden="true" /> : null}{filled} de 3</span>
                </header>
                <div className="pronouns-rows">{exercise.elements.map((element, row) => {
                    const scene = scenes[element.id];
                    const value = answer.textos?.[element.id] ?? '';
                    const clip = clips[element.id];
                    const active = listening && state.clip === clip && (state.phase === 'playing' || state.phase === 'loading');
                    const audioError = listening && state.clip === clip && state.phase === 'error';
                    const [meaning, sentence] = element.texto.split(' · ');
                    const selected = value.trim() ? value.trim().split(/\s+/) : [];
                    const used = new Map<string, number>();
                    selected.forEach(word => used.set(word, (used.get(word) ?? 0) + 1));
                    return <div data-answer-correct={result?.item_results?.[element.id] ?? result?.is_correct} className={`pronouns-row${listening ? ' is-listening' : ''}${ordering ? ' is-ordering' : ''}${activity === 'complete' ? ' is-completing' : ''}`} key={element.id}>
                        <span className="pronouns-row-number" aria-hidden="true">{row + 1}</span>
                        {!listening && element.imagen && scene && <div className="pronouns-illustration" role="img" aria-label={scene.description} style={{ backgroundImage: `url("${mediaUrl(element.imagen)}")`, backgroundPosition: `${(scene.cell % 3) * 50}% ${Math.floor(scene.cell / 3) * 50}%` }} />}
                        <div className="pronouns-row-content">
                            {listening ? <div className={`pronouns-audio${active ? ' is-playing' : ''}${audioError ? ' is-error' : ''}`}>
                                <button type="button" aria-label={`Escuchar audio ${row + 1} del ejercicio ${start + index}`} onClick={() => play(clip)}><Volume2 size={20} aria-hidden="true" /><span>{audioError ? 'Reintentar' : `Audio ${row + 1}`}</span></button>
                            </div> : <p className="pronouns-meaning">{meaning}</p>}
                            {ordering ? <fieldset className="pronouns-order" disabled={disabled}>
                                <legend className="sr-only">Construye la oración {row + 1}: {meaning}</legend>
                                <div className="pronouns-order-answer" aria-label={`Oración ${row + 1} construida`}>
                                    {Array.from({ length: element.opciones?.length ?? 0 }, (_, position) => <button data-answer-control={Boolean(selected[position])} type="button" key={position} disabled={!selected[position] || disabled} className={selected[position] ? 'is-filled' : ''} aria-label={selected[position] ? `Quitar ${selected[position]} de la posición ${position + 1}` : `Posición ${position + 1} vacía`} onClick={() => fill(element.id, selected.filter((_, i) => i !== position).join(' '))}>{selected[position] || <span aria-hidden="true">···</span>}</button>)}
                                    <button type="button" className="pronouns-reset" disabled={disabled || !selected.length} aria-label={`Reiniciar oración ${row + 1}`} onClick={() => fill(element.id, '')}><RotateCcw size={16} aria-hidden="true" /></button>
                                </div>
                                <div className="pronouns-order-bank" aria-label={`Palabras para la oración ${row + 1}`}>
                                    {element.opciones?.map((word, position) => {
                                        const consumed = (used.get(word) ?? 0) > 0;
                                        if (consumed) used.set(word, (used.get(word) ?? 0) - 1);
                                        return <button type="button" key={position} disabled={disabled || consumed} onClick={() => fill(element.id, [...selected, word].join(' '))}>{word}</button>;
                                    })}
                                </div>
                            </fieldset> : <label className="pronouns-select-label">
                                <span className="sr-only">{listening ? `Respuesta al audio ${row + 1}` : `Pronombre para ${meaning}`} del ejercicio {start + index}</span>
                                <span className="pronouns-sentence" lang={activity === 'listening' ? 'es' : 'qu'}>
                                    <select className="field" disabled={disabled} value={value} onChange={event => fill(element.id, event.target.value)}>
                                        <option value="">{activity === 'listening' ? 'Elige el significado' : 'Selecciona'}</option>
                                        {element.opciones?.map(option => <option key={option} value={option}>{option}</option>)}
                                    </select>{sentence?.replace('_____', '').trim()}
                                </span>
                            </label>}
                            {listening && state.clip === clip && state.message && <p className="sr-only" role="status">{state.message}</p>}
                        </div>
                    </div>;
                })}</div>
                {result && <p className={`pronouns-result ${result.is_correct ? 'is-correct' : 'is-incorrect'}`} role="status">
                    {result.is_correct && <CheckCircle2 size={16} aria-hidden="true" />}<strong>Ejercicio {start + index}: {result.is_correct ? 'correcto' : 'revisa tus respuestas'}</strong><span className="sr-only">{feedbackMessage(result.feedback)}</span>
                </p>}
            </article>;
        })}
    </section>;
}
