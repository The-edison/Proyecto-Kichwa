import { useAuth } from '../context/AuthContext';
import { apiBaseUrl } from '../services/api';

export function GoogleAuthButton({ label = 'Continuar con Google' }: { label?: string }) {
    const { googleEnabled } = useAuth();

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-emerald-100" />O continúa con<span className="h-px flex-1 bg-emerald-100" /></div>
            {googleEnabled ? (
                <a href={`${apiBaseUrl}/auth/google`} className="secondary-button w-full" aria-label={label}>
                    <span className="google-mark" aria-hidden="true">G</span>{label}
                </a>
            ) : (
                <>
                    <button type="button" className="secondary-button w-full opacity-60" disabled title="El acceso con Google aún no está disponible">
                        <span className="google-mark" aria-hidden="true">G</span>{label}
                    </button>
                    <p className="text-center text-xs text-muted">Acceso con Google próximamente disponible.</p>
                </>
            )}
        </div>
    );
}
