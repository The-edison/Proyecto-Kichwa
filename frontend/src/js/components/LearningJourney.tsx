import { ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, LockKeyhole } from 'lucide-react';
import { Link } from '../navigation';
import { LearningProgress } from './LearningProgress';
import type { LearningReport } from '../types';
import '../../css/learning-journey.css';

export const nextLearningHref = (step: NonNullable<LearningReport['next_step']>) => step.kind === 'module_final' ? `/aprender/evaluacion/${step.id}` : `/aprender/unidad/${step.id}`;

export function LearningJourney({ report, admin = false }: { report: LearningReport; admin?: boolean }) {
    return <div className="learning-journey">{report.levels.map(level => <section key={level.id} className="journey-level" aria-label={`Avance de ${level.title}`}>
        <header><h3>{level.title}</h3><span className={`badge ${level.completed ? 'success' : 'neutral'}`}>{level.completed ? 'Completado' : level.percentage > 0 ? 'En curso' : 'Por comenzar'}</span></header>
        {!level.modules.length && <p className="soft-note">El contenido de este nivel está en preparación.</p>}
        {level.modules.map(module => <article className="glass-panel journey-module" key={module.id}>
            <header><BookOpen size={21} aria-hidden="true" /><h4>{module.title}</h4><span className={`badge ${module.completed ? 'success' : 'neutral'}`}>{module.completed ? 'Completado' : module.completed_activities > 0 ? 'En curso' : 'Por comenzar'}</span></header>
            <p><strong>{module.completed_units} de {module.total_units} unidades completadas</strong> · {module.completed_activities} de {module.total_activities} actividades correctas.</p>
            <LearningProgress value={module.percentage} label="Avance de la práctica" />
            <ul className="journey-units">{module.units.map(unit => <li key={unit.id}>
                <span className={unit.completed ? 'journey-unit-complete' : 'journey-unit-icon'} aria-hidden="true">{unit.completed ? <CheckCircle2 size={20} /> : <BookOpen size={20} />}</span>
                <div><strong>{unit.title}</strong><span>{unit.completed ? 'Completada' : !unit.total_activities ? 'En preparación' : unit.percentage === 100 ? 'Práctica lista · evaluación pendiente' : unit.completed_activities > 0 ? 'En curso' : 'Sin empezar'} · {unit.completed_activities}/{unit.total_activities} actividades correctas</span></div>
                {!admin && unit.total_activities > 0 && <Link className="text-link" href={'/aprender/unidad/' + unit.id}>{unit.completed ? 'Repasar' : 'Continuar'}<ArrowRight size={16} aria-hidden="true" /></Link>}
            </li>)}</ul>
            {module.final_evaluation && <div className="journey-final"><ClipboardCheck size={23} aria-hidden="true" /><div><h5>{module.final_evaluation.title}</h5>
                <strong className={module.final_evaluation.passed ? 'text-forest' : ''}>{module.final_evaluation.passed ? 'Aprobada' : !module.final_evaluation.unlocked ? 'Bloqueada' : module.final_evaluation.in_progress ? 'Intento en curso' : module.final_evaluation.attempt_count > 0 ? 'Pendiente de aprobar' : 'Lista para comenzar'}</strong>
                {module.final_evaluation.best_score !== null ? <p>Mejor nota: <strong>{module.final_evaluation.best_score}%</strong> · Última nota: {module.final_evaluation.latest_score ?? '—'}% · {module.final_evaluation.attempt_count} {module.final_evaluation.attempt_count === 1 ? 'intento finalizado' : 'intentos finalizados'}.</p> : <p>Sin intentos finalizados. Se aprueba con {module.final_evaluation.pass_percentage}%.</p>}
                {!module.final_evaluation.unlocked && <p><LockKeyhole size={14} aria-hidden="true" /> Se habilita al completar correctamente todas las actividades del módulo.</p>}
                {!admin && module.final_evaluation.unlocked && <Link className="text-link" href={'/aprender/evaluacion/' + module.final_evaluation.id}>{module.final_evaluation.passed ? 'Ver prueba' : module.final_evaluation.in_progress ? 'Retomar prueba' : 'Abrir prueba'}<ArrowRight size={16} aria-hidden="true" /></Link>}
            </div></div>}
        </article>)}
    </section>)}</div>;
}
