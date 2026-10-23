import { useEffect, useRef } from 'react';
import { ArrowRight, BookOpen, DoorOpen, Hash, House, ListOrdered, MapPin, PawPrint, Plus, ShieldCheck, UserRound, UsersRound, type LucideIcon } from 'lucide-react';
import lesson from '../../../../backend/resources/lessons/intermediate-morphemes.json';
import { LessonNote, LessonOverview, LessonText } from './LessonOverview';
import { LessonCardGrid } from './LessonCardGrid';
import '../../css/guided-introduction.css';
import '../../css/advanced-morphemes.css';

const icons: Record<string, LucideIcon> = { house: House, door: DoorOpen, sheep: PawPrint, cattle: PawPrint, parent: UsersRound, child: UserRound, destination: MapPin };
const sectionIcons = [ShieldCheck, ListOrdered, UsersRound, BookOpen];

export function AdvancedMorphemesIntroduction({ page, onSelectPage }: { page: number; onSelectPage: (page: number) => void }) {
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
    const first = section.forms[0];
    const addition = page === 2 ? 'la' : page === 1 ? 'niki' : 'kamak';
    return <div className="guided-introduction morphemes-introduction">
        <LessonOverview unit="NIVEL INTERMEDIO · UNIDAD 1" title={lesson.title} description={lesson.description} />
        <nav className="morphemes-route" aria-label="Partes de la lección">
            {lesson.sections.map((item, index) => {
                const Icon = sectionIcons[index];
                return <button type="button" key={item.key} aria-current={page === index ? 'step' : undefined} onClick={() => onSelectPage(index)}><span className="morphemes-route-number" aria-hidden="true">{index + 1}</span><Icon size={19} aria-hidden="true" /><span>{item.label}</span></button>;
            })}
        </nav>
        {page === 0 && <LessonNote>{lesson.note}</LessonNote>}
        <div className="morphemes-step-heading"><span className="morphemes-step-icon" aria-hidden="true"><SectionIcon size={26} /></span><div><p className="eyebrow">{section.kicker}</p><h2 ref={heading} tabIndex={-1}>{section.title}</h2></div></div>
        <LessonCardGrid className="cometa-lesson-cards morphemes-cards">
            <section className="cometa-lesson-card morphemes-explanation" aria-labelledby="morphemes-explain-title">
                <div className="cometa-card-heading"><span className="cometa-card-number" aria-hidden="true">01</span><div><span className="cometa-card-kicker">ENTIENDE EL CAMBIO</span><h3 id="morphemes-explain-title">{page === 3 ? 'Dos ideas diferentes' : section.position}</h3></div></div>
                <p><LessonText text={section.explanation} /></p>
                {page === 3 ? <div className="morphemes-comparison">{section.forms.map((form, index) => <div key={form.word}><span className="morphemes-part" lang="qu">{index === 0 ? '-kamak' : '-kama'}</span><ArrowRight size={20} aria-hidden="true" /><span>{index === 0 ? 'Persona encargada' : 'Hasta un lugar'}</span></div>)}</div> : <figure className="morphemes-formula">
                    <div className="morphemes-formula-parts"><span className={`morphemes-part${page === 2 ? ' is-added' : ''}`} lang="qu">{page === 2 ? addition : first.base}</span><Plus size={19} aria-hidden="true" /><span className={`morphemes-part${page === 2 ? '' : ' is-added'}`} lang="qu">{page === 2 ? first.base : addition}</span></div>
                    <ArrowRight className="morphemes-formula-arrow" size={24} aria-hidden="true" />
                    <figcaption><strong lang="qu">{first.word}</strong><span>{first.meaning}</span></figcaption>
                </figure>}
                {page === 1 && <div className="morphemes-position-line" role="img" aria-label="Fila de nueve posiciones. Shukniki: primero; kimsaniki: tercero; iskunniki: noveno.">{Array.from({ length: 9 }, (_, index) => <span key={index} className={[0, 2, 8].includes(index) ? 'is-featured' : ''}>{index + 1}<small>º</small></span>)}</div>}
                <div className="morphemes-example"><BookOpen size={21} aria-hidden="true" /><div><span className="cometa-card-kicker">{page === 0 ? 'EN UNA ORACIÓN' : 'LEE CON ATENCIÓN'}</span><p lang={page === 3 ? 'es' : 'qu'}>{section.example.before && <>{section.example.before} </>}<strong>{section.example.focus}</strong>{section.example.after && <> {section.example.after}</>}</p><p>{section.example.meaning}</p></div></div>
            </section>
            <section className="cometa-lesson-card morphemes-vocabulary" aria-labelledby="morphemes-vocabulary-title">
                <div className="cometa-card-heading"><span className="cometa-card-number" aria-hidden="true">02</span><div><span className="cometa-card-kicker">PASO A PASO</span><h3 id="morphemes-vocabulary-title">{page === 3 ? 'Comprueba la diferencia' : 'Observa las partes de cada palabra'}</h3></div></div>
                <p>{section.instruction}</p>
                <dl className="morphemes-words">{section.forms.map(form => {
                    const Icon = icons[form.icon] ?? Hash;
                    const suffix = form.word.slice(form.base.length);
                    return <div key={form.word}>
                        <span className="morphemes-word-icon" aria-hidden="true">{page === 1 ? <strong>{form.icon}º</strong> : <Icon size={23} strokeWidth={1.7} />}</span>
                        <dt><span className="morphemes-base-meaning"><span lang="qu">{form.base}</span> · {form.baseMeaning}</span><strong lang="qu">{page === 2 ? <><mark>la</mark>{form.base}</> : <>{form.base}<mark>{suffix}</mark></>}</strong></dt>
                        <dd>{form.meaning}</dd>
                    </div>;
                })}</dl>
                {page === 3 && <ul className="morphemes-recap"><li><strong>-kamak</strong>: responsabilidad; va al final.</li><li><strong>-niki</strong>: posición; va después de un número.</li><li><strong>la-</strong>: aparece al inicio de estas palabras de parentesco.</li></ul>}
            </section>
        </LessonCardGrid>
        {section.reminder && <LessonNote>{section.reminder}</LessonNote>}
    </div>;
}
