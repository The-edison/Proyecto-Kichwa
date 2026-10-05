import { router, usePage } from '@inertiajs/react';
import { createContext, useContext, type ReactNode } from 'react';
import type { AuthUser, SharedProps } from '../types';

interface AuthValue {
    user: AuthUser | null;
    logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { auth } = usePage().props as unknown as SharedProps;
    return (
        <AuthContext.Provider value={{
            user: auth?.user ?? null,
            logout: () => router.post('/cerrar-sesion'),
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthValue {
    const value = useContext(AuthContext);
    if (!value) throw new Error('AuthProvider no está disponible.');
    return value;
}
