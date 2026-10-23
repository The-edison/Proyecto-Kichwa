import type { ReactNode } from 'react';
import { Lightbulb } from 'lucide-react';
import intiTeaching from '../../images/cometa-teaching.webp';
import '../../css/lesson-notebook.css';

type LessonOverviewProps = {
    unit: string;
    title: string;
    description: string;
};

const emphasis = /(«[^»]+»|(?<![\p{L}\p{N}])(?:ñukanchik|kankuna|paykuna|ñuka|kan|pay|chunka|shuk|killa|allku|puka|taruka|yurak|chaki|inti|wasi|tamya|urku|purina|puri|killkana|killka|mikuna|mikuni|significado en español|Pulsa el botón|tres vocales|del cero al veinte|cantidades mayores|días de la semana|meses del año|animales y colores|partes del cuerpo|naturaleza|cosas de la casa|nombra una acción|letras del kichwa|palabras sencillas|preguntas y respuestas sencillas|quitar -na)(?![\p{L}\p{N}]))/giu;

export function LessonText({ text }: { text: string }) {
    return <>{text.split(emphasis).map((part, index) => index % 2 ? <strong className="lesson-key-text" key={index}>{part}</strong> : part)}</>;
}

export function LessonOverview({ unit, title, description }: LessonOverviewProps) {
    return <header className="lesson-overview">
            <div className="lesson-overview-copy">
                <p className="lesson-overview-meta"><span>{unit}</span><span aria-hidden="true">/</span> LECCIÓN</p>
                <h1>{title}</h1>
                <p><LessonText text={description} /></p>
            </div>
            <figure className="lesson-guide">
                <img src={intiTeaching} width={100} height={108} alt="Inti, tu guía de aprendizaje" decoding="async" />
                <figcaption>Aprende con Inti</figcaption>
            </figure>
        </header>;
}

export function LessonNote({ children }: { children: ReactNode }) {
    return <aside className="lesson-study-note"><Lightbulb size={19} aria-hidden="true" /><p>{typeof children === 'string' ? <LessonText text={children} /> : children}</p></aside>;
}
