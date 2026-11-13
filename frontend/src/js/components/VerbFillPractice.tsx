import { mediaUrl } from './ExerciseCard';
import type { Exercise, ExerciseAnswer, ExerciseFeedback } from '../types';

export function VerbFillPractice({ exercise, answer, feedback, busy, onChange }: {
    exercise: Exercise;
    answer: ExerciseAnswer;
    feedback?: ExerciseFeedback;
    busy: boolean;
    onChange: (answer: ExerciseAnswer) => void;
}) {
    const element = exercise.elements[0];
    if (!element) return null;
    const [before, after] = element.texto.split(/_+/);
    const selected = answer.textos?.[element.id] ?? '';
    const choose = (word: string) => onChange({ textos: { ...answer.textos, [element.id]: selected === word ? '' : word } });

    return <fieldset className="mx-auto max-w-2xl space-y-7" disabled={busy || feedback?.is_correct === true}>
        <legend className="sr-only">Completa la expresión con una opción</legend>
        {exercise.config?.prompt_image && <img src={mediaUrl(exercise.config.prompt_image)} alt={exercise.config.prompt_image_alt ?? 'Escena del ejercicio'} className="mx-auto aspect-[4/3] w-full max-w-lg rounded-3xl object-cover" decoding="async" />}
        <p className="text-center text-xl font-semibold leading-relaxed text-ink">
            {before}<button type="button" aria-label={selected ? `Respuesta elegida: ${selected}. Quitar respuesta` : 'Espacio sin completar'} className={`mx-2 inline-flex min-h-12 min-w-32 items-center justify-center rounded-xl border-b-2 px-4 ${selected ? 'border-brand bg-positive-soft text-ink' : 'border-line bg-card text-muted'}`} onClick={() => selected && choose(selected)}>{selected || '________'}</button>{after}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Opciones para completar">
            {element.opciones?.map(word => <button type="button" key={word} aria-pressed={selected === word} className={`min-h-14 rounded-2xl border-2 px-3 py-2 text-base font-bold transition-colors ${selected === word ? 'border-brand bg-solid-primary text-button-text' : 'border-line bg-card text-ink hover:border-brand'}`} onClick={() => choose(word)}>{word}</button>)}
        </div>
    </fieldset>;
}
