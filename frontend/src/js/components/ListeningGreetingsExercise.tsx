import { RotateCcw, Volume2 } from 'lucide-react';
import { useLessonAudio, type LessonAudioClip } from '../hooks/useLessonAudio';
import type { Exercise, ExerciseAnswer, ExerciseFeedback } from '../types';
import { mediaUrl } from './ExerciseCard';

const clips: Record<string, LessonAudioClip> = {
    'alli-puncha-churi': 'alli-puncha-churi', 'alli-chishi-kusa': 'alli-chishi-kusa', 'alli-tuta-tayta': 'alli-tuta-tayta',
    imatak: 'imatak', 'pitak-kan': 'pitak-kan', imamanta: 'imamanta',
};
const scenes: Record<string, string> = {
    imatak: 'Dos personas conversan mientras observan un recipiente de barro.',
    'pitak-kan': 'Dos mujeres observan a un hombre que llega a la entrada del patio.',
    imamanta: 'Dos personas observan una planta con hojas caídas y tierra seca.',
};

export function ListeningGreetingsExercise({ exercise, answer, feedback, disabled, onChange }: {
    exercise: Exercise;
    answer: ExerciseAnswer;
    feedback?: ExerciseFeedback;
    disabled: boolean;
    onChange: (answer: ExerciseAnswer) => void;
}) {
    const { state, play } = useLessonAudio();
    const questions = exercise.config?.listening_questions === true;
    return <section className={`guided-sentence-panel${questions ? ' is-question-choices' : ''}`} data-exercise-correct={feedback?.is_correct} aria-label={questions ? 'Escucha y elige el significado de las tres preguntas' : 'Completa las tres oraciones según el audio'}>
        {exercise.elements.map((element, index) => {
            const clip = clips[element.id];
            const active = state.clip === clip && ['playing', 'loading'].includes(state.phase);
            const [before, after] = element.texto.split(/_+/);
            return <article className="guided-sentence-item" data-answer-correct={feedback?.item_results?.[element.id] ?? feedback?.is_correct} key={element.id}>
                <h2>{questions ? 'Imagen' : 'Oración'} {index + 1}</h2>
                {questions && <img className="guided-question-image" src={mediaUrl(element.imagen)} alt={scenes[element.id] ?? 'Escena de una pregunta'} width={280} height={210} decoding="async" fetchPriority="high" />}
                <div className={`guided-listening-audio${active ? ' is-active' : ''}`}>
                    <button type="button" aria-label={`Escuchar ${questions ? 'la pregunta' : 'la oración'} ${index + 1}`} onClick={() => play(clip)}><Volume2 size={21} aria-hidden="true" /><span>Escuchar audio</span></button>
                    <button type="button" className="guided-listening-repeat" aria-label={`Repetir ${questions ? 'la pregunta' : 'la oración'} ${index + 1}`} onClick={() => play(clip)}><RotateCcw size={18} aria-hidden="true" /></button>
                </div>
                {!questions && <p className="guided-sentence-text">{before}<span className="guided-sentence-blank" aria-label={answer.textos?.[element.id] ? `Palabra seleccionada: ${answer.textos[element.id]}` : 'Palabra que falta'}>{answer.textos?.[element.id] || '_____'}</span>{after}</p>}
                <fieldset className="guided-choice-options" disabled={disabled}>
                    <legend className="sr-only">{questions ? 'Significado en español de la pregunta' : 'Palabra que completa la oración'} {index + 1}</legend>
                    {element.opciones?.map(option => <label className={answer.textos?.[element.id] === option ? 'is-selected' : ''} key={option}>
                        <input type="radio" name={`guided-${exercise.id}-${element.id}`} value={option} checked={answer.textos?.[element.id] === option} onChange={() => {
                            if (!disabled) onChange({ textos: { ...answer.textos, [element.id]: option } });
                        }} /><span>{option}</span>
                    </label>)}
                </fieldset>
            </article>;
        })}
        <p className={state.phase === 'error' ? 'form-error' : 'sr-only'} role="status" aria-live="polite">{state.message}</p>
    </section>;
}
