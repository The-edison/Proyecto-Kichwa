import { useLocation } from 'react-router-dom';
import { Link } from '../navigation';
import { CircleHelp, Menu, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Brand } from '../components/Brand';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../context/AuthContext';
import '../../css/auth-compact.css';

function Shell({ children }: { children: ReactNode }) {
    const location = useLocation();
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const sessionHref = user?.debe_cambiar_contrasena ? '/cuenta' : user?.role === 'admin' ? '/admin' : '/aprender';
    const compactAuth = location.pathname === '/iniciar-sesion' || location.pathname === '/registro';
    const activeKey = location.pathname === '/'
        ? location.hash === '#cultura' ? 'cultura' : null
        : location.pathname === '/diccionario' ? 'diccionario'
        : location.pathname === '/iniciar-sesion' ? 'iniciar-sesion'
        : location.pathname === '/registro' ? 'registro'
        : null;
    const links = [
        { key: 'cultura', href: '/#cultura', label: 'Nuestra cultura' },
        { key: 'diccionario', href: '/diccionario', label: 'Diccionario' },
        { key: 'iniciar-sesion', href: user ? sessionHref : '/iniciar-sesion', label: user ? 'Continuar' : 'Iniciar sesión' },
    ];
    const footerLinks = [
        { href: '/informacion/terminos', label: 'Términos de uso' },
        { href: '/informacion/privacidad', label: 'Aviso de privacidad' },
        { href: '/informacion/accesibilidad', label: 'Accesibilidad' },
        { href: '/informacion/enfoque', label: 'Nuestro enfoque' },
        { href: '/informacion/preguntas', label: 'Preguntas frecuentes' },
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
                <nav className="public-footer-links" aria-label="Información del sitio">
                    {footerLinks.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}
                </nav>
                <div className="public-footer-meta">
                    <span>Yachay · Universidad Estatal de Bolívar</span>
                    <Link href="/informacion/ayuda" className="public-footer-help"><CircleHelp size={17} aria-hidden="true" />Ayuda</Link>
                </div>
            </footer>
        </div>
    );
}

export function PublicLayout({ children }: { children: ReactNode }) {
    return <Shell>{children}</Shell>;
}
