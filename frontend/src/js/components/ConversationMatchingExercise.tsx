import type { Exercise, ExerciseAnswer, ExerciseFeedback } from '../types';
import { MatchingLines } from './MatchingLines';
import { Volume2 } from 'lucide-react';
import { useLessonAudio, type LessonAudioClip } from '../hooks/useLessonAudio';

export function ConversationMatchingExercise({ exercise, answer, feedback, selectedOrigin, disabled, onSelectOrigin, onPair, group = 'q' }: {
    exercise: Exercise;
    answer: ExerciseAnswer;
    feedback?: ExerciseFeedback;
    selectedOrigin: string;
    disabled: boolean;
    onSelectOrigin: (origin: string) => void;
    onPair: (destination: string) => void;
    group?: 'q' | 'a' | 'd' | 'c';
}) {
    const { state, play } = useLessonAudio();
    const hasAudio = group === 'd' || group === 'c';
    const title = { q:'Preguntas', a:'Respuestas', d:'Despedidas', c:'Cortesía' }[group];
    const allOrigins = exercise.elements.filter(element => element.grupo === 'origen');
    const rows = { gridTemplateRows:`20px repeat(${allOrigins.length},minmax(64px,auto))` };
    return <section className="guided-conversation-panel" data-exercise-correct={feedback?.is_correct} aria-label={`${title} y sus significados`}>
        <div className="guided-conversation-groups is-single">
            {[{ id:group, title }].map(group => {
                const origins = allOrigins.filter(element => element.id.startsWith(`${group.id}-`));
                const destinations = exercise.elements.filter(element => element.grupo === 'destino' && element.id.startsWith(`es-${group.id}-`));
                const count = answer.pares?.filter(pair => origins.some(origin => origin.id === pair.origen)).length ?? 0;
                return <section className="guided-conversation-group" key={group.id} aria-label={group.title}>
                    <header><h2>{group.title}</h2><span>{count} / {origins.length} parejas</span></header>
                    <fieldset className="guided-conversation-columns" data-matching-board disabled={disabled && !hasAudio}>
                        <legend className="sr-only">Relaciona cada expresión de {group.title.toLowerCase()} con su significado en español</legend>
                        <div className="guided-matching-column" style={rows}><h3>KICHWA</h3>{origins.map(origin => {
                            const paired = answer.pares?.some(pair => pair.origen === origin.id);
                            const number = origins.findIndex(item => item.id === origin.id) + 1;
                            return <div className="guided-expression-row" key={origin.id} data-matching-origin={origin.id}><button type="button" disabled={disabled} aria-label={origin.texto} aria-pressed={selectedOrigin === origin.id || Boolean(paired)} data-answer-correct={paired ? feedback?.item_results?.[origin.id] ?? feedback?.is_correct : undefined} className={`${selectedOrigin === origin.id ? 'is-selected' : ''}${paired ? ' is-paired' : ''}`} onClick={() => { if (!disabled) onSelectOrigin(origin.id); }}>
                                <span>{origin.texto}</span>{paired && <span className="guided-pair-number" aria-label={`Pareja ${number}`}>{number}</span>}
                            </button>{hasAudio && <button type="button" className={`guided-expression-audio${state.clip === origin.id && ['loading','playing'].includes(state.phase) ? ' is-playing' : ''}`} aria-label={`Escuchar ${origin.texto}`} title={`Escuchar ${origin.texto}`} onClick={() => play(origin.id as LessonAudioClip)}><Volume2 size={19} aria-hidden="true" /></button>}</div>;
                        })}</div>
                        <div className="guided-matching-column" style={rows}><h3>ESPAÑOL</h3>{destinations.map(destination => {
                            const paired = answer.pares?.find(pair => pair.destino === destination.id);
                            const number = paired ? origins.findIndex(item => item.id === paired.origen) + 1 : 0;
                            return <button type="button" key={destination.id} data-matching-destination={destination.id} data-answer-correct={paired ? feedback?.item_results?.[paired.origen] ?? feedback?.is_correct : undefined} aria-label={destination.texto} aria-pressed={Boolean(paired)} className={paired ? 'is-paired' : ''} disabled={disabled || !paired && !selectedOrigin.startsWith(`${group.id}-`)} onClick={() => { if (!disabled) onPair(destination.id); }}>
                                <span>{destination.texto}</span>{paired && <span className="guided-pair-number" aria-label={`Pareja ${number}`}>{number}</span>}
                            </button>;
                        })}</div>
                        <MatchingLines pairs={answer.pares} feedback={feedback} />
                    </fieldset>
                </section>;
            })}
        </div>
        <p role="status" className="guided-conversation-status">{answer.pares?.filter(pair => pair.origen.startsWith(`${group}-`)).length ?? 0} de {allOrigins.length} parejas seleccionadas. {disabled ? 'Las parejas están comprobadas.' : 'Pulsa una expresión en kichwa y su significado. Vuelve a pulsar una pareja para quitarla.'}</p>
        {hasAudio && <p className={state.phase === 'error' ? 'form-error' : 'sr-only'} role="status" aria-live="polite">{state.message}</p>}
    </section>;
}
