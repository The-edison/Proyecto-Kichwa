import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Baby, Blocks, BookOpen, CheckCircle2, Droplets, Ear, Gift, GraduationCap, Hand, Heart, House, MessageCircle, Play, Plus, UserRound, UsersRound, Utensils, PenLine, type LucideIcon } from 'lucide-react';
import lesson from '../../../../backend/resources/lessons/intermediate-verbal-analysis.json';
import { LessonCardGrid } from './LessonCardGrid';
import { LessonNote, LessonOverview } from './LessonOverview';
import '../../css/guided-introduction.css';
import '../../css/advanced-morphemes.css';
import '../../css/verbal-analysis.css';

type Word = typeof lesson.sections[number]['forms'][number];
const sectionIcons = [Play, UsersRound, Heart, MessageCircle, Blocks];
const icons: Record<string, LucideIcon> = { eat: Utensils, baby: Baby, person: UserRound, house: House, friends: UsersRound, water: Droplets, learn: GraduationCap, gift: Gift, hand: Hand, write: PenLine, listen: Ear, affirm: CheckCircle2 };

function WordBlocks({ form, compact = false }: { form: Word; compact?: boolean }) {
    return <span className={`verbal-blocks${compact ? ' is-compact' : ''}`} aria-label={form.parts.map(part => part.text).join(' + ')}>{form.parts.map((part, index) => <span className="verbal-block-piece" key={index}>{index > 0 && <Plus size={compact ? 14 : 18} aria-hidden="true" />}<span className="verbal-block" data-part-role={part.role} lang="qu">{part.text}</span></span>)}</span>;
}

export function VerbalAnalysisIntroduction({ page, onSelectPage }: { page: number; onSelectPage: (page: number) => void }) {
    const section = lesson.sections[page] ?? lesson.sections[0];
    const analysis = section.key === 'analysis';
    const [selectedWord, setSelectedWord] = useState('mikukuni');
    const heading = useRef<HTMLHeadingElement>(null);
    const previousPage = useRef(page);
    useEffect(() => {
        if (previousPage.current !== page) {
            heading.current?.focus({ preventScroll: true });
            heading.current?.closest('.guided-unit-main')?.scrollTo({ top: 0 });
            previousPage.current = page;
        }
    }, [page]);
    const focusWord = section.forms.find(form => form.word === (analysis ? selectedWord : section.focus)) ?? section.forms[0];
    const SectionIcon = sectionIcons[page] ?? Blocks;
    const listedWords = section.forms.filter(form => form.group === 'list');
    const extraWords = section.forms.filter(form => form.group === 'extra');
    return <div className="guided-introduction morphemes-introduction verbal-introduction">
        <LessonOverview unit="NIVEL INTERMEDIO · UNIDAD 3" title={lesson.title} description={lesson.description} />
        <nav className="morphemes-route verbal-route" aria-label="Partes de la lección">
            {lesson.sections.map((item, index) => {
                const Icon = sectionIcons[index];
                return <button type="button" key={item.key} aria-current={page === index ? 'step' : undefined} onClick={() => onSelectPage(index)}><span className="morphemes-route-number" aria-hidden="true">{index + 1}</span><Icon size={19} aria-hidden="true" /><span>{item.label}</span></button>;
            })}
        </nav>
        {page === 0 && <LessonNote>{lesson.note}</LessonNote>}
        <div className="morphemes-step-heading"><span className="morphemes-step-icon" aria-hidden="true"><SectionIcon size={26} /></span><div><p className="eyebrow">{section.kicker}</p><h2 ref={heading} tabIndex={-1}>{section.title}</h2></div></div>
        <LessonCardGrid className="cometa-lesson-cards morphemes-cards">
            <section className="cometa-lesson-card morphemes-explanation" aria-labelledby="verbal-explain-title">
                <div className="cometa-card-heading"><span className="cometa-card-number" aria-hidden="true">01</span><div><span className="cometa-card-kicker">ENTIENDE CADA PARTE</span><h3 id="verbal-explain-title">{section.position}</h3></div></div>
                <p>{section.explanation}</p>
                <div id="verbal-analysis-detail" className="verbal-analysis-detail">
                    <figure className="morphemes-formula verbal-formula">
                        <span className="verbal-kind">{focusWord.kind}</span>
                        <WordBlocks form={focusWord} />
                        <ArrowRight className="morphemes-formula-arrow" size={24} aria-hidden="true" />
                        <figcaption aria-live={analysis ? 'polite' : undefined}><strong lang="qu">{focusWord.word}</strong><span>{focusWord.meaning}</span></figcaption>
                    </figure>
                    <dl className="verbal-part-meanings" aria-label={`Qué aporta cada parte de ${focusWord.word}`}>{focusWord.parts.map((part, index) => <div key={index}><dt className="verbal-block" data-part-role={part.role} lang="qu">{part.text}</dt><dd><strong>{part.label}</strong><span>{part.meaning}</span></dd></div>)}</dl>
                </div>
                {!analysis && <div className="morphemes-example"><BookOpen size={21} aria-hidden="true" /><div><span className="cometa-card-kicker">COMPRENDE EL SIGNIFICADO</span>{section.key === 'courtesy' && section.example.before && <p>{section.example.before}</p>}<p lang="qu">{section.key !== 'courtesy' && section.example.before && <>{section.example.before} </>}<strong>{section.example.focus}</strong>{section.example.after}</p><p>{section.example.meaning}</p></div></div>}
            </section>
            <section className="cometa-lesson-card morphemes-vocabulary" aria-labelledby="verbal-words-title">
                <div className="cometa-card-heading"><span className="cometa-card-number" aria-hidden="true">02</span><div><span className="cometa-card-kicker">{analysis ? 'EXPLORA LAS PALABRAS' : 'OBSERVA Y COMPARA'}</span><h3 id="verbal-words-title">{section.listTitle}</h3></div></div>
                <p>{section.instruction}</p>
                {analysis ? <>
                    <div className="verbal-explorer" role="group" aria-label="Elige una palabra para analizar">{listedWords.map(form => {
                        const Icon = icons[form.icon] ?? BookOpen;
                        return <button type="button" key={form.word} aria-pressed={focusWord.word === form.word} aria-controls="verbal-analysis-detail" onClick={() => setSelectedWord(form.word)}><Icon size={22} aria-hidden="true" /><strong lang="qu">{form.word}</strong><span>{form.kind}</span></button>;
                    })}</div>
                    <div className="verbal-read-guide"><Blocks size={22} aria-hidden="true" /><p>Al cambiar de palabra, los bloques muestran su función. <strong>-pak</strong> indica un beneficiario en <span lang="qu">wawapak</span>; <strong>-nkapak</strong> expresa finalidad en <span lang="qu">mikunkapak</span>.</p></div>
                </> : <dl className="morphemes-words verbal-words">{listedWords.map(form => {
                    const Icon = icons[form.icon] ?? BookOpen;
                    return <div key={form.word}><span className="morphemes-word-icon" aria-hidden="true"><Icon size={23} strokeWidth={1.7} /></span><dt><span className="morphemes-base-meaning"><span lang="qu">{form.base}</span> · {form.baseMeaning}</span><strong lang="qu">{form.parts.map((part, index) => index === 0 ? <span key={index}>{part.text}</span> : <mark key={index}>{part.text}</mark>)}</strong><WordBlocks form={form} compact /></dt><dd>{form.meaning}</dd></div>;
                })}</dl>}
            </section>
        </LessonCardGrid>
        {extraWords.length > 0 && <section className="verbal-extra" aria-labelledby="verbal-extra-title"><h3 id="verbal-extra-title">{section.extraTitle}</h3><p>{section.extraIntro}</p><dl className={`verbal-extra-words${extraWords.length === 2 ? ' has-two' : ''}`}>{extraWords.map(form => <div key={form.word}><dt lang="qu">{form.word}</dt><dd>{form.meaning}</dd><span>{form.kind}</span></div>)}</dl></section>}
        <LessonNote>{section.reminder}</LessonNote>
    </div>;
}
