import { CheckCircle2, RotateCcw } from 'lucide-react';
import { wordOrderDrag } from '../services/wordOrderDrag';
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
                const drag = wordOrderDrag(`sentence:${exercise.id}`, exercise.elements.map(word => word.id), order, disabled, change);
                return <article data-exercise-correct={result?.is_correct} className="scene-choice-card sentence-order-card" key={exercise.id}>
                    <header><h2>Ordena la oración</h2><span>{exercise.config?.context_meaning}</span></header>
                    <figure className="scene-choice-figure"><img src={mediaUrl(exercise.config?.prompt_image)} alt={exercise.config?.prompt_image_alt ?? 'Situación para formar una oración en kichwa'} width={320} height={240} decoding="async" fetchPriority="high" /></figure>
                    <fieldset disabled={disabled}>
                        <legend>{exercise.config?.context_text}</legend>
                        <div className="sentence-order-toolbar"><span>{order.filter(Boolean).length} de {exercise.elements.length} palabras colocadas</span><button type="button" onClick={() => change([])} disabled={disabled || !order.some(Boolean)} aria-label={`Reiniciar ${exercise.config?.context_meaning}`} title="Reiniciar oración"><RotateCcw size={18} aria-hidden="true" /></button></div>
                        <div className="sentence-order-slots" aria-label="Oración formada" {...drag.target()}>
                            {exercise.elements.map((_, index) => order[index] ? <button data-answer-correct={result?.item_results?.[order[index]] ?? result?.is_correct} type="button" key={index} {...drag.target(index)} {...drag.placed(index)} onClick={() => drag.remove(index)} aria-label={`Quitar ${words.get(order[index])}, posición ${index + 1}`}>{words.get(order[index])}</button> : <span className="sentence-order-empty" key={index} {...drag.target(index)} aria-label={`Espacio ${index + 1}`} />)}
                        </div>
                        <div className="sentence-order-words" aria-label="Palabras disponibles">
                            {exercise.elements.map((word, index) => <button type="button" key={word.id} {...drag.source(index)} disabled={disabled || order.includes(word.id)} onClick={() => drag.add(index)}>{word.texto}</button>)}
                        </div>
                    </fieldset>
                    {result && <p className={`guided-feedback ${result.is_correct ? 'is-correct' : 'is-incorrect'}`} role="status">{result.is_correct && <CheckCircle2 size={18} aria-hidden="true" />}<span>{feedbackMessage(result.feedback)}</span></p>}
                </article>;
            })}
        </div>
    </section>;
}
