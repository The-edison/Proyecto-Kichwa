import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Check, ChevronRight, ClipboardCheck, PlayCircle, Sparkles, X } from 'lucide-react';
import { Head, Link } from '../../navigation';
import { AppLayout } from '../../layouts/AppLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { Pagination } from '../../components/Pagination';
import { LearningProgress, LearningProgressRing, progressValue } from '../../components/LearningProgress';
import { useApi } from '../../hooks/useApi';
import type { LearningModule, Paginated, Evaluation, ProgressSummary } from '../../types';
import indigenousLanguagesImage from '../../../images/indigenous-languages.jpg';
import culturalDiversityImage from '../../../images/cultural-diversity.jpg';

const levelVideos: Record<string, { id: string; title: string; source: string }> = {
    basic: { id: 'Ua290T-e48Q', title: 'Saludos y despedidas en kichwa', source: 'Aprendiendo Idiomas' },
    intermediate: { id: 'rA7kRku13GA', title: 'Estructura de oraciones en kichwa', source: 'Ñuka Kichwa' },
};

export default function Level({ level }: { level: { id: number; name: string; code: string } }) {
    const [page, setPage] = useState(1);
    const [diagnosticPage, setDiagnosticPage] = useState(1);
    const [videosOpen, setVideosOpen] = useState(true);
    const videosDialog = useRef<HTMLDialogElement>(null);
    const modules = useApi<Paginated<LearningModule>>(`/levels/${level.id}/modules?page=${page}`);
    const diagnostic = useApi<Paginated<Evaluation>>(`/levels/${level.id}/evaluations?type=diagnostica&page=${diagnosticPage}`);
    const progress = useApi<ProgressSummary[]>('/progress');
    const summary = progress.data?.find(item => item.level.id === level.id);
    const cover = level.code === 'basic'
        ? { src: indigenousLanguagesImage, alt: 'Collage de lenguas indígenas, textiles y tradiciones' }
        : level.code === 'intermediate'
        ? { src: culturalDiversityImage, alt: 'Ilustración de diversidad cultural y pueblos indígenas' }
        : null;
    const video = levelVideos[level.code];

    useEffect(() => { setVideosOpen(true); }, [level.code]);
    useEffect(() => {
        if (videosOpen && video && !videosDialog.current?.open) videosDialog.current?.showModal();
    }, [videosOpen, video]);

    return <AppLayout title={'Nivel ' + level.name} subtitle="Tu recorrido de aprendizaje, módulo a módulo.">
        <Head title={level.name} />
        <nav aria-label="Migas de pan" className="learning-breadcrumb">
            <Link href="/aprender">Mi aprendizaje</Link><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">{level.name}</span>
        </nav>
        {video && <section className="level-video-section" aria-labelledby="level-videos-title">
            <div className="section-heading learning-section-heading level-video-heading"><div><span className="eyebrow">MIRA Y ESCUCHA</span><h2 id="level-videos-title">Video del nivel {level.name}</h2></div><button type="button" className="secondary-button" onClick={() => setVideosOpen(true)}><PlayCircle size={18} aria-hidden="true" /> Ver video</button></div>
            {videosOpen && <dialog ref={videosDialog} className="level-video-dialog" aria-labelledby="level-videos-dialog-title" onClose={() => setVideosOpen(false)}>
                <div className="level-video-dialog-header"><div><span className="eyebrow">NIVEL {level.name.toLocaleUpperCase('es')} · {video.source}</span><h2 id="level-videos-dialog-title">{video.title}</h2></div><div className="level-video-actions"><a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer">Abrir en YouTube <ArrowRight size={15} aria-hidden="true" /></a><button type="button" className="level-video-close" onClick={() => videosDialog.current?.close()} aria-label="Cerrar video"><X size={22} aria-hidden="true" /></button></div></div>
                <div className="level-video-stage">
                    <div className="level-video-frame"><iframe
                        src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&mute=1&playsinline=1&rel=0`}
                        title={`${video.title} · ${video.source}`}
                        loading="eager"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    /></div>
                </div>
            </dialog>}
        </section>}
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
