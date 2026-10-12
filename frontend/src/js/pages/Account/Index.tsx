import { Head } from '../../navigation';
import { CheckCircle2, KeyRound, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { AppLayout } from '../../layouts/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { apiPost } from '../../services/api';
import { useState } from 'react';
import { PasswordChange } from '../../components/PasswordChange';

export default function Account() {
    const { user, googleEnabled, googleLoading } = useAuth();
    const [linking, setLinking] = useState(false), [linkError, setLinkError] = useState('');
    async function linkGoogle() {
        setLinking(true); setLinkError('');
        try { const result = await apiPost<{ url: string }>('/auth/google/link-prepare', {}); window.location.assign(result.url); }
        catch { setLinkError('No se pudo iniciar la vinculación con Google.'); setLinking(false); }
    }
    const search = new URLSearchParams(window.location.search);
    const status = search.get('google_status');
    const googleError = search.get('google_error');
    const role = user?.role === 'admin' ? 'Administrador' : 'Estudiante';

    return <AppLayout title="Mi cuenta" subtitle="Tu perfil, seguridad y métodos de acceso en un solo lugar.">
        <Head title="Mi cuenta" />
        {user?.debe_cambiar_contrasena && <div className="account-required-notice" role="status"><ShieldCheck size={23} aria-hidden="true" /><div><strong>Completa la configuración de tu cuenta</strong><p>Cambia tu contraseña inicial para continuar a tu espacio de aprendizaje.</p></div><a href="#account-security" className="text-link">Cambiar contraseña</a></div>}
        <section className="account-profile-hero glass-panel" aria-labelledby="account-profile-name"><div className="account-profile-avatar" aria-hidden="true">{user?.name.slice(0, 1).toUpperCase()}</div><div className="account-profile-intro"><span className="eyebrow">TU ESPACIO PERSONAL</span><h2 id="account-profile-name">{user?.name}</h2><p>{user?.email}</p><div className="account-profile-badges"><span className="badge"><UserRound size={13} aria-hidden="true" />{role}</span><span className={`badge ${user?.email_verified ? 'success' : 'catalog-draft'}`}>{user?.email_verified ? <CheckCircle2 size={13} aria-hidden="true" /> : <Mail size={13} aria-hidden="true" />}{user?.email_verified ? 'Correo verificado' : 'Correo por verificar'}</span></div></div><span className="account-profile-emblem" aria-hidden="true"><ShieldCheck size={72} strokeWidth={1.2} /></span></section>
        <nav className="account-section-navigation" aria-label="Secciones de mi cuenta"><a href="#account-details"><UserRound size={16} aria-hidden="true" />Datos del perfil</a><a href="#account-security"><KeyRound size={16} aria-hidden="true" />Seguridad</a><a href="#account-access"><ShieldCheck size={16} aria-hidden="true" />Métodos de acceso</a></nav>
        <div className="account-workspace"><div className="account-profile-column">
            <section id="account-details" tabIndex={-1} className="account-card glass-panel" aria-labelledby="account-details-heading"><div className="account-card-heading"><span className="stat-icon tone-1"><UserRound size={23} aria-hidden="true" /></span><div><span className="eyebrow">INFORMACIÓN PERSONAL</span><h2 id="account-details-heading">Datos de tu cuenta</h2></div></div><p className="account-card-description">La información asociada a tu perfil en Yachay.</p><dl className="account-details-list"><div><dt>Nombre completo</dt><dd>{user?.name}</dd></div><div><dt>Correo electrónico</dt><dd>{user?.email}</dd></div><div><dt>Cédula</dt><dd>{user?.cedula || 'No registrada'}</dd></div><div><dt>Rol en el campus</dt><dd>{role}</dd></div></dl></section>
            <section id="account-access" tabIndex={-1} className="account-card glass-panel" aria-labelledby="account-access-heading"><div className="account-card-heading"><span className="account-google-mark" aria-hidden="true">G</span><div><span className="eyebrow">MÉTODOS DE ACCESO</span><h2 id="account-access-heading">Acceso con Google</h2></div></div>
                {user?.google_connected ? <><span className="badge success account-google-status"><CheckCircle2 size={14} aria-hidden="true" />Cuenta vinculada</span><p className="account-card-description">Google está vinculado a tu cuenta. Puedes utilizarlo para iniciar sesión con este mismo correo.</p></> : googleLoading ? <p className="account-card-description" role="status">Comprobando la disponibilidad de Google…</p> : googleEnabled ? <><p className="account-card-description">Vincula Google para acceder fácilmente. Usa el mismo correo registrado en esta cuenta.</p><button type="button" className="secondary-button" disabled={linking} onClick={() => void linkGoogle()}><ShieldCheck size={17} aria-hidden="true" />{linking ? 'Conectando…' : 'Vincular Google'}</button></> : <><span className="badge neutral account-google-status">Próximamente</span><p className="account-card-description">El acceso con Google estará disponible cuando se habilite en la plataforma.</p></>}
                {status && <p className="account-success-notice" role="status"><CheckCircle2 size={17} aria-hidden="true" />{status}</p>}{googleError && <p className="auth-alert" role="alert">{googleError}</p>}{linkError && <p className="auth-alert" role="alert">{linkError}</p>}
            </section>
        </div><PasswordChange /></div>
    </AppLayout>;
}
