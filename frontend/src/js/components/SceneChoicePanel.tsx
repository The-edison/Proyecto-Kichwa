import { CheckCircle2, Volume2 } from 'lucide-react';
import { useLessonAudio, type LessonAudioClip } from '../hooks/useLessonAudio';
import { feedbackMessage, mediaUrl } from './ExerciseCard';
import type { Exercise, ExerciseAnswer, ExerciseFeedback } from '../types';

export function SceneChoicePanel({ exercises, answers, feedback, busy, onChange }: {
    exercises: Exercise[];
    answers: Record<number, ExerciseAnswer>;
    feedback: Record<number, ExerciseFeedback | undefined>;
    busy: boolean;
    onChange: (exercise: Exercise, answer: ExerciseAnswer) => void;
}) {
    const { state, play } = useLessonAudio();
    return <section className={`scene-choice-panel${exercises.length === 2 ? ' is-pair' : ''}`} aria-label={`${exercises.length} ejercicios de lenguaje en contexto`}>
        {exercises.map(exercise => {
            const answer = answers[exercise.id] ?? {};
            const result = feedback[exercise.id];
            const checked = result?.is_correct === true;
            const question = exercise.config?.conversation_group === 'q';
            const farewell = exercise.config?.conversation_group === 'd';
            const courtesy = exercise.config?.conversation_group === 'c';
            return <article className="scene-choice-card" key={exercise.id}>
                <header><h2>{courtesy ? 'Sé amable según la escena' : farewell ? 'Despídete según la escena' : question ? 'Elige según la escena' : 'Responde según la escena'}</h2><span>{exercise.config?.context_meaning}</span></header>
                <figure className="scene-choice-figure">
                    <img src={mediaUrl(exercise.config?.prompt_image)} alt={exercise.config?.prompt_image_alt ?? 'Escena de una conversación en kichwa'} width={320} height={240} decoding="async" fetchPriority="high" />
                    <figcaption>{exercise.config?.context_text}</figcaption>
                </figure>
                <fieldset className="scene-choice-fieldset">
                    <legend>{courtesy ? '¿Qué expresión de cortesía usarías en kichwa?' : farewell ? '¿Cómo te despedirías en kichwa?' : question ? '¿Cómo harías esta pregunta en kichwa?' : '¿Cómo responderías en kichwa?'}</legend>
                    {exercise.elements.map(option => <div className={`scene-choice-option${answer.seleccion?.includes(option.id) ? ' is-selected' : ''}`} key={option.id}>
                        <label><input type="radio" disabled={busy || checked} name={`guided-${exercise.id}`} value={option.id} checked={answer.seleccion?.includes(option.id) ?? false} onChange={() => { if (!busy && !checked) onChange(exercise, {seleccion:[option.id]}); }} /><span>{option.texto}</span></label>
                        <button type="button" aria-label={`Escuchar ${option.texto}`} title={`Escuchar ${option.texto}`} className={state.clip === option.id && ['loading','playing'].includes(state.phase) ? 'is-playing' : ''} onClick={() => play(option.id as LessonAudioClip)}><Volume2 size={19} aria-hidden="true" /></button>
                    </div>)}
                </fieldset>
                {result && <p className={`guided-feedback ${checked ? 'is-correct' : 'is-incorrect'}`} role="status">{checked && <CheckCircle2 size={18} aria-hidden="true" />}<span>{feedbackMessage(result.feedback)}</span></p>}
                <span className="scene-choice-badge">Lenguaje en contexto</span>
            </article>;
        })}
        <p className={state.phase === 'error' ? 'form-error' : 'sr-only'} role="status" aria-live="polite">{state.message}</p>
    </section>;
}
