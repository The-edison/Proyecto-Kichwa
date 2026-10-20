import { MoonStar, Sun, Sunset, Volume2 } from 'lucide-react';
import { LessonNote, LessonOverview } from './LessonOverview';
import { LessonCardGrid } from './LessonCardGrid';
import { useLessonAudio } from '../hooks/useLessonAudio';
import '../../css/guided-introduction.css';
import '../../css/guided-greetings.css';

const greetings = [
    { time: 'Mañana', word: 'Alli puncha', meaning: 'Buenos días', Icon: Sun, tone: 'morning', clip: 'alli-puncha' },
    { time: 'Tarde', word: 'Alli chishi', meaning: 'Buenas tardes', Icon: Sunset, tone: 'afternoon', clip: 'alli-chishi' },
    { time: 'Noche', word: 'Alli tuta', meaning: 'Buenas noches', Icon: MoonStar, tone: 'night', clip: 'alli-tuta' },
] as const;
const conversation = [
    ['Imanalla kanki', '¿Cómo estás?', 'imanalla-kanki'], ['Allilla kani.', 'Estoy bien.', 'allilla-kani'],
    ['Maymanta kanki', '¿De dónde eres?', 'maymanta-kanki'], ['Maypitak llankanki', '¿Dónde trabajas?', 'maypitak-llankanki'],
] as const;
const farewells = [['Kayakaman', 'Hasta mañana', 'kayakaman'], ['Kipakaman', 'Hasta luego', 'kipakaman'], ['Yupaychani', 'Gracias', 'yupaychani'], ['Kishpichiway', 'Perdón', 'kishpichiway']] as const;

export function GreetingsIntroduction() {
    const { state, play } = useLessonAudio();
    const active = (clip: string) => state.clip === clip && (state.phase === 'playing' || state.phase === 'loading');
    const status = (clips: readonly string[]) => {
        const selected = clips.includes(state.clip ?? '');
        return <p className={`greetings-audio-status${selected && state.phase === 'error' ? ' is-error' : ' sr-only'}`} role="status" aria-live="polite">{selected ? state.message : ''}</p>;
    };
    return <div className="guided-introduction greetings-introduction">
        <LessonOverview
            unit="UNIDAD 2"
            title="Saludos y conversación"
            description="Aprende a iniciar una conversación en kichwa: un saludo para cada momento y expresiones para acercarte a los demás."
        />
        <LessonNote>El saludo cambia según el momento del día. <strong>Observa la mañana, la tarde y la noche</strong> para elegir la expresión adecuada.</LessonNote>
        <p className="greetings-audio-instruction"><Volume2 size={16} aria-hidden="true" />Pulsa un saludo o una expresión para escuchar su pronunciación.</p>
        <section className="greetings-section" aria-labelledby="greetings-title">
            <div className="cometa-card-heading"><span className="cometa-card-number" aria-hidden="true">01</span><div><span className="cometa-card-kicker">UN SALUDO PARA CADA MOMENTO</span><h2 id="greetings-title">Para saludar</h2></div></div>
            <div className="greetings-times">{greetings.map(({ time, word, meaning, Icon, tone, clip }) => <article key={word} className={`greetings-time greetings-${tone}${active(clip) ? ' is-active' : ''}`}>
                <div className="greetings-sky"><Icon size={40} strokeWidth={1.6} aria-hidden="true" /><span>{time}</span></div>
                <h3>{word}</h3><p>{meaning}</p>
                <button type="button" className="greetings-tile-audio" aria-label={`Escuchar ${word}`} onClick={() => play(clip)}><Volume2 size={15} aria-hidden="true" /><span>{active(clip) ? state.phase === 'playing' ? 'Sonando' : 'Cargando…' : 'Escuchar'}</span></button>
            </article>)}</div>
            {status(greetings.map(item => item.clip))}
        </section>
        <LessonCardGrid className="greetings-details">
            <section className="cometa-lesson-card" aria-labelledby="conversation-title">
                <div className="cometa-card-heading"><span className="cometa-card-number" aria-hidden="true">02</span><div><span className="cometa-card-kicker">PREGUNTAS Y RESPUESTAS</span><h2 id="conversation-title">Para conversar</h2></div></div>
                <dl className="greetings-phrases">{conversation.map(([word, meaning, clip]) => <div key={word}><dt><button type="button" className={`greetings-phrase-audio${active(clip) ? ' is-active' : ''}`} aria-label={`Escuchar ${word}`} onClick={() => play(clip)}><Volume2 size={16} aria-hidden="true" /><span>{word}</span></button></dt><dd>{meaning}</dd></div>)}</dl>
                {status(conversation.map(item => item[2]))}
            </section>
            <section className="cometa-lesson-card" aria-labelledby="farewells-title">
                <div className="cometa-card-heading"><span className="cometa-card-number" aria-hidden="true">03</span><div><span className="cometa-card-kicker">EXPRESIONES COTIDIANAS</span><h2 id="farewells-title">Despedidas y amabilidad</h2></div></div>
                <dl className="greetings-phrases">{farewells.map(([word, meaning, clip]) => <div key={word}><dt><button type="button" className={`greetings-phrase-audio${active(clip) ? ' is-active' : ''}`} aria-label={`Escuchar ${word}`} onClick={() => play(clip)}><Volume2 size={16} aria-hidden="true" /><span>{word}</span></button></dt><dd>{meaning}</dd></div>)}</dl>
                {status(farewells.map(item => item[2]))}
            </section>
            <section className="cometa-lesson-card greetings-dialogue" aria-labelledby="dialogue-title">
                <div className="cometa-card-heading"><span className="cometa-card-number" aria-hidden="true">04</span><div><span className="cometa-card-kicker">EJEMPLO EN CONTEXTO</span><h2 id="dialogue-title">Una pequeña conversación</h2></div></div>
                <div className="greetings-bubble"><span>PERSONA A</span><strong>Imanalla kanki</strong><p>¿Cómo estás?</p></div>
                <div className="greetings-bubble greetings-reply"><span>PERSONA B</span><strong>Allilla kani.</strong><p>Estoy bien.</p></div>
                <p className="greetings-dialogue-note"><strong>Observa el intercambio.</strong> La primera persona pregunta cómo estás; la segunda responde sobre su estado de ánimo.</p>
            </section>
        </LessonCardGrid>
    </div>;
}
