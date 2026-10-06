import { createContext, useContext, useEffect, useState, startTransition, type ReactNode } from 'react';
import { apiGet, apiPost, ApiError } from '../services/api';
import type { AuthUser } from '../types';
import { useNavigate } from 'react-router-dom';
import { queryClient } from '../services/queryClient';

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

    useEffect(() => {
        apiGet<{ google: { enabled: boolean } }>('/config').then((config) => setGoogleEnabled(config.google.enabled)).catch(() => {});
        apiGet<ApiUser>('/auth/me')
            .then((current) => setUser(toAuthUser(current)))
            .catch((error: unknown) => { if (!(error instanceof ApiError && error.status === 401)) console.error(error); })
            .finally(() => setLoading(false));
    }, []);

    async function login(identifier: string, password: string) {
        const response = await apiPost<{ user: ApiUser }>('/auth/login', { identifier, password });
        const authenticated = toAuthUser(response.user);
        queryClient.clear();
        setUser(authenticated);
        navigate(authenticated.debe_cambiar_contrasena ? '/cuenta' : authenticated.role === 'admin' ? '/admin' : '/aprender');
    }

    async function register(data: Record<string, string>) {
        const response = await apiPost<{ user: ApiUser }>('/auth/register', data);
        queryClient.clear();
        setUser(toAuthUser(response.user));
        navigate('/aprender');
    }

    async function logout() {
        await apiPost<void>('/auth/logout', {});
        queryClient.clear();
        startTransition(() => { setUser(null); navigate('/'); });
    }

    async function refreshUser() { setUser(toAuthUser(await apiGet<ApiUser>("/auth/me"))); }
    return (
        <AuthContext.Provider value={{ user, loading, googleEnabled, login, register, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthValue {
    const value = useContext(AuthContext);
    if (!value) throw new Error('AuthProvider no está disponible.');
    return value;
}
