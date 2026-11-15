import { useState } from 'react';
import { CalendarDays, CheckCircle2, ClipboardCheck, Users } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { ErrorState, LoadingState } from './States';

interface UsageMonth {
    month: string;
    active_students: number;
    exercise_answers: number;
    completed_tests: number;
    active_days: number;
}
interface MonthlyUsageData { current_month: string; timezone: string; months: UsageMonth[]; }
const monthLabel = (month: string, short = false) => new Date(`${month}-01T12:00:00Z`).toLocaleDateString('es-EC', { month: short ? 'short' : 'long', year: 'numeric', timeZone: 'UTC' });
const countLabel = (count: number) => count.toLocaleString('es-EC');

export function MonthlyUsage({ groupFilter = '', groupName = '' }: { groupFilter?: string; groupName?: string } = {}) {
    const { data, loading, error, refresh } = useApi<MonthlyUsageData>(`/admin/usage-monthly${groupFilter ? `?grupo_id=${encodeURIComponent(groupFilter)}` : ''}`);
    const [selectedMonth, setSelectedMonth] = useState('');
    const selected = data?.months.find(month => month.month === (selectedMonth || data.current_month)) ?? data?.months.at(-1);
    const maximum = Math.max(1, ...(data?.months.map(month => month.exercise_answers) ?? []));

    return <section className="glass-panel monthly-usage" aria-labelledby="monthly-usage-heading">
        <header className="section-heading"><div><span className="eyebrow">ACTIVIDAD DE APRENDIZAJE</span><h2 id="monthly-usage-heading">Uso mensual de la plataforma</h2><p className="text-muted">{groupName ? `Participación de ${groupName} en los últimos seis meses.` : 'Consulta la participación de tus estudiantes en los últimos seis meses.'}</p></div>
            {data && !loading && !error && <label className="monthly-usage-filter"><span>Mes del resumen</span><select className="field" value={selected?.month ?? ''} onChange={event => setSelectedMonth(event.target.value)}>{[...data.months].reverse().map(month => <option key={month.month} value={month.month}>{monthLabel(month.month)}{month.month === data.current_month ? ' · en curso' : ''}</option>)}</select></label>}
        </header>
        {loading ? <LoadingState label="Cargando el uso mensual…" /> : error ? <><ErrorState message={error} /><button type="button" className="secondary-button" onClick={() => void refresh()}>Volver a intentar</button></> : selected && data ? <>
            <div className="monthly-usage-summary" aria-live="polite" aria-atomic="true">
                <p className="monthly-usage-period">{monthLabel(selected.month)}{selected.month === data.current_month ? ' · datos hasta hoy' : ''}</p>
                <dl className="monthly-usage-metrics">
                    <div><dt><Users size={18} aria-hidden="true" />Estudiantes que participaron</dt><dd>{countLabel(selected.active_students)}</dd></div>
                    <div><dt><CheckCircle2 size={18} aria-hidden="true" />Ejercicios respondidos</dt><dd>{countLabel(selected.exercise_answers)}</dd></div>
                    <div><dt><ClipboardCheck size={18} aria-hidden="true" />Pruebas finalizadas</dt><dd>{countLabel(selected.completed_tests)}</dd></div>
                </dl>
                <p className="monthly-usage-days"><CalendarDays size={17} aria-hidden="true" />{selected.active_days === 1 ? '1 día con actividad de aprendizaje.' : `${selected.active_days} días con actividad de aprendizaje.`}</p>
                {selected.active_days === 0 && <p className="soft-note">Todavía no hay respuestas de ejercicios ni pruebas finalizadas en este mes.</p>}
            </div>
            <div className="monthly-usage-chart" role="group" aria-label="Ejercicios respondidos por mes. Selecciona un mes para consultar su resumen.">
                <h3>Ejercicios respondidos por mes</h3>
                <div className="monthly-usage-bars">{data.months.map(month => <button type="button" key={month.month} className="monthly-usage-month" aria-pressed={month.month === selected.month} aria-label={`${monthLabel(month.month)}: ${countLabel(month.exercise_answers)} ejercicios respondidos. Ver resumen.`} onClick={() => setSelectedMonth(month.month)}>
                    <strong>{countLabel(month.exercise_answers)}</strong><span className="monthly-usage-track" aria-hidden="true"><span style={{ height: `${month.exercise_answers / maximum * 100}%` }} /></span><span className="monthly-usage-label">{monthLabel(month.month, true)}</span>
                </button>)}</div>
            </div>
            <p className="monthly-usage-note">Cada respuesta cuenta como un ejercicio respondido, incluidos los reintentos. Cada estudiante se cuenta una sola vez por mes. Fechas según la hora de Ecuador continental.{groupFilter && ' La actividad se agrupa según el grupo actual de cada estudiante.'}</p>
        </> : <p className="soft-note">El resumen mensual todavía no está disponible.</p>}
    </section>;
}
