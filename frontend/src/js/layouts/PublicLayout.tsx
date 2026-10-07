import { useLocation } from 'react-router-dom';
import { Link } from '../navigation';
import { Menu, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Brand } from '../components/Brand';

function Shell({ children }: { children: ReactNode }) {
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const activeKey = location.pathname === '/'
        ? location.hash === '#como-funciona' ? 'como-funciona' : location.hash === '#cultura' ? 'cultura' : null
        : location.pathname === '/diccionario' ? 'diccionario'
        : location.pathname === '/iniciar-sesion' ? 'iniciar-sesion'
        : location.pathname === '/registro' ? 'registro'
        : null;
    const links = [
        { key: 'como-funciona', href: '/#como-funciona', label: 'Cómo funciona' },
        { key: 'cultura', href: '/#cultura', label: 'Nuestra cultura' },
        { key: 'diccionario', href: '/diccionario', label: 'Diccionario' },
        { key: 'iniciar-sesion', href: '/iniciar-sesion', label: 'Iniciar sesión', className: 'nav-login' },
        { key: 'registro', href: '/registro', label: 'Comenzar ahora →', className: 'nav-start' },
    ];

    return (
        <div className="page-shell">
            <div className="aurora aurora-one" />
            <div className="aurora aurora-two" />
            <header className="public-header">
                <Brand />
                <button className="menu-button" type="button" aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
                    aria-expanded={open} aria-controls="public-navigation" onClick={() => setOpen(!open)}>
                    {open ? <X /> : <Menu />}
                </button>
                <nav id="public-navigation" className={open ? 'public-nav is-open' : 'public-nav'} aria-label="Navegación principal">
                    {links.map(link => <Link key={link.key} href={link.href}
                        className={[link.className, activeKey === link.key ? 'is-selected' : ''].filter(Boolean).join(' ')}
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
