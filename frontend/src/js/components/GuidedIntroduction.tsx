import { ArrowRight, Flower2, Footprints, Heart, House, Lightbulb, PawPrint } from 'lucide-react';
import cometaTeaching from '../../images/cometa-teaching.webp';
import '../../css/guided-introduction.css';

const letters = ['ch', 'h', 'k', 'l', 'll', 'm', 'n', 'ñ', 'p', 'r', 's', 'sh', 't', 'w', 'y'];
const vocabulary = [
    { word: 'sisa', meaning: 'flor', Icon: Flower2 },
    { word: 'llama', meaning: 'oveja', Icon: PawPrint },
    { word: 'wasi', meaning: 'casa', Icon: House },
    { word: 'shunku', meaning: 'corazón', Icon: Heart },
    { word: 'purina', meaning: 'caminar', Icon: Footprints },
];

export function GuidedIntroduction() {
    return <div className="guided-introduction">
        <header className="cometa-lesson-welcome">
            <div className="cometa-lesson-copy">
                <span className="cometa-lesson-eyebrow">APRENDE CON COMETA</span>
                <h1>La escritura del kichwa</h1>
                <p>Primero, descubre las letras. Después, únelas para reconocer tus primeras palabras.</p>
                <div className="cometa-lesson-tip"><Lightbulb size={19} aria-hidden="true" /><span>En la lengua kichwa solo se usan tres vocales: <strong>a, i y u.</strong></span></div>
            </div>
            <figure className="cometa-lesson-teacher">
                <span className="cometa-lesson-greeting">¡Te muestro cómo!</span>
                <img src={cometaTeaching} width={260} height={280} alt="Cometa, el cuy con poncho rojo, presenta el contenido con una pata extendida y un libro" decoding="async" />
                <figcaption><span aria-hidden="true">✦</span> Cometa · Tu guía de aprendizaje</figcaption>
            </figure>
        </header>

        <div className="cometa-lesson-cards">
            <section className="cometa-lesson-card cometa-vowels" aria-labelledby="cometa-vowels-title">
                <div className="cometa-card-heading"><span className="cometa-card-number" aria-hidden="true">01</span><div><span className="cometa-card-kicker">EMPIEZA POR AQUÍ</span><h2 id="cometa-vowels-title">Las vocales</h2></div></div>
                <div className="cometa-vowel-tiles" aria-label="Vocales: a, i, u">{['a', 'i', 'u'].map(vowel => <span key={vowel}>{vowel}</span>)}</div>
                <div className="cometa-word-example"><span className="cometa-example-label">ENCUÉNTRALAS EN</span><span className="cometa-example-word" role="img" aria-label="wasi"><span aria-hidden="true">w<mark>a</mark>s<mark>i</mark></span></span><span className="cometa-word-meaning">casa</span></div>
            </section>

            <section className="cometa-lesson-card cometa-letters" aria-labelledby="cometa-letters-title">
                <div className="cometa-card-heading"><span className="cometa-card-number" aria-hidden="true">02</span><div><span className="cometa-card-kicker">DA FORMA A LAS PALABRAS</span><h2 id="cometa-letters-title">Letras y grupos de letras</h2></div></div>
                <ul className="cometa-letter-chips" aria-label="Letras y grupos de letras de la unidad">{letters.map(letter => <li key={letter} className={letter.length > 1 ? 'is-group' : undefined}>{letter}</li>)}</ul>
                <p className="cometa-letter-note"><strong>ch, ll y sh</strong> se escriben con dos letras.</p>
                <p className="cometa-extra-letter">También verás <strong>ts</strong> en <em>tsalik</em> y <em>tsuntsu.</em></p>
            </section>

            <section className="cometa-lesson-card cometa-vocabulary" aria-labelledby="cometa-vocabulary-title">
                <div className="cometa-card-heading"><span className="cometa-card-number" aria-hidden="true">03</span><div><span className="cometa-card-kicker">CONECTA CON SU SIGNIFICADO</span><h2 id="cometa-vocabulary-title">Palabras que vamos a reconocer</h2></div></div>
                <dl className="cometa-vocabulary-list">{vocabulary.map(({ word, meaning, Icon }) => <div key={word}><Icon size={22} strokeWidth={1.7} aria-hidden="true" /><div><dt>{word}</dt><dd>{meaning}</dd></div></div>)}</dl>
            </section>

            <section className="cometa-lesson-card cometa-word-builder" aria-labelledby="cometa-builder-title">
                <div className="cometa-card-heading"><span className="cometa-card-number" aria-hidden="true">04</span><div><span className="cometa-card-kicker">ASÍ LO VAS A HACER</span><h2 id="cometa-builder-title">Cómo completar una palabra</h2></div></div>
                <p className="cometa-builder-prompt">Si escuchas <strong>«sisa»</strong>, busca la letra que falta:</p>
                <div className="cometa-word-transformation" role="img" aria-label="s, espacio vacío, s, a. Completa con i para formar sisa.">
                    <span className="cometa-word-tiles" aria-hidden="true"><span>s</span><span className="is-empty">_</span><span>s</span><span>a</span></span>
                    <ArrowRight size={20} aria-hidden="true" />
                    <span className="cometa-word-tiles" aria-hidden="true"><span>s</span><span className="is-answer">i</span><span>s</span><span>a</span></span>
                </div>
                <p className="cometa-builder-note"><span aria-hidden="true">✦</span> Completa con <strong>i</strong> y lee la palabra entera: <strong>sisa.</strong></p>
            </section>
        </div>
    </div>;
}
