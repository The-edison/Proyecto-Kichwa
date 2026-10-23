import { useLayoutEffect, useRef, useState } from 'react';
import type { Exercise, ExerciseAnswer, ExerciseFeedback } from '../types';
import '../../css/numbers-matching.css';

const mixedOrder = [3, 8, 0, 6, 1, 9, 4, 2, 7, 5];
type Pair = { origen: string; destino: string };
type Line = { id: string; x1: number; y1: number; x2: number; y2: number };

export function measureMatchingLines(pairs: Pair[], buttons: Map<string, HTMLButtonElement>): Line[] {
    return pairs.flatMap(pair => {
        const origin = buttons.get(pair.origen);
        const destination = buttons.get(pair.destino);
        return origin && destination ? [{ id: pair.origen,
            x1: origin.offsetLeft + origin.offsetWidth, y1: origin.offsetTop + origin.offsetHeight / 2,
            x2: destination.offsetLeft, y2: destination.offsetTop + destination.offsetHeight / 2 }] : [];
    });
}

export function NumbersMatchingExercise({ exercise, answer, feedback, selectedOrigin, disabled, onSelectOrigin, onPair }: {
    exercise: Exercise;
    answer: ExerciseAnswer;
    feedback?: ExerciseFeedback;
    selectedOrigin: string;
    disabled: boolean;
    onSelectOrigin: (id: string) => void;
    onPair: (id: string) => void;
}) {
    const origins = exercise.elements.filter(element => element.grupo === 'origen');
    const words = exercise.elements.filter(element => element.grupo === 'destino');
    const destinations = mixedOrder.map(index => words[index]).filter((item): item is typeof words[number] => Boolean(item));
    const board = useRef<HTMLDivElement>(null);
    const buttons = useRef(new Map<string, HTMLButtonElement>());
    const [lines, setLines] = useState<Line[]>([]);
    const [hint, setHint] = useState('');

    useLayoutEffect(() => {
        const container = board.current;
        if (!container) return;
        const measure = () => setLines(measureMatchingLines(answer.pares ?? [], buttons.current));
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(container);
        buttons.current.forEach(button => observer.observe(button));
        return () => observer.disconnect();
    }, [answer.pares]);

    function chooseDestination(destination: string) {
        if (!selectedOrigin) return;
        if (selectedOrigin.slice(2) !== destination.slice(2)) {
            setHint('Esa palabra no corresponde a la cifra. Prueba con otra.');
            return;
        }
        setHint('¡Pareja correcta! La línea muestra la unión.');
        onPair(destination);
    }

    return <section className="numbers-matching" data-exercise-correct={feedback?.is_correct} aria-label="Une los números con sus nombres en kichwa">
        <div className="numbers-matching-progress"><strong>{answer.pares?.length ?? 0} / {origins.length}</strong><span>parejas unidas</span></div>
        <div className="numbers-matching-book">
            <div className="numbers-matching-headings"><h2>NÚMEROS</h2><h2>NOMBRES EN KICHWA</h2></div>
            <div className="numbers-matching-board" ref={board}>
                <div className="numbers-matching-page numbers-matching-page-left">
                    {origins.map(origin => {
                        const paired = answer.pares?.some(pair => pair.origen === origin.id) ?? false;
                        return <button type="button" key={origin.id} ref={node => { if (node) buttons.current.set(origin.id, node); else buttons.current.delete(origin.id); }}
                            data-answer-correct={paired ? feedback?.item_results?.[origin.id] ?? feedback?.is_correct : undefined} className={`${selectedOrigin === origin.id ? 'is-selected ' : ''}${paired ? 'is-paired' : ''}`}
                            aria-label={`Seleccionar cifra ${origin.texto}`} aria-pressed={selectedOrigin === origin.id || paired} disabled={disabled}
                            onClick={() => { setHint(''); onSelectOrigin(origin.id); }}>{origin.texto}</button>;
                    })}
                </div>
                <div className="numbers-matching-page numbers-matching-page-right">
                    {destinations.map(destination => {
                        const pair = answer.pares?.find(pair => pair.destino === destination.id);
                        const paired = Boolean(pair);
                        return <button type="button" key={destination.id} ref={node => { if (node) buttons.current.set(destination.id, node); else buttons.current.delete(destination.id); }}
                            data-answer-correct={pair ? feedback?.item_results?.[pair.origen] ?? feedback?.is_correct : undefined} className={paired ? 'is-paired' : ''} aria-label={`Seleccionar ${destination.texto}`} aria-pressed={paired} disabled={disabled || !selectedOrigin && !paired}
                            onClick={() => { if (paired) { setHint(''); onPair(destination.id); } else chooseDestination(destination.id); }}>{destination.texto}</button>;
                    })}
                </div>
                <svg className="numbers-matching-lines" aria-hidden="true">
                    {lines.map(line => <line key={line.id} data-answer-correct={feedback?.item_results?.[line.id] ?? feedback?.is_correct} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />)}
                </svg>
            </div>
        </div>
        <p className="numbers-matching-hint" role="status" aria-live="polite">{hint || (selectedOrigin ? 'Ahora elige el nombre en kichwa de la cifra seleccionada.' : 'Selecciona una cifra y después su nombre. Puedes tocar una pareja para cambiarla.')}</p>
    </section>;
}
