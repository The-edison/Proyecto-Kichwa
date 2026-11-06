import { useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import type { Exercise, ExerciseAnswer, ExerciseFeedback } from '../types';

const places = ['Primero', 'Segundo', 'Tercero', 'Cuarto', 'Quinto', 'Sexto', 'Séptimo', 'Octavo', 'Noveno'];

export function MorphemeOrdinalExercise({ exercise, answer, feedback, disabled, onChange }: {
    exercise: Exercise; answer: ExerciseAnswer; feedback?: ExerciseFeedback; disabled: boolean; onChange: (answer: ExerciseAnswer) => void;
}) {
    const [selectedWord, setSelectedWord] = useState('');
    const [selectedPlace, setSelectedPlace] = useState<number | null>(null);
    const [dragging, setDragging] = useState('');
    const slots = exercise.elements.map((_, index) => answer.orden?.[index] ?? '');
    const filled = slots.filter(Boolean).length;

    function place(word: string, position: number) {
        if (disabled || !exercise.elements.some(item => item.id === word) || position < 0 || position >= slots.length) return;
        const next = [...slots];
        const previous = next.indexOf(word);
        if (previous === position) return;
        if (previous >= 0) next[previous] = next[position];
        next[position] = word;
        onChange({ orden: next });
        setSelectedWord(''); setSelectedPlace(null); setDragging('');
    }
    function chooseWord(word: string) {
        if (disabled || slots.includes(word)) return;
        if (selectedPlace !== null) place(word, selectedPlace);
        else setSelectedWord(previous => previous === word ? '' : word);
    }
    function choosePlace(position: number) {
        if (disabled) return;
        if (selectedWord) place(selectedWord, position);
        else setSelectedPlace(previous => previous === position ? null : position);
    }
    function clear(position: number) {
        if (disabled) return;
        const next = [...slots]; next[position] = '';
        onChange({ orden: next });
        setSelectedWord(''); setSelectedPlace(null);
    }
    function reset() {
        if (disabled) return;
        onChange({ orden: [] });
        setSelectedWord(''); setSelectedPlace(null); setDragging('');
    }
    return <div className={`ordinal-exercise${selectedWord || dragging ? ' has-word-selected' : ''}`}>
        <div className="ordinal-toolbar"><h2>Palabras</h2><span className="ordinal-count" aria-label={`${filled} de ${slots.length} lugares completos`}>{filled}<span> / {slots.length}</span></span><button type="button" className="ordinal-reset" disabled={disabled || !filled} onClick={reset} aria-label="Reiniciar ordinales"><RotateCcw size={16} aria-hidden="true" /><span>Reiniciar</span></button></div>
        <div className="ordinal-word-bank" role="group" aria-label="Palabras disponibles">{exercise.elements.map(item => {
            const used = slots.includes(item.id);
            return <button type="button" key={item.id} lang="qu" className={`ordinal-chip${selectedWord === item.id ? ' is-selected' : ''}${used ? ' is-used' : ''}`} aria-label={`Elegir ${item.texto}`} aria-pressed={selectedWord === item.id} disabled={disabled || used} draggable={!disabled && !used} onClick={() => chooseWord(item.id)} onDragStart={event => { if (disabled || used) return; event.dataTransfer.setData('text/plain', item.id); event.dataTransfer.effectAllowed = 'move'; setDragging(item.id); setSelectedWord(item.id); }} onDragEnd={() => setDragging('')}><span>{item.texto}</span>{used && <Check size={14} aria-hidden="true" />}</button>;
        })}</div>
        <div className="ordinal-places" role="group" aria-label="Lugares del primero al noveno">{slots.map((id, index) => {
            const word = exercise.elements.find(item => item.id === id);
            const grade = id ? feedback?.item_results?.[id] ?? feedback?.is_correct : undefined;
            return <div className={`ordinal-place${selectedPlace === index ? ' is-active' : ''}${word ? ' is-filled' : ''}`} key={index}>
                <button type="button" className="ordinal-target" data-answer-correct={grade} aria-label={`${index + 1}.º ${places[index] ?? ''}: ${word?.texto ?? 'vacío'}`} aria-pressed={selectedPlace === index} disabled={disabled} onClick={() => choosePlace(index)} draggable={!disabled && Boolean(word)} onDragStart={event => { if (disabled || !word) return; event.dataTransfer.setData('text/plain', word.id); event.dataTransfer.effectAllowed = 'move'; setDragging(word.id); }} onDragEnd={() => setDragging('')} onDragOver={event => { if (!disabled) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; } }} onDrop={event => { event.preventDefault(); place(event.dataTransfer.getData('text/plain'), index); }}>
                    <span className="ordinal-number">{index + 1}<sup>º</sup></span>
                    <span className="ordinal-place-copy"><span className="ordinal-place-name">{places[index]}</span>{word ? <strong lang="qu">{word.texto}</strong> : <span className="ordinal-empty-line" aria-hidden="true" />}</span>
                </button>
                {word && !disabled && <button type="button" className="ordinal-remove" aria-label={`Quitar ${word.texto} del ${index + 1}.º lugar`} onClick={() => clear(index)}><X size={14} aria-hidden="true" /></button>}
            </div>;
        })}</div>
        <p className="sr-only" role="status">{selectedWord ? `${exercise.elements.find(item => item.id === selectedWord)?.texto} seleccionada. Elige un lugar.` : selectedPlace !== null ? `Lugar ${selectedPlace + 1} seleccionado. Elige una palabra.` : `${filled} de ${slots.length} lugares completos.`}</p>
    </div>;
}
