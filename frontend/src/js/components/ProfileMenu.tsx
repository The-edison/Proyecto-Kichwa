import { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { BookOpen, ChartNoAxesCombined, ChevronDown, House, KeyRound, Languages, LayoutDashboard, LogOut, UserRound, Users, type LucideIcon } from 'lucide-react';
import { Link } from '../navigation';
import { useAuth } from '../context/AuthContext';

export function ProfileMenu() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const menu = useRef<HTMLDetailsElement>(null);
    const admin = user?.role === 'admin';
    const close = () => { if (menu.current) menu.current.open = false; };
    const campusLinks: Array<[string, string, LucideIcon]> = admin
        ? [['/admin', 'Resumen del campus', LayoutDashboard], ['/admin/contenidos', 'Contenidos y actividades', BookOpen], ['/admin/estudiantes', 'Estudiantes', Users]]
        : [['/aprender', 'Mi aprendizaje', BookOpen], ['/aprender/progreso', 'Mi progreso', ChartNoAxesCombined], ['/aprender/diccionario', 'Diccionario', Languages]];
    return <details ref={menu} className="topbar-dropdown profile-menu" name="campus-popovers">
        <summary className="profile-trigger" aria-label="Abrir opciones de perfil" title="Mi perfil"><span className="user-avatar" aria-hidden="true">{user?.name.slice(0, 1).toUpperCase()}</span><ChevronDown size={13} aria-hidden="true" /></summary>
        <div className="dropdown-panel profile-menu-panel">
            <div className="profile-menu-identity"><span className="user-avatar" aria-hidden="true">{user?.name.slice(0, 1).toUpperCase()}</span><div><strong>{user?.name}</strong><small>{user?.email}</small><span className="badge">{admin ? 'Administrador' : 'Estudiante'}</span></div></div>
            <nav aria-label="Opciones de perfil">
                <div className="dropdown-group"><p className="dropdown-group-title">MI CUENTA</p><Link href="/cuenta" onClick={close} aria-current={location.pathname === '/cuenta' && !location.hash ? 'page' : undefined}><UserRound size={18} aria-hidden="true" /><span>Mi cuenta<small>Perfil y métodos de acceso</small></span></Link><Link href="/cuenta#account-security" onClick={close}><KeyRound size={18} aria-hidden="true" /><span>Seguridad<small>Contraseña y verificación</small></span></Link></div>
                <div className="dropdown-group"><p className="dropdown-group-title">{admin ? 'GESTIÓN DEL CAMPUS' : 'MI APRENDIZAJE'}</p>{campusLinks.map(([href, label, Icon]) => <Link key={href} href={href} onClick={close} aria-current={location.pathname === href ? 'page' : undefined}><Icon size={18} aria-hidden="true" /><span>{label}</span></Link>)}</div>
                <div className="dropdown-group"><p className="dropdown-group-title">GENERAL</p><Link href="/" onClick={close}><House size={18} aria-hidden="true" /><span>Ver inicio</span></Link></div>
            </nav>
            <div className="profile-menu-session"><button type="button" onClick={() => { close(); void logout(); }}><LogOut size={18} aria-hidden="true" />Cerrar sesión</button></div>
        </div>
    </details>;
}
