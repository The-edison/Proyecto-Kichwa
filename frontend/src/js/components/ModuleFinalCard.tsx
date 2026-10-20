import { Award, CheckCircle2, LockKeyhole, ArrowRight } from 'lucide-react';
import { Link } from '../navigation';
import type { ModuleFinalStatus } from '../types';
import '../../css/module-final.css';

export function ModuleFinalCard({ status }: { status: ModuleFinalStatus }) {
    return <section className="module-final-card" aria-labelledby="module-final-title">
        <span className="module-final-emblem" aria-hidden="true">{status.passed ? <Award /> : status.unlocked ? <CheckCircle2 /> : <LockKeyhole />}</span>
        <div><span className="eyebrow">EL SIGUIENTE PASO</span><h2 id="module-final-title">{status.title}</h2>
            <p><strong>{status.question_count} preguntas</strong> sobre las cinco unidades. Apruebas con <strong>{status.pass_percentage}%</strong>.</p>
            <p>{status.passed ? `¡Prueba aprobada! Mejor nota: ${status.best_score}%.` : status.unlocked ? 'Ya puedes demostrar lo que aprendiste.' : `Completa correctamente todas las actividades para habilitarla: ${status.completed_units} de ${status.total_units} unidades listas.`}</p>
            <ul className="module-final-units">{status.units.map(unit => <li key={unit.id}><Link href={'/aprender/unidad/' + unit.id}>{unit.completed ? <CheckCircle2 size={16} aria-hidden="true" /> : <LockKeyhole size={16} aria-hidden="true" />}{unit.title}<span>{unit.correct}/{unit.total}</span></Link></li>)}</ul>
        </div>
        {status.unlocked ? <Link className="primary-button" href={'/aprender/evaluacion/' + status.id}>{status.passed ? 'Volver a practicar' : 'Abrir prueba'}<ArrowRight size={18} aria-hidden="true" /></Link> : <span className="module-final-locked"><LockKeyhole size={16} aria-hidden="true" />Prueba bloqueada</span>}
    </section>;
}
