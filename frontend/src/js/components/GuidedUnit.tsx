import { useEffect, useRef, useState, useSyncExternalStore, type SetStateAction } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, LoaderCircle, RotateCcw, X } from 'lucide-react';
import '../../css/guided-unit.css';
import { Head, Link } from '../navigation';
import { useApi } from '../hooks/useApi';
import { ApiError, apiPost } from '../services/api';
import { answerComplete, feedbackMessage, mediaUrl } from './ExerciseCard';
import { ErrorState, LoadingState } from './States';
import { LearningCompanion } from './LearningCompanion';
import { GuidedIntroduction } from './GuidedIntroduction';
import { GreetingsIntroduction } from './GreetingsIntroduction';
import { useAuth } from '../context/AuthContext';
import { emptyGuidedAttempt, readGuidedAttempt, writeGuidedAttempt, subscribeGuidedAttempt, type GuidedAttempt, type GuidedResult } from '../services/guidedAttempt';
import type { Exercise, ExerciseAnswer, ExerciseFeedback, Unit } from '../types';

interface GuidedData { exercises: Array<Exercise & { completed: boolean }>; completed_count: number; total: number; }
type GuidedUnitData = Unit & { level_id: number; level_name: string; module_name: string };

export function GuidedUnit({ unit }: { unit: GuidedUnitData }) {
    const sequence = useApi<GuidedData>(`/units/${unit.id}/guided`);
    const { user } = useAuth();
    const draftKey = `yachay:guided-attempt:v1:${user?.id}:${unit.id}`;
    const attempt = useSyncExternalStore(listener => subscribeGuidedAttempt(draftKey, listener), () => readGuidedAttempt(draftKey));
    const { step, answers, feedback, xpEarned, summary, selectedOrigin } = attempt;
    function setField<K extends keyof GuidedAttempt>(key: K, value: SetStateAction<GuidedAttempt[K]>) {
        const previous = readGuidedAttempt(draftKey);
        writeGuidedAttempt(draftKey, { ...previous, [key]: typeof value === 'function' ? (value as (old: GuidedAttempt[K]) => GuidedAttempt[K])(previous[key]) : value });
    }
    const setStep = (value: SetStateAction<number>) => setField('step', value);
    const setAnswers = (value: SetStateAction<GuidedAttempt['answers']>) => setField('answers', value);
    const setFeedback = (value: SetStateAction<GuidedAttempt['feedback']>) => setField('feedback', value);
    const setXpEarned = (value: SetStateAction<number>) => setField('xpEarned', value);
    const setSummary = (value: GuidedResult | null) => setField('summary', value);
    const setSelectedOrigin = (value: SetStateAction<string>) => setField('selectedOrigin', value);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const sending = useRef(false);
    const heading = useRef<HTMLHeadingElement>(null);
    const current = step > 0 ? sequence.data?.exercises[step - 1] : undefined;
    const answer = current ? answers[current.id] ?? {} : {};
    const result = current ? feedback[current.id] : undefined;
    const feedbackText = result ? feedbackMessage(result.feedback) : '';
    const checked = Boolean(result?.response_id);
    const activityCount = sequence.data?.exercises.length ?? 0;
    const screenCount = activityCount + 1;
    const ready = activityCount > 0 && sequence.data?.total === activityCount;
    const moduleHref = `/aprender/modulo/${unit.module_id}`;
    const catalog = sequence.data ? JSON.stringify(sequence.data.exercises.map(({ id, type, prompt, elements, zones, config }) => ({ id, type, prompt, elements, zones, config }))) : null;

    useEffect(() => {
        if (!catalog) return;
        const saved = readGuidedAttempt(draftKey);
        if ((saved.catalog && saved.catalog !== catalog) || saved.step > screenCount) {
            writeGuidedAttempt(draftKey, emptyGuidedAttempt(catalog));
        } else if (!saved.catalog) {
            writeGuidedAttempt(draftKey, { ...saved, catalog });
        }
    }, [catalog, draftKey, screenCount]);

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
        setField('submissions', previous => ({ ...previous, [current.id]: undefined }));
        setError('');
    }
    function selectOrigin(origin: string) {
        if (busy || result?.is_correct) return;
        if (answer.pares?.some(item => item.origen === origin)) {
            update({ pares: answer.pares.filter(item => item.origen !== origin) });
            setSelectedOrigin('');
            return;
        }
        setSelectedOrigin(previous => previous === origin ? '' : origin);
    }
    function pair(destination: string) {
        if (busy || result?.is_correct) return;
        if (!selectedOrigin) {
            if (answer.pares?.some(item => item.destino === destination)) {
                update({ pares: answer.pares.filter(item => item.destino !== destination) });
            }
            return;
        }
        update({ pares: [...(answer.pares ?? []).filter(item => item.origen !== selectedOrigin && item.destino !== destination), { origen: selectedOrigin, destino: destination }] });
        setSelectedOrigin('');
    }
    function move(next: number) { setStep(next); setSelectedOrigin(''); setError(''); }
    function retry() {
        writeGuidedAttempt(draftKey, emptyGuidedAttempt(catalog ?? ''));
        setError('');
    }
    async function finish() {
        const responseIds = sequence.data?.exercises.map(exercise => feedback[exercise.id]?.response_id);
        if (sending.current || !responseIds || responseIds.some(id => !id)) return;
        sending.current = true; setBusy(true); setError('');
        const finishingAttemptId = readGuidedAttempt(draftKey).practiceAttemptId;
        try {
            const response = await apiPost<GuidedResult>(`/units/${unit.id}/guided/result`, { response_ids: responseIds, practice_attempt_id: finishingAttemptId });
            if (readGuidedAttempt(draftKey).practiceAttemptId !== finishingAttemptId) return;
            setSummary(response); move(screenCount);
        } catch (reason) {
            setError(reason instanceof ApiError ? Object.values(reason.errors).flat().join(' ') || reason.message : 'No se pudo cargar tu puntaje. Tus respuestas están guardadas; vuelve a intentarlo.');
        } finally { sending.current = false; setBusy(false); }
    }
    async function check() {
        if (!current || result?.is_correct || !answerComplete(current, answer) || sending.current) return;
        sending.current = true; setBusy(true); setError('');
        try {
            const saved = readGuidedAttempt(draftKey);
            writeGuidedAttempt(draftKey, { ...saved, practiceAttemptId: saved.practiceAttemptId ?? crypto.randomUUID(), submissions: { ...saved.submissions, [current.id]: saved.submissions[current.id] ?? crypto.randomUUID() } });
            const pending = readGuidedAttempt(draftKey);
            const response = await apiPost<ExerciseFeedback>(`/exercises/${current.id}/answer`, { answer, practice_attempt_id: pending.practiceAttemptId, submission_id: pending.submissions[current.id] });
            const latest = readGuidedAttempt(draftKey);
            if (latest.practiceAttemptId !== pending.practiceAttemptId || latest.submissions[current.id] !== pending.submissions[current.id]
                || (response.response_id !== undefined && latest.feedback[current.id]?.response_id === response.response_id)) return;
            setFeedback(previous => ({ ...previous, [current.id]: response }));
            setXpEarned(previous => response.xp_attempt ?? previous + (response.xp_earned ?? 0));
        } catch (reason) {
            setError(reason instanceof ApiError ? Object.values(reason.errors).flat().join(' ') || reason.message : 'No se pudo guardar tu respuesta. Se conserva tu selección; vuelve a intentarlo.');
        } finally { sending.current = false; setBusy(false); }
    }
    const origins = current?.elements.filter(item => item.grupo === 'origen') ?? [];
    const destinations = current?.elements.filter(item => item.grupo === 'destino') ?? [];

    return <div className={`guided-unit-shell${step > 0 && step < screenCount ? ' is-activity' : ''}${summary && step === screenCount ? ' is-result' : ''}`}>
        <Head title={`${unit.title} · Actividades`} />
        <header className="guided-unit-header">
            <Link href={moduleHref} className="guided-unit-brand"><BookOpen size={24} aria-hidden="true" /><span>KICHWA</span></Link>
            <span className="guided-unit-level">NIVEL {unit.level_name}</span>
            <div className="guided-unit-location"><span title={unit.module_name}>Unidad {unit.sort_order} · {unit.title}</span><Link href={moduleHref} aria-label="Salir de las actividades" title="Volver al módulo"><X size={22} aria-hidden="true" /></Link></div>
        </header>
        <section className="guided-unit-main" aria-label="Contenido de la unidad" aria-busy={sequence.loading || busy}>
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
                    <div className="guided-matching-column"><h2>ESPAÑOL</h2>{origins.map((origin, index) => <button type="button" key={origin.id} className={`${selectedOrigin === origin.id ? 'is-selected' : ''}${answer.pares?.some(item => item.origen === origin.id) ? ' is-paired' : ''}`} aria-pressed={selectedOrigin === origin.id || answer.pares?.some(item => item.origen === origin.id) === true} onClick={() => selectOrigin(origin.id)}>
                        <span>{origin.texto}</span>{answer.pares?.some(item => item.origen === origin.id) && <span className="guided-pair-number" aria-label={`Pareja ${index + 1}`}>{index + 1}</span>}
                    </button>)}</div>
                    <div className="guided-matching-column"><h2>KICHWA</h2>{destinations.map(destination => {
                        const matched = answer.pares?.find(item => item.destino === destination.id);
                        const number = matched ? origins.findIndex(origin => origin.id === matched.origen) + 1 : 0;
                        return <button type="button" key={destination.id} className={matched ? 'is-paired' : ''} aria-pressed={Boolean(matched)} disabled={(!selectedOrigin && !matched) || busy} onClick={() => pair(destination.id)}><span>{destination.texto}</span>{number > 0 && <span className="guided-pair-number" aria-label={`Pareja ${number}`}>{number}</span>}</button>;
                    })}</div>
                    <p className="guided-matching-help" role="status">{answer.pares?.length ?? 0} de 4 parejas seleccionadas. Puedes cambiar una pareja antes de comprobar.</p>
                </fieldset>}
                {result && feedbackText && <p className={`guided-feedback ${result.is_correct ? 'is-correct' : 'is-incorrect'}`} role="status">{result.is_correct && <CheckCircle2 size={20} aria-hidden="true" />}<span>{feedbackText}</span></p>}
                {error && <p className="form-error" role="alert">{error}</p>}
            </>}
        </section>
        {step < screenCount && <footer className="guided-unit-footer">
            {step === 0 ? <Link href={moduleHref} className="guided-back"><ArrowLeft size={16} aria-hidden="true" />Volver</Link> : <button type="button" className="guided-back" disabled={busy} onClick={() => move(step - 1)}><ArrowLeft size={16} aria-hidden="true" />Volver</button>}
            {step > 0 && <div className="guided-attempt-progress"><span className="guided-step" aria-label={`Ejercicio ${step} de ${activityCount}`}>{String(step).padStart(2, '0')} <span>/ {String(activityCount).padStart(2, '0')}</span></span><span className="guided-attempt-xp">{xpEarned} XP en este intento</span></div>}
            {ready && !sequence.error && !sequence.loading && (step === 0 ? <button type="button" className="primary-button" onClick={() => move(1)}>Continuar <ArrowRight size={17} aria-hidden="true" /></button> : checked ? <button type="button" className="primary-button" disabled={busy} onClick={() => step === activityCount ? void finish() : move(step + 1)}>{busy ? <><LoaderCircle size={17} className="animate-spin" aria-hidden="true" />Calculando…</> : step === activityCount ? <>Ver mi puntaje <ArrowRight size={17} aria-hidden="true" /></> : <>Continuar <ArrowRight size={17} aria-hidden="true" /></>}</button> : <button type="button" className="primary-button" disabled={busy || !current || !answerComplete(current, answer)} onClick={() => void check()}>{busy && <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />}{busy ? 'Comprobando…' : 'Comprobar'}</button>)}
        </footer>}
    </div>;
}
