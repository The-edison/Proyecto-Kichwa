import { useLocation } from 'react-router-dom';
import { Link } from '../navigation';
import { Menu, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Brand } from '../components/Brand';
import { ThemeToggle } from '../components/ThemeToggle';
import '../../css/auth-compact.css';

function Shell({ children }: { children: ReactNode }) {
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const compactAuth = location.pathname === '/iniciar-sesion' || location.pathname === '/registro';
    const activeKey = location.pathname === '/'
        ? location.hash === '#historias' ? 'historias' : location.hash === '#cultura' ? 'cultura' : null
        : location.pathname === '/diccionario' ? 'diccionario'
        : location.pathname === '/iniciar-sesion' ? 'iniciar-sesion'
        : location.pathname === '/registro' ? 'registro'
        : null;
    const links = [
        { key: 'historias', href: '/#historias', label: 'Historias' },
        { key: 'cultura', href: '/#cultura', label: 'Nuestra cultura' },
        { key: 'diccionario', href: '/diccionario', label: 'Diccionario' },
        { key: 'iniciar-sesion', href: '/iniciar-sesion', label: 'Iniciar sesión' },
    ];

    return (
        <div className={location.pathname === '/' ? 'page-shell home-shell' : `page-shell${compactAuth ? ' auth-shell' : ''}`}>
            <div className="aurora aurora-one" />
            <div className="aurora aurora-two" />
            <header className="public-header">
                <Brand />
                {location.pathname !== '/' && <ThemeToggle />}
                <button className="menu-button" type="button" aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
                    aria-expanded={open} aria-controls="public-navigation" onClick={() => setOpen(!open)}>
                    {open ? <X /> : <Menu />}
                </button>
                <nav id="public-navigation" className={open ? 'public-nav is-open' : 'public-nav'} aria-label="Navegación principal">
                    {links.map(link => <Link key={link.key} href={link.href}
                        className={activeKey === link.key ? 'nav-start is-selected' : 'nav-start'}
                        aria-current={activeKey === link.key ? 'location' : undefined}
                        onClick={() => setOpen(false)}>{link.label}</Link>)}
                </nav>
            </header>
            <main>{children}</main>
            <footer className="public-footer">
                <Brand />
                <p>Una experiencia de aprendizaje del Kichwa de la Sierra Centro del Ecuador.</p>
                <span>Universidad Estatal de Bolívar</span>
            </footer>
        </div>
    );
}

export function PublicLayout({ children }: { children: ReactNode }) {
    return <Shell>{children}</Shell>;
}
