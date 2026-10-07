import { useLocation } from 'react-router-dom';
import { Link } from '../navigation';
import {
    BookOpen,
    ChartNoAxesCombined,
    ChevronLeft,
    ChevronRight,
    House,
    Languages,
    LayoutDashboard,
    LogOut,
    Menu,
    UserRound,
    Users,
    X,
    type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Brand } from '../components/Brand';
import { useAuth } from '../context/AuthContext';

const storageKey = 'yachay-sidebar-collapsed';

function initialCollapsed(): boolean {
    try {
        return typeof window === 'undefined' || window.localStorage.getItem(storageKey) !== 'false';
    } catch {
        return true;
    }
}

function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(initialCollapsed);
    const admin = user?.role === 'admin';
    const links: Array<[string, string, LucideIcon]> = admin
        ? [
            ['/admin', 'Resumen', LayoutDashboard],
            ['/admin/estudiantes', 'Estudiantes', Users],
            ['/admin/contenidos', 'Contenidos y actividades', BookOpen],
            ['/cuenta', 'Mi cuenta', UserRound],
        ]
        : [
            ['/aprender', 'Mi aprendizaje', House],
            ['/aprender/progreso', 'Mi progreso', ChartNoAxesCombined],
            ['/cuenta', 'Mi cuenta', UserRound],
            ['/aprender/diccionario', 'Diccionario', Languages],
        ];

    useEffect(() => {
        try {
            window.localStorage.setItem(storageKey, String(collapsed));
        } catch {
            // El menú sigue funcionando si el navegador bloquea el almacenamiento local.
        }
    }, [collapsed]);

    return (
        <div className={`app-shell ${collapsed ? 'is-collapsed' : ''}`}>
            <div className="aurora aurora-one" />
            <div className="aurora aurora-two" />
            {mobileOpen && <button className="sidebar-scrim" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />}

            <aside className={`app-sidebar glass-panel ${mobileOpen ? 'is-open' : ''}`} aria-label="Menú lateral">
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
                <span className="sidebar-caption">{admin ? 'ADMINISTRACIÓN' : 'TU ESPACIO'}</span>
                <nav aria-label="Navegación de la aplicación">
                    {links.map(([href, label, Icon]) => (
                        <Link
                            key={href}
                            href={href}
                            className={`sidebar-link ${location.pathname === href ? 'is-active' : ''}`}
                            aria-label={label}
                            aria-current={location.pathname === href ? 'page' : undefined}
                            title={collapsed ? label : undefined}
                            onClick={() => setMobileOpen(false)}
                        >
                            <Icon size={19} aria-hidden="true" />
                            <span className="sidebar-link-label">{label}</span>
                        </Link>
                    ))}
                </nav>
                <div className="sidebar-bottom">
                    <div className="user-avatar" aria-hidden="true">{user?.name.slice(0, 1).toUpperCase()}</div>
                    <div className="user-meta"><strong>{user?.name}</strong><small>{admin ? 'Administrador' : 'Estudiante'}</small></div>
                    <button className="glass-icon-button" type="button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={logout}><LogOut size={19} /></button>
                </div>
            </aside>

            <div className="app-main">
                <header className="app-topbar">
                    <button className="menu-button" type="button" aria-label="Abrir menú" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu /></button>
                    <div><span className="eyebrow">YACHAY · KICHWA VIVO</span><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
                    <Link href="/" className="topbar-home">Ver inicio ↗</Link>
                </header>
                <main className="app-content">{children}</main>
            </div>
        </div>
    );
}

export function AppLayout(props: { title: string; subtitle?: string; children: ReactNode }) {
    return <Shell {...props} />;
}
