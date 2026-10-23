import { useState } from 'react';
import type { Exercise, ExerciseAnswer, ExerciseFeedback } from '../types';
import '../../css/numbers-practice.css';

const groups: Record<string, { image: string; count: number; name: string }> = {
    leaves: { image: 'leaf.webp', count: 2, name: 'hojas' },
    women: { image: 'woman.webp', count: 3, name: 'mujeres' },
    bulls: { image: 'bull.webp', count: 4, name: 'toros' },
    children: { image: 'child.webp', count: 5, name: 'niños' },
    plants: { image: 'plant.webp', count: 7, name: 'plantas' },
    cows: { image: 'cow.webp', count: 10, name: 'vacas' },
};

export function NumbersPractice({ exercise, answer, feedback, disabled, onChange }: {
    exercise: Exercise;
    answer: ExerciseAnswer;
    feedback?: ExerciseFeedback;
    disabled: boolean;
    onChange: (answer: ExerciseAnswer) => void;
}) {
    const [active, setActive] = useState(exercise.elements[0]?.id ?? '');
    const texts = answer.textos ?? {};
    const fill = (id: string, word: string) => onChange({ textos: { ...texts, [id]: word } });

    if (exercise.config?.numbers_activity === 'count') {
        return <fieldset className="numbers-practice" data-exercise-correct={feedback?.is_correct} disabled={disabled}>
            <legend className="sr-only">Cuenta los objetos y escribe cada número en kichwa</legend>
            <div className="numbers-count-sheet">
                <div className="numbers-count-sheet-heading"><strong>Observa, cuenta y escribe</strong><span>Escribe en kichwa cuántas figuras hay en cada fila.</span></div>
                <div className="numbers-count-grid">{exercise.elements.map((element, index) => {
                const group = groups[element.id];
                if (!group) return null;
                return <label className="numbers-count-row" data-answer-correct={feedback?.item_results?.[element.id] ?? feedback?.is_correct} key={element.id}>
                    <span className="numbers-count-row-label"><small>{String(index + 1).padStart(2, '0')}</small><strong>{element.texto}</strong></span>
                    <span className={`numbers-objects numbers-objects-${element.id}`} role="img" aria-label={`${group.count} ${group.name}`}>{Array.from({ length: group.count }, (_, item) => <img key={item} src={`${import.meta.env.BASE_URL}images/numbers-count/${group.image}`} alt="" aria-hidden="true" width={64} height={64} draggable={false} />)}</span>
                    <span className="numbers-count-answer"><span className="sr-only">Número de {group.name} en kichwa</span><input className="field" type="text" autoComplete="off" spellCheck={false} value={texts[element.id] ?? ''} placeholder="?" onChange={event => fill(element.id, event.target.value)} /></span>
                </label>;
                })}</div>
            </div>
        </fieldset>;
    }

    const words = [...new Set(exercise.elements.flatMap(element => element.opciones ?? []))];
    return <fieldset className="numbers-practice" data-exercise-correct={feedback?.is_correct} disabled={disabled}>
        <legend className="sr-only">Completa las frases con números en kichwa</legend>
        <p className="numbers-bank-instruction">Selecciona una frase y toca una palabra. También puedes usar el menú de cada frase.</p>
        <div className="numbers-word-bank" aria-label="Banco de números">{words.map(word => <button type="button" key={word} draggable={!disabled} onDragStart={event => event.dataTransfer.setData('text/plain', word)} onClick={() => {
            const target = active && !texts[active] ? active : exercise.elements.find(element => !texts[element.id])?.id ?? active;
            if (target) fill(target, word);
        }}>{word}</button>)}</div>
        <div className="numbers-sentence-grid">{exercise.elements.map((element, index) => {
            const [sentence, meaning = ''] = element.texto.split(' · ');
            const [before, after] = sentence.split('_____');
            return <label className={`numbers-sentence-card${active === element.id ? ' is-active' : ''}`} data-answer-correct={feedback?.item_results?.[element.id] ?? feedback?.is_correct} key={element.id} onDragOver={event => event.preventDefault()} onDrop={event => {
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
