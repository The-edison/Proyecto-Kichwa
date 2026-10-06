import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiBaseUrl } from '../services/api';

export function GoogleAuthButton({ label = 'Continuar con Google', disabled = false }: { label?: string; disabled?: boolean }) {
    const { googleEnabled, googleLoading } = useAuth();
    const [redirecting, setRedirecting] = useState(false);
    const leaving = useRef(false);
    useEffect(() => {
        const reset = () => { leaving.current = false; setRedirecting(false); };
        window.addEventListener('pageshow', reset);
        return () => window.removeEventListener('pageshow', reset);
    }, []);
    const busy = disabled || redirecting;
    return <div className="space-y-3">
        <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-emerald-100" />O continúa con<span className="h-px flex-1 bg-emerald-100" /></div>
        {googleEnabled && !busy ? <a href={`${apiBaseUrl}/auth/google`} className="secondary-button w-full" aria-label={label} onClick={event => {
            if (leaving.current) { event.preventDefault(); return; }
            leaving.current = true; setRedirecting(true);
        }}><span className="google-mark" aria-hidden="true">G</span>{label}</a> :
            <button type="button" className="secondary-button w-full disabled:cursor-not-allowed disabled:opacity-60" disabled aria-busy={googleLoading || redirecting}>
                {googleLoading || redirecting ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : <span className="google-mark" aria-hidden="true">G</span>}
                {redirecting ? 'Conectando con Google…' : googleLoading ? 'Comprobando disponibilidad…' : label}
            </button>}
        {!googleLoading && !googleEnabled && <p className="text-center text-xs leading-5 text-muted">El acceso con Google no está disponible en este momento. Puedes ingresar con tu correo o crear una cuenta.</p>}
    </div>;
}
