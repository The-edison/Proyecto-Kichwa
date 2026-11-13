import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { Head, Link } from '../../navigation';
import { AppLayout } from '../../layouts/AppLayout';
import { ErrorState, LoadingState } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import type { Evaluation, EvaluationQuestion } from '../../types';
import '../../../css/module-final.css';

export default function EvaluationPreview({ evaluation }: { evaluation: Evaluation }) {
    const available = evaluation.preview_available === true;
    const { data, loading, error } = useApi<{ questions: EvaluationQuestion[] }>(available ? `/evaluations/${evaluation.id}/preview-questions` : '');

    return <AppLayout title={evaluation.title} subtitle="Vista temporal del contenido de la prueba"><Head title={`Vista previa · ${evaluation.title}`} />
        <div className="module-final-page">
            <Link className="module-final-back" href={evaluation.module_id ? '/aprender/modulo/' + evaluation.module_id : evaluation.unit_id ? '/aprender/unidad/' + evaluation.unit_id : '/aprender/nivel/' + evaluation.level_id}><ArrowLeft size={18} aria-hidden="true" />Volver</Link>
            {!available ? <ErrorState message="La vista previa no está disponible." /> : <>
                <section className="module-final-preview-heading glass-panel"><LockKeyhole size={24} aria-hidden="true" /><div><h2>Vista previa de la prueba</h2><p>Puedes leer las preguntas y opciones. Esta vista no inicia un intento ni guarda respuestas o calificaciones.</p></div></section>
                {loading ? <LoadingState /> : error ? <ErrorState message={error} /> : data && <div className="module-final-preview-list">{data.questions.map((question, index) => <article className="module-final-question glass-panel" key={question.id}>
                    <span className="eyebrow">PREGUNTA {index + 1} DE {data.questions.length}</span>
                    {question.config?.title && <p className="module-final-preview-topic">{question.config.title}</p>}
                    <h2>{question.prompt}</h2>
                    {question.config?.prompt_image && <img className="module-final-preview-image" src={question.config.prompt_image} alt={question.config.prompt_image_alt ?? ''} />}
                    <ol className="module-final-preview-options">{question.elements.map((option, position) => <li key={option.id}><span className="module-final-letter">{String.fromCharCode(65 + position)}.</span>{option.imagen && <img src={option.imagen} alt="" />}{option.texto}</li>)}</ol>
                    {(question.config?.max_selections ?? 1) > 1 && <p>Esta pregunta pide {question.config?.max_selections} opciones.</p>}
                </article>)}</div>}
            </>}
        </div>
    </AppLayout>;
}
