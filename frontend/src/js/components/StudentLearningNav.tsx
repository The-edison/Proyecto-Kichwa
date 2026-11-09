import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BookOpen, ChevronDown, GraduationCap, LockKeyhole } from 'lucide-react';
import { Link } from '../navigation';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { showModuleLock } from '../services/moduleAccess';
import type { ModuleLock } from '../types';
import '../../css/student-learning-nav.css';

type NavigationUnit = { id: number; title: string };
type NavigationModule = { id: number; title: string; units: NavigationUnit[]; unlocked?: boolean; lock?: ModuleLock | null };
type NavigationLevel = { id: number; name: string; available: boolean; modules: NavigationModule[] };

export function StudentLearningNav({ onExpand, onNavigate }: { onExpand: () => void; onNavigate: () => void }) {
    const { user } = useAuth();
    const { pathname } = useLocation();
    const catalog = useApi<NavigationLevel[]>('/learning-navigation');
    const storageKey = `yachay-learning-navigation:${user?.id}`;
    const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
        try {
            const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? '{}');
            return saved && typeof saved === 'object' && !Array.isArray(saved)
                ? Object.fromEntries(Object.entries(saved).filter(([, value]) => typeof value === 'boolean')) : {};
        } catch { return {}; }
    });
    const currentLevel = catalog.data?.find(level => pathname === `/aprender/nivel/${level.id}` || level.modules.some(module => pathname === `/aprender/modulo/${module.id}` || module.units.some(unit => pathname === `/aprender/unidad/${unit.id}`)));
    const currentModule = currentLevel?.modules.find(module => pathname === `/aprender/modulo/${module.id}` || module.units.some(unit => pathname === `/aprender/unidad/${unit.id}`));

    useEffect(() => {
        setExpanded(previous => ({ ...previous, ...(currentLevel ? { [`level:${currentLevel.id}`]: true } : {}), ...(currentModule ? { [`module:${currentModule.id}`]: true } : {}) }));
    }, [pathname, currentLevel?.id, currentModule?.id]);
    useEffect(() => {
        try { sessionStorage.setItem(storageKey, JSON.stringify(expanded)); } catch { /* Navigation also works without storage. */ }
    }, [expanded, storageKey]);

    const toggle = (key: string, fallback: boolean) => {
        onExpand();
        setExpanded(previous => ({ ...previous, [key]: !(previous[key] ?? fallback) }));
    };
    const destination = (href: string, label: string, className = '', position?: number) => <Link href={href} title={label} className={`learning-nav-link ${className} ${pathname === href ? 'is-active' : ''}`} aria-label={position !== undefined ? `Unidad ${position + 1}: ${label}` : undefined} aria-current={pathname === href ? 'page' : undefined} onClick={onNavigate}>
        {position !== undefined ? <><span className="learning-nav-unit-number" aria-hidden="true">{String(position + 1).padStart(2, '0')}</span><span className="learning-nav-unit-title">{label}</span></> : <><span>{label}</span><ChevronDown size={13} aria-hidden="true" /></>}
    </Link>;

    return <section className="sidebar-nav-group student-learning-nav" aria-label="Niveles de aprendizaje">
        <span className="sidebar-caption">NIVELES</span>
        {catalog.loading && <span className="learning-nav-message" role="status">Cargando niveles…</span>}
        {catalog.error && <div className="learning-nav-message" role="alert">No se pudieron cargar los niveles.<button type="button" onClick={() => catalog.refresh()}>Reintentar</button></div>}
        {catalog.data?.map(level => {
            const open = expanded[`level:${level.id}`] ?? currentLevel?.id === level.id;
            return <div className={`learning-nav-level ${open && level.available ? 'is-expanded' : ''}`} key={level.id}>
                <button className={`learning-nav-toggle learning-nav-level-toggle ${currentLevel?.id === level.id ? 'is-current' : ''}`} type="button" aria-label={`Nivel ${level.name}`} aria-expanded={open} aria-controls={`learning-level-${level.id}`} title={level.name} disabled={!level.available} onClick={() => toggle(`level:${level.id}`, currentLevel?.id === level.id)}>
                    <GraduationCap size={20} aria-hidden="true"/><span className="learning-nav-label">{level.name}{!level.available && <small>Próximamente</small>}</span><ChevronDown className={`learning-nav-chevron ${open ? 'is-open' : ''}`} size={15} aria-hidden="true"/>
                </button>
                {open && level.available && <div id={`learning-level-${level.id}`} className="learning-nav-children">
                    {destination(`/aprender/nivel/${level.id}`, 'Ver nivel', 'learning-nav-overview')}
                    {!level.modules.length && <span className="learning-nav-message">Aún no hay módulos publicados.</span>}
                    {level.modules.map((module, index) => {
                        const locked = module.unlocked === false;
                        const moduleOpen = !locked && (expanded[`module:${module.id}`] ?? currentModule?.id === module.id);
                        return <div className={`learning-nav-module ${moduleOpen ? 'is-expanded' : ''}${locked ? ' is-locked' : ''}`} key={module.id}>
                            <button className={`learning-nav-toggle learning-nav-module-toggle ${currentModule?.id === module.id ? 'is-current' : ''}`} type="button" title={module.title} aria-label={`Módulo ${index + 1}: ${module.title}${locked ? ' · Bloqueado' : ''}`} aria-expanded={moduleOpen} aria-controls={!locked ? `learning-module-${module.id}` : undefined} onClick={() => { if (locked && module.lock) { onNavigate(); showModuleLock(module.lock); } else if (!locked) toggle(`module:${module.id}`, currentModule?.id === module.id); }}>
                                {locked ? <LockKeyhole size={16} aria-hidden="true"/> : <BookOpen size={16} aria-hidden="true"/>}<span><small>Módulo {String(index + 1).padStart(2, '0')}{locked ? ' · Bloqueado' : ''}</small><span>{module.title.replace(/^M[óo]dulo\s+\d+\s*[:·.—-]?\s*/iu, '')}</span></span><ChevronDown size={13} className={`learning-nav-chevron ${moduleOpen ? 'is-open' : ''}`} aria-hidden="true"/>
                            </button>
                            {moduleOpen && <div id={`learning-module-${module.id}`} className="learning-nav-units">
                                {destination(`/aprender/modulo/${module.id}`, 'Ver módulo', 'learning-nav-overview')}
                                {module.units.map((unit, position) => <div key={unit.id}>{destination(`/aprender/unidad/${unit.id}`, unit.title, 'learning-nav-unit', position)}</div>)}
                                {!module.units.length && <span className="learning-nav-message">Aún no hay unidades publicadas.</span>}
                            </div>}
                        </div>;
                    })}
                </div>}
            </div>;
        })}
        {!catalog.loading && !catalog.error && catalog.data?.length === 0 && <span className="learning-nav-message">Aún no hay niveles publicados.</span>}
    </section>;
}
