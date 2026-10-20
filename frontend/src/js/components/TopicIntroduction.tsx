import topics from '../../../../backend/resources/lessons/guided-topics.json';
import { LessonNote, LessonOverview } from './LessonOverview';
import { LessonCardGrid } from './LessonCardGrid';
import { TopicSectionIcon, TopicWordVisual } from './TopicVisual';
import '../../css/guided-introduction.css';
import '../../css/guided-topics.css';

export function TopicIntroduction({ lesson }: { lesson: string }) {
    const topic = topics.find(item => item.key === lesson);
    if (!topic) return null;

    return <div className={`guided-introduction topic-introduction topic-${topic.key}`}>
        <LessonOverview unit={`${topic.module > 1 ? `MÓDULO ${topic.module} · ` : ''}UNIDAD ${topic.order}`} title={topic.title} description={topic.description} />
        <LessonNote>{topic.note}</LessonNote>
        <LessonCardGrid>
            {topic.sections.map((section, index) => <section className="cometa-lesson-card" key={section.title} aria-labelledby={`${topic.key}-section-${index}`}>
                <div className="cometa-card-heading">
                    <span className="cometa-card-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                    <div><span className="cometa-card-kicker">{section.kicker}</span><h2 id={`${topic.key}-section-${index}`}>{section.title}</h2></div>
                    <TopicSectionIcon lesson={topic.key} section={index} />
                </div>
                {section.rows.length > 0 && <dl className="topic-vocabulary">{section.rows.map(([word, meaning], rowIndex) => <div key={word}><dt lang="qu"><TopicWordVisual lesson={topic.key} section={index} word={word} index={rowIndex} /><span>{word}</span></dt><dd>{topic.key === 'numbers' && index < 3 ? <span className="topic-quantity">{meaning}</span> : meaning}</dd></div>)}</dl>}
                {section.paragraphs.map(paragraph => <p className="topic-explanation" key={paragraph}>{paragraph}</p>)}
            </section>)}
        </LessonCardGrid>
    </div>;
}
