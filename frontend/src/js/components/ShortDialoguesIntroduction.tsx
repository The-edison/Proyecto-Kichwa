import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, BriefcaseBusiness, CalendarDays, Eye, EyeOff, Hand, House, Leaf, MapPin, MessageCircle, PenLine, Plus, School, UsersRound, type LucideIcon } from 'lucide-react';
import lesson from '../../../../backend/resources/lessons/intermediate-dialogues.json';
import { LessonCardGrid } from './LessonCardGrid';
import { LessonNote, LessonOverview } from './LessonOverview';
import '../../css/guided-introduction.css';
import '../../css/advanced-morphemes.css';
import '../../css/short-dialogues.css';

const sectionIcons = [MessageCircle, MapPin, UsersRound, PenLine];
const destinationIcons: Record<string, LucideIcon> = { home: House, school: School, work: BriefcaseBusiness };
type Dialogue = { title: string; context: string; turns: { speaker: string; text: string; meaning: string }[] };

function DialogueTurns({ dialogue, showMeanings }: { dialogue: Dialogue; showMeanings: boolean }) {
    return <div className="short-dialogue" aria-live="polite" aria-atomic="true">
        <p className="short-dialogue-context">{dialogue.context}</p>
        <ol className="short-dialogue-turns" aria-label={dialogue.title}>
            {dialogue.turns.map((turn, index) => <li key={index} className={turn.speaker === 'Evelin' ? 'is-reply' : ''}>
                <span className="short-dialogue-avatar" aria-hidden="true">{turn.speaker.charAt(0)}</span>
                <div className="short-dialogue-bubble"><span className="short-dialogue-speaker">{turn.speaker}</span><p lang="qu">{turn.text}</p>{showMeanings && <p className="short-dialogue-translation">{turn.meaning}</p>}</div>
            </li>)}
        </ol>
    </div>;
}

function Parts({ root, ending }: { root: string; ending: string }) {
    return <span className="short-word-parts" lang="qu"><span>{root}</span><Plus size={16} aria-label="más" /><strong>{ending}</strong></span>;
}

export function ShortDialoguesIntroduction({ page, onSelectPage }: { page: number; onSelectPage: (page: number) => void }) {
    const [destinationIndex, setDestinationIndex] = useState(0);
    const [topicIndex, setTopicIndex] = useState(0);
    const [showMeanings, setShowMeanings] = useState(true);
    const section = lesson.sections[page] ?? lesson.sections[0];
    const destination = lesson.destinations[destinationIndex];
    const heading = useRef<HTMLHeadingElement>(null);
    const previousPage = useRef(page);
    useEffect(() => {
        if (previousPage.current !== page) {
            heading.current?.focus({ preventScroll: true });
            heading.current?.closest('.guided-unit-main')?.scrollTo({ top: 0 });
            previousPage.current = page;
        }
    }, [page]);
    const SectionIcon = sectionIcons[page] ?? BookOpen;
    const dialogue: Dialogue = page === 1 ? {
        title: `Un plan: ${destination.label.toLowerCase()}`,
        context: 'Alex pregunta por el destino de Evelin. Ella cuenta adónde va y cuál es su plan para mañana.',
        turns: [
            { speaker: 'Alex', text: 'Mayman rinki?', meaning: '¿Adónde vas?' },
            { speaker: 'Evelin', text: destination.present, meaning: destination.presentMeaning },
            { speaker: 'Alex', text: 'Kaya?', meaning: '¿Y mañana?' },
            { speaker: 'Evelin', text: destination.future, meaning: destination.futureMeaning },
        ],
    } : page === 2 ? section.dialogues[topicIndex] : lesson.sections[0].dialogues[0];
    const forms = page === 2 ? section.forms.filter((_, index) => topicIndex === 0 ? index < 2 : index === 2) : section.forms;

    return <div className="guided-introduction morphemes-introduction short-dialogues-introduction">
        <LessonOverview unit="NIVEL INTERMEDIO · UNIDAD 4" title={lesson.title} description={lesson.description} />
        <nav className="morphemes-route" aria-label="Partes de la lección">
            {lesson.sections.map((item, index) => {
                const Icon = sectionIcons[index];
                return <button type="button" key={item.key} aria-current={page === index ? 'step' : undefined} onClick={() => onSelectPage(index)}><span className="morphemes-route-number" aria-hidden="true">{index + 1}</span><Icon size={19} aria-hidden="true" /><span>{item.label}</span></button>;
            })}
        </nav>
        {page === 0 && <LessonNote>{lesson.note}</LessonNote>}
        <div className="morphemes-step-heading"><span className="morphemes-step-icon" aria-hidden="true"><SectionIcon size={26} /></span><div><p className="eyebrow">{section.kicker}</p><h2 ref={heading} tabIndex={-1}>{section.title}</h2></div></div>
        <p className="short-dialogue-instruction">{section.instruction}</p>
        <div className="short-dialogue-tools">
            {(page === 1 || page === 3) && <div className="short-dialogue-options" role="group" aria-label="Elige un destino">
                {lesson.destinations.map((item, index) => {
                    const Icon = destinationIcons[item.icon];
                    return <button key={item.key} type="button" aria-pressed={destinationIndex === index} aria-controls={page === 1 ? 'short-dialogue-model' : 'short-paragraph-model'} onClick={() => setDestinationIndex(index)}><Icon size={19} aria-hidden="true" />{item.label}</button>;
                })}
            </div>}
            {page === 2 && <div className="short-dialogue-options" role="group" aria-label="Elige un tema de conversación">
                {[{ label: 'Familia', Icon: UsersRound }, { label: 'Naturaleza', Icon: Leaf }].map(({ label, Icon }, index) => <button key={label} type="button" aria-pressed={topicIndex === index} aria-controls="short-dialogue-model" onClick={() => setTopicIndex(index)}><Icon size={19} aria-hidden="true" />{label}</button>)}
            </div>}
            {page < 3 && <button type="button" className="short-translation-toggle" aria-pressed={showMeanings} aria-controls="short-dialogue-model" onClick={() => setShowMeanings(value => !value)}>{showMeanings ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}{showMeanings ? 'Ocultar traducciones' : 'Mostrar traducciones'}</button>}
        </div>
        <LessonCardGrid className="cometa-lesson-cards morphemes-cards short-dialogue-cards">
            <section className="cometa-lesson-card" aria-labelledby="short-model-title">
                <div className="cometa-card-heading"><span className="cometa-card-number" aria-hidden="true">01</span><div><span className="cometa-card-kicker">{page === 3 ? 'LEE LAS IDEAS JUNTAS' : 'SIGUE LOS TURNOS'}</span><h3 id="short-model-title">{page === 3 ? `Un plan: ${destination.label.toLowerCase()}` : dialogue.title}</h3></div></div>
                {page < 3 ? <div id="short-dialogue-model"><DialogueTurns dialogue={dialogue} showMeanings={showMeanings} /></div> : <div id="short-paragraph-model" className="short-paragraph" aria-live="polite" aria-atomic="true">
                    <p className="short-dialogue-context">Dos oraciones, una misma persona y un mismo plan para mañana.</p>
                    <blockquote lang="qu"><span>{destination.future}</span>{' '}<span>{destination.followUp}</span></blockquote>
                    <p className="short-paragraph-meaning">{destination.futureMeaning} {destination.followUpMeaning}</p>
                    <ol className="short-text-steps">
                        <li><MapPin size={23} aria-hidden="true" /><div><strong>1. Cuenta adónde irás</strong><p lang="qu">{destination.future}</p></div></li>
                        <li><ArrowRight size={23} aria-hidden="true" /><div><strong>2. Cuenta qué harás allí</strong><p lang="qu">{destination.followUp}</p></div></li>
                    </ol>
                    <p>La segunda oración se entiende como parte del plan para mañana. La terminación <strong lang="qu">-sha</strong> mantiene la persona: «yo».</p>
                </div>}
            </section>
            <section className="cometa-lesson-card" aria-labelledby="short-guide-title">
                <div className="cometa-card-heading"><span className="cometa-card-number" aria-hidden="true">02</span><div><span className="cometa-card-kicker">ENTIENDE CÓMO FUNCIONA</span><h3 id="short-guide-title">{section.position}</h3></div></div>
                <p>{section.explanation}</p>
                {page === 3 ? <>
                    <figure className="short-sentence-model"><figcaption>El orden de este modelo</figcaption><ol><li><small>Cuándo</small><strong lang="qu">Kaya</strong></li><li><small>Quién</small><strong lang="qu">ñuka</strong></li><li><small>Adónde</small><strong lang="qu">{destination.toward}</strong></li><li><small>Acción</small><strong lang="qu">risha</strong></li></ol></figure>
                    <dl className="short-segment-guide">
                        <div><dt><Parts root={destination.place} ending="man" /></dt><dd><strong>Destino:</strong> hacia {destination.placeMeaning === 'Quito' ? 'Quito' : `la ${destination.placeMeaning}`}.</dd></div>
                        <div><dt><Parts root="ri" ending="sha" /></dt><dd><strong>Ir + futuro de yo:</strong> iré.</dd></div>
                        <div><dt><Parts root={destination.action} ending="sha" /></dt><dd><strong>{destination.actionMeaning} + futuro de yo:</strong> {destination.futureActionMeaning}.</dd></div>
                    </dl>
                    <div className="short-word-bank"><span className="cometa-card-kicker">PALABRAS PARA ESTE TEXTO</span><ul aria-label="Banco de palabras">{['Kaya', 'ñuka', destination.toward, 'risha', destination.at, destination.futureAction].map(word => <li key={word} lang="qu">{word}</li>)}</ul></div>
                </> : <>
                    <dl className="short-conversation-guide">{forms.map((form, index) => <div key={form.word}>
                        <dt><span className="short-guide-step" aria-hidden="true">{page === 0 ? [<Hand size={19} key="hello" />, <MessageCircle size={19} key="talk" />, <Hand size={19} key="bye" />][index] : index + 1}</span><span>{form.label}</span></dt>
                        <dd><strong lang="qu">{form.base}</strong><span>{form.baseMeaning}</span><p lang="qu">{form.word}</p><span>{form.meaning}</span><p className="short-guide-detail">{form.detail}</p></dd>
                    </div>)}</dl>
                    {page === 0 && <div className="short-reply-tip"><MessageCircle size={21} aria-hidden="true" /><p><strong lang="qu">Kanka?</strong> significa «¿Y tú?». Sirve para devolver la pregunta.</p></div>}
                    {page === 1 && <div className="short-reply-tip"><CalendarDays size={21} aria-hidden="true" /><p><strong>Conserva la persona.</strong> Tanto <span lang="qu">rini</span> como <span lang="qu">risha</span> hablan de «yo»; cambia el tiempo.</p></div>}
                </>}
            </section>
        </LessonCardGrid>
        <LessonNote>{section.reminder}</LessonNote>
    </div>;
}
