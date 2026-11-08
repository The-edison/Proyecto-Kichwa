import { Head, Link } from '../../navigation';
import { ArrowRight, BookOpen, ClipboardCheck, Users, ChartNoAxesCombined } from 'lucide-react';
import { AppLayout } from '../../layouts/AppLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import type { Paginated, Student } from '../../types';

export default function Dashboard() {
    const summary = useApi<{ students: number; contents: number; exercises: number }>('/admin/overview');
    const students = useApi<Paginated<Student>>('/admin/students?page=1');
    const cards = [
        ['Estudiantes', summary.data?.students, Users, '/admin/estudiantes', 'Cuentas registradas'],
        ['Lecciones', summary.data?.contents, BookOpen, '/admin/contenidos', 'Lecciones publicadas para estudiantes'],
        ['Ejercicios', summary.data?.exercises, ClipboardCheck, '/admin/contenidos', 'Actividades disponibles para estudiantes'],
    ] as const;
    const contents = summary.data?.contents ?? 0, exercises = summary.data?.exercises ?? 0;
    const total = contents + exercises;
    const share = total ? Math.round(contents / total * 100) : 0;
    return <AppLayout title="Panel de administración" subtitle="Elige una tarea para empezar. Los indicadores quedan disponibles más abajo.">
        <Head title="Administración" />
        <section className="admin-start" aria-labelledby="admin-start-title"><span className="eyebrow">EMPIEZA AQUÍ</span><h2 id="admin-start-title">¿Qué quieres hacer?</h2><div className="admin-start-grid">
            <Link href="/admin/contenidos" className="glass-panel admin-start-card card-hover"><BookOpen aria-hidden="true" /><strong>Organizar el curso</strong><span>Niveles, módulos, unidades, temas y ejercicios</span><span className="admin-start-action">Abrir contenidos <ArrowRight size={17} aria-hidden="true" /></span></Link>
            <Link href="/admin/estudiantes" className="glass-panel admin-start-card card-hover"><Users aria-hidden="true" /><strong>Ver estudiantes</strong><span>Cuentas y resultados de aprendizaje</span><span className="admin-start-action">Abrir estudiantes <ArrowRight size={17} aria-hidden="true" /></span></Link>
            <Link href="/admin/diccionario" className="glass-panel admin-start-card card-hover"><ClipboardCheck aria-hidden="true" /><strong>Editar diccionario</strong><span>Palabras en kichwa y español</span><span className="admin-start-action">Abrir diccionario <ArrowRight size={17} aria-hidden="true" /></span></Link>
        </div></section>
        <h2 className="admin-overview-heading">Resumen del campus</h2>
        {summary.loading ? <LoadingState label="Cargando indicadores del campus…" /> : summary.error ? <ErrorState message={summary.error} /> : <section className="stats-grid admin-stats" aria-label="Indicadores del campus">{cards.map(([label, count, Icon, href, note], index) => <Link href={href} className="stat-card glass-panel card-hover" key={label}><span className={`stat-icon tone-${index}`}><Icon size={22} aria-hidden="true" /></span><span className="stat-label">{label}</span><strong className="stat-value">{count ?? '—'}</strong><small>{note} <ArrowRight size={14} aria-hidden="true" /></small></Link>)}</section>}
        <details className="admin-more-details"><summary>Ver gráficos y estudiantes recientes</summary><div className="admin-chart-grid">
            <section className="glass-panel chart-panel"><div className="section-heading"><div><span className="eyebrow">CONTENIDO EDUCATIVO</span><h2>El campus en cifras</h2></div><ChartNoAxesCombined size={22} className="text-muted" aria-hidden="true" /></div><p className="text-muted">Contenido publicado y disponible en el panel del estudiante.</p>{!summary.data ? <p className="soft-note">Esperando los indicadores del campus.</p> : <div className="bar-chart" role="img" aria-label={`${contents} lecciones y ${exercises} ejercicios`}>
                {[['Lecciones', contents, 'primary'], ['Ejercicios', exercises, 'secondary']].map(([label, value, tone]) => <div className="bar-row" key={label}><span>{label}</span><div className="bar-track"><div className={`bar-fill ${tone}`} style={{ width: `${Number(value) / Math.max(contents, exercises, 1) * 100}%` }} /></div><strong>{value}</strong></div>)}
            </div>}<div className="chart-legend"><span><i className="legend-dot primary" /> Lecciones</span><span><i className="legend-dot secondary" /> Ejercicios</span></div></section>
            <section className="glass-panel chart-panel"><span className="eyebrow">COMPOSICIÓN DEL CAMPUS</span><h2>Recursos para aprender</h2><div className="donut-layout"><svg viewBox="0 0 120 120" className="donut-chart" role="img" aria-label={`${total} recursos: ${share}% lecciones, ${total ? 100 - share : 0}% ejercicios`}><circle cx="60" cy="60" r="46" className="donut-track" />{total > 0 && <><circle cx="60" cy="60" r="46" pathLength="100" className="donut-secondary" /><circle cx="60" cy="60" r="46" pathLength="100" className="donut-primary" strokeDasharray={`${share} ${100 - share}`} transform="rotate(-90 60 60)" /></>}<text x="60" y="59" textAnchor="middle" className="donut-number">{summary.data ? total : '—'}</text><text x="60" y="75" textAnchor="middle" className="donut-label">recursos</text></svg><div className="donut-details"><p><i className="legend-dot primary" /><strong>{contents}</strong> Lecciones</p><p><i className="legend-dot secondary" /><strong>{exercises}</strong> Ejercicios</p></div></div></section>
        </div>
        <div className="dashboard-columns"><section className="glass-panel student-preview"><div className="section-heading"><div><span className="eyebrow">COMUNIDAD YACHAY</span><h2>Estudiantes del campus</h2></div><Link href="/admin/estudiantes" className="text-link">Ver todos <ArrowRight size={16} /></Link></div>{students.loading ? <LoadingState /> : students.error ? <ErrorState message={students.error} /> : !students.data?.data.length ? <EmptyState title="Tu comunidad empieza aquí" description="Las nuevas cuentas aparecerán cuando se registren." /> : <div className="table-scroll"><table className="dashboard-table"><caption className="sr-only">Primera página de estudiantes registrados</caption><thead><tr><th>Estudiante</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{students.data.data.slice(0, 5).map(student => <tr key={student.id}><td><div className="table-person"><span className="user-avatar" aria-hidden="true">{student.name.slice(0, 1).toUpperCase()}</span><span><strong>{student.name}</strong><small>{student.email}</small></span></div></td><td><span className={`badge ${student.state === 'activo' ? 'success' : 'neutral'}`}>{student.state === 'activo' ? '✓ Activo' : 'Bloqueado'}</span></td><td><Link href={`/admin/estudiantes?q=${encodeURIComponent(student.email)}`} className="glass-icon-button" aria-label={`Ver a ${student.name}`}><ArrowRight size={17} /></Link></td></tr>)}</tbody></table></div>}</section>
        <aside className="glass-panel achievement-panel"><h2>Sobre estos datos</h2><p className="text-muted">Los indicadores cuentan el contenido visible para los estudiantes. Los borradores se gestionan dentro de cada unidad.</p></aside></div></details>
    </AppLayout>;
}
