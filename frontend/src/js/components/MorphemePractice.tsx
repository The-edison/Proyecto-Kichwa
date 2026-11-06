import { useEffect, useRef, useState } from 'react';
import { Check, Pause, Play, Volume2 } from 'lucide-react';
import { MatchingLines } from './MatchingLines';
import { MorphemeIllustration } from './MorphemeIllustration';
import { MorphemeOrdinalExercise } from './MorphemeOrdinalExercise';
import thirdPlacePodium from '../../images/morpheme-third-place.png';
import familyListeningAtlas from '../../images/morpheme-family-listening.png';
import { TimeMorphemeIllustration } from './TimeMorphemeIllustration';
import { VerbalIllustration } from './VerbalIllustration';
import type { Exercise, ExerciseAnswer, ExerciseFeedback } from '../types';
import '../../css/morpheme-practice.css';

const audioRoot = `${import.meta.env.BASE_URL}audio/intermedio/modulo-2/unidad-1/`;
const audioFiles: Record<number, string> = { 2: 'julio-wasikamak.mp3', 6: 'shukniki.mp3', 8: 'laushushi-oracion.mp3' };
const verbalCells: Record<string, number> = { wawaku: 0, warmiku: 1, wasiku: 2, mashiku: 3, shamuychi: 6, apamuychi: 7, armachina: 8, hapichi: 9 };
const verbalListeningScenes = {
    wawaku: { file: 'wawaku-oracion.mp3', cell: 5, description: 'Una madre abraza a su bebé.' },
    warmiku: { file: 'warmiku-oracion.mp3', cell: 1, description: 'Una mujer andina con sombrero y trenzas.' },
    wasiku: { file: 'wasiku-oracion.mp3', cell: 2, description: 'Una casita andina con flores junto a la entrada.' },
    mashiku: { file: 'mashiku-oracion.mp3', cell: 3, description: 'Dos amigos de la comunidad.' },
    mikunayan: { file: 'mikunayan-oracion.mp3', cell: 4, description: 'Una joven con un plato de comida.' },
    millanayan: { file: 'millanayan-oracion.mp3', cell: 12, description: 'Una joven siente asco al mirar un plato de comida.' },
    killkanayan: { file: 'killkanayan-oracion.mp3', cell: 11, description: 'Una joven escribe en su cuaderno.' },
    yachanayan: { file: 'yachanayan-oracion.mp3', cell: 10, description: 'Una joven estudia con libros.' },
};
const timeListeningScenes = {
    alex: { file: 'alex-samarirka-oracion.mp3', cell: 0, description: 'Alex descansa bajo un árbol.' },
    edgar: { file: 'edgar-wakarka-oracion.mp3', cell: 1, description: 'Edgar llora y se seca las lágrimas.' },
    kaled: { file: 'kaled-chayarka-oracion.mp3', cell: 2, description: 'Kaled llega con su mochila a una casa de la comunidad.' },
    pakarina: { file: 'pakarina-chinkarirka-oracion.mp3', cell: 3, description: 'Una persona busca el camino en el mercado.' },
    llanka: { file: 'llankasha-oracion.mp3', cell: 5, description: 'Una persona trabaja la tierra con una azada.' },
    yachachi: { file: 'yachachisha-oracion.mp3', cell: 6, description: 'Una docente enseña a sus estudiantes en clase.' },
    puri: { file: 'purisha-oracion.mp3', cell: 7, description: 'Una persona camina por un sendero de su comunidad.' },
    sira: { file: 'sirasha-oracion.mp3', cell: 8, description: 'Una mujer cose una tela bordada.' },
};
const listeningScenes = {
    julio: { file: 'julio-wasikamak.mp3', cell: 5, description: 'Julio frente a una casa andina.' },
    manuelito: { file: 'manuelito-punkukamak.mp3', cell: 1, description: 'Puerta de entrada de una casa.' },
    marilin: { file: 'marilin-llamakamak.mp3', cell: 2, description: 'Una oveja en el campo.' },
    luis: { file: 'luis-tantakamak.mp3', cell: 4, description: 'Pan recién preparado.' },
};
const familyListeningScenes = {
    layaya: { file: 'layaya-oracion.mp3', cell: 0, description: 'Brayan y un hombre adulto con familiares en un patio andino.' },
    lamama: { file: 'lamama-oracion.mp3', cell: 1, description: 'Una joven y una mujer adulta junto a una cocina apagada.' },
    lachuri: { file: 'lachuri-oracion.mp3', cell: 2, description: 'Un niño y un hombre adulto junto a la casa familiar.' },
    laushushi: { file: 'laushushi-oracion.mp3', cell: 3, description: 'Una joven con trenzas descansando en el patio, junto a una mujer adulta.' },
};
const scenes: Record<number, { cell: number; description: string }> = {
    2: { cell: 5, description: 'Julio con sombrero y poncho andino frente a una casa.' },
    6: { cell: 7, description: 'Tres niños en un podio. El ganador está en el centro, en primer lugar.' },
    8: { cell: 9, description: 'Joven andina con cabello trenzado y blusa roja.' },
};
const occupationCells: Record<string, number> = { wasi: 0, punku: 1, llama: 2, wakra: 3, tanta: 4 };

function timeLabel(seconds: number) {
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

/** A single audio element per panel prevents clips playing over one another. */
function usePracticeAudio(root = audioRoot) {
    const audio = useRef<HTMLAudioElement>(null);
    const [file, setFile] = useState('');
    const [playing, setPlaying] = useState(false);
    const [error, setError] = useState(false);
    const [time, setTime] = useState(0);
    const [duration, setDuration] = useState(0);
    useEffect(() => {
        const element = audio.current;
        return () => { element?.pause(); };
    }, []);
    function play(nextFile: string, restart = false) {
        const element = audio.current;
        if (!element) return;
        if (!restart && file === nextFile && !element.paused) {
            element.pause();
            return;
        }
        setError(false);
        if (file !== nextFile) {
            element.pause();
            element.src = `${root}${nextFile}`;
            setFile(nextFile); setTime(0); setDuration(0);
        } else if (element.error) {
            element.load();
        }
        if (restart) element.currentTime = 0;
        void element.play().catch(() => { setError(true); setPlaying(false); });
    }
    const player = <audio ref={audio} preload="none" onPlay={event => {
        document.querySelectorAll<HTMLAudioElement>('.morpheme-practice audio').forEach(element => {
            if (element !== event.currentTarget) element.pause();
        });
        setPlaying(true);
    }} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onTimeUpdate={() => setTime(audio.current?.currentTime ?? 0)} onLoadedMetadata={() => setDuration(Number.isFinite(audio.current?.duration) ? audio.current!.duration : 0)} onError={() => { setError(true); setPlaying(false); }} />;
    return { audio, file, playing, error, time, duration, play, player };
}

export function MorphemePractice({ exercise, answer, feedback, busy, onChange }: { exercise: Exercise; answer: ExerciseAnswer; feedback?: ExerciseFeedback; busy: boolean; onChange: (answer: ExerciseAnswer) => void }) {
    const [selected, setSelected] = useState('');
    const timeActivity = exercise.config?.time_practice;
    const verbalActivity = exercise.config?.verbal_practice;
    const verbalListening = exercise.config?.verbal_listening ? verbalListeningScenes[exercise.config.verbal_listening] : undefined;
    const clip = usePracticeAudio(verbalActivity ? `${import.meta.env.BASE_URL}audio/intermedio/modulo-2/unidad-3/` : timeActivity ? `${import.meta.env.BASE_URL}audio/intermedio/modulo-2/unidad-2/` : audioRoot);
    const disabled = busy || feedback?.is_correct === true;
    const activity = exercise.config?.morpheme_practice ?? 0;
    const origins = exercise.elements.filter(item => item.grupo === 'origen');
    const destinationIds = activity === 1 && !verbalActivity ? ['d1', 'd0', 'd4', 'd2', 'd3'] : ['d2', 'd3', 'd0', 'd1'];
    const destinations = exercise.elements.filter(item => item.grupo === 'destino').sort((a, b) => destinationIds.indexOf(a.id) - destinationIds.indexOf(b.id));
    const pairs = answer.pares ?? [];
    const listening = exercise.config?.morpheme_listening ? listeningScenes[exercise.config.morpheme_listening] : undefined;
    const familyListening = exercise.config?.morpheme_family_listening ? familyListeningScenes[exercise.config.morpheme_family_listening] : undefined;
    const timeListening = exercise.config?.time_listening ? timeListeningScenes[exercise.config.time_listening] : undefined;
    const scene = familyListening ?? listening ?? scenes[activity];
    const thirdPlace = activity === 6 && exercise.config?.morpheme_position === 'tercero';
    const mainFile = verbalListening?.file ?? (verbalActivity ? verbalActivity === 3 ? 'wawaku-oracion.mp3' : 'yachanayani.mp3' : timeListening?.file ?? (timeActivity ? timeActivity === 3 ? 'alex-samarirka.mp3' : 'nuka-llankasha.mp3' : familyListening?.file ?? listening?.file ?? (exercise.config?.morpheme_position === 'tercero' ? 'kimsaniki.mp3' : audioFiles[activity])));
    function pair(id: string) {
        if (disabled) return;
        if (!selected) {
            onChange({ pares: pairs.filter(item => item.destino !== id) });
            return;
        }
        onChange({ pares: [...pairs.filter(item => item.origen !== selected && item.destino !== id), { origen: selected, destino: id }] });
        setSelected('');
    }
    function select(id: string) {
        if (disabled) return;
        const origin = origins.find(item => item.id === id);
        if (origin) clip.play(`${origin.texto.toLowerCase()}.mp3`, true);
        if (pairs.some(item => item.origen === id)) onChange({ pares: pairs.filter(item => item.origen !== id) });
        setSelected(previous => previous === id ? '' : id);
    }
    return <section className={`morpheme-practice morpheme-activity-${activity}`} data-exercise-correct={feedback?.is_correct} aria-label={exercise.config?.title}>
        {clip.player}
        {exercise.type === 'relacionar' && <div className={`morpheme-matching-layout${activity === 7 ? ' is-family' : ''}`}>
            <div className="morpheme-board" data-matching-board>
                <div className="morpheme-column"><h2 className="sr-only">Palabras en kichwa</h2>{origins.map(item => {
                    const matched = pairs.find(pair => pair.origen === item.id);
                    const file = `${item.texto.toLowerCase()}.mp3`;
                    const illustration = occupationCells[item.texto.toLowerCase().replace(/kamak$/, '')];
                    return <div className="morpheme-origin" key={item.id}>
                        <button type="button" className="morpheme-word-audio" aria-label={`Escuchar ${item.texto}`} aria-pressed={clip.file === file && clip.playing} onClick={() => clip.play(file, true)}><Volume2 size={21} aria-hidden="true" /></button>
                        <button type="button" data-matching-origin={item.id} data-answer-correct={matched ? feedback?.item_results?.[item.id] ?? feedback?.is_correct : undefined} disabled={disabled} aria-pressed={selected === item.id || Boolean(matched)} className={selected === item.id ? 'is-selected' : matched ? 'is-paired' : ''} onClick={() => select(item.id)}>{verbalActivity && <VerbalIllustration cell={verbalCells[item.texto.toLowerCase()] ?? 0} description={item.texto} />}{timeActivity === 2 && <TimeMorphemeIllustration cell={Number(item.id.slice(1))} description={`Ilustración de ${item.texto}`} />}{!verbalActivity && !timeActivity && activity === 1 && illustration !== undefined && <MorphemeIllustration cell={illustration} description={`Ilustración de ${item.texto}`} />}<span lang="qu">{item.texto}</span></button>
                    </div>;
                })}</div>
                <div className="morpheme-column"><h2 className="sr-only">Significados en español</h2>{destinations.map(item => {
                    const matched = pairs.find(pair => pair.destino === item.id);
                    return <button type="button" className={matched ? 'is-paired' : ''} data-matching-destination={item.id} data-answer-correct={matched ? feedback?.item_results?.[matched.origen] ?? feedback?.is_correct : undefined} key={item.id} disabled={disabled || (!selected && !matched)} aria-pressed={Boolean(matched)} onClick={() => pair(item.id)}>{item.texto}</button>;
                })}</div>
                <MatchingLines pairs={pairs} feedback={feedback} />
            </div>
            {activity === 7 && <MorphemeIllustration cell={8} description="Familia andina: dos adultos detrás de sus dos hijos." className="morpheme-family" />}
            <p className="morpheme-matching-hint" role="status">{pairs.length} de {origins.length} parejas · {disabled ? 'Parejas comprobadas.' : selected ? `Ahora elige el significado de ${origins.find(item => item.id === selected)?.texto}.` : 'Toca una palabra y después su significado.'}</p>
        </div>}
        {exercise.type === 'seleccion_multiple' && <div className="morpheme-listening-layout">
            {scene && <figure className="morpheme-listening-scene">{verbalActivity ? <VerbalIllustration cell={verbalListening?.cell ?? (verbalActivity === 3 ? 5 : 10)} description={verbalListening?.description ?? (verbalActivity === 3 ? "Una madre abraza a su bebé." : "Una joven estudia con libros.")} /> : timeActivity ? <TimeMorphemeIllustration cell={timeListening?.cell ?? (timeActivity === 3 ? 0 : 5)} description={timeListening?.description ?? (timeActivity === 3 ? 'Alex descansa bajo un árbol.' : 'Una persona trabaja en el campo.')} /> : familyListening ? <span className="morpheme-family-listening-illustration" style={{ display: 'block', position: 'relative', width: '100%', aspectRatio: '1', overflow: 'hidden', borderRadius: 18 }}><img src={familyListeningAtlas} alt={familyListening.description} width={1024} height={1024} decoding="async" style={{ position: 'absolute', width: '200%', maxWidth: 'none', height: '200%', left: `${familyListening.cell % 2 * -100}%`, top: `${Math.floor(familyListening.cell / 2) * -100}%` }} /></span> : thirdPlace ? <img src={thirdPlacePodium} alt="Niño con medalla de bronce en el podio marcado con el número 3: tercer lugar." width={512} height={512} decoding="async" /> : <MorphemeIllustration cell={scene.cell} description={scene.description} />}{activity === 6 && !thirdPlace && <figcaption aria-hidden="true"><span>2</span><span>1</span><span>3</span></figcaption>}</figure>}
            <div className="morpheme-listening-content">
                <div className="morpheme-audio-player" role="group" aria-label="Reproductor del ejercicio">
                    <button type="button" className="morpheme-play" aria-label={clip.playing ? 'Pausar audio' : 'Reproducir audio'} onClick={() => clip.play(mainFile)}>{clip.playing ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}</button>
                    <span className="morpheme-audio-time">{timeLabel(clip.time)} / {timeLabel(clip.duration)}</span>
                    <input type="range" aria-label="Posición del audio" min={0} max={clip.duration || 1} step={0.1} value={clip.time} disabled={!clip.duration} onChange={event => { if (clip.audio.current) clip.audio.current.currentTime = Number(event.target.value); }} />
                    <Volume2 size={21} aria-hidden="true" />
                </div>
                {(verbalListening || verbalActivity === 3) && <p lang="qu" className="verbal-listening-transcript">{exercise.config?.verbal_sentence ?? 'Ñuka churika shuk sumak wawaku kan.'}</p>}
                <fieldset disabled={disabled} className="morpheme-options"><legend className="sr-only">Selecciona una respuesta</legend>{exercise.elements.map(item => <label key={item.id} className={answer.seleccion?.includes(item.id) ? 'is-selected' : ''} data-answer-correct={answer.seleccion?.includes(item.id) ? feedback?.item_results?.[item.id] ?? feedback?.is_correct : undefined}><input type="radio" name={`morpheme-${exercise.id}`} checked={answer.seleccion?.includes(item.id) ?? false} onChange={() => onChange({ seleccion: [item.id] })} /><span>{item.texto}</span></label>)}</fieldset>
            </div>
        </div>}
        {exercise.type === 'completar' && <>
            <p className="morpheme-writing-help" id={`morpheme-word-help-${exercise.id}`}>Ejemplo: <span lang="qu">wasi → <strong>wasikamak</strong></span></p>
            <div className="morpheme-rows">{exercise.elements.map(item => {
            const correct = feedback?.item_results?.[item.id] ?? feedback?.is_correct;
            const base = item.id;
            return <label key={item.id} data-answer-correct={correct}>
                <MorphemeIllustration cell={occupationCells[base] ?? 0} description={item.texto.split(' +')[0]} />
                <strong lang="qu">{item.texto.split(' +')[0]}</strong>
                <span className="morpheme-writing-field"><input aria-label={`Escribe la palabra completa de ${item.texto.split(' +')[0]} con -kamak`} aria-describedby={`morpheme-word-help-${exercise.id}`} lang="qu" type="text" maxLength={80} disabled={disabled} value={answer.textos?.[item.id] ?? ''} onChange={event => onChange({ textos: { ...answer.textos, [item.id]: event.target.value } })} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="Palabra completa" />{correct === true && <Check size={22} aria-label="Correcto" />}</span>
            </label>;
        })}</div></>}
        {exercise.type === 'ordenar' && <MorphemeOrdinalExercise exercise={exercise} answer={answer} feedback={feedback} disabled={disabled} onChange={onChange} />}
        {clip.error && <p className="morpheme-audio-error" role="status">Audio no disponible. Vuelve a intentarlo cuando se haya cargado la grabación.</p>}
    </section>;
}

export function MorphemeListeningPanel({ exercises, answers, feedback, busy, onChange, positions = false }: {
    exercises: Exercise[]; answers: Record<number, ExerciseAnswer>; feedback: Record<number, ExerciseFeedback | undefined>;
    busy: boolean; onChange: (exercise: Exercise, answer: ExerciseAnswer) => void; positions?: boolean;
}) {
    const [visibleExercise, setVisibleExercise] = useState(0);
    const verbalPanel = exercises.every(exercise => exercise.config?.verbal_listening);
    return <section className="morpheme-listening-panel" aria-label={positions ? 'Escucha e identifica el lugar' : `${exercises[0]?.config?.morpheme_family_listening ? 'Parentescos: escucha y elige el significado' : 'Escucha y selecciona'}: panel ${exercises[0]?.config?.verbal_panel ?? exercises[0]?.config?.time_panel ?? exercises[0]?.config?.morpheme_panel} de 2`}>
        {verbalPanel && <nav className="verbal-listening-nav" aria-label="Ejercicios del panel">{exercises.map((exercise, index) => <button type="button" key={exercise.id} aria-pressed={visibleExercise === index} onClick={() => { document.querySelectorAll<HTMLAudioElement>('.morpheme-listening-panel audio').forEach(audio => audio.pause()); setVisibleExercise(index); }}>Ejercicio {((exercise.config?.verbal_panel ?? 1) - 1) * 2 + index + 1}<span>{answers[exercise.id]?.seleccion?.length ? '1/1' : '0/1'}</span></button>)}</nav>}
        {exercises.map((exercise, index) => {
            const result = feedback[exercise.id];
            const number = ((exercise.config?.verbal_panel ?? exercise.config?.time_panel ?? exercise.config?.morpheme_panel ?? 1) - 1) * 2 + index + 1;
            return <article key={exercise.id} className={`morpheme-listening-card${visibleExercise === index ? ' is-active' : ''}`} data-exercise-correct={result?.is_correct}>
                <h2>Ejercicio {number}</h2>
                <MorphemePractice exercise={exercise} answer={answers[exercise.id] ?? {}} feedback={result} busy={busy} onChange={answer => onChange(exercise, answer)} />
                {result && <p className={`guided-feedback ${result.is_correct ? 'is-correct' : 'is-incorrect'}`} role="status">{result.feedback}</p>}
            </article>;
        })}
    </section>;
}
