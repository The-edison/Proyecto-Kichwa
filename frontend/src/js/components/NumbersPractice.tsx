import { useState } from 'react';
import type { Exercise, ExerciseAnswer } from '../types';
import '../../css/numbers-practice.css';

const groups: Record<string, { icon: string; count: number; name: string }> = {
    apples: { icon: '🍎', count: 3, name: 'manzanas' },
    flowers: { icon: '🌼', count: 5, name: 'flores' },
    llamas: { icon: '🦙', count: 4, name: 'llamas' },
    trees: { icon: '🌳', count: 6, name: 'árboles' },
    books: { icon: '📚', count: 10, name: 'libros' },
    pencils: { icon: '✏️', count: 7, name: 'lápices' },
};

export function NumbersPractice({ exercise, answer, disabled, onChange }: {
    exercise: Exercise;
    answer: ExerciseAnswer;
    disabled: boolean;
    onChange: (answer: ExerciseAnswer) => void;
}) {
    const [active, setActive] = useState(exercise.elements[0]?.id ?? '');
    const texts = answer.textos ?? {};
    const fill = (id: string, word: string) => onChange({ textos: { ...texts, [id]: word } });

    if (exercise.config?.numbers_activity === 'count') {
        return <fieldset className="numbers-practice" disabled={disabled}>
            <legend className="sr-only">Cuenta los objetos y escribe cada número en kichwa</legend>
            <div className="numbers-count-grid">{exercise.elements.map((element, index) => {
                const group = groups[element.id];
                if (!group) return null;
                return <label className="numbers-count-card" key={element.id}>
                    <span className="numbers-card-index">{String(index + 1).padStart(2, '0')} · {element.texto}</span>
                    <span className="numbers-objects" role="img" aria-label={`${group.count} ${group.name}`}>{Array.from({ length: group.count }, (_, item) => <span key={item} aria-hidden="true">{group.icon}</span>)}</span>
                    <span className="numbers-input-label">Número en kichwa</span>
                    <input className="field" type="text" autoComplete="off" spellCheck={false} value={texts[element.id] ?? ''} placeholder="Escribe el número" onChange={event => fill(element.id, event.target.value)} />
                </label>;
            })}</div>
        </fieldset>;
    }

    const words = [...new Set(exercise.elements.flatMap(element => element.opciones ?? []))];
    return <fieldset className="numbers-practice" disabled={disabled}>
        <legend className="sr-only">Completa las frases con números en kichwa</legend>
        <p className="numbers-bank-instruction">Selecciona una frase y toca una palabra. También puedes usar el menú de cada frase.</p>
        <div className="numbers-word-bank" aria-label="Banco de números">{words.map(word => <button type="button" key={word} draggable={!disabled} onDragStart={event => event.dataTransfer.setData('text/plain', word)} onClick={() => {
            const target = active && !texts[active] ? active : exercise.elements.find(element => !texts[element.id])?.id ?? active;
            if (target) fill(target, word);
        }}>{word}</button>)}</div>
        <div className="numbers-sentence-grid">{exercise.elements.map((element, index) => {
            const [sentence, meaning = ''] = element.texto.split(' · ');
            const [before, after] = sentence.split('_____');
            return <label className={`numbers-sentence-card${active === element.id ? ' is-active' : ''}`} key={element.id} onDragOver={event => event.preventDefault()} onDrop={event => {
                event.preventDefault();
                const word = event.dataTransfer.getData('text/plain');
                if (words.includes(word)) fill(element.id, word);
            }}>
                <span className="numbers-card-index">FRASE {String(index + 1).padStart(2, '0')}</span>
                <span className="numbers-sentence-line" lang="qu">{before}<select className="field" aria-label={`Número para la frase ${index + 1}`} value={texts[element.id] ?? ''} onFocus={() => setActive(element.id)} onChange={event => fill(element.id, event.target.value)}><option value="">Elige</option>{words.map(word => <option key={word} value={word}>{word}</option>)}</select>{after}</span>
                <span className="numbers-sentence-meaning">{meaning}</span>
            </label>;
        })}</div>
    </fieldset>;
}
