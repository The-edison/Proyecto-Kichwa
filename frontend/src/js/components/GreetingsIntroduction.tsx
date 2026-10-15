import { Lightbulb, MessageCircle, MoonStar, Sun, Sunset } from 'lucide-react';
import cometaTeaching from '../../images/cometa-teaching.webp';
import '../../css/guided-introduction.css';
import '../../css/guided-greetings.css';

const greetings = [
    { time: 'Mañana', word: 'Alli puncha', meaning: 'Buenos días', Icon: Sun, tone: 'morning' },
    { time: 'Tarde', word: 'Alli chishi', meaning: 'Buenas tardes', Icon: Sunset, tone: 'afternoon' },
    { time: 'Noche', word: 'Alli tuta', meaning: 'Buenas noches', Icon: MoonStar, tone: 'night' },
];
const conversation = [
    ['Imanalla kanki?', '¿Cómo estás?'], ['Allilla kani.', 'Estoy bien.'],
    ['Maymanta kanki?', '¿De dónde eres?'], ['Maypitak llankanki?', '¿Dónde trabajas?'],
];
const farewells = [['Kayakama', 'Hasta mañana'], ['Tupananchikkama', 'Hasta luego'], ['Yupaychani', 'Gracias'], ['Kishpichiway', 'Perdón']];

export function GreetingsIntroduction() {
    return <div className="guided-introduction greetings-introduction">
        <header className="cometa-lesson-welcome">
            <div className="cometa-lesson-copy">
                <span className="cometa-lesson-eyebrow">APRENDE CON COMETA · UNIDAD 2</span>
                <h1>Saludos y conversación</h1>
                <p>Cada momento tiene su saludo. Aprende a saludar, conversar y despedirte en kichwa.</p>
                <div className="cometa-lesson-tip"><Lightbulb size={19} aria-hidden="true" /><span>Observa la luz del cielo: te ayudará a elegir el saludo de la mañana, la tarde o la noche.</span></div>
            </div>
            <figure className="cometa-lesson-teacher">
                <span className="cometa-lesson-greeting">¡Saludemos juntos!</span>
                <img src={cometaTeaching} width={260} height={280} alt="Cometa enseña los saludos con un libro y una pata extendida" decoding="async" />
                <figcaption>Cometa · Tu guía de aprendizaje</figcaption>
            </figure>
        </header>
        <section aria-labelledby="greetings-title">
            <div className="cometa-card-heading"><span className="cometa-card-number" aria-hidden="true">01</span><div><span className="cometa-card-kicker">UN SALUDO PARA CADA MOMENTO</span><h2 id="greetings-title">Para saludar</h2></div></div>
            <div className="greetings-times">{greetings.map(({ time, word, meaning, Icon, tone }) => <article key={word} className={`greetings-time greetings-${tone}`}>
                <div className="greetings-sky"><Icon size={40} strokeWidth={1.6} aria-hidden="true" /><span>{time}</span></div>
                <h3>{word}</h3><p>{meaning}</p>
            </article>)}</div>
        </section>
        <div className="greetings-details">
            <section className="cometa-lesson-card" aria-labelledby="conversation-title">
                <div className="cometa-card-heading"><span className="cometa-card-number" aria-hidden="true">02</span><h2 id="conversation-title">Para conversar</h2></div>
                <dl className="greetings-phrases">{conversation.map(([word, meaning]) => <div key={word}><dt>{word}</dt><dd>{meaning}</dd></div>)}</dl>
            </section>
            <section className="cometa-lesson-card" aria-labelledby="farewells-title">
                <div className="cometa-card-heading"><span className="cometa-card-number" aria-hidden="true">03</span><h2 id="farewells-title">Despedidas y amabilidad</h2></div>
                <dl className="greetings-phrases">{farewells.map(([word, meaning]) => <div key={word}><dt>{word}</dt><dd>{meaning}</dd></div>)}</dl>
            </section>
            <section className="cometa-lesson-card greetings-dialogue" aria-labelledby="dialogue-title">
                <div className="cometa-card-heading"><MessageCircle size={23} aria-hidden="true" /><h2 id="dialogue-title">Una pequeña conversación</h2></div>
                <div className="greetings-bubble"><span>PERSONA A</span><strong>Imanalla kanki?</strong><p>¿Cómo estás?</p></div>
                <div className="greetings-bubble greetings-reply"><span>PERSONA B</span><strong>Allilla kani.</strong><p>Estoy bien.</p></div>
                <p className="greetings-dialogue-note">La respuesta trata del mismo tema que la pregunta.</p>
            </section>
        </div>
    </div>;
}
