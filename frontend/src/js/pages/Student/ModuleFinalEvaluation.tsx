import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ClipboardCheck, Save } from 'lucide-react';
import { Head, Link } from '../../navigation';
import { AppLayout } from '../../layouts/AppLayout';
import { EvaluationAnswerReview, EvaluationResultSummary } from '../../components/EvaluationResultSummary';
import { ModuleFinalCard } from '../../components/ModuleFinalCard';
import { apiGet, apiPatch, apiPost, ApiError } from '../../services/api';
import type { Evaluation, EvaluationQuestion, EvaluationResult, ExerciseAnswer } from '../../types';
import '../../../css/module-final.css';

type Answers = Record<number, ExerciseAnswer>;
interface Attempt { attempt_id: number; evaluation_id?: number; questions: EvaluationQuestion[]; answers: Answers; state?: string; result?: EvaluationResult | null; }
export function finalAnswerComplete(question: EvaluationQuestion, answer?: ExerciseAnswer) {
    const selected = answer?.seleccion ?? [];
    return selected.length === (question.config?.max_selections ?? 1) && new Set(selected).size === selected.length
        && selected.every(id => question.elements.some(element => element.id === id));
}
const failure = (reason: unknown) => reason instanceof ApiError ? Object.values(reason.errors ?? {}).flat().join(' ') || reason.message : 'No se pudo conectar. Tus respuestas siguen en esta pantalla. Vuelve a intentarlo.';

export default function ModuleFinalEvaluation({ evaluation }: { evaluation: Evaluation }) {
    const [attempt, setAttempt] = useState<number | null>(null);
    const [questions, setQuestions] = useState<EvaluationQuestion[]>([]);
    const [answers, setAnswers] = useState<Answers>({});
    const [position, setPosition] = useState(0);
    const [result, setResult] = useState<EvaluationResult | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState('');
    const queue = useRef<Promise<unknown>>(Promise.resolve());
    const attemptEvaluation = useRef(evaluation.id);
    const acting = useRef(false);
    const heading = useRef<HTMLHeadingElement>(null);
    const status = evaluation.module_final;
    const latest = evaluation.history?.[0];
    const newerVersionAvailable = Boolean(evaluation.history?.some(item => item.state === 'en_curso' && item.evaluation_id !== undefined && item.evaluation_id !== evaluation.id))
        && !evaluation.history?.some(item => item.state === 'en_curso' && item.evaluation_id === evaluation.id);
    const complete = questions.filter(question => finalAnswerComplete(question, answers[question.id])).length;

    function save(id: number, snapshot: Answers) {
        queue.current = queue.current.catch(() => undefined).then(() => apiPatch(`/attempts/${id}`, { answers: snapshot }));
        return queue.current;
    }
    useEffect(() => {
        if (!attempt || busy) return;
        setSaved('Cambios pendientes de guardar…');
        const timer = window.setTimeout(() => {
            setSaved('Guardando…');
            void save(attempt, answers).then(() => setSaved('Respuestas guardadas. Puedes salir y retomar después.')).catch(() => setSaved('No se guardaron los últimos cambios. Pulsa «Guardar respuestas» antes de salir.'));
        }, 600);
        return () => window.clearTimeout(timer);
    }, [answers, attempt, busy]);
    useEffect(() => { if (attempt) heading.current?.focus(); }, [position, attempt]);

    async function open(id?: number, fresh = false) {
        if (acting.current) return;
        acting.current = true; setBusy(true); setError('');
        try {
            await queue.current.catch(() => undefined);
            const response = id ? await apiGet<Attempt>(`/attempts/${id}`) : await apiPost<Attempt>(`/evaluations/${evaluation.id}/attempts`, fresh || newerVersionAvailable ? { new_version: true } : {});
            attemptEvaluation.current = response.evaluation_id ?? evaluation.id;
            setQuestions(response.questions); setAnswers(response.answers ?? {}); setPosition(0);
            setAttempt(response.state && response.state !== 'en_curso' ? null : response.attempt_id);
            setResult(response.result ?? null); setSaved('');
        } catch (reason) { setError(failure(reason)); }
        finally { acting.current = false; setBusy(false); }
    }
    async function persist() {
        if (!attempt || acting.current) return;
        acting.current = true; setBusy(true); setError('');
        try { await save(attempt, answers); setSaved('Respuestas guardadas. Puedes salir y retomar después.'); }
        catch (reason) { setError(failure(reason)); }
        finally { acting.current = false; setBusy(false); }
    }
    async function finish() {
        if (!attempt || acting.current || complete !== questions.length || !questions.length) return;
        acting.current = true; setBusy(true); setError('');
        try {
            await queue.current.catch(() => undefined);
            // The submit endpoint also stores and grades this complete snapshot atomically.
            const response = await apiPost<EvaluationResult>(`/evaluations/${attemptEvaluation.current}/submit`, {
                attempt_id: attempt, answers: questions.map(question => ({ question_id: question.id, answer: answers[question.id] })),
            });
            setResult(response); setAttempt(null);
        } catch (reason) { setError(failure(reason)); }
        finally { acting.current = false; setBusy(false); }
    }
    function choose(question: EvaluationQuestion, id: string) {
        if (busy || acting.current) return;
        const max = question.config?.max_selections ?? 1;
        setAnswers(old => {
            const selected = old[question.id]?.seleccion ?? [];
            const next = max === 1 ? [id] : selected.includes(id) ? selected.filter(value => value !== id) : selected.length < max ? [...selected, id] : selected;
            return { ...old, [question.id]: { seleccion: next } };
        });
    }
    function go(index: number) { setPosition(index); }
    const question = questions[position];
    const required = Math.ceil((status?.question_count ?? 15) * (status?.pass_percentage ?? 80) / 100);
    return <AppLayout focused={Boolean(attempt || result)} title={evaluation.title} subtitle="Demuestra lo que aprendiste en el módulo."><Head title={evaluation.title} />
        <div className="module-final-page">
            {!result && <Link className="module-final-back" href={'/aprender/modulo/' + evaluation.module_id}><ArrowLeft size={18} aria-hidden="true" />Volver al módulo</Link>}
            {error && !result && <p className="form-error" role="alert">{error}</p>}
            {!attempt && !result && <>
                {status && !status.unlocked ? <ModuleFinalCard status={status} /> : <section className="module-final-intro glass-panel">
                    <ClipboardCheck size={40} aria-hidden="true" /><h2>Tu reto final</h2>
                    <p><strong>{status?.question_count ?? 15} preguntas</strong> sobre el contenido de todas las unidades del módulo.</p>
                    <ul><li>Lee cada situación y elige una respuesta. Algunas preguntas piden <strong>varias opciones</strong>.</li><li>Puedes volver a las preguntas y cambiar tus respuestas.</li><li>Apruebas con <strong>{required} aciertos ({status?.pass_percentage ?? 80}%)</strong>. Verás las explicaciones al finalizar.</li><li>Sin límite de tiempo. Tus respuestas se guardan para continuar después.</li></ul>
                    {newerVersionAvailable && <p>Puedes iniciar la prueba actualizada o continuar tu intento guardado más abajo.</p>}
                    <button className="primary-button" disabled={busy} onClick={() => void open(undefined, Boolean(latest?.result))}>{latest?.state === 'en_curso' && !newerVersionAvailable ? 'Continuar prueba' : latest?.result ? 'Reintentar' : 'Iniciar prueba'}<ArrowRight size={18} aria-hidden="true" /></button>
                </section>}
            </>}
            {attempt && <>
                <div className="module-final-progress"><strong>{complete} de {questions.length} respondidas</strong><progress value={complete} max={questions.length} aria-label="Preguntas respondidas" /></div>
                <nav className="module-final-numbers" aria-label="Preguntas de la prueba">{questions.map((item, index) => <button key={item.id} type="button" disabled={busy} aria-current={position === index ? 'step' : undefined} aria-label={`Pregunta ${index + 1}${finalAnswerComplete(item, answers[item.id]) ? ', respondida' : ', pendiente'}`} className={finalAnswerComplete(item, answers[item.id]) ? 'is-answered' : ''} onClick={() => go(index)}>{index + 1}</button>)}</nav>
                {question && <section className="module-final-question glass-panel" aria-labelledby="final-question-title">
                    <span className="eyebrow">Pregunta {position + 1} de {questions.length} · {question.config?.title}</span><h2 id="final-question-title" tabIndex={-1} ref={heading}>{question.prompt}</h2>
                    <p id="final-choice-hint">{(question.config?.max_selections ?? 1) > 1 ? `Marca ${question.config?.max_selections} opciones. Para cambiar una, desmárcala primero.` : 'Elige una opción.'}</p>
                    <fieldset disabled={busy} aria-describedby="final-choice-hint"><legend className="sr-only">Opciones de respuesta</legend><div className="module-final-options">{question.elements.map((option, index) => <label key={option.id} className={answers[question.id]?.seleccion?.includes(option.id) ? 'is-selected' : ''}>
                        <input type={(question.config?.max_selections ?? 1) > 1 ? 'checkbox' : 'radio'} name={'final-' + question.id} value={option.id} checked={answers[question.id]?.seleccion?.includes(option.id) ?? false} onChange={() => choose(question, option.id)} />
                        <span className="module-final-letter" aria-hidden="true">{String.fromCharCode(65 + index)}</span><span>{option.texto}</span>
                    </label>)}</div></fieldset>
                    <div className="module-final-actions"><button className="secondary-button" disabled={busy || position === 0} onClick={() => go(position - 1)}><ArrowLeft size={18} aria-hidden="true" />Anterior</button><button className="primary-button" disabled={busy || (position === questions.length - 1 && complete !== questions.length)} onClick={() => position < questions.length - 1 ? go(position + 1) : void finish()}>{busy ? 'Calificando…' : position < questions.length - 1 ? 'Siguiente' : 'Finalizar prueba'}<ArrowRight size={18} aria-hidden="true" /></button></div>
                </section>}
                <div className="module-final-save"><button className="secondary-button" disabled={busy} onClick={() => void persist()}><Save size={17} aria-hidden="true" />Guardar respuestas</button>{position === questions.length - 1 && complete < questions.length && <p role="status">Responde las {questions.length - complete} preguntas pendientes para finalizar.</p>}<p role="status">{saved}</p></div>
            </>}
            {result && <section data-exercise-correct={result.correct_count === result.total_questions} className="module-final-result glass-panel" aria-labelledby="final-result-title"><EvaluationResultSummary result={result} passPercentage={status?.pass_percentage ?? 80} headingId="final-result-title" />
                {error && <p className="form-error" role="alert">{error}</p>}
                <div className="module-final-actions"><button className="primary-button" disabled={busy} onClick={() => void open(undefined, true)}>{busy ? 'Iniciando…' : 'Reintentar'}</button><Link className="secondary-button" href={'/aprender/modulo/' + evaluation.module_id}><ArrowLeft size={18} aria-hidden="true" />Volver a las unidades</Link></div>
                <details className="module-final-explanations"><summary>Revisar respuestas</summary><EvaluationAnswerReview result={result} questions={questions} answers={answers} /></details>
            </section>}
            {!attempt && !result && !!evaluation.history?.length && <section className="module-final-history glass-panel"><h2>Último intento</h2>{evaluation.history.slice(0, 1).filter(item => item.state === 'en_curso' || item.result).map(item => <div key={item.id}><span>Resultado: {item.result ? `${item.result.score}%` : 'En curso'}</span><button className="secondary-button" disabled={busy || (item.state === 'en_curso' && !status?.unlocked)} onClick={() => void open(item.id)}>{item.result ? 'Ver resultado' : 'Continuar'}</button></div>)}</section>}
        </div>
    </AppLayout>;
}
