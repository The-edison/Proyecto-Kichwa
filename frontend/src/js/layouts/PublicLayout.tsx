import { Link } from '../navigation';
import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Brand } from '../components/Brand';

function Shell({ children }: { children: ReactNode }) {
    const url = window.location.pathname;
    const headerRef = useRef<HTMLElement>(null);
    const navRef = useRef<HTMLElement>(null);
    const [open, setOpen] = useState(false);
    const [hash, setHash] = useState('');
    const [hoveredKey, setHoveredKey] = useState<string | null>(null);
    const [glassPosition, setGlassPosition] = useState<{
        railLeft: number;
        railTop: number;
        railWidth: number;
        railHeight: number;
        lensLeft: number;
        lensWidth: number;
    } | null>(null);
    const path = url.split(/[?#]/, 1)[0];
    const activeKey = path === '/'
        ? hash === '#como-funciona' ? 'como-funciona' : hash === '#cultura' ? 'cultura' : null
        : path === '/glosario' ? 'glosario'
        : path === '/iniciar-sesion' ? 'iniciar-sesion'
        : path === '/registro' ? 'registro'
        : null;
    const selectedKey = hoveredKey ?? activeKey;

    useEffect(() => {
        const syncHash = () => setHash(window.location.hash);
        syncHash();
        window.addEventListener('hashchange', syncHash);
        return () => window.removeEventListener('hashchange', syncHash);
    }, [url]);

    useEffect(() => {
        const updateIndicator = () => {
            const header = headerRef.current;
            const nav = navRef.current;
            const link = selectedKey ? nav?.querySelector<HTMLElement>(`[data-nav-key="${selectedKey}"]`) : null;

            if (!header || !nav || window.innerWidth <= 1150) {
                setGlassPosition(null);
                return;
            }

            const headerBounds = header.getBoundingClientRect();
            const navBounds = nav.getBoundingClientRect();
            const linkBounds = link?.getBoundingClientRect();
            setGlassPosition({
                railLeft: navBounds.left - headerBounds.left - 12,
                railTop: navBounds.top - headerBounds.top - 8,
                railWidth: navBounds.width + 24,
                railHeight: navBounds.height + 16,
                lensLeft: linkBounds ? linkBounds.left - headerBounds.left - 8 : 0,
                lensWidth: linkBounds ? linkBounds.width + 16 : 0,
            });
        };

        updateIndicator();
        window.addEventListener('resize', updateIndicator);
        return () => window.removeEventListener('resize', updateIndicator);
    }, [selectedKey, open]);

    const glassStyle = {
        '--glass-rail-left': `${glassPosition?.railLeft ?? 0}px`,
        '--glass-rail-top': `${glassPosition?.railTop ?? 0}px`,
        '--glass-rail-width': `${glassPosition?.railWidth ?? 0}px`,
        '--glass-rail-height': `${glassPosition?.railHeight ?? 0}px`,
        '--glass-rail-opacity': glassPosition ? 1 : 0,
        '--glass-indicator-left': `${glassPosition?.lensLeft ?? 0}px`,
        '--glass-indicator-width': `${glassPosition?.lensWidth ?? 0}px`,
        '--glass-indicator-opacity': glassPosition && selectedKey ? 1 : 0,
    } as CSSProperties;
    const selectLink = (key: string) => ({
        'data-nav-key': key,
        onPointerEnter: () => setHoveredKey(key),
        onFocus: () => setHoveredKey(key),
        onBlur: () => setHoveredKey(null),
    });
    const linkClass = (key: string) => selectedKey === key ? 'is-selected' : undefined;

    return (
        <div className="page-shell">
            <div className="aurora aurora-one" />
            <div className="aurora aurora-two" />
            <header ref={headerRef} className="public-header" style={glassStyle}>
                <Brand />
                <button
                    className="menu-button"
                    type="button"
                    aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
                    aria-expanded={open}
                    aria-controls="public-navigation"
                    onClick={() => setOpen(!open)}
                >
                    {open ? <X /> : <Menu />}
                </button>
                <nav
                    id="public-navigation"
                    ref={navRef}
                    className={open ? 'public-nav is-open' : 'public-nav'}
                    aria-label="Navegación principal"
                    onPointerLeave={() => setHoveredKey(null)}
                    onClick={(event) => {
                        if (event.target instanceof Element && event.target.closest('a')) {
                            setOpen(false);
                        }
                    }}
                >
                    <a href="/#como-funciona" className={linkClass('como-funciona')} {...selectLink('como-funciona')}>Cómo funciona</a>
                    <a href="/#cultura" className={linkClass('cultura')} {...selectLink('cultura')}>Nuestra cultura</a>
                    <Link href="/glosario" className={linkClass('glosario')} {...selectLink('glosario')}>Diccionario</Link>
                    <Link href="/iniciar-sesion" className={linkClass('iniciar-sesion')} {...selectLink('iniciar-sesion')}>Iniciar sesión</Link>
                    <Link href="/registro" className={linkClass('registro')} {...selectLink('registro')}>Comenzar ahora →</Link>
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
