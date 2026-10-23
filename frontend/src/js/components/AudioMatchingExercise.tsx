import { CheckCircle2, RotateCcw, Volume2 } from 'lucide-react';
import { useLessonAudio, type LessonAudioClip } from '../hooks/useLessonAudio';
import type { Exercise, ExerciseAnswer, ExerciseFeedback } from '../types';
import { MatchingLines } from './MatchingLines';

const clips: Record<string, LessonAudioClip> = { imatak: 'imatak', 'pitak-kan': 'pitak-kan', imamanta: 'imamanta' };

export function AudioMatchingExercise({ exercise, answer, feedback, selectedOrigin, disabled, onSelectOrigin, onPair }: {
    exercise: Exercise;
    answer: ExerciseAnswer;
    feedback?: ExerciseFeedback;
    selectedOrigin: string;
    disabled: boolean;
    onSelectOrigin: (origin: string) => void;
    onPair: (destination: string) => void;
}) {
    const { state, play } = useLessonAudio();
    const origins = exercise.elements.filter(element => element.grupo === 'origen');
    const destinations = exercise.elements.filter(element => element.grupo === 'destino');
    return <section className="guided-audio-matching" data-exercise-correct={feedback?.is_correct} aria-label="Relaciona los tres audios con su significado">
        <div className="guided-audio-matching-columns" data-matching-board>
            <div className="guided-audio-matching-column" role="group" aria-label="Audios">
                <h2>AUDIOS</h2>
                {origins.map((origin, index) => {
                    const clip = clips[origin.id];
                    const paired = answer.pares?.some(pair => pair.origen === origin.id);
                    const active = state.clip === clip && ['loading', 'playing'].includes(state.phase);
                    return <div className={`guided-audio-tile${selectedOrigin === origin.id ? ' is-selected' : ''}${paired ? ' is-paired' : ''}${active ? ' is-playing' : ''}`} key={origin.id} data-matching-origin={origin.id} data-answer-correct={paired ? feedback?.item_results?.[origin.id] ?? feedback?.is_correct : undefined}>
                        <button data-answer-control={Boolean(paired)} type="button" aria-label={`Escuchar y seleccionar el audio ${index + 1}`} aria-pressed={selectedOrigin === origin.id || Boolean(paired)} onClick={() => {
                            if (!disabled) onSelectOrigin(origin.id);
                            play(clip);
                        }}>{paired ? <CheckCircle2 size={23} aria-hidden="true" /> : <Volume2 size={23} aria-hidden="true" />}<span>Audio {index + 1}</span></button>
                        <button type="button" className="guided-audio-repeat" aria-label={`Repetir el audio ${index + 1}`} onClick={() => play(clip)}><RotateCcw size={19} aria-hidden="true" /></button>
                    </div>;
                })}
            </div>
            <div className="guided-audio-matching-column" role="group" aria-label="Significado en español">
                <h2>SIGNIFICADO</h2>
                {destinations.map(destination => {
                    const pair = answer.pares?.find(item => item.destino === destination.id);
                    const number = pair ? origins.findIndex(origin => origin.id === pair.origen) + 1 : null;
                    return <button type="button" key={destination.id} data-matching-destination={destination.id} data-answer-correct={pair ? feedback?.item_results?.[pair.origen] ?? feedback?.is_correct : undefined} className={`guided-audio-meaning${pair ? ' is-paired' : ''}`} disabled={disabled} aria-pressed={Boolean(pair)} onClick={() => onPair(destination.id)}>
                        <span>{destination.texto}</span>{number && <span className="guided-audio-pair-number" aria-label={`Emparejado con el audio ${number}`}>{number}</span>}
                    </button>;
                })}
            </div>
            <MatchingLines pairs={answer.pares} feedback={feedback} />
        </div>
        <p className="guided-audio-matching-hint">{answer.pares?.length ?? 0} de {origins.length} parejas seleccionadas. {disabled ? 'Puedes volver a escuchar los audios.' : selectedOrigin ? 'Ahora selecciona el significado en español.' : 'Pulsa un audio para escucharlo y seleccionarlo.'}</p>
        <p className={state.phase === 'error' ? 'form-error' : 'sr-only'} role="status" aria-live="polite">{state.message}</p>
    </section>;
}
