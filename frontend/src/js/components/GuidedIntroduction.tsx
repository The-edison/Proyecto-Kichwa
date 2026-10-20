import { ArrowRight, Flower2, Footprints, Heart, House, PawPrint, TreeDeciduous } from 'lucide-react';
import { LessonNote, LessonOverview } from './LessonOverview';
import { LessonCardGrid } from './LessonCardGrid';
import { VowelAudioButtons } from './VowelAudioButtons';
import { ConsonantAudioButton } from './ConsonantAudioButton';
import { useLessonAudio } from '../hooks/useLessonAudio';
import '../../css/guided-introduction.css';

const letters = ['ch', 'h', 'k', 'l', 'll', 'm', 'n', 'ñ', 'p', 'r', 's', 'sh', 't', 'w', 'y'];
const vocabulary = [
    { word: 'sisa', meaning: 'flor', Icon: Flower2 },
    { word: 'llama', meaning: 'oveja', Icon: PawPrint },
    { word: 'wasi', meaning: 'casa', Icon: House },
    { word: 'shunku', meaning: 'corazón', Icon: Heart },
    { word: 'purina', meaning: 'caminar', Icon: Footprints },
    { word: 'yura', meaning: 'árbol', Icon: TreeDeciduous },
];

export function GuidedIntroduction() {
    const playback = useLessonAudio();
    return <div className="guided-introduction">
        <LessonOverview
            unit="UNIDAD 1"
            title="La escritura del kichwa"
            description="Conoce las tres vocales y las 15 consonantes del kichwa. Escucha sus sonidos y aprende a formar palabras sencillas."
        />
        <LessonNote>El kichwa tiene <strong>tres vocales (a, i y u)</strong> y <strong>15 consonantes.</strong> Pulsa los botones para escuchar sus sonidos.</LessonNote>

        <LessonCardGrid>
            <section className="cometa-lesson-card cometa-vowels" aria-labelledby="cometa-vowels-title">
                <div className="cometa-card-heading"><span className="cometa-card-number" aria-hidden="true">01</span><div><span className="cometa-card-kicker">EMPIEZA POR AQUÍ</span><h2 id="cometa-vowels-title">Las vocales</h2></div></div>
                <VowelAudioButtons playback={playback} />
                <div className="cometa-word-example"><span className="cometa-example-label">ENCUÉNTRALAS EN</span><span className="cometa-example-word" role="img" aria-label="wasi"><span aria-hidden="true">w<mark>a</mark>s<mark>i</mark></span></span><span className="cometa-word-meaning">casa</span></div>
            </section>

            <section className="cometa-lesson-card cometa-letters" aria-labelledby="cometa-letters-title">
                <div className="cometa-card-heading cometa-letters-heading"><span className="cometa-card-number" aria-hidden="true">02</span><div><span className="cometa-card-kicker">RECONOCE SUS SONIDOS</span><h2 id="cometa-letters-title">Las consonantes</h2></div><ConsonantAudioButton playback={playback} /></div>
                <p className="cometa-vowel-status" role="status" aria-live="polite">{playback.state.clip === 'consonantes' ? playback.state.message : ''}</p>
                <ul className="cometa-letter-chips" aria-label="Las 15 consonantes">{letters.map(letter => <li key={letter} className={letter.length > 1 ? 'is-group' : undefined}>{letter}</li>)}</ul>
                <p className="cometa-letter-note">Las consonantes <strong>ch, ll y sh</strong> se escriben con dos letras. Cada una cuenta como una consonante en esta lista.</p>
            </section>

            <section className="cometa-lesson-card cometa-vocabulary" aria-labelledby="cometa-vocabulary-title">
                <div className="cometa-card-heading"><span className="cometa-card-number" aria-hidden="true">03</span><div><span className="cometa-card-kicker">CONECTA CON SU SIGNIFICADO</span><h2 id="cometa-vocabulary-title">Palabras que vamos a reconocer</h2></div></div>
                <dl className="cometa-vocabulary-list">{vocabulary.map(({ word, meaning, Icon }) => <div key={word}><Icon size={22} strokeWidth={1.7} aria-hidden="true" /><div><dt>{word}</dt><dd>{meaning}</dd></div></div>)}</dl>
            </section>

            <section className="cometa-lesson-card cometa-word-builder" aria-labelledby="cometa-builder-title">
                <div className="cometa-card-heading"><span className="cometa-card-number" aria-hidden="true">04</span><div><span className="cometa-card-kicker">ASÍ LO VAS A HACER</span><h2 id="cometa-builder-title">Cómo completar una palabra</h2></div></div>
                <p className="cometa-builder-prompt"><strong>Sisa</strong> significa «flor». Mira qué vocal falta para completar la palabra.</p>
                <div className="cometa-word-transformation" role="img" aria-label="s, espacio vacío, s, a. Completa con i para formar sisa.">
                    <span className="cometa-word-tiles" aria-hidden="true"><span>s</span><span className="is-empty">_</span><span>s</span><span>a</span></span>
                    <ArrowRight size={20} aria-hidden="true" />
                    <span className="cometa-word-tiles" aria-hidden="true"><span>s</span><span className="is-answer">i</span><span>s</span><span>a</span></span>
                </div>
                <p className="cometa-builder-note"><span aria-hidden="true">✦</span> Completa con <strong>i</strong> y lee la palabra entera: <strong>sisa.</strong></p>
            </section>
        </LessonCardGrid>
    </div>;
}
