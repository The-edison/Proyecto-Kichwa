import type { EvaluationQuestion, EvaluationResult, ExerciseAnswer, ExerciseSolution } from '../types';
import '../../css/module-final.css';

export function EvaluationResultSummary({ result, passPercentage = 80, requiredCorrect, headingId }: { result: EvaluationResult; passPercentage?: number; requiredCorrect?: number; headingId?: string }) {
    const required = requiredCorrect ?? Math.ceil(result.total_questions * passPercentage / 100);
    const passed = result.passed ?? (requiredCorrect !== undefined ? result.correct_count >= required : result.score >= passPercentage);
    return <div className="evaluation-result-summary" role="status" aria-live="polite" aria-atomic="true">
        <h2 id={headingId}>{passed ? '¡Prueba aprobada!' : 'Prueba no aprobada'}</h2>
        <p className="module-final-score" aria-label={`Calificación: ${result.score} de 100`}>{result.score} / 100</p>
        <p><strong>{result.correct_count} de {result.total_questions} respuestas correctas.</strong></p>
        <p>{requiredCorrect !== undefined ? `Se necesitan ${required} aciertos para aprobar.` : `Mínimo para aprobar: ${passPercentage}% (${required} aciertos).`}</p>
        {!passed && <p>Puedes volver a intentarlo para mejorar tu nota.</p>}
    </div>;
}

function answerText(question: EvaluationQuestion, answer?: ExerciseAnswer | ExerciseSolution): string {
    if (!answer) return 'Sin respuesta';
    const label = (id: string) => question.elements.find(item => item.id === id)?.texto ?? question.zones?.find(item => item.id === id)?.texto ?? id;
    if (answer.seleccion) return answer.seleccion.map(label).join(' · ');
    if (answer.orden) return answer.orden.map(label).join(' → ');
    if (answer.textos) return Object.entries(answer.textos).map(([id, text]) => `${label(id)}: ${Array.isArray(text) ? text.join(" / ") : text}`).join(' · ');
    if (answer.pares) return answer.pares.map(pair => `${label(pair.origen)} → ${label(pair.destino)}`).join(' · ');
    return 'Sin respuesta';
}

export function EvaluationAnswerReview({ result, questions, answers }: { result: EvaluationResult; questions: EvaluationQuestion[]; answers: Record<number, ExerciseAnswer> }) {
    return <ol className="module-final-feedback">{questions.map((question, index) => {
        const outcome = result.results.find(item => item.question_id === question.id);
        return outcome && <li key={question.id} className={`evaluation-review-card ${outcome.is_correct ? 'is-correct' : 'is-incorrect'}`}>
            <div className="evaluation-review-heading">
                <span>Pregunta {index + 1} de {questions.length}</span>
                <span className="evaluation-review-badge">{outcome.is_correct ? '✓ Correcta' : '✕ Incorrecta'}</span>
            </div>
            <h3>{question.prompt}</h3>
            <div className="evaluation-review-answers">
                <div className="evaluation-review-answer"><h4>Tu respuesta: </h4><p>{answerText(question, answers[question.id])}</p></div>
                {outcome.correct_answer && <div className="evaluation-review-answer is-solution"><h4>Respuesta correcta: </h4><p>{answerText(question, outcome.correct_answer)}</p></div>}
            </div>
            <div className="evaluation-review-explanation"><h4>Explicación</h4><p>{outcome.feedback}</p></div>
        </li>;
    })}</ol>;
}
