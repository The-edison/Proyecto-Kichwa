import topics from '../../../../backend/resources/lessons/guided-topics.json';
import { LessonNote, LessonOverview, LessonText } from './LessonOverview';
import { LessonCardGrid } from './LessonCardGrid';
import { TopicSectionIcon, TopicWordVisual } from './TopicVisual';
import { Bed, Fingerprint, Hand, UserRound, UserRoundCheck, Users, UsersRound, Utensils, Volume2, type LucideIcon } from 'lucide-react';
import { useLessonAudio, type LessonAudioClip } from '../hooks/useLessonAudio';
import '../../css/guided-introduction.css';
import '../../css/guided-topics.css';

const pronounClips: Record<string, LessonAudioClip> = {
    'ñuka': 'pronoun-nuka', kan: 'pronoun-kan', pay: 'pronoun-pay',
    'ñukanchik': 'pronoun-nukanchik', kankuna: 'pronoun-kankuna', paykuna: 'pronoun-paykuna',
};
const pronounIcons: Record<string, LucideIcon> = {
    'ñuka': Fingerprint, kan: Hand, pay: UserRound,
    'ñukanchik': UserRoundCheck, kankuna: UsersRound, paykuna: Users,
};

export function TopicIntroduction({ lesson }: { lesson: string }) {
    const { state, play } = useLessonAudio();
    const topic = topics.find(item => item.key === lesson);
    if (!topic) return null;

    return <div className={`guided-introduction topic-introduction topic-${topic.key}`}>
        <LessonOverview unit={`${topic.module > 1 ? `MÓDULO ${topic.module} · ` : ''}UNIDAD ${topic.order}`} title={topic.title} description={topic.description} />
        <LessonNote>{topic.note}</LessonNote>
        <LessonCardGrid>
            {topic.sections.map((section, index) => <section className={`cometa-lesson-card topic-section-${index}`} key={section.title} aria-labelledby={`${topic.key}-section-${index}`}>
                <div className="cometa-card-heading">
                    <span className="cometa-card-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                    <div><span className="cometa-card-kicker">{section.kicker}</span><h2 id={`${topic.key}-section-${index}`}>{section.title}</h2></div>
                    <TopicSectionIcon lesson={topic.key} section={index} />
                </div>
                {topic.key === 'pronouns' && index < 2 ? <div className="topic-pronoun-tiles">
                    {section.rows.map(([word, meaning]) => {
                        const Icon = pronounIcons[word] ?? UserRound;
                        const active = state.clip === pronounClips[word] && ['loading', 'playing'].includes(state.phase);
                        return <button type="button" key={word} className={`topic-pronoun-audio${active ? ' is-playing' : ''}`} aria-label={`Escuchar ${word}`} onClick={() => play(pronounClips[word])}>
                            <span className="topic-pronoun-symbol" aria-hidden="true"><Icon size={26} strokeWidth={1.6} /></span>
                            <span className="topic-pronoun-copy"><strong lang="qu">{word}</strong><span>{meaning}</span></span>
                            <span className="topic-pronoun-speaker" aria-hidden="true"><Volume2 size={17} /><span>{active ? state.phase === 'playing' ? 'Sonando' : 'Cargando…' : 'Escuchar'}</span></span>
                        </button>;
                    })}
                </div> : section.rows.length > 0 && <dl className="topic-vocabulary">{section.rows.map(([word, meaning], rowIndex) => <div key={word}><dt lang="qu">{topic.key === 'pronouns' && index === 3 ? <span className="topic-example-symbol" aria-hidden="true">{rowIndex === 0 ? <Utensils size={19} strokeWidth={1.6} /> : <Bed size={19} strokeWidth={1.6} />}</span> : <TopicWordVisual lesson={topic.key} section={index} word={word} index={rowIndex} />}<span>{word}</span></dt><dd>{topic.key === 'numbers' && index < 3 ? <span className="topic-quantity">{meaning}</span> : meaning}</dd></div>)}</dl>}
                {topic.key === 'pronouns' && index < 2 && state.clip && section.rows.some(([word]) => pronounClips[word] === state.clip) && state.message && <p className={`topic-pronoun-status${state.phase === 'error' ? ' is-error' : ''}`} role="status">{state.message}</p>}
                {section.paragraphs.map((paragraph, paragraphIndex) => topic.key === 'pronouns' && index === 2 ? <div className="topic-pronoun-note" key={paragraph}>
                    <span className="topic-pronoun-note-icon" aria-hidden="true">{paragraphIndex === 0 ? <UserRound size={20} strokeWidth={1.6} /> : <UsersRound size={20} strokeWidth={1.6} />}</span><p className="topic-explanation"><LessonText text={paragraph} /></p>
                </div> : <p className="topic-explanation" key={paragraph}><LessonText text={paragraph} /></p>)}
            </section>)}
        </LessonCardGrid>
    </div>;
}
