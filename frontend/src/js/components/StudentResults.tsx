import { useEffect, useRef } from 'react';
import { BookOpen, CheckCircle2, GraduationCap, Star, Trophy, X, Zap } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from './States';
import type { Mastery, Student } from '../types';

export function StudentResults({ student, data, loading, error, onClose }: { student: Student; data: Mastery | null; loading: boolean; error: string | null; onClose: () => void }) {
    const dialog = useRef<HTMLDialogElement>(null);
    // Capture the trigger before React autofocus moves focus into the dialog.
    const opener = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null);
    useEffect(() => {
        const element = dialog.current;
        const overflow = document.body.style.overflow;
        element?.showModal();
        document.body.style.overflow = 'hidden';
        return () => { element?.close(); document.body.style.overflow = overflow; if (opener.current?.isConnected) opener.current.focus(); };
    }, []);
    return <dialog ref={dialog} className="student-results-dialog" aria-labelledby="student-results-title" aria-describedby="student-results-description" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose(); } }}>
        <div className="student-results-header"><span className="stat-icon tone-0"><GraduationCap size={25} aria-hidden="true" /></span><div><span className="eyebrow">SEGUIMIENTO ACADÉMICO</span><h2 id="student-results-title">Resultados de aprendizaje</h2><p id="student-results-description">El recorrido de {student.name}</p></div><button type="button" className="glass-icon-button" aria-label="Cerrar resultados" onClick={onClose} autoFocus><X size={20} aria-hidden="true" /></button></div>
        <div className="student-results-body">{loading ? <LoadingState label="Cargando resultados del estudiante…" /> : error ? <ErrorState message={error} /> : data && <>
            <div className="student-report-profile"><span className="directory-card-avatar" aria-hidden="true">{student.name.slice(0, 1).toUpperCase()}</span><div><span className="eyebrow">PERFIL DEL ESTUDIANTE</span><h3>{student.name}</h3><p>{student.email}</p></div><span className="badge neutral">ID #{student.id}</span></div>
            <div className="student-results-stats">{([{ Icon: Zap, value: data.xp, label: 'Experiencia acumulada · XP' }, { Icon: GraduationCap, value: data.mastered_topics.length, label: 'Lecciones dominadas' }, { Icon: CheckCircle2, value: data.completed_units.length, label: 'Unidades completadas' }]).map(({ Icon, value, label }, index) => <div key={label}><span className={`stat-icon tone-${index}`}><Icon size={22} aria-hidden="true" /></span><strong>{value}</strong><small>{label}</small></div>)}</div>
            <section className="student-results-achievements"><div className="section-heading"><h3>Logros e insignias</h3><Trophy size={19} className="text-forest" aria-hidden="true" /></div>{data.medals.length ? <ul>{data.medals.map(medal => <li key={medal}><Trophy size={17} aria-hidden="true" />{medal}</li>)}</ul> : <p className="soft-note">Las insignias aparecerán cuando el estudiante consiga sus primeros logros.</p>}</section>
            <section><div className="section-heading"><h3>Rendimiento por lección</h3><span className="badge neutral">{data.lessons.length} {data.lessons.length === 1 ? 'lección evaluada' : 'lecciones evaluadas'}</span></div>{!data.lessons.length ? <EmptyState title="Aún no hay resultados de lecciones" description="Los resultados aparecerán cuando el estudiante realice sus primeras evaluaciones." /> : <div className="student-lesson-results">{data.lessons.map(lesson => <article key={lesson.topic_id}><div className="student-lesson-heading"><BookOpen size={20} aria-hidden="true" /><h4>{lesson.name}</h4><span className="learning-mastery-stars" role="img" aria-label={`${lesson.stars} estrellas de dominio`}>{Array.from({ length: lesson.stars }, (_, index) => <Star key={index} size={14} fill="currentColor" aria-hidden="true" />)}{lesson.stars === 0 && <span>Sin estrellas</span>}</span></div><dl><div><dt>Mejor resultado</dt><dd>{lesson.best_score}%</dd></div><div><dt>Último resultado</dt><dd>{lesson.latest_score === null ? 'Pendiente' : `${lesson.latest_score}%`}</dd></div><div><dt>Intentos</dt><dd>{lesson.attempt_count}</dd></div></dl><div className="student-report-progress" role="progressbar" aria-label={`Mejor resultado en ${lesson.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={lesson.best_score}><span style={{ width: `${Math.max(0, Math.min(100, lesson.best_score))}%` }} /></div></article>)}</div>}</section>
        </>}</div>
        <footer className="student-results-footer"><button type="button" className="secondary-button" onClick={onClose}>Cerrar resultados</button></footer>
    </dialog>;
}
