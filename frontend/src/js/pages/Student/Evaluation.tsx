import { Head, Link } from '../../navigation';
import ModuleFinalEvaluation from './ModuleFinalEvaluation';
import { useEffect, useRef, useState } from 'react';
import { useAnswerSound } from '../../hooks/useAnswerSound';
import { AppLayout } from '../../layouts/AppLayout';
import { ExerciseInteraction, answerComplete } from '../../components/ExerciseCard';
import { LearningCompanion } from '../../components/LearningCompanion';
import { ErrorState, LoadingState, EmptyState } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import '../../../css/exercise-page-turn.css';
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from '../../services/api';
import type { Evaluation as EvaluationData, EvaluationResult, ExerciseAnswer, EvaluationQuestion } from '../../types';
export default function Evaluation({ evaluationId }: { evaluationId: number }) {
    const playAnswerSound = useAnswerSound();
    const { data, loading, error } = useApi<EvaluationData>(`/evaluations/${evaluationId}`);
    const [questions, setQuestions] = useState<EvaluationQuestion[]>([]);
    const [saved, setSaved] = useState('');
    const [confirmedPairs, setConfirmedPairs] = useState<Record<number, string[]>>({});
    const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
    const [answers, setAnswers] = useState<Record<number, ExerciseAnswer>>({});
    const [attempt, setAttempt] = useState<number | null>(null);
    const [result, setResult] = useState<EvaluationResult | null>(null);
    const [busy, setBusy] = useState(false);
    const [submitError, setSubmitError] = useState('');
    useEffect(() => { setAttempt(null); setQuestions([]); setAnswers({}); setResult(null); setSaved(''); }, [evaluationId]);
    useEffect(() => { if (!attempt || busy) return; const timer = window.setTimeout(() => { setSaved('Guardando respuestas…'); saveQueue.current = saveQueue.current.catch(() => undefined).then(() => apiPatch(`/attempts/${attempt}`, {answers})).then(() => setSaved('Respuestas guardadas. Puedes retomar este intento.')).catch(() => setSaved('No se pudieron guardar los cambios. Conserva esta página abierta y vuelve a intentarlo.')); }, 500); return () => window.clearTimeout(timer); }, [answers, attempt, busy]);
    async function review(id: number) {
        setBusy(true); setSubmitError('');
        try { const response = await apiGet<{attempt_id: number; state: string; questions: EvaluationQuestion[]; answers: Record<number,ExerciseAnswer>; confirmed_pairs?: Record<number,string[]>; result: EvaluationResult | null}>(`/attempts/${id}`); setConfirmedPairs(response.confirmed_pairs ?? {}); setQuestions(response.questions); setAnswers(response.answers ?? {}); setAttempt(response.state === 'en_curso' ? id : null); setResult(response.result); }
        catch(reason) { setSubmitError(reason instanceof ApiError ? reason.message : 'No se pudo abrir el intento.'); }
        finally { setBusy(false); }
    }
    async function start() {
        setBusy(true); setSubmitError('');
        try { const response = await apiPost<{ attempt_id: number; questions: EvaluationQuestion[]; answers: Record<number, ExerciseAnswer>; confirmed_pairs?: Record<number,string[]> }>(`/evaluations/${evaluationId}/attempts`, {}); setAttempt(response.attempt_id); setAnswers(response.answers ?? {}); setConfirmedPairs(response.confirmed_pairs ?? {}); setQuestions(response.questions); setResult(null); }
        catch (reason) { setSubmitError(reason instanceof ApiError ? reason.message : 'No se pudo iniciar.'); }
        finally { setBusy(false); }
    }
    async function submit() {
        if (!data || !attempt) return;
        setBusy(true); setSubmitError('');
        try { await saveQueue.current; try { await apiPatch(`/attempts/${attempt}`, {answers}); } catch(reason) { if (!(reason instanceof ApiError && reason.status === 409)) throw reason; } const response = await apiPost<EvaluationResult>(`/evaluations/${data.id}/submit`, { attempt_id: attempt, answers: questions.map(q => ({ question_id: q.id, answer: answers[q.id] })) }); setResult(response); playAnswerSound(response.correct_count === response.total_questions); setAttempt(null); }
        catch (reason) { setSubmitError(reason instanceof ApiError ? Object.values(reason.errors).flat().join(' ') || reason.message : 'No se pudo enviar.'); }
        finally { setBusy(false); }
    }
    async function abandon() {
        if (!attempt || !window.confirm('¿Abandonar este intento?')) return;
        try { await apiDelete(`/attempts/${attempt}`); setAttempt(null); setAnswers({}); }
        catch (reason) { setSubmitError(reason instanceof ApiError ? reason.message : 'No se pudo abandonar.'); }
    }
    if (data?.type === 'modulo') return <ModuleFinalEvaluation key={evaluationId} evaluation={data} />;
    return <AppLayout title={data?.title ?? 'Evaluación'} subtitle="La calificación se calcula al finalizar el intento."><Head title="Evaluación" />{loading ? <LoadingState /> : error ? <ErrorState message={error} /> : data && <div className="space-y-5">
        <Link href={`/aprender/nivel/${data.level_id}`} className="font-bold text-forest">← Volver al nivel</Link>
        {data.config?.sequence_mode && <p className="glass-panel p-5">Seis preguntas · Un punto por pregunta · Apruebas con cinco aciertos · Duración sugerida: 3–5 minutos.</p>}{!data.config?.managed && !data.questions.length ? <EmptyState title="Sin preguntas" description="Esta evaluación todavía no está lista." /> : !attempt ? <button className="primary-button" disabled={busy} onClick={start}>{result ? 'Nuevo intento' : 'Iniciar o retomar intento'}</button> : <>{questions.map((q, i) => <article key={q.id} className="glass-panel p-6 exercise-page-turn" style={{ animationDelay: `${Math.min(i, 5) * 55}ms` }}><span className="eyebrow">PREGUNTA {i + 1} DE {questions.length}</span><h3 className="my-5 text-lg font-bold">{q.config?.title && <span className="block text-sm text-forest">{q.config.title}</span>}{q.prompt}</h3><fieldset disabled={busy}><ExerciseInteraction name={`question-${q.id}`} initialLockedPairs={confirmedPairs[q.id]} onCheckPair={data.config?.managed && !data.config.final ? async (origin,destination) => (await apiPost<{is_correct: boolean}>(`/attempts/${attempt}/pair`, {question_id:q.id,origin,destination})).is_correct : undefined} exercise={q} answer={answers[q.id] ?? {}} onChange={value => setAnswers(old => ({ ...old, [q.id]: value }))} /></fieldset></article>)}
            <div className="flex flex-wrap gap-3"><button className="primary-button" disabled={busy || questions.some(q => !answerComplete(q, answers[q.id] ?? {}))} onClick={submit}>Finalizar y calificar</button><button className="secondary-button" disabled={busy} onClick={abandon}>Abandonar intento</button></div></>}
        {!!data.history?.length && !attempt && <section className="glass-panel space-y-3 p-5"><h2 className="font-bold">Intentos guardados</h2>{data.history.map(h=><div className="flex flex-wrap items-center gap-3" key={h.id}><span>Intento {h.number}: {h.result ? h.result.score+'%' : h.state === 'en_curso' ? 'En curso' : 'Abandonado'}</span><button className="secondary-button" disabled={busy} onClick={()=>void review(h.id)}>{h.state==='en_curso' ? 'Retomar' : 'Ver resultado'}</button></div>)}</section>}<p role="status">{attempt ? saved : ''}</p>{submitError && <p className="form-error" role="alert">{submitError}</p>}
        {result && <div className="glass-panel p-7" role="status"><LearningCompanion final correct={result.passed ?? result.score >= 80} score={data.config?.sequence_mode ? `${result.correct_count} / ${result.total_questions}` : `${result.score}%`} xpEarned={result.xp_earned} xpTotal={result.xp_total} /><h2 className="font-serif text-4xl">{data.config?.sequence_mode ? `${result.correct_count}/6 · ${result.passed ? 'Aprobado' : 'Sigue practicando'}` : `${result.score}%`}</h2><p className="mt-3">{'★'.repeat(result.stars ?? 0)} · {result.xp_earned ?? 0} XP obtenidos · Total: {result.xp_total ?? 0} XP</p><p className="mt-3">{result.correct_count} de {result.total_questions} respuestas correctas.</p>{result.results.map(r => <p className="mt-2" key={r.question_id}>Pregunta #{r.question_id}: {r.feedback}</p>)}</div>}
    </div>}</AppLayout>;
}
