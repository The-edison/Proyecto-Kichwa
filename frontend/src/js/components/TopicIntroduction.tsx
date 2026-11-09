import topics from '../../../../backend/resources/lessons/guided-topics.json';
import { LessonNote, LessonOverview, LessonText } from './LessonOverview';
import { LessonCardGrid } from './LessonCardGrid';
import { TopicSectionIcon, TopicWordVisual } from './TopicVisual';
import { BodyPartVisual } from './BodyPartVisual';
import { Bed, Fingerprint, Hand, UserRound, UserRoundCheck, Users, UsersRound, Utensils, Volume2, type LucideIcon } from 'lucide-react';
import { animalColorClip, bodyClip, useLessonAudio, type LessonAudioClip } from '../hooks/useLessonAudio';
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
const numberSectionAudio = [
    { clip: 'numbers-zero-ten', label: 'del cero al diez' },
    { clip: 'numbers-eleven-twenty', label: 'del once al veinte' },
    { clip: 'numbers-large', label: 'cantidades grandes' },
] as const;
const calendarSectionAudio = [
    { clip: 'calendar-weekdays', label: 'los días de la semana' },
    { clip: 'calendar-months', label: 'los meses del año' },
    undefined,
    undefined,
    { clip: 'calendar-seasons', label: 'las estaciones del año' },
] as const;
const animalPictures: Record<string, string> = {
    allku: '🐕', misi: '🐈', kuy: '🐹', llama: '🐑', wakra: '🐄', kuchi: '🐖', atalpa: '🐔', kunu: '🐇',
    apiw: '🐎', chantasu: '🫏', taruka: '🦌', ukucha: '🐁', urpi: '🕊️', hampatu: '🐸', pilpintu: '🦋', kinti: '🐦',
    atuk: '🐺', 'añas': '🦊', uturunku: '🐻',
};

function AnimalPicture({ word }: { word: string }) {
    if (word === 'misi-negro') return <svg viewBox="0 0 120 90" width="110" height="90" aria-hidden="true">
        <path d="M72 69c42 15 36-37 20-26" fill="none" stroke="#282823" strokeWidth="10" strokeLinecap="round" />
        <ellipse cx="60" cy="63" rx="23" ry="19" fill="#282823" /><path d="m41 72-2 9h15l3-8m10 0 1 8h15l-4-10" fill="#282823" />
        <path d="M34 39 30 12l19 11q13-4 24 0l17-11-3 28c-4 27-48 27-53-1Z" fill="#282823" />
        <path d="m35 20 3 15 8-8m31 0 8-7-2 15" fill="#be887c" /><ellipse cx="47" cy="40" rx="6" ry="4" fill="#d5c657" /><ellipse cx="73" cy="40" rx="6" ry="4" fill="#d5c657" />
        <path d="M47 37v6m26-6v6" stroke="#171713" strokeWidth="2" /><path d="m57 47 3 4 3-4" fill="#be887c" /><path d="m38 48-14-3m14 8-14 2m58-7 14-3m-14 8 14 2" stroke="#b7b5a2" strokeWidth="1.6" />
    </svg>;
    if (word === 'yutu') return <svg viewBox="0 0 70 55" width="44" height="44" aria-hidden="true">
        <path d="m25 36-13 4 4-13" fill="#775a42" /><ellipse cx="34" cy="31" rx="22" ry="16" fill="#b3906b" /><circle cx="49" cy="19" r="11" fill="#94744e" />
        <path d="m59 18 9 3-9 3" fill="#bd8652" /><path d="m30 45-3 6m16-6 3 6" stroke="#775a42" strokeWidth="2" /><path d="M22 30q10-12 22 0-9 13-22 0" fill="#806244" />
        <circle cx="51" cy="17" r="2" fill="#26281e" /><path d="m28 31 1 1m7 2 1 1m-4-8 1 1" stroke="#e4d2b5" strokeWidth="3" strokeLinecap="round" />
    </svg>;
    if (word === 'kuy') return <svg viewBox="0 0 70 55" width="44" height="44" aria-hidden="true">
        <ellipse cx="36" cy="32" rx="26" ry="17" fill="#b48558" /><ellipse cx="53" cy="29" rx="14" ry="14" fill="#e2ba8e" />
        <ellipse cx="46" cy="16" rx="6" ry="7" fill="#b48558" /><ellipse cx="46" cy="17" rx="3" ry="4" fill="#d69f99" />
        <path d="M25 44v4m19-4v4" stroke="#735337" strokeWidth="5" strokeLinecap="round" /><circle cx="57" cy="26" r="2" fill="#30291f" />
        <ellipse cx="65" cy="32" rx="3" ry="2" fill="#735337" /><path d="m63 35-6 2m7-1-2 4" stroke="#735337" strokeWidth="1.3" />
    </svg>;
    if (word === 'kinti') return <svg viewBox="0 0 70 55" width="44" height="44" aria-hidden="true">
        <path d="M32 28C15 29 7 17 7 7c14 3 24 10 28 19" fill="#6d9c73" /><path d="M33 28C22 13 31 5 43 3c1 12-2 21-10 25" fill="#4e8767" />
        <path d="m29 33-17 13 20-4 8-10" fill="#326b5d" /><ellipse cx="39" cy="31" rx="14" ry="9" transform="rotate(-23 39 31)" fill="#408d83" />
        <circle cx="49" cy="23" r="8" fill="#408d83" /><path d="m55 22 14-6-13 9" fill="#4c5745" /><circle cx="51" cy="21" r="1.6" fill="#172e2a" />
    </svg>;
    return <>{animalPictures[word]}</>;
}

export function TopicIntroduction({ lesson }: { lesson: string }) {
    const { state, play } = useLessonAudio();
    const topic = topics.find(item => item.key === lesson);
    if (!topic) return null;

    return <div className={`guided-introduction topic-introduction topic-${topic.key}`}>
        <LessonOverview unit={`${topic.module > 1 ? `MÓDULO ${topic.module} · ` : ''}UNIDAD ${topic.order}`} title={topic.title} description={topic.description} />
        <LessonNote>{topic.note}</LessonNote>
        <LessonCardGrid>
            {topic.sections.map((section, index) => {
                const sectionAudio = topic.key === 'numbers' ? numberSectionAudio[index] : topic.key === 'calendar' ? calendarSectionAudio[index] : undefined;
                return <section className={`cometa-lesson-card topic-section-${index}`} key={section.title} aria-labelledby={`${topic.key}-section-${index}`}>
                <div className="cometa-card-heading">
                    <span className="cometa-card-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                    <div><span className="cometa-card-kicker">{section.kicker}</span><h2 id={`${topic.key}-section-${index}`}>{section.title}</h2></div>
                    <TopicSectionIcon lesson={topic.key} section={index} />
                </div>
                {sectionAudio && <div className="topic-section-audio">
                    <button type="button" className="topic-section-audio-button" onClick={() => play(sectionAudio.clip)} aria-label={`Escuchar ${sectionAudio.label}`}>
                        <Volume2 size={18} aria-hidden="true" />
                        <span>{state.clip === sectionAudio.clip && state.phase === 'playing' ? 'Sonando…' : state.clip === sectionAudio.clip && state.phase === 'loading' ? 'Cargando…' : `Escuchar ${sectionAudio.label}`}</span>
                    </button>
                    {state.clip === sectionAudio.clip && state.message && <p className={`topic-section-audio-status${state.phase === 'error' ? ' is-error' : ''}`} role="status">{state.message}</p>}
                </div>}
                {topic.key === 'body' ? <>
                    <div className={index === 3 ? 'animals-example body-example' : `animals-word-grid body-word-grid body-group-${index}`}>
                        {section.rows.map(([word, meaning]) => {
                            const clip = bodyClip(word, index);
                            if (!clip) return null;
                            const active = state.clip === clip && ['loading', 'playing'].includes(state.phase);
                            return <button type="button" key={word} className={`animals-word-audio${index === 3 ? ' animals-example-audio' : ''}${active ? ' is-playing' : ''}`} aria-label={`Escuchar ${word}`} aria-pressed={active} onClick={() => play(clip)}>
                                <span className={index === 3 ? 'animals-example-hat body-example-picture' : 'animals-word-picture'} aria-hidden="true"><BodyPartVisual word={index === 3 ? 'chaki' : word} /></span>
                                <span className="animals-word-copy"><strong lang="qu">{index === 3 ? word.split(/(chaki)/i).map((part, partIndex) => partIndex % 2 ? <mark key={partIndex}>{part}</mark> : part) : word}</strong><span>{meaning}</span></span>
                                <span className="animals-word-speaker" aria-hidden="true"><Volume2 size={17} /><span>{active ? state.phase === 'playing' ? 'Sonando' : 'Cargando…' : 'Escuchar'}</span></span>
                            </button>;
                        })}
                    </div>
                    {state.clip && section.rows.some(([word]) => bodyClip(word, index) === state.clip) && <p className={`animals-audio-status${state.phase === 'error' ? ' is-error' : ''}`} role="status">{state.message}</p>}
                </> : topic.key === 'animals-colors' ? <>
                    <div className={index === 3 ? 'animals-example' : `animals-word-grid${index === 2 ? ' animals-color-grid' : ''}`}>
                        {section.rows.map(([word, meaning], rowIndex) => {
                            const clip = animalColorClip(word, index);
                            if (!clip) return null;
                            const active = state.clip === clip && ['loading', 'playing'].includes(state.phase);
                            return <button type="button" className={`animals-word-audio${active ? ' is-playing' : ''}${index === 3 ? ' animals-example-audio' : ''}`} key={word} aria-label={`Escuchar ${word}`} aria-pressed={active} onClick={() => play(clip)}>
                                {index === 3 ? <span className="animals-example-hat" aria-hidden="true"><AnimalPicture word="misi-negro" /></span> : index === 2 ? <span className="animals-color-picture"><TopicWordVisual lesson={topic.key} section={index} word={word} index={rowIndex} /></span> : <span className="animals-word-picture" aria-hidden="true"><AnimalPicture word={word} /></span>}
                                <span className="animals-word-copy"><strong lang="qu">{index === 3 ? word.split(/(yana)/i).map((part, partIndex) => partIndex % 2 ? <mark key={partIndex}>{part}</mark> : part) : word}</strong><span>{meaning}</span></span>
                                <span className="animals-word-speaker" aria-hidden="true"><Volume2 size={17} /><span>{active ? state.phase === 'playing' ? 'Sonando' : 'Cargando…' : 'Escuchar'}</span></span>
                            </button>;
                        })}
                    </div>
                    {state.clip && section.rows.some(([word]) => animalColorClip(word, index) === state.clip) && <p className={`animals-audio-status${state.phase === 'error' ? ' is-error' : ''}`} role="status">{state.message}</p>}
                </> : topic.key === 'pronouns' && index < 2 ? <div className="topic-pronoun-tiles">
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
            </section>;
            })}
        </LessonCardGrid>
    </div>;
}
