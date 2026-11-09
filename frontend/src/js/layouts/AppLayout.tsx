import { UserAvatar } from '../components/UserAvatar';
import { useLocation, useNavigate } from 'react-router-dom';
import { Link } from '../navigation';
import {
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Languages,
    LayoutDashboard,
    LogOut,
    Menu,
    Users,
    X,
    Search,
    type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Brand } from '../components/Brand';
import { ThemeToggle } from '../components/ThemeToggle';
import { ProfileMenu } from '../components/ProfileMenu';
import { StudentOpinionMenu } from '../components/StudentOpinionMenu';
import { StudentLearningNav } from '../components/StudentLearningNav';
import { StudentOverviewNav } from '../components/StudentOverviewNav';
import { useAuth } from '../context/AuthContext';

const storageKey = 'yachay-sidebar-collapsed';

function initialCollapsed(): boolean {
    try {
        return typeof window !== 'undefined' && window.localStorage.getItem(storageKey) === 'true';
    } catch {
        return false;
    }
}

function Shell({ title, subtitle, children, immersive = false }: { title: string; subtitle?: string; children: ReactNode; immersive?: boolean }) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const sidebar = useRef<HTMLElement>(null);
    const menu = useRef<HTMLButtonElement>(null);
    const [search, setSearch] = useState('');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(initialCollapsed);
    const admin = user?.role === 'admin';
    useEffect(() => {
        document.querySelectorAll<HTMLDetailsElement>('.topbar-dropdown[open]').forEach(item => { item.open = false; });
    }, [location.pathname, location.search, location.hash]);
    useEffect(() => {
        const close = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            document.querySelectorAll<HTMLDetailsElement>('.topbar-dropdown[open]').forEach(item => {
                item.open = false;
                if (item.contains(document.activeElement)) item.querySelector<HTMLElement>('summary')?.focus();
            });
        };
        const outside = (event: MouseEvent) => document.querySelectorAll<HTMLDetailsElement>('.topbar-dropdown[open]').forEach(item => {
            if (!item.contains(event.target as Node)) item.open = false;
        });
        document.addEventListener('keydown', close);
        document.addEventListener('click', outside);
        return () => { document.removeEventListener('keydown', close); document.removeEventListener('click', outside); };
    }, []);
    useEffect(() => {
        if (!mobileOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        sidebar.current?.querySelector<HTMLButtonElement>('.sidebar-close')?.focus();
        function keyboard(event: KeyboardEvent) {
            if (event.key === 'Escape') setMobileOpen(false);
            if (event.key !== 'Tab') return;
            const items = Array.from(sidebar.current?.querySelectorAll<HTMLElement>('a, button') ?? []).filter(item => item.getClientRects().length);
            const first = items[0], last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
        document.addEventListener('keydown', keyboard);
        return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', keyboard); menu.current?.focus(); };
    }, [mobileOpen]);
    useEffect(() => {
        const media = window.matchMedia('(min-width: 901px)');
        const close = () => { if (media.matches) setMobileOpen(false); };
        media.addEventListener('change', close);
        return () => media.removeEventListener('change', close);
    }, []);
    const links: Array<[string, string, LucideIcon]> = admin
        ? [
            ['/admin', 'Resumen', LayoutDashboard],
            ['/admin/contenidos', 'Contenidos y actividades', BookOpen],
            ['/admin/diccionario', 'Diccionario', Languages],
            ['/admin/estudiantes', 'Estudiantes', Users],
        ]
        : [
            ['/aprender/diccionario', 'Diccionario', Languages],
        ];
    const isActive = (href: string) => location.pathname === href
        || (!['/admin', '/aprender'].includes(href) && location.pathname.startsWith(href + '/'));
    const navigationGroups = admin
        ? [{ label: 'GESTIÓN DEL CAMPUS', links }]
        : [{ label: 'APRENDIZAJE', links: [] }, { label: 'RECURSOS', links }];

    useEffect(() => {
        try {
            window.localStorage.setItem(storageKey, String(collapsed));
        } catch {
            // El menú sigue funcionando si el navegador bloquea el almacenamiento local.
        }
    }, [collapsed]);

    return (
        <div className={`app-shell ${collapsed ? 'is-collapsed' : ''} ${immersive ? 'is-learning' : ''}`}>
            <div className="aurora aurora-one" />
            <div className="aurora aurora-two" />
            {mobileOpen && <button className="sidebar-scrim" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />}

            <aside ref={sidebar} id="campus-navigation" className={`app-sidebar glass-panel ${mobileOpen ? 'is-open' : ''}`} aria-label="Menú lateral">
                <div className="sidebar-top">
                    <Brand />
                    <button
                        className="glass-icon-button sidebar-toggle"
                        type="button"
                        aria-label={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
                        aria-expanded={!collapsed}
                        title={collapsed ? 'Expandir menú' : 'Contraer menú'}
                        onClick={() => setCollapsed((value) => !value)}
                    >
                        {collapsed ? <ChevronRight size={19} /> : <ChevronLeft size={19} />}
                    </button>
                    <button className="menu-button sidebar-close" type="button" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)}><X /></button>
                </div>
                <nav aria-label="Navegación de la aplicación">
                    {navigationGroups.map(group => <section className="sidebar-nav-group" aria-label={group.label} key={group.label}><span className="sidebar-caption">{group.label}</span>{group.links.map(([href, label, Icon]) => (
                        <Link
                            key={href}
                            href={href}
                            className={`sidebar-link ${isActive(href) ? 'is-active' : ''}`}
                            aria-label={label}
                            aria-current={isActive(href) ? 'page' : undefined}
                            title={collapsed ? label : undefined}
                            onClick={() => setMobileOpen(false)}
                        >
                            <Icon size={19} aria-hidden="true" />
                            <span className="sidebar-link-label">{label}</span>
                        </Link>
                    ))}{!admin && group.label === 'APRENDIZAJE' && <><StudentOverviewNav onExpand={() => setCollapsed(false)} onNavigate={() => setMobileOpen(false)} /><StudentLearningNav onExpand={() => setCollapsed(false)} onNavigate={() => setMobileOpen(false)} /></>}</section>)}
                </nav>
                <div className="sidebar-bottom">
                    <UserAvatar name={user?.name} avatar={user?.avatar} />
                    <div className="user-meta"><strong>{user?.name}</strong><small>{admin ? 'Administrador' : 'Estudiante'}</small></div>
                    <button className="glass-icon-button" type="button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={logout}><LogOut size={19} /></button>
                </div>
            </aside>

            <div className="app-main" inert={mobileOpen || undefined}>
                <a href="#main-content" className="skip-link">Saltar al contenido</a>
                <header className="app-topbar">
                    <button ref={menu} className="menu-button" type="button" aria-label="Abrir menú" aria-controls="campus-navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu /></button>
                    <div><span className="eyebrow">YACHAY · KICHWA</span><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
                    <div className="topbar-tools">
                        <form className="topbar-search" role="search" onSubmit={event => { event.preventDefault(); if (search.trim()) navigate(admin ? `/admin/estudiantes?q=${encodeURIComponent(search.trim())}` : `/aprender/diccionario?q=${encodeURIComponent(search.trim())}`); }}>
                            <Search size={18} aria-hidden="true" /><input aria-label={admin ? 'Buscar estudiantes' : 'Buscar en el diccionario'} placeholder={admin ? 'Buscar estudiante…' : 'Buscar una palabra…'} value={search} onChange={event => setSearch(event.target.value)} /><button type="submit" aria-label="Buscar"><Search size={16} /></button>
                        </form>
                        <ThemeToggle scope={user?.role ?? 'public'} />
                        {user?.role === 'student' && <StudentOpinionMenu />}
                        <ProfileMenu />
                    </div>
                </header>
                <main id="main-content" tabIndex={-1} className="app-content">{children}</main>
            </div>
        </div>
    );
}

export function AppLayout(props: { title: string; subtitle?: string; children: ReactNode; immersive?: boolean }) {
    return <Shell {...props} />;
}
