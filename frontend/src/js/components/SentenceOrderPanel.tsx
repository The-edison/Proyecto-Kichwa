import { CheckCircle2, RotateCcw } from 'lucide-react';
import { feedbackMessage, mediaUrl } from './ExerciseCard';
import type { Exercise, ExerciseAnswer, ExerciseFeedback } from '../types';

export function SentenceOrderPanel({ exercises, answers, feedback, busy, onChange }: {
    exercises: Exercise[];
    answers: Record<number, ExerciseAnswer>;
    feedback: Record<number, ExerciseFeedback | undefined>;
    busy: boolean;
    onChange: (exercise: Exercise, answer: ExerciseAnswer) => void;
}) {
    const completed = exercises.filter(exercise => feedback[exercise.id]?.is_correct).length;
    return <section className="sentence-order-panel" aria-label="Ordena las dos oraciones">
        <div className="sentence-order-progress"><span>{completed} de {exercises.length} completadas</span><progress value={completed} max={exercises.length} aria-label="Oraciones completadas" /></div>
        <div className="scene-choice-panel is-pair">
            {exercises.map(exercise => {
                const order = answers[exercise.id]?.orden ?? [];
                const result = feedback[exercise.id];
                const disabled = busy || result?.is_correct === true;
                const words = new Map(exercise.elements.map(word => [word.id, word.texto]));
                const change = (next: string[]) => { if (!disabled) onChange(exercise, { orden: next }); };
                return <article className="scene-choice-card sentence-order-card" key={exercise.id}>
                    <header><h2>Ordena la oración</h2><span>{exercise.config?.context_meaning}</span></header>
                    <figure className="scene-choice-figure"><img src={mediaUrl(exercise.config?.prompt_image)} alt={exercise.config?.prompt_image_alt ?? 'Situación para formar una oración en kichwa'} width={320} height={240} decoding="async" fetchPriority="high" /></figure>
                    <fieldset disabled={disabled}>
                        <legend>{exercise.config?.context_text}</legend>
                        <div className="sentence-order-toolbar"><span>{order.length} de {exercise.elements.length} palabras colocadas</span><button type="button" onClick={() => change([])} disabled={disabled || !order.length} aria-label={`Reiniciar ${exercise.config?.context_meaning}`} title="Reiniciar oración"><RotateCcw size={18} aria-hidden="true" /></button></div>
                        <div className="sentence-order-slots" aria-label="Oración formada">
                            {exercise.elements.map((_, index) => order[index] ? <button type="button" key={index} onClick={() => change(order.filter((_, position) => position !== index))} aria-label={`Quitar ${words.get(order[index])}, posición ${index + 1}`}>{words.get(order[index])}</button> : <span className="sentence-order-empty" key={index} aria-label={`Espacio ${index + 1}`} />)}
                        </div>
                        <div className="sentence-order-words" aria-label="Palabras disponibles">
                            {exercise.elements.map(word => <button type="button" key={word.id} disabled={disabled || order.includes(word.id)} onClick={() => change([...order, word.id])}>{word.texto}</button>)}
                        </div>
                    </fieldset>
                    {result && <p className={`guided-feedback ${result.is_correct ? 'is-correct' : 'is-incorrect'}`} role="status">{result.is_correct && <CheckCircle2 size={18} aria-hidden="true" />}<span>{feedbackMessage(result.feedback)}</span></p>}
                </article>;
            })}
        </div>
    </section>;
}
