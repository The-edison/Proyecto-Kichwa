import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { MorphemePractice } from './MorphemePractice';
import { VerbalIllustration } from './VerbalIllustration';
import { MatchingLines } from './MatchingLines';
import type { Exercise, ExerciseAnswer, ExerciseElement, ExerciseFeedback } from '../types';
import '../../css/verbal-practice.css';

export function VerbalWordTiles({ item, value, disabled, result, onChange, separate = false }: { item: ExerciseElement; value: string; disabled: boolean; result?: boolean; onChange: (value: string) => void; separate?: boolean }) {
    const words = value.trim().split(/\s+/).filter(Boolean);
    const tokens = item.opciones ?? [];
    function add(word: string) {
        if (!disabled && tokens.includes(word) && !words.includes(word)) onChange([...words, word].join(' '));
    }
    return <div className="verbal-tiles" data-answer-correct={result}>
        <div className="verbal-tile-bank" aria-label={`Bloques para ${item.texto}`}>{tokens.map(token => <button type="button" key={token} disabled={disabled || words.includes(token)} draggable={!disabled && !words.includes(token)} onDragStart={event => event.dataTransfer.setData('text/plain', `${item.id}:${token}`)} onClick={() => add(token)}>{token}</button>)}</div>
        <div className="verbal-tile-slots" aria-label={separate ? `Segmentos de ${item.texto}` : `Forma ${item.texto}`} onDragOver={event => { if (!disabled) event.preventDefault(); }} onDrop={event => { event.preventDefault(); const [id, token] = event.dataTransfer.getData('text/plain').split(':'); if (id === item.id) add(token); }}>
            {tokens.map((_, index) => <span className="verbal-tile-slot" key={index}>{separate && index > 0 && <span aria-hidden="true">+</span>}<button type="button" disabled={disabled || !words[index]} aria-label={words[index] ? `Quitar ${words[index]}` : `Posición ${index + 1}`} onClick={() => onChange(words.filter((_, position) => index !== position).join(' '))}>{words[index] || '…'}</button></span>)}
        </div>
        <div className="verbal-tile-result"><span>{separate ? 'Segmentos' : 'Palabra formada'}:</span><strong lang="qu">{words.length ? words.join(separate ? ' + ' : '') : '—'}</strong><button type="button" aria-label={`Reiniciar ${item.texto}`} disabled={disabled || !words.length} onClick={() => onChange('')}><RotateCcw size={15} /></button></div>
    </div>;
}

const functions = [{ id: 'cortesia', text: 'Cortesía' }, { id: 'causa', text: 'Hacer que otro realice la acción' }, { id: 'deseo', text: 'Deseo' }];

export function VerbalPractice({ exercise, answer, feedback, busy, onChange }: { exercise: Exercise; answer: ExerciseAnswer; feedback?: ExerciseFeedback; busy: boolean; onChange: (answer: ExerciseAnswer) => void }) {
    const [selected, setSelected] = useState('');
    const activity = exercise.config?.verbal_practice;
    const disabled = busy || feedback?.is_correct === true;
    if ([1, 3, 4, 6].includes(activity ?? 0)) return <div className="verbal-practice"><MorphemePractice exercise={exercise} answer={answer} feedback={feedback} busy={busy} onChange={onChange} /></div>;
    const update = (id: string, value: string) => onChange({ textos: { ...answer.textos, [id]: value } });
    const grade = (id: string) => feedback?.item_results?.[id] ?? feedback?.is_correct;
    function options(item: ExerciseElement, meanings?: Record<string, string>) {
        return <fieldset className="verbal-options" disabled={disabled}><legend className="sr-only">{item.texto}</legend>{item.opciones?.map(value => {
            const chosen = answer.textos?.[item.id] === value;
            return <label key={value} className={chosen ? 'is-selected' : ''} data-answer-correct={chosen ? grade(item.id) : undefined}><input type="radio" name={`verbal-${exercise.id}-${item.id}`} value={value} checked={chosen} onChange={() => update(item.id, value)} /><span>{meanings?.[value] ?? (activity === 7 ? '-'+value : value)}</span></label>;
        })}</fieldset>;
    }
    function tiles(item: ExerciseElement, separate: boolean) {
        return <VerbalWordTiles item={item} value={answer.textos?.[item.id] ?? ''} disabled={disabled} result={grade(item.id)} separate={separate} onChange={value => update(item.id, value)} />;
    }
    function connect(destination: string) {
        if (!selected || disabled) return;
        const texts = { ...answer.textos };
        for (const id of ['chi', 'naya', 'pay']) if (texts[id] === destination) texts[id] = '';
        texts[selected] = destination;
        onChange({ textos: texts }); setSelected('');
    }
    const pairings = ['chi', 'naya', 'pay'].filter(id => answer.textos?.[id]).map(id => ({ origen: id, destino: answer.textos![id] }));
    return <section className={`morpheme-practice verbal-practice verbal-activity-${activity}`} data-exercise-correct={feedback?.is_correct} aria-label={exercise.config?.title}>
        {activity === 2 && <div className="verbal-build-rows">{exercise.elements.map((item, index) => {
            const cell = ({ 'miku-parts': 4, 'wasi-parts': 2, 'wawa-parts': 0, 'mashi-parts': 3 } as Record<string, number>)[item.id] ?? 4;
            return <article key={item.id} className="verbal-build-row"><div className="verbal-build-image"><span className="verbal-step">{index + 1}</span><VerbalIllustration cell={cell} description={item.texto} /><h2>Separa <span lang="qu">{item.texto}</span></h2></div>{tiles(item, true)}</article>;
        })}</div>}
        {activity === 5 && <div className="verbal-sentences">{exercise.elements.map((item, index) => {
            const [before, after] = item.texto.split('_____');
            const meaning = exercise.config?.verbal_sentence_meanings?.[item.id];
            return <article key={item.id} className="verbal-sentence"><span className="verbal-step">{index + 1}</span><VerbalIllustration cell={[6, 7, 8, 9][index]} description={meaning ?? item.texto} /><div><p lang="qu" className="verbal-sentence-kichwa">{before}<strong>{answer.textos?.[item.id]?.toLocaleLowerCase() || '______'}</strong>{after}</p>{meaning && <p lang="es" className="verbal-sentence-meaning">{meaning}</p>}{options(item)}</div></article>;
        })}</div>}
        {activity === 7 && <div className="verbal-classify">{exercise.elements.map((item, index) => <article key={item.id}><div className="verbal-classify-word"><VerbalIllustration cell={[1, 8, 11, 6][index]} description={item.texto} /><strong lang="qu">{item.texto}</strong></div>{options(item)}</article>)}</div>}
        {activity === 8 && <div className="verbal-integrator">
            <article className="verbal-integrator-part"><h2><span className="verbal-step">a</span>Separa <span lang="qu">mikukuni</span></h2><div className="verbal-integrator-segments"><VerbalIllustration cell={4} description="Una joven está comiendo." />{tiles(exercise.elements.find(item => item.id === 'segments')!, true)}</div></article>
            <article className="verbal-integrator-part"><h2><span className="verbal-step">b</span>Une el morfema con su función.</h2><div className="verbal-function-board" data-matching-board><div>{['chi', 'naya', 'pay'].map(id => <button type="button" key={id} data-matching-origin={id} disabled={disabled} data-answer-correct={answer.textos?.[id] ? grade(id) : undefined} aria-pressed={selected === id || Boolean(answer.textos?.[id])} onClick={() => { if (answer.textos?.[id]) update(id, ''); setSelected(id); }}>-{id}</button>)}</div><div>{functions.map(item => <button type="button" key={item.id} data-matching-destination={item.id} disabled={disabled || !selected} onClick={() => connect(item.id)}>{item.text}</button>)}</div><MatchingLines pairs={pairings} feedback={feedback} /></div></article>
            <article className="verbal-integrator-part"><h2><span className="verbal-step">c</span>En <span lang="qu">mikukuni</span>, ¿qué expresa <span lang="qu">-ku</span>?</h2>{options(exercise.elements.find(item => item.id === 'ku-function')!, { causa: 'Hacer que otro realice la acción.', curso: 'Una acción en curso.', deseo: 'El deseo del hablante.' })}</article>
        </div>}
    </section>;
}
