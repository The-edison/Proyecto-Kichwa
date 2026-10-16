import { RotateCcw, Volume2 } from 'lucide-react';
import { useLessonAudio } from '../hooks/useLessonAudio';
import type { Exercise, ExerciseAnswer } from '../types';

export function MissingVowelExercise({ exercise, answer, disabled, onChange }: {
    exercise: Exercise;
    answer: ExerciseAnswer;
    disabled: boolean;
    onChange: (answer: ExerciseAnswer) => void;
}) {
    const { state, play } = useLessonAudio();
    return <section className="guided-listening-panel" aria-label="Completa las tres palabras">
        {exercise.elements.map((element, index) => {
            const clip = (['audio1', 'audio2', 'audio3'] as const)[index];
            if (!clip) return null;
            const [before, after] = element.texto.split('_');
            const active = state.clip === clip && (state.phase === 'playing' || state.phase === 'loading');
            return <div className="guided-listening-row" key={element.id}>
                <div className={`guided-listening-audio${active ? ' is-active' : ''}`}>
                    <button type="button" onClick={() => play(clip)} aria-label={`Escuchar el audio ${index + 1}`}><Volume2 size={21} aria-hidden="true" /><span>{active ? (state.phase === 'playing' ? 'Sonando' : 'Cargando…') : `Audio ${index + 1}`}</span></button>
                    <button type="button" className="guided-listening-repeat" aria-label={`Repetir el audio ${index + 1}`} title="Repetir audio" onClick={() => play(clip)}><RotateCcw size={18} aria-hidden="true" /></button>
                </div>
                <label className="guided-listening-word">
                    <span className="guided-listening-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                    <span aria-hidden="true">{before}</span>
                    <input
                        type="text"
                        name={`guided-${exercise.id}-${element.id}`}
                        aria-label={`Vocal que falta en la palabra ${index + 1}`}
                        maxLength={1}
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        disabled={disabled}
                        value={answer.textos?.[element.id] ?? ''}
                        onChange={event => {
                            if (disabled) return;
                            const value = event.target.value.toLowerCase().replace(/[^aiu]/g, '').slice(0, 1);
                            onChange({ textos: { ...answer.textos, [element.id]: value } });
                        }}
                    />
                    <span aria-hidden="true">{after}</span>
                </label>
            </div>;
        })}
        <p className={`guided-listening-status${state.phase === 'error' ? ' is-error' : ' sr-only'}`} role="status" aria-live="polite">{state.message}</p>
    </section>;
}
