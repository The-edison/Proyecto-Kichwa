import { useEffect, useRef } from 'react';
import { ArrowRight, Bed, BookOpen, BriefcaseBusiness, CalendarDays, Clock3, Droplets, Footprints, GraduationCap, Heart, MapPin, PersonStanding, Plus, Scissors, Sun, UserRound, type LucideIcon } from 'lucide-react';
import lesson from '../../../../backend/resources/lessons/intermediate-tenses.json';
import { LessonCardGrid } from './LessonCardGrid';
import { LessonNote, LessonOverview } from './LessonOverview';
import '../../css/guided-introduction.css';
import '../../css/advanced-morphemes.css';
import '../../css/time-morphemes.css';

const sectionIcons = [Clock3, CalendarDays, Footprints, BookOpen];
const icons: Record<string, LucideIcon> = { rest: Bed, cry: Droplets, arrive: MapPin, lost: MapPin, fall: PersonStanding, work: BriefcaseBusiness, teach: GraduationCap, walk: Footprints, love: Heart, sew: Scissors, past: Clock3, present: Sun, future: CalendarDays, speaker: UserRound, person: UserRound };
const partLabels: Record<string, string> = { rka: 'pasado', ni: 'yo', sha: 'futuro · yo', nka: 'futuro · él o ella' };

function WordParts({ parts }: { parts: string[] }) {
    return <span className="time-word-parts" aria-label={parts.join(' + ')}>{parts.map((part, index) => <span className="time-word-piece" key={index}>{index > 0 && <Plus size={15} aria-hidden="true" />}<span className={`morphemes-part${index > 0 ? ' is-added' : ''}`} lang="qu">{part}</span></span>)}</span>;
}

export function TimeMorphemesIntroduction({ page, onSelectPage }: { page: number; onSelectPage: (page: number) => void }) {
    const section = lesson.sections[page] ?? lesson.sections[0];
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
    const focusWord = section.forms.find(form => form.word === (page === 0 ? 'chayarka' : 'purisha')) ?? section.forms[0];
    return <div className="guided-introduction morphemes-introduction time-introduction">
        <LessonOverview unit="NIVEL INTERMEDIO · UNIDAD 2" title={lesson.title} description={lesson.description} />
        <nav className="morphemes-route" aria-label="Partes de la lección">
            {lesson.sections.map((item, index) => {
                const Icon = sectionIcons[index];
                return <button type="button" key={item.key} aria-current={page === index ? 'step' : undefined} onClick={() => onSelectPage(index)}><span className="morphemes-route-number" aria-hidden="true">{index + 1}</span><Icon size={19} aria-hidden="true" /><span>{item.label}</span></button>;
            })}
        </nav>
        {page === 0 && <LessonNote>{lesson.note}</LessonNote>}
        <div className="morphemes-step-heading"><span className="morphemes-step-icon" aria-hidden="true"><SectionIcon size={26} /></span><div><p className="eyebrow">{section.kicker}</p><h2 ref={heading} tabIndex={-1}>{section.title}</h2></div></div>
        <ol className="time-timeline" aria-label="Pasado, presente y futuro">
            {[{ label: 'Pasado', description: 'Ya pasó', Icon: Clock3 }, { label: 'Presente', description: 'Ocurre ahora', Icon: Sun }, { label: 'Futuro', description: 'Pasará después', Icon: CalendarDays }].map(({ label, description, Icon }, index) => <li key={label} className={page === 2 || page === 0 && index === 0 || page === 1 && index === 2 || page === 3 && index !== 1 ? 'is-highlighted' : ''}><Icon size={22} aria-hidden="true" /><strong>{label}</strong><span>{description}</span></li>)}
        </ol>
        <LessonCardGrid className="cometa-lesson-cards morphemes-cards">
            <section className="cometa-lesson-card morphemes-explanation" aria-labelledby="time-explain-title">
                <div className="cometa-card-heading"><span className="cometa-card-number" aria-hidden="true">01</span><div><span className="cometa-card-kicker">ENTIENDE LA IDEA</span><h3 id="time-explain-title">{section.position}</h3></div></div>
                <p>{section.explanation}</p>
                {page === 3 ? <div className="time-context-pairs">
                    <div><span className="time-context-label">KAYNA · AYER</span><p lang="qu">Kayna pay <strong>chayarka.</strong></p><p>Ayer él o ella llegó.</p></div>
                    <div><span className="time-context-label">KAYA · MAÑANA</span><p lang="qu">Kaya ñuka <strong>llankasha.</strong></p><p>Mañana yo trabajaré.</p></div>
                </div> : <figure className="morphemes-formula time-formula">
                    <WordParts parts={focusWord.parts} />
                    <ArrowRight className="morphemes-formula-arrow" size={24} aria-hidden="true" />
                    <figcaption><strong lang="qu">{focusWord.word}</strong><span>{focusWord.meaning}</span></figcaption>
                </figure>}
                {page !== 3 && <dl className="time-part-key">{focusWord.parts.map((part, index) => <div key={index}><dt lang="qu">{part}</dt><dd>{index === 0 ? 'raíz: la acción' : partLabels[part]}</dd></div>)}</dl>}
                {page === 2 && <div className="time-person-guide"><UserRound size={23} aria-hidden="true" /><p><strong>La persona se mantiene: ñuka, «yo».</strong> En presente usamos -ni; en pasado, -rka + -ni; en futuro, -sha.</p></div>}
                {page !== 3 && <div className="morphemes-example"><BookOpen size={21} aria-hidden="true" /><div><span className="cometa-card-kicker">LEE LA FRASE COMPLETA</span><p lang="qu">{section.example.before && <>{section.example.before} </>}<strong>{section.example.focus}</strong>{section.example.after}</p><p>{section.example.meaning}</p></div></div>}
            </section>
            <section className="cometa-lesson-card morphemes-vocabulary" aria-labelledby="time-forms-title">
                <div className="cometa-card-heading"><span className="cometa-card-number" aria-hidden="true">02</span><div><span className="cometa-card-kicker">OBSERVA LAS PARTES</span><h3 id="time-forms-title">{page === 0 ? 'Cinco acciones en pasado' : page === 1 ? 'Cinco formas con «yo»' : page === 2 ? 'Puri: caminar' : 'El futuro cambia con la persona'}</h3></div></div>
                <p>{section.instruction}</p>
                <dl className="morphemes-words time-words">{section.forms.map(form => {
                    const Icon = icons[form.icon] ?? Footprints;
                    return <div key={form.word}>
                        <span className="morphemes-word-icon" aria-hidden="true"><Icon size={23} strokeWidth={1.7} /></span>
                        <dt><span className="morphemes-base-meaning"><span lang="qu">{form.infinitive}</span> · {form.baseMeaning}</span><span className="time-form-label">{form.label}</span><strong lang="qu">{form.base}<mark>{form.word.slice(form.base.length)}</mark></strong><WordParts parts={form.parts} /></dt>
                        <dd>{form.meaning}</dd>
                    </div>;
                })}</dl>
                {page === 3 && <div className="time-person-guide"><UserRound size={23} aria-hidden="true" /><p><strong>Ñuka → -sha.</strong><br /><strong>Pay → -nka.</strong><br />Las dos formas expresan futuro; indican personas diferentes.</p></div>}
            </section>
        </LessonCardGrid>
        <LessonNote>{section.reminder}</LessonNote>
    </div>;
}
