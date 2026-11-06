import { useState } from 'react';
import { ArrowDown, ArrowUp, BookOpen, MessageCircle, RotateCcw } from 'lucide-react';
import scene from '../../images/dialogue-practice-scene.png';
import cometa from '../../images/cometa-teaching.webp';
import type { Exercise, ExerciseAnswer, ExerciseFeedback } from '../types';
import '../../css/dialogue-practice.css';

function mixDialogueOrder(ids: string[], previous: string[] = []): string[] {
    if (ids.length < 3) return [...ids].reverse();
    const excluded = [ids, [...ids].reverse(), previous].map(order => order.join('|'));
    for (let attempt = 0; attempt < 12; attempt++) {
        const shuffled = [...ids];
        for (let index = shuffled.length - 1; index > 0; index--) {
            const target = Math.floor(Math.random() * (index + 1));
            [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
        }
        if (!excluded.includes(shuffled.join('|'))) return shuffled;
    }
    for (let offset = 1; offset < ids.length; offset++) {
        const rotated = [...ids.slice(offset), ...ids.slice(0, offset)];
        if (!excluded.includes(rotated.join('|'))) return rotated;
    }
    return [...ids];
}

export function DialoguePractice({ exercise, answer, feedback, busy, onChange }: { exercise: Exercise; answer: ExerciseAnswer; feedback?: ExerciseFeedback; busy: boolean; onChange: (answer: ExerciseAnswer) => void }) {
    const [moveNotice, setMoveNotice] = useState('');
    const [movedId, setMovedId] = useState('');
    const [initialOrder, setInitialOrder] = useState(() => exercise.type === 'ordenar' ? mixDialogueOrder(exercise.elements.map(item => item.id)) : []);
    const disabled = busy || feedback?.is_correct === true;
    const config = exercise.config;
    const fullReading = config?.dialogue_practice === 5;
    const turns = config?.dialogue_turns ?? [];
    const grade = (id: string) => feedback?.item_results?.[id] ?? feedback?.is_correct;
    const order = answer.orden?.length ? [...new Set([...answer.orden, ...exercise.elements.map(item => item.id)])].filter(id => exercise.elements.some(item => item.id === id)) : initialOrder;
    const options = [...new Set(exercise.elements.flatMap(item => item.opciones ?? []))];
    function fill(id: string, value: string) {
        if (disabled || (value !== '' && !exercise.elements.find(item => item.id === id)?.opciones?.includes(value))) return;
        const texts = { ...answer.textos };
        for (const key of Object.keys(texts)) if (texts[key] === value && key !== id) texts[key] = '';
        texts[id] = value;
        onChange({ textos: texts });
    }
    function move(index: number, offset: number) {
        const target = index + offset;
        if (disabled || target < 0 || target >= order.length) return;
        const next = [...order];
        [next[index], next[target]] = [next[target], next[index]];
        setMovedId(order[index]);
        onChange({ orden: next });
        setMoveNotice(`Frase movida a la posición ${target + 1} de ${order.length}.`);
    }
    function fragment(id: string) {
        const text = exercise.elements.find(item => item.id === id)?.texto ?? '';
        const separator = text.indexOf(':');
        return <span className="dialogue-fragment" lang="qu"><strong>{text.slice(0, separator)}</strong><span>{text.slice(separator + 1).trim()}</span></span>;
    }
    const illustration = <img className="dialogue-scene" src={scene} alt="Jóvenes conversan junto a una casa andina y una llama, con montañas al fondo." width={1672} height={941} />;
    const tip = <aside className="dialogue-tip"><img src={cometa} width={96} height={96} alt="Cometa, el cuy con poncho andino" /><p><strong>Cometa te recuerda:</strong><span>{config?.dialogue_hint}</span></p></aside>;
    const reading = <article className="dialogue-reading"><h2><MessageCircle size={23} aria-hidden="true" />{config?.dialogue_name}</h2><ol>{turns.map((turn, index) => <li key={turn.blank ?? index}><strong>{turn.speaker}:</strong>{turn.blank ? <div className="dialogue-blank" data-answer-correct={answer.textos?.[turn.blank] ? grade(turn.blank) : undefined}>
        <select aria-label={`Respuesta de ${turn.speaker}, turno ${index + 1}`} disabled={disabled} value={answer.textos?.[turn.blank] ?? ''} onChange={event => fill(turn.blank!, event.target.value)}><option value="">Elige una respuesta…</option>{options.map(option => <option key={option}>{option}</option>)}</select>
    </div> : <span lang="qu">{turn.text}</span>}</li>)}</ol>{exercise.type !== 'completar' && !fullReading && illustration}</article>;
    return <section className={`morpheme-practice dialogue-practice${fullReading ? ' is-full-reading' : ''}`} aria-label={config?.title} data-exercise-correct={feedback?.is_correct}>
        {exercise.type === 'ordenar' ? <div className={`dialogue-sort${order.length > 6 ? ' is-long' : ''}`}>
            <div className="dialogue-sort-visual"><div className="dialogue-sort-banner">{illustration}</div>{tip}
                <button className="secondary-button" type="button" disabled={disabled} onClick={() => { if (!disabled) { setInitialOrder(mixDialogueOrder(exercise.elements.map(item => item.id), order)); onChange({ orden: [] }); setMovedId(''); setMoveNotice('Las frases se mezclaron de nuevo.'); } }}><RotateCcw size={16} aria-hidden="true" /> Restablecer orden</button>
            </div>
            <ol className="dialogue-order" aria-label="Orden de la conversación">{order.map((id, index) => <li key={id} className={movedId === id && !feedback ? 'is-moving' : undefined} data-answer-correct={grade(id)}>
                <span className="dialogue-number" aria-label={`Posición ${index + 1}`}>{index + 1}</span>
                {fragment(id)}
                <div className="dialogue-move">
                    <button type="button" aria-label={`Subir turno ${index + 1}`} disabled={disabled || index === 0} onClick={() => move(index, -1)}><ArrowUp size={18} aria-hidden="true" /><span>Subir</span></button>
                    <button type="button" aria-label={`Bajar turno ${index + 1}`} disabled={disabled || index === order.length - 1} onClick={() => move(index, 1)}><ArrowDown size={18} aria-hidden="true" /><span>Bajar</span></button>
                </div>
            </li>)}</ol>
            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{moveNotice}</p>
        </div>
        : turns.length > 0 && exercise.type === 'completar' ? <div className="dialogue-completion-layout"><div className="dialogue-completion-visual">{illustration}{tip}{Boolean(config?.dialogue_expressions?.length) && <aside className="dialogue-key"><h2><BookOpen size={23} aria-hidden="true" />Expresiones claves</h2><ul>{config?.dialogue_expressions?.map(text => <li key={text}>{text}</li>)}</ul></aside>}</div>{reading}</div>
        : turns.length > 0 ? <div className="dialogue-columns">{reading}<div className="dialogue-side"><fieldset className="dialogue-options" disabled={disabled}><legend>Selecciona la idea principal</legend>{exercise.elements.map(item => <label key={item.id} className={answer.seleccion?.includes(item.id) ? 'is-selected' : ''} data-answer-correct={answer.seleccion?.includes(item.id) ? grade(item.id) : undefined}><input type="radio" name={`dialogue-${exercise.id}`} checked={answer.seleccion?.includes(item.id) ?? false} onChange={() => onChange({ seleccion: [item.id] })} /><span>{item.texto}</span></label>)}</fieldset>
            {fullReading ? <><figure className="dialogue-reading-image">{illustration}</figure>{tip}</> : Boolean(config?.dialogue_expressions?.length) && <aside className="dialogue-key"><h2><BookOpen size={23} aria-hidden="true" />Expresiones claves</h2><ul>{config?.dialogue_expressions?.map(text => <li key={text}>{text}</li>)}</ul></aside>}
        </div></div>
        : <div className="dialogue-questions-layout"><figure>{illustration}{tip}</figure><div className="dialogue-questions">{exercise.elements.map((item, index) => <article key={item.id}><h2><span className="dialogue-number">{index + 1}</span><span lang="qu">{item.texto.replace('_____', answer.textos?.[item.id] || '_____')}</span></h2><fieldset className="dialogue-options" disabled={disabled}><legend className="sr-only">{item.texto}</legend>{item.opciones?.map(option => <label key={option} className={answer.textos?.[item.id] === option ? 'is-selected' : ''} data-answer-correct={answer.textos?.[item.id] === option ? grade(item.id) : undefined}><input type="radio" name={`dialogue-${exercise.id}-${item.id}`} checked={answer.textos?.[item.id] === option} onChange={() => onChange({ textos: { ...answer.textos, [item.id]: option } })} /><span lang="qu">{option}</span></label>)}</fieldset></article>)}</div></div>}
        {exercise.type === 'seleccion_multiple' && !fullReading && tip}
    </section>;
}
