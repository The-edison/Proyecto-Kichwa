import { useState } from 'react';
import { ArrowRight, BookOpen, Check, ChevronRight, ClipboardCheck, Sparkles } from 'lucide-react';
import { Head, Link } from '../../navigation';
import { AppLayout } from '../../layouts/AppLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { Pagination } from '../../components/Pagination';
import { LearningProgress, LearningProgressRing, progressValue } from '../../components/LearningProgress';
import { useApi } from '../../hooks/useApi';
import type { LearningModule, Paginated, Evaluation, ProgressSummary } from '../../types';
import indigenousLanguagesImage from '../../../images/indigenous-languages.jpg';
import culturalDiversityImage from '../../../images/cultural-diversity.jpg';

export default function Level({ level }: { level: { id: number; name: string; code: string } }) {
    const [page, setPage] = useState(1);
    const [diagnosticPage, setDiagnosticPage] = useState(1);
    const modules = useApi<Paginated<LearningModule>>(`/levels/${level.id}/modules?page=${page}`);
    const diagnostic = useApi<Paginated<Evaluation>>(`/levels/${level.id}/evaluations?type=diagnostica&page=${diagnosticPage}`);
    const progress = useApi<ProgressSummary[]>('/progress');
    const summary = progress.data?.find(item => item.level.id === level.id);
    const cover = level.code === 'basic'
        ? { src: indigenousLanguagesImage, alt: 'Collage de lenguas indígenas, textiles y tradiciones' }
        : level.code === 'intermediate'
        ? { src: culturalDiversityImage, alt: 'Ilustración de diversidad cultural y pueblos indígenas' }
        : null;

    return <AppLayout title={'Nivel ' + level.name} subtitle="Tu recorrido de aprendizaje, módulo a módulo.">
        <Head title={level.name} />
        <nav aria-label="Migas de pan" className="learning-breadcrumb">
            <Link href="/aprender">Mi aprendizaje</Link><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">{level.name}</span>
        </nav>
        <div className="section-heading learning-section-heading level-module-heading"><div><span className="eyebrow">EXPLORA TU CURSO</span><h2>Módulos de aprendizaje</h2><p>Elige un módulo para descubrir sus unidades y actividades.</p></div><div className="level-module-summary">{modules.data && <span className="badge neutral">{modules.data.total} {modules.data.total === 1 ? 'módulo' : 'módulos'}</span>}{summary ? <Link href="/aprender/progreso" className="level-progress-corner" aria-label={'Ver mi progreso en el nivel ' + level.name}><LearningProgressRing value={summary.percentage} label={'Progreso del nivel ' + level.name} /></Link> : progress.loading ? <span className="level-progress-status" role="status">Cargando avance…</span> : progress.error ? <span className="level-progress-status" role="status">Avance no disponible</span> : null}</div></div>
        {modules.loading ? <LoadingState /> : modules.error ? <ErrorState message={modules.error} /> : !modules.data?.data.length ?
            <EmptyState title="Todavía no hay módulos publicados" description="El administrador está preparando el contenido de este nivel." /> :
            <ol aria-label="Módulos del nivel" className="learning-module-grid">
                {modules.data.data.map((module, index) => {
                    const percentage = progressValue(module.percentage);
                    const number = module.sort_order || (page - 1) * modules.data!.per_page + index + 1;
                    const completed = percentage === 100;
                    return <li key={module.id}><Link href={'/aprender/modulo/' + module.id} className="learning-module-card glass-panel card-hover">
                        <div className={`learning-module-cover tone-${index % 2}${cover ? ' has-image' : ''}`}>
                            {cover ? <img src={cover.src} alt={cover.alt} loading="lazy" /> : <span className="learning-cover-icon" aria-hidden="true">{completed ? <Check size={40} strokeWidth={1.6} /> : index % 2 ? <Sparkles size={40} strokeWidth={1.6} /> : <BookOpen size={40} strokeWidth={1.6} />}</span>}
                            <span className="learning-cover-number" aria-hidden="true">{String(number).padStart(2, '0')}</span><span className={`badge ${completed ? 'success' : 'neutral'}`}>{completed ? '✓ Completado' : percentage > 0 ? 'En curso' : 'Por explorar'}</span>
                        </div>
                        <div className="learning-module-body"><span className="eyebrow">MÓDULO {number}</span><h3>{module.title.replace(/^Módulo\s+\d+\s*/iu, '')}</h3><p>{module.description.replace(/^Objetivo del módulo:\s*/i, '')}</p><div className="learning-module-bottom"><LearningProgress value={percentage} label="Progreso del módulo" /><span className={`learning-card-action ${percentage > 0 && !completed ? 'is-primary' : ''}`}>{completed ? 'Repasar contenidos' : percentage > 0 ? 'Continuar módulo' : 'Explorar módulo'}<ArrowRight size={18} aria-hidden="true" /></span></div></div>
                    </Link></li>;
                })}
            </ol>}
        <Pagination page={page} lastPage={modules.data?.last_page ?? 1} onChange={setPage} />
        {diagnostic.error ? <div className="mt-8"><ErrorState message={diagnostic.error} /></div> : !!diagnostic.data?.data.length && <section className="learning-diagnostics" aria-labelledby="diagnostic-heading"><div className="section-heading"><div><span className="eyebrow">CONOCE TU PUNTO DE PARTIDA</span><h2 id="diagnostic-heading">Diagnóstico general</h2></div></div>{diagnostic.data.data.map(e => <Link key={e.id} className="learning-diagnostic-card glass-panel card-hover" href={'/aprender/evaluacion/' + e.id}><span className="stat-icon tone-1"><ClipboardCheck size={23} aria-hidden="true" /></span><div><h3>{e.title}</h3><p>Explora lo que ya sabes y reconoce tus próximos pasos.</p></div><ArrowRight size={20} aria-hidden="true" /></Link>)}<Pagination page={diagnosticPage} lastPage={diagnostic.data.last_page} onChange={setDiagnosticPage} /></section>}
    </AppLayout>;
}
