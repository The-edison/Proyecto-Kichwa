import { AlertCircle, BookOpen } from 'lucide-react';
import type { ReactNode } from 'react';

export function LoadingState({ label = 'Cargando...' }: { label?: string }) {
    return <div className="glass-panel space-y-3 p-6" role="status"><span>{label}</span><div aria-hidden className="motion-safe:animate-pulse space-y-3"><div className="h-4 w-3/4 rounded bg-emerald-100" /><div className="h-4 w-full rounded bg-emerald-50" /><div className="h-4 w-1/2 rounded bg-emerald-50" /></div></div>;
}

export function ErrorState({ message, action }: { message: string; action?: ReactNode }) {
    return <div className="glass-panel state-panel text-rose-800" role="alert"><AlertCircle size={24} /><span>{message}</span>{action}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
    return (
        <div className="glass-panel empty-panel">
            <span className="empty-icon"><BookOpen size={28} /></span>
            <h3 className="font-serif text-2xl text-ink">{title}</h3>
            <p className="max-w-md text-muted">{description}</p>
            {action}
        </div>
    );
}
