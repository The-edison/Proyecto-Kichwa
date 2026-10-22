import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChartNoAxesCombined, ChevronDown, House } from 'lucide-react';
import { Link } from '../navigation';
import '../../css/student-learning-nav.css';

const isLearningRoute = (pathname: string) => pathname.startsWith('/aprender') || pathname === '/cuenta';

export function StudentOverviewNav({ onExpand, onNavigate }: { onExpand: () => void; onNavigate: () => void }) {
    const { pathname } = useLocation();
    const [open, setOpen] = useState(() => isLearningRoute(pathname));

    useEffect(() => {
        if (isLearningRoute(pathname)) setOpen(true);
    }, [pathname]);

    return <div className="student-overview-nav">
        <div className={`sidebar-link student-overview-row ${isLearningRoute(pathname) ? 'is-current' : ''}`}>
            <Link href="/aprender" className="student-overview-home" aria-current={pathname === '/aprender' ? 'page' : undefined} onClick={onNavigate}>
                <House size={19} aria-hidden="true" /><span className="sidebar-link-label">Mi aprendizaje</span>
            </Link>
            <button type="button" className="student-overview-toggle" aria-label={open ? 'Ocultar Mi progreso' : 'Mostrar Mi progreso'}
                aria-expanded={open} aria-controls="student-overview-children"
                onClick={() => { onExpand(); setOpen(value => !value); }}>
                <ChevronDown size={15} className={`learning-nav-chevron ${open ? 'is-open' : ''}`} aria-hidden="true" />
            </button>
        </div>
        {open && <div id="student-overview-children" className="learning-nav-children student-overview-children">
            <Link href="/aprender/progreso" className={`learning-nav-link student-overview-link ${pathname === '/aprender/progreso' ? 'is-active' : ''}`}
                aria-current={pathname === '/aprender/progreso' ? 'page' : undefined} onClick={onNavigate}>
                <ChartNoAxesCombined size={16} aria-hidden="true" /><span>Mi progreso</span>
            </Link>
        </div>}
    </div>;
}
