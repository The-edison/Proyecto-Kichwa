import { useEffect, useRef, useState } from 'react';
import { Award, ArrowLeft, ArrowRight, CheckCircle2, Circle, ClipboardCheck, Save } from 'lucide-react';
import { Head, Link } from '../../navigation';
import { AppLayout } from '../../layouts/AppLayout';
import { ModuleFinalCard } from '../../components/ModuleFinalCard';
import { apiGet, apiPatch, apiPost, ApiError } from '../../services/api';
import type { Evaluation, EvaluationQuestion, EvaluationResult, ExerciseAnswer } from '../../types';
import '../../../css/module-final.css';

type Answers = Record<number, ExerciseAnswer>;
interface Attempt { attempt_id: number; questions: EvaluationQuestion[]; answers: Answers; state?: string; result?: EvaluationResult | null; }
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
    const [reviewing, setReviewing] = useState(false);
    const [result, setResult] = useState<EvaluationResult | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState('');
    const queue = useRef<Promise<unknown>>(Promise.resolve());
    const acting = useRef(false);
    const heading = useRef<HTMLHeadingElement>(null);
    const status = evaluation.module_final;
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
    useEffect(() => { if (attempt) heading.current?.focus(); }, [position, reviewing, attempt]);

    async function open(id?: number) {
        if (acting.current) return;
        acting.current = true; setBusy(true); setError('');
        try {
            await queue.current.catch(() => undefined);
            const response = id ? await apiGet<Attempt>(`/attempts/${id}`) : await apiPost<Attempt>(`/evaluations/${evaluation.id}/attempts`, {});
            setQuestions(response.questions); setAnswers(response.answers ?? {}); setPosition(0); setReviewing(false);
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
            const response = await apiPost<EvaluationResult>(`/evaluations/${evaluation.id}/submit`, {
                attempt_id: attempt, answers: questions.map(question => ({ question_id: question.id, answer: answers[question.id] })),
            });
            setResult(response); setAttempt(null); setReviewing(false);
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
    function go(index: number) { setPosition(index); setReviewing(false); }
    const question = questions[position];
    const required = Math.ceil((status?.question_count ?? 15) * (status?.pass_percentage ?? 80) / 100);
    return <AppLayout title={evaluation.title} subtitle="Demuestra lo que aprendiste en el módulo 1."><Head title={evaluation.title} />
        <div className="module-final-page">
            {!result && <Link className="module-final-back" href={'/aprender/modulo/' + evaluation.module_id}><ArrowLeft size={18} aria-hidden="true" />Volver al módulo</Link>}
            {error && <p className="form-error" role="alert">{error}</p>}
            {!attempt && !result && <>
                {status && !status.unlocked ? <ModuleFinalCard status={status} /> : <section className="module-final-intro glass-panel">
                    <ClipboardCheck size={40} aria-hidden="true" /><h2>Tu reto final</h2>
                    <p><strong>{status?.question_count ?? 15} preguntas</strong> de escritura, saludos, pronombres, números y calendario.</p>
                    <ul><li>Lee cada situación y elige una respuesta. Algunas preguntas piden <strong>dos opciones</strong>.</li><li>Puedes volver a las preguntas y cambiar tus respuestas.</li><li>Apruebas con <strong>{required} aciertos ({status?.pass_percentage ?? 80}%)</strong>. Verás las explicaciones al finalizar.</li><li>Sin límite de tiempo. Tus respuestas se guardan para continuar después.</li></ul>
                    <button className="primary-button" disabled={busy} onClick={() => void open()}>Iniciar o continuar prueba<ArrowRight size={18} aria-hidden="true" /></button>
                </section>}
            </>}
            {attempt && <>
                <div className="module-final-progress"><strong>{complete} de {questions.length} respondidas</strong><progress value={complete} max={questions.length} aria-label="Preguntas respondidas" /></div>
                <nav className="module-final-numbers" aria-label="Preguntas de la prueba">{questions.map((item, index) => <button key={item.id} type="button" disabled={busy} aria-current={!reviewing && position === index ? 'step' : undefined} aria-label={`Pregunta ${index + 1}${finalAnswerComplete(item, answers[item.id]) ? ', respondida' : ', pendiente'}`} className={finalAnswerComplete(item, answers[item.id]) ? 'is-answered' : ''} onClick={() => go(index)}>{index + 1}</button>)}</nav>
                {reviewing ? <section className="module-final-question glass-panel"><h2 ref={heading} tabIndex={-1}>Revisa antes de finalizar</h2><p>Has respondido <strong>{complete} de {questions.length}</strong> preguntas. Puedes cambiar cualquier respuesta antes de enviar.</p>
                    <ul className="module-final-review">{questions.map((item, index) => <li key={item.id}><button disabled={busy} onClick={() => go(index)}>{finalAnswerComplete(item, answers[item.id]) ? <CheckCircle2 size={18} aria-hidden="true" /> : <Circle size={18} aria-hidden="true" />}<span><strong>{index + 1}. {item.prompt}</strong><span>{item.elements.filter(option => answers[item.id]?.seleccion?.includes(option.id)).map(option => option.texto).join(' · ') || 'Sin respuesta'}</span></span></button></li>)}</ul>
                    <button className="primary-button" disabled={busy || complete !== questions.length} onClick={() => void finish()}>{busy ? 'Enviando…' : 'Finalizar y calificar'}</button>
                </section> : question && <section className="module-final-question glass-panel" aria-labelledby="final-question-title">
                    <span className="eyebrow">Pregunta {position + 1} de {questions.length} · {question.config?.title}</span><h2 id="final-question-title" tabIndex={-1} ref={heading}>{question.prompt}</h2>
                    <p id="final-choice-hint">{(question.config?.max_selections ?? 1) > 1 ? 'Marca dos opciones. Para cambiar una, desmárcala primero.' : 'Elige una opción.'}</p>
                    <fieldset disabled={busy} aria-describedby="final-choice-hint"><legend className="sr-only">Opciones de respuesta</legend><div className="module-final-options">{question.elements.map((option, index) => <label key={option.id} className={answers[question.id]?.seleccion?.includes(option.id) ? 'is-selected' : ''}>
                        <input type={(question.config?.max_selections ?? 1) > 1 ? 'checkbox' : 'radio'} name={'final-' + question.id} value={option.id} checked={answers[question.id]?.seleccion?.includes(option.id) ?? false} onChange={() => choose(question, option.id)} />
                        <span className="module-final-letter" aria-hidden="true">{String.fromCharCode(65 + index)}</span><span>{option.texto}</span>
                    </label>)}</div></fieldset>
                    <div className="module-final-actions"><button className="secondary-button" disabled={busy || position === 0} onClick={() => go(position - 1)}><ArrowLeft size={18} aria-hidden="true" />Anterior</button><button className="primary-button" disabled={busy} onClick={() => position < questions.length - 1 ? go(position + 1) : setReviewing(true)}>{position < questions.length - 1 ? 'Siguiente' : 'Revisar respuestas'}<ArrowRight size={18} aria-hidden="true" /></button></div>
                </section>}
                <div className="module-final-save"><button className="secondary-button" disabled={busy} onClick={() => void persist()}><Save size={17} aria-hidden="true" />Guardar respuestas</button>{!reviewing && <button className="secondary-button" disabled={busy} onClick={() => setReviewing(true)}>Revisar todo</button>}<p role="status">{saved}</p></div>
            </>}
            {result && <section className="module-final-result glass-panel" aria-labelledby="final-result-title"><Award size={44} aria-hidden="true" /><h2 id="final-result-title">{result.passed ? '¡Prueba aprobada!' : 'Sigue aprendiendo'}</h2><p className="module-final-score">{result.score}%</p><p><strong>{result.correct_count} de {result.total_questions} respuestas correctas.</strong> {result.passed ? 'Has superado la prueba final del módulo 1.' : `Necesitas ${required} aciertos para aprobar. Repasa las explicaciones y vuelve a intentarlo.`}</p><p>+{result.xp_earned ?? 0} XP · Total: {result.xp_total ?? 0} XP</p>
                <ol className="module-final-feedback">{questions.map((item, index) => { const outcome = result.results.find(value => value.question_id === item.id); return outcome && <li key={item.id} className={outcome.is_correct ? 'is-correct' : 'is-incorrect'}><h3>{index + 1}. {outcome.is_correct ? 'Correcta' : 'Por repasar'}</h3><p><strong>{item.prompt}</strong></p><p>{outcome.feedback}</p></li>; })}</ol>
                <div className="module-final-actions">
                    <button className="secondary-button" disabled={busy || !status?.unlocked} onClick={() => void open()}>Reintentar</button>
                    <Link className="primary-button" href={'/aprender/nivel/' + evaluation.level_id}>Finalizar<ArrowRight size={18} aria-hidden="true" /></Link>
                </div>
            </section>}
            {!attempt && !result && !!evaluation.history?.length && <section className="module-final-history glass-panel"><h2>Tus intentos</h2>{evaluation.history.filter(item => item.state === 'en_curso' || item.result).map(item => <div key={item.id}><span>Intento {item.number} · {item.result ? `${item.result.score}%` : 'En curso'}</span><button className="secondary-button" disabled={busy || (item.state === 'en_curso' && !status?.unlocked)} onClick={() => void open(item.id)}>{item.result ? 'Ver resultado' : 'Continuar'}</button></div>)}</section>}
        </div>
    </AppLayout>;
}
