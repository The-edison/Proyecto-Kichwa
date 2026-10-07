import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { apiGet, apiPost, ApiError } from '../services/api';
import type { AuthUser } from '../types';
import { useNavigate } from 'react-router-dom';
import { queryClient } from '../services/queryClient';
import { clearTabSession, tabSessionToken } from '../services/tabSession';

interface ApiUser extends Omit<AuthUser, 'role'> {
    role: { code: AuthUser['role'] };
}

function toAuthUser(user: ApiUser): AuthUser {
    return { id: user.id, name: user.name, email: user.email, cedula: user.cedula,
        role: user.role.code, google_connected: user.google_connected,
        debe_cambiar_contrasena: user.debe_cambiar_contrasena, email_verified: user.email_verified };
}

interface AuthValue {
    user: AuthUser | null;
    loading: boolean;
    googleEnabled: boolean;
    googleLoading: boolean;
    refreshUser: () => Promise<void>;
    login: (identifier: string, password: string) => Promise<void>;
    register: (data: Record<string, string>) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [googleEnabled, setGoogleEnabled] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(true);
    const sessionVersion = useRef(0);

    useEffect(() => {
        let live = true;
        const expired = () => { sessionVersion.current++; clearTabSession(); queryClient.clear(); setUser(null); };
        const revalidate = () => {
            if (document.visibilityState !== 'visible') return;
            const version = sessionVersion.current;
            void tabSessionToken().then(token => {
                if (token) return apiGet<ApiUser>('/auth/me').then(current => { if (live && version === sessionVersion.current) setUser(toAuthUser(current)); });
            }).catch(error => { if (error instanceof ApiError && error.status === 401) expired(); });
        };
        const catalogChanged = (event: StorageEvent) => {
            if (event.key === 'yachay:catalog-changed') void queryClient.invalidateQueries({ queryKey: ['api'] });
        };
        window.addEventListener('yachay:session-expired', expired);
        window.addEventListener('storage', catalogChanged);
        window.addEventListener('pageshow', revalidate);
        document.addEventListener('visibilitychange', revalidate);
        apiGet<{ google: { enabled: boolean } }>('/config').then((config) => setGoogleEnabled(config.google.enabled)).catch(() => {}).finally(() => setGoogleLoading(false));
        const version = sessionVersion.current;
        tabSessionToken().then(token => token ? apiGet<ApiUser>('/auth/me') : null)
            .then((current) => { if (live && current && version === sessionVersion.current) setUser(toAuthUser(current)); })
            .catch((error: unknown) => { if (!(error instanceof ApiError && error.status === 401)) console.error(error); })
            .finally(() => setLoading(false));
        return () => {
            live = false;
            window.removeEventListener('yachay:session-expired', expired);
            window.removeEventListener('storage', catalogChanged);
            window.removeEventListener('pageshow', revalidate);
            document.removeEventListener('visibilitychange', revalidate);
        };
    }, []);

    useEffect(() => {
        if (!user) return;
        let timer: ReturnType<typeof setTimeout>;
        const reset = () => { clearTimeout(timer); timer = setTimeout(() => { void logout().catch(() => {}); }, 30 * 60 * 1000); };
        const activity = ['pointerdown', 'keydown', 'scroll'];
        activity.forEach(event => window.addEventListener(event, reset, { passive: true }));
        reset();
        return () => { clearTimeout(timer); activity.forEach(event => window.removeEventListener(event, reset)); };
    }, [user?.id]);

    async function login(identifier: string, password: string) {
        const response = await apiPost<{ user: ApiUser }>('/auth/login', { identifier, password });
        const authenticated = toAuthUser(response.user);
        sessionVersion.current++;
        queryClient.clear();
        setUser(authenticated);
        navigate(authenticated.debe_cambiar_contrasena ? '/cuenta' : authenticated.role === 'admin' ? '/admin' : '/aprender');
    }

    async function register(data: Record<string, string>) {
        const response = await apiPost<{ user: ApiUser }>('/auth/register', data);
        sessionVersion.current++;
        queryClient.clear();
        setUser(toAuthUser(response.user));
        navigate('/aprender');
    }

    async function logout() {
        try { await apiPost<void>('/auth/logout', {}); }
        finally { sessionVersion.current++; clearTabSession(); queryClient.clear(); setUser(null); navigate('/'); }
    }

    async function refreshUser() { setUser(toAuthUser(await apiGet<ApiUser>("/auth/me"))); }
    return (
        <AuthContext.Provider value={{ user, loading, googleEnabled, googleLoading, login, register, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthValue {
    const value = useContext(AuthContext);
    if (!value) throw new Error('AuthProvider no está disponible.');
    return value;
}
