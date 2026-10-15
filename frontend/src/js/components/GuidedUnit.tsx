import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, LoaderCircle, RotateCcw, X } from 'lucide-react';
import '../../css/guided-unit.css';
import { Head, Link } from '../navigation';
import { useApi } from '../hooks/useApi';
import { ApiError, apiPost } from '../services/api';
import { answerComplete, mediaUrl } from './ExerciseCard';
import { ErrorState, LoadingState } from './States';
import { LearningCompanion } from './LearningCompanion';
import { GuidedIntroduction } from './GuidedIntroduction';
import { GreetingsIntroduction } from './GreetingsIntroduction';
import type { Exercise, ExerciseAnswer, ExerciseFeedback, Unit } from '../types';

interface GuidedData { exercises: Array<Exercise & { completed: boolean }>; completed_count: number; total: number; }
type GuidedUnitData = Unit & { level_id: number; level_name: string; module_name: string };
interface GuidedResult { xp_earned?: number; xp_total?: number; score: number; max_score: number; correct_count: number; total_items: number; passed: boolean; next_unit_id: number | null; details: Array<{ exercise_id: number; title: string; correct: number; total: number }>; }

export function GuidedUnit({ unit }: { unit: GuidedUnitData }) {
    const sequence = useApi<GuidedData>(`/units/${unit.id}/guided`);
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState<Record<number, ExerciseAnswer>>({});
    const [feedback, setFeedback] = useState<Record<number, ExerciseFeedback | undefined>>({});
    const [xpEarned, setXpEarned] = useState(0);
    const [summary, setSummary] = useState<GuidedResult | null>(null);
    const [selectedOrigin, setSelectedOrigin] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const sending = useRef(false);
    const practiceAttempt = useRef<string | null>(null);
    const submissions = useRef<Record<number, string | undefined>>({});
    const heading = useRef<HTMLHeadingElement>(null);
    const current = step > 0 ? sequence.data?.exercises[step - 1] : undefined;
    const answer = current ? answers[current.id] ?? {} : {};
    const result = current ? feedback[current.id] : undefined;
    const checked = Boolean(result?.response_id);
    const activityCount = sequence.data?.exercises.length ?? 0;
    const screenCount = activityCount + 1;
    const ready = activityCount > 0 && sequence.data?.total === activityCount;
    const moduleHref = `/aprender/modulo/${unit.module_id}`;

    useEffect(() => { if (step > 0) heading.current?.focus(); window.scrollTo({ top: 0 }); }, [step]);
    useEffect(() => {
        const images = sequence.data?.exercises.slice(Math.max(0, step - 1), step + 1) ?? [];
        images.forEach(exercise => {
            const url = mediaUrl(exercise.config?.prompt_image);
            if (!url) return;
            const image = new Image();
            image.decoding = 'async';
            image.src = url;
        });
    }, [sequence.data, step]);

    function update(value: ExerciseAnswer) {
        if (!current || busy || result?.is_correct) return;
        setAnswers(previous => ({ ...previous, [current.id]: value }));
        setFeedback(previous => ({ ...previous, [current.id]: undefined }));
        submissions.current[current.id] = undefined;
        setError('');
    }
    function pair(destination: string) {
        if (!selectedOrigin || busy || result?.is_correct) return;
        update({ pares: [...(answer.pares ?? []).filter(item => item.origen !== selectedOrigin && item.destino !== destination), { origen: selectedOrigin, destino: destination }] });
        setSelectedOrigin('');
    }
    function move(next: number) { setStep(next); setSelectedOrigin(''); setError(''); }
    function retry() {
        practiceAttempt.current = null; submissions.current = {};
        setAnswers({}); setFeedback({}); setXpEarned(0); setSummary(null); move(0);
    }
    async function finish() {
        const responseIds = sequence.data?.exercises.map(exercise => feedback[exercise.id]?.response_id);
        if (sending.current || !responseIds || responseIds.some(id => !id)) return;
        sending.current = true; setBusy(true); setError('');
        try {
            const response = await apiPost<GuidedResult>(`/units/${unit.id}/guided/result`, { response_ids: responseIds, practice_attempt_id: practiceAttempt.current });
            setSummary(response); move(screenCount);
        } catch (reason) {
            setError(reason instanceof ApiError ? Object.values(reason.errors).flat().join(' ') || reason.message : 'No se pudo cargar tu puntaje. Tus respuestas están guardadas; vuelve a intentarlo.');
        } finally { sending.current = false; setBusy(false); }
    }
    async function check() {
        if (!current || result?.is_correct || !answerComplete(current, answer) || sending.current) return;
        sending.current = true; setBusy(true); setError('');
        try {
            const response = await apiPost<ExerciseFeedback>(`/exercises/${current.id}/answer`, { answer, practice_attempt_id: practiceAttempt.current ??= crypto.randomUUID(), submission_id: submissions.current[current.id] ??= crypto.randomUUID() });
            setFeedback(previous => ({ ...previous, [current.id]: response }));
            setXpEarned(previous => response.xp_attempt ?? previous + (response.xp_earned ?? 0));
        } catch (reason) {
            setError(reason instanceof ApiError ? Object.values(reason.errors).flat().join(' ') || reason.message : 'No se pudo guardar tu respuesta. Se conserva tu selección; vuelve a intentarlo.');
        } finally { sending.current = false; setBusy(false); }
    }
    const origins = current?.elements.filter(item => item.grupo === 'origen') ?? [];
    const destinations = current?.elements.filter(item => item.grupo === 'destino') ?? [];

    return <div className={`guided-unit-shell${step > 0 && step < screenCount ? ' is-activity' : ''}`}>
        <Head title={`${unit.title} · Actividades`} />
        <header className="guided-unit-header">
            <Link href={moduleHref} className="guided-unit-brand"><BookOpen size={24} aria-hidden="true" /><span>KICHWA</span></Link>
            <span className="guided-unit-level">NIVEL {unit.level_name}</span>
            <div className="guided-unit-location"><span title={unit.module_name}>Unidad {unit.sort_order} · {unit.title}</span><Link href={moduleHref} aria-label="Salir de las actividades" title="Volver al módulo"><X size={22} aria-hidden="true" /></Link></div>
        </header>
        <main className="guided-unit-main" aria-busy={sequence.loading || busy}>
            {sequence.loading ? <LoadingState label="Preparando tu unidad…" /> : sequence.error ? <ErrorState message={sequence.error} /> : !ready ? <ErrorState message="Las actividades de esta unidad están en preparación." /> : summary && step === screenCount ? <section className="guided-result" aria-labelledby="guided-result-title">
                <p className="eyebrow">RESULTADO DE LA UNIDAD</p>
                <LearningCompanion final correct={summary.passed} score={`${summary.score} / ${summary.max_score}`} xpEarned={summary.xp_earned ?? xpEarned} />
                <h1 id="guided-result-title" ref={heading} tabIndex={-1}>{summary.passed ? '¡Buen trabajo!' : 'Sigue practicando'}</h1>
                <p className="guided-result-score" aria-label={`${summary.score} de ${summary.max_score} puntos`}>{summary.score}<span> / {summary.max_score}</span></p>
                <p className={`guided-result-status ${summary.passed ? 'is-passed' : ''}`}>{summary.passed ? 'Meta alcanzada' : 'Por debajo de la meta'}</p>
                <p className="guided-result-caption">{summary.correct_count} de {summary.total_items} respuestas correctas · Meta: 16/20 puntos</p>
                <div className="guided-result-details">{summary.details.map(detail => <div key={detail.exercise_id}><span>{detail.title}</span><strong>{detail.correct} / {detail.total}</strong></div>)}</div>
                <p className="guided-result-note">El puntaje se calcula con tus respuestas correctas sobre {summary.max_score} puntos. Puedes volver a practicar para mejorar tu resultado.</p>
                <div className="guided-result-actions">
                    <button type="button" className="secondary-button" onClick={retry}><RotateCcw size={18} aria-hidden="true" />Reintentar</button>
                    <Link className="primary-button" href={summary.next_unit_id ? `/aprender/unidad/${summary.next_unit_id}` : `/aprender/nivel/${unit.level_id}`}>Continuar <ArrowRight size={18} aria-hidden="true" /></Link>
                    <Link className="guided-result-exit" href={moduleHref}><ArrowLeft size={17} aria-hidden="true" />Salir a unidades</Link>
                </div>
            </section> : <>
                {step > 0 && <div className="exercise-companion-header"><div><h1 className="guided-exercise-heading" ref={heading} tabIndex={-1}>{current?.config?.title}</h1>
                <p className="guided-unit-description">{current?.prompt}</p></div><LearningCompanion key={result ? `response-${result.response_id}` : `ready-${current?.id}`} correct={result?.is_correct} xpEarned={result?.xp_earned} xpTotal={result?.xp_total} /></div>}
                {step === 0 ? (unit.config?.guided_lesson === 'greetings' ? <GreetingsIntroduction /> : <GuidedIntroduction />) : current?.type === 'seleccion_multiple' ? <fieldset className="guided-choice" disabled={busy || result?.is_correct === true}>
                    <legend className="sr-only">Selecciona el nombre en kichwa de la imagen</legend>
                    <figure className="guided-choice-visual">
                        <img className="guided-choice-image" src={mediaUrl(current.config?.prompt_image)} alt={current.config?.prompt_image_alt ?? "Imagen del ejercicio para reconocer una palabra en kichwa"} width={280} height={210} decoding="async" fetchPriority="high" />
                        {unit.config?.guided_lesson === 'greetings' && current.config?.context_text && <figcaption className="guided-image-time" aria-label={`Hora de la escena: ${current.config.context_text}`}>{current.config.context_text}</figcaption>}
                    </figure>
                    <div className="guided-choice-options">{current.elements.map(option => <label key={option.id} className={answer.seleccion?.includes(option.id) ? 'is-selected' : ''}>
                        <input type="radio" name={`guided-${current.id}`} value={option.id} checked={answer.seleccion?.includes(option.id) ?? false} onChange={() => update({ seleccion: [option.id] })} /><span>{option.texto}</span>
                    </label>)}</div>
                </fieldset> : <fieldset className="guided-matching" disabled={busy || result?.is_correct === true}>
                    <legend className="sr-only">Relaciona las cuatro palabras en español con sus parejas en kichwa</legend>
                    <div className="guided-matching-column"><h2>ESPAÑOL</h2>{origins.map((origin, index) => <button type="button" key={origin.id} className={`${selectedOrigin === origin.id ? 'is-selected' : ''}${answer.pares?.some(item => item.origen === origin.id) ? ' is-paired' : ''}`} aria-pressed={selectedOrigin === origin.id} onClick={() => { if (!busy && !result?.is_correct) setSelectedOrigin(origin.id); }}>
                        <span>{origin.texto}</span>{answer.pares?.some(item => item.origen === origin.id) && <span className="guided-pair-number" aria-label={`Pareja ${index + 1}`}>{index + 1}</span>}
                    </button>)}</div>
                    <div className="guided-matching-column"><h2>KICHWA</h2>{destinations.map(destination => {
                        const matched = answer.pares?.find(item => item.destino === destination.id);
                        const number = matched ? origins.findIndex(origin => origin.id === matched.origen) + 1 : 0;
                        return <button type="button" key={destination.id} className={matched ? 'is-paired' : ''} disabled={!selectedOrigin || busy} onClick={() => pair(destination.id)}><span>{destination.texto}</span>{number > 0 && <span className="guided-pair-number" aria-label={`Pareja ${number}`}>{number}</span>}</button>;
                    })}</div>
                    <p className="guided-matching-help" role="status">{answer.pares?.length ?? 0} de 4 parejas seleccionadas. Puedes cambiar una pareja antes de comprobar.</p>
                </fieldset>}
                {result && <p className={`guided-feedback ${result.is_correct ? 'is-correct' : 'is-incorrect'}`} role="status">{result.is_correct && <CheckCircle2 size={20} aria-hidden="true" />}<span>{result.feedback}</span></p>}
                {error && <p className="form-error" role="alert">{error}</p>}
            </>}
        </main>
        {step < screenCount && <footer className="guided-unit-footer">
            {step === 0 ? <Link href={moduleHref} className="guided-back"><ArrowLeft size={16} aria-hidden="true" />Volver</Link> : <button type="button" className="guided-back" disabled={busy} onClick={() => move(step - 1)}><ArrowLeft size={16} aria-hidden="true" />Volver</button>}
            <div className="guided-attempt-progress"><span className="guided-step" aria-label={`Pantalla ${step + 1} de ${screenCount}`}>{String(step + 1).padStart(2, '0')} <span>/ {String(screenCount).padStart(2, '0')}</span></span><span className="guided-attempt-xp">{xpEarned} XP en este intento</span></div>
            {ready && !sequence.error && !sequence.loading && (step === 0 ? <button type="button" className="primary-button" onClick={() => move(1)}>Continuar <ArrowRight size={17} aria-hidden="true" /></button> : checked ? <button type="button" className="primary-button" disabled={busy} onClick={() => step === activityCount ? void finish() : move(step + 1)}>{busy ? <><LoaderCircle size={17} className="animate-spin" aria-hidden="true" />Calculando…</> : step === activityCount ? <>Ver mi puntaje <ArrowRight size={17} aria-hidden="true" /></> : <>Continuar <ArrowRight size={17} aria-hidden="true" /></>}</button> : <button type="button" className="primary-button" disabled={busy || !current || !answerComplete(current, answer)} onClick={() => void check()}>{busy && <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />}{busy ? 'Comprobando…' : 'Comprobar'}</button>)}
        </footer>}
    </div>;
}
