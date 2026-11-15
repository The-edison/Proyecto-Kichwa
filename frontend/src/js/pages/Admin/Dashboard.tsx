import { Head, Link } from '../../navigation';
import { ArrowRight, BookOpen, ClipboardCheck, Users, ChartNoAxesCombined } from 'lucide-react';
import { useState } from 'react';
import { AppLayout } from '../../layouts/AppLayout';
import { ErrorState, LoadingState } from '../../components/States';
import { MonthlyUsage } from '../../components/MonthlyUsage';
import { useApi } from '../../hooks/useApi';
import type { StudentGroup } from '../../types';

export default function Dashboard() {
    const [groupFilter, setGroupFilter] = useState('');
    const groups = useApi<{ data: StudentGroup[] }>('/admin/grupos');
    const groupQuery = groupFilter ? `?grupo_id=${encodeURIComponent(groupFilter)}` : '';
    const groupName = groupFilter === 'sin_grupo' ? 'estudiantes sin grupo' : groups.data?.data.find(group => String(group.id) === groupFilter)?.nombre ?? '';
    const summary = useApi<{ students: number; contents: number; exercises: number }>(`/admin/overview${groupQuery}`);
    const cards = [
        ['Estudiantes', summary.data?.students, Users, `/admin/estudiantes${groupQuery}`, groupFilter ? 'Cuentas del grupo seleccionado' : 'Cuentas registradas'],
        ['Lecciones', summary.data?.contents, BookOpen, '/admin/contenidos', 'Lecciones publicadas para estudiantes'],
        ['Ejercicios', summary.data?.exercises, ClipboardCheck, '/admin/contenidos', 'Actividades disponibles para estudiantes'],
    ] as const;
    const contents = summary.data?.contents ?? 0, exercises = summary.data?.exercises ?? 0;
    const total = contents + exercises;
    const share = total ? Math.round(contents / total * 100) : 0;
    return <AppLayout title="Resumen del campus" subtitle="Todo lo que necesitas para acompañar el aprendizaje.">
        <Head title="Administración" />
        <div className="dashboard-intro admin-dashboard-intro"><span className="eyebrow">PANEL DE ADMINISTRACIÓN</span><div className="admin-summary-filter"><select className="field" aria-label="Seleccionar grupo del resumen" value={groupFilter} disabled={groups.loading || Boolean(groups.error)} onChange={event => setGroupFilter(event.target.value)}><option value="">Todos los estudiantes</option><option value="sin_grupo">Sin grupo</option>{groups.data?.data.map(group => <option key={group.id} value={group.id}>{group.nombre}{group.activo ? '' : ' · Inactivo'}</option>)}</select></div></div>
        {groups.error && <p className="auth-alert" role="alert">No se pudieron cargar los grupos. <button type="button" className="text-link" onClick={() => void groups.refresh()}>Reintentar</button></p>}
        {summary.loading ? <LoadingState label="Cargando indicadores del campus…" /> : summary.error ? <ErrorState message={summary.error} /> : <section className="stats-grid admin-stats" aria-label="Indicadores del campus">{cards.map(([label, count, Icon, href, note], index) => <Link href={href} className="stat-card glass-panel card-hover" key={label}><span className={`stat-icon tone-${index}`}><Icon size={22} aria-hidden="true" /></span><span className="stat-label">{label}</span><strong className="stat-value">{count ?? '—'}</strong><small>{note} <ArrowRight size={14} aria-hidden="true" /></small></Link>)}</section>}
        {!summary.loading && !summary.error && summary.data && <div className="admin-chart-grid">
            <section className="glass-panel chart-panel"><div className="section-heading"><div><span className="eyebrow">CONTENIDO EDUCATIVO</span><h2>El campus en cifras</h2></div><ChartNoAxesCombined size={22} className="text-muted" aria-hidden="true" /></div><p className="text-muted">Contenido publicado y disponible en el panel del estudiante.</p>{!summary.data ? <p className="soft-note">Esperando los indicadores del campus.</p> : <div className="bar-chart" role="img" aria-label={`${contents} lecciones y ${exercises} ejercicios`}>
                {[['Lecciones', contents, 'primary'], ['Ejercicios', exercises, 'secondary']].map(([label, value, tone]) => <div className="bar-row" key={label}><span>{label}</span><div className="bar-track"><div className={`bar-fill ${tone}`} style={{ width: `${Number(value) / Math.max(contents, exercises, 1) * 100}%` }} /></div><strong>{value}</strong></div>)}
            </div>}<div className="chart-legend"><span><i className="legend-dot primary" /> Lecciones</span><span><i className="legend-dot secondary" /> Ejercicios</span></div></section>
            <section className="glass-panel chart-panel"><span className="eyebrow">COMPOSICIÓN DEL CAMPUS</span><h2>Recursos para aprender</h2><div className="donut-layout"><svg viewBox="0 0 120 120" className="donut-chart" role="img" aria-label={`${total} recursos: ${share}% lecciones, ${total ? 100 - share : 0}% ejercicios`}><circle cx="60" cy="60" r="46" className="donut-track" />{total > 0 && <><circle cx="60" cy="60" r="46" pathLength="100" className="donut-secondary" /><circle cx="60" cy="60" r="46" pathLength="100" className="donut-primary" strokeDasharray={`${share} ${100 - share}`} transform="rotate(-90 60 60)" /></>}<text x="60" y="59" textAnchor="middle" className="donut-number">{summary.data ? total : '—'}</text><text x="60" y="75" textAnchor="middle" className="donut-label">recursos</text></svg><div className="donut-details"><p><i className="legend-dot primary" /><strong>{contents}</strong> Lecciones</p><p><i className="legend-dot secondary" /><strong>{exercises}</strong> Ejercicios</p></div></div></section>
        </div>}
        <MonthlyUsage groupFilter={groupFilter} groupName={groupName} />
    </AppLayout>;
}
