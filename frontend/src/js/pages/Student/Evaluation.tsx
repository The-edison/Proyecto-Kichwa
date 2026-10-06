import { Head, Link } from '../../navigation';
import { useState } from 'react';
import { AppLayout } from '../../layouts/AppLayout';
import { ExerciseInteraction, answerComplete } from '../../components/ExerciseCard';
import { ErrorState, LoadingState, EmptyState } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import { apiPost, apiDelete, ApiError } from '../../services/api';
import type { Evaluation as EvaluationData, EvaluationResult, ExerciseAnswer } from '../../types';
export default function Evaluation({ evaluationId }: { evaluationId: number }) {
    const { data, loading, error } = useApi<EvaluationData>(`/evaluations/${evaluationId}`);
    const [answers, setAnswers] = useState<Record<number, ExerciseAnswer>>({});
    const [attempt, setAttempt] = useState<number | null>(null);
    const [result, setResult] = useState<EvaluationResult | null>(null);
    const [busy, setBusy] = useState(false);
    const [submitError, setSubmitError] = useState('');
    async function start() {
        setBusy(true); setSubmitError('');
        try { const response = await apiPost<{ attempt_id: number }>(`/evaluations/${evaluationId}/attempts`, {}); setAttempt(response.attempt_id); setAnswers({}); setResult(null); }
        catch (reason) { setSubmitError(reason instanceof ApiError ? reason.message : 'No se pudo iniciar.'); }
        finally { setBusy(false); }
    }
    async function submit() {
        if (!data || !attempt) return;
        setBusy(true); setSubmitError('');
        try { setResult(await apiPost<EvaluationResult>(`/evaluations/${data.id}/submit`, { attempt_id: attempt, answers: data.questions.map(q => ({ question_id: q.id, answer: answers[q.id] })) })); setAttempt(null); }
        catch (reason) { setSubmitError(reason instanceof ApiError ? Object.values(reason.errors).flat().join(' ') || reason.message : 'No se pudo enviar.'); }
        finally { setBusy(false); }
    }
    async function abandon() {
        if (!attempt || !window.confirm('¿Abandonar este intento?')) return;
        try { await apiDelete(`/attempts/${attempt}`); setAttempt(null); setAnswers({}); }
        catch (reason) { setSubmitError(reason instanceof ApiError ? reason.message : 'No se pudo abandonar.'); }
    }
    return <AppLayout title={data?.title ?? 'Evaluación'} subtitle="La calificación se calcula al finalizar el intento."><Head title="Evaluación" />{loading ? <LoadingState /> : error ? <ErrorState message={error} /> : data && <div className="space-y-5">
        <Link href={`/aprender/nivel/${data.level_id}`} className="font-bold text-forest">← Volver al Básico</Link>
        {!data.questions.length ? <EmptyState title="Sin preguntas" description="Esta evaluación todavía no está lista." /> : !attempt ? <button className="primary-button" disabled={busy} onClick={start}>{result ? 'Nuevo intento' : 'Iniciar o retomar intento'}</button> : <>{data.questions.map((q, i) => <article key={q.id} className="glass-panel p-6"><span className="eyebrow">PREGUNTA {i + 1} DE {data.questions.length}</span><h3 className="my-5 text-lg font-bold">{q.prompt}</h3><ExerciseInteraction name={`question-${q.id}`} exercise={q} answer={answers[q.id] ?? {}} onChange={value => setAnswers({ ...answers, [q.id]: value })} /></article>)}
            <div className="flex flex-wrap gap-3"><button className="primary-button" disabled={busy || data.questions.some(q => !answerComplete(q, answers[q.id] ?? {}))} onClick={submit}>Finalizar y calificar</button><button className="secondary-button" disabled={busy} onClick={abandon}>Abandonar intento</button></div></>}
        {submitError && <p className="form-error" role="alert">{submitError}</p>}
        {result && <div className="glass-panel p-7" role="status"><h2 className="font-serif text-4xl">{result.score}%</h2><p className="mt-3">{result.correct_count} de {result.total_questions} respuestas correctas.</p>{result.results.map(r => <p className="mt-2" key={r.question_id}>Pregunta #{r.question_id}: {r.feedback}</p>)}</div>}
    </div>}</AppLayout>;
}
