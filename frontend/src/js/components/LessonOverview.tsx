import type { ReactNode } from 'react';
import { Lightbulb } from 'lucide-react';
import cometaTeaching from '../../images/cometa-teaching.webp';

type LessonOverviewProps = {
    unit: string;
    title: string;
    description: string;
};

export function LessonOverview({ unit, title, description }: LessonOverviewProps) {
    return <header className="lesson-overview">
            <div className="lesson-overview-copy">
                <p className="lesson-overview-meta"><span>{unit}</span><span aria-hidden="true">/</span> LECCIÓN</p>
                <h1>{title}</h1>
                <p>{description}</p>
            </div>
            <figure className="lesson-guide">
                <img src={cometaTeaching} width={100} height={108} alt="Cometa, tu guía de aprendizaje" decoding="async" />
                <figcaption>Aprende con Cometa</figcaption>
            </figure>
        </header>;
}

export function LessonNote({ children }: { children: ReactNode }) {
    return <aside className="lesson-study-note"><Lightbulb size={19} aria-hidden="true" /><p>{children}</p></aside>;
}
