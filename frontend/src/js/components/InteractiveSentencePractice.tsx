import { CalendarDays, Hash, RotateCcw } from 'lucide-react';
import type { Exercise, ExerciseAnswer, ExerciseFeedback } from '../types';
import '../../css/interactive-sentence-practice.css';

export function InteractiveSentencePractice({ exercise, answer, feedback, disabled, lesson, onChange }: {
    exercise: Exercise;
    answer: ExerciseAnswer;
    feedback?: ExerciseFeedback;
    disabled: boolean;
    lesson: 'numbers' | 'calendar';
    onChange: (answer: ExerciseAnswer) => void;
}) {
    const mode = exercise.config?.interactive_activity;
    const Icon = lesson === 'calendar' ? CalendarDays : Hash;

    if (mode === 'tiles') {
        const order = answer.orden ?? [];
        const words = new Map(exercise.elements.map(element => [element.id, element.texto]));
        return <fieldset className="interactive-sentence" data-exercise-correct={feedback?.is_correct} disabled={disabled}>
            <legend className="sr-only">Forma la expresión en kichwa</legend>
            <div className="interactive-sentence-cue"><Icon size={34} strokeWidth={1.7} aria-hidden="true" /><div><span>TRADUCE AL KICHWA</span><strong>{exercise.config?.context_meaning}</strong></div></div>
            <div className="interactive-sentence-answer" aria-label="Expresión formada">
                {exercise.elements.map((_, index) => order[index] ? <button type="button" key={index} data-answer-correct={feedback?.item_results?.[order[index]] ?? feedback?.is_correct} onClick={() => onChange({ orden: order.filter((_, position) => position !== index) })} aria-label={`Quitar ${words.get(order[index])} de la posición ${index + 1}`}>{words.get(order[index])}</button> : <span className="interactive-sentence-empty" key={index} aria-label={`Espacio ${index + 1}`} />)}
            </div>
            <p className="interactive-sentence-help">Toca las fichas en orden. Toca una ficha colocada para quitarla.</p>
            <div className="interactive-sentence-bank" aria-label="Palabras disponibles">{exercise.elements.map(word => <button type="button" key={word.id} disabled={disabled || order.includes(word.id)} onClick={() => onChange({ orden: [...order, word.id] })}>{word.texto}</button>)}</div>
            <button type="button" className="interactive-sentence-reset" disabled={disabled || order.length === 0} onClick={() => onChange({ orden: [] })}><RotateCcw size={16} aria-hidden="true" />Empezar de nuevo</button>
        </fieldset>;
    }

    const element = exercise.elements[0];
    if (!element) return null;
    const [sentence, meaning = ''] = element.texto.split(' · ');
    const [before, after = ''] = sentence.split('_____');
    const selected = answer.textos?.[element.id] ?? '';
    const fill = (word: string) => onChange({ textos: { ...answer.textos, [element.id]: word } });
    return <fieldset className="interactive-sentence" data-exercise-correct={feedback?.is_correct} disabled={disabled}>
        <legend className="sr-only">Completa la expresión en kichwa</legend>
        <div className="interactive-sentence-cue"><Icon size={34} strokeWidth={1.7} aria-hidden="true" /><div><span>PISTA</span><strong>{meaning}</strong></div></div>
        <div className="interactive-sentence-line" data-answer-correct={feedback?.item_results?.[element.id] ?? feedback?.is_correct} lang="qu"><span>{before}</span>{mode === 'writing' ? <input className="field" type="text" aria-label="Palabra que falta en kichwa" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={80} value={selected} placeholder="Escribe aquí" onChange={event => fill(event.target.value)} /> : <button data-answer-control={Boolean(selected)} type="button" className={`interactive-sentence-blank${selected ? ' is-filled' : ''}`} aria-label={selected ? `Quitar ${selected}` : 'Espacio sin completar'} disabled={disabled || !selected} onClick={() => fill('')}>{selected || '_____'} </button>}<span>{after}</span></div>
        {mode === 'choice' && <><p className="interactive-sentence-help">Elige la palabra que completa la expresión. Puedes cambiarla antes de comprobar.</p><div className="interactive-sentence-bank" aria-label="Opciones en kichwa">{element.opciones?.map(word => <button type="button" key={word} className={selected === word ? 'is-selected' : ''} aria-pressed={selected === word} onClick={() => fill(word)}>{word}</button>)}</div></>}
        {mode === 'writing' && <p className="interactive-sentence-help">Escribe la palabra en kichwa y después pulsa Comprobar.</p>}
    </fieldset>;
}
