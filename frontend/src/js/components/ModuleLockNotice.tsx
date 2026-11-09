import { ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, LockKeyhole } from 'lucide-react';
import { Link } from '../navigation';
import { moduleResumeHref } from '../services/moduleAccess';
import type { ModuleLock } from '../types';
import '../../css/module-access.css';

export function ModuleLockNotice({ lock, onNavigate }: { lock: ModuleLock; onNavigate?: () => void }) {
    const unitsComplete = lock.total_units > 0 && lock.completed_units === lock.total_units;
    return <section className="module-lock-notice" aria-label="Requisitos para desbloquear el módulo">
        <span className="module-lock-emblem" aria-hidden="true"><LockKeyhole size={30} /></span>
        <span className="eyebrow">TU APRENDIZAJE, PASO A PASO</span>
        <h2>Tu siguiente reto te espera</h2>
        <p>Para abrir <strong>{lock.module_title}</strong>, termina primero <strong>{lock.prerequisite.title}</strong>. Cada paso te prepara para el siguiente.</p>
        <ul className="module-lock-requirements">
            <li className={unitsComplete ? 'is-complete' : ''}>{unitsComplete ? <CheckCircle2 size={20} aria-hidden="true" /> : <BookOpen size={20} aria-hidden="true" />}<span>Unidades completadas<strong>{lock.completed_units} de {lock.total_units}</strong></span></li>
            <li className={lock.final_passed ? 'is-complete' : ''}>{lock.final_passed ? <CheckCircle2 size={20} aria-hidden="true" /> : <ClipboardCheck size={20} aria-hidden="true" />}<span>Prueba final<strong>{lock.final_passed ? 'Aprobada' : lock.final_ready ? 'Pendiente de aprobar' : 'En preparación'}</strong></span></li>
        </ul>
        <Link className="primary-button" href={moduleResumeHref(lock)} onClick={onNavigate}>{unitsComplete && lock.final_ready ? 'Ir a la prueba final' : 'Continuar mi aprendizaje'}<ArrowRight size={18} aria-hidden="true" /></Link>
    </section>;
}
