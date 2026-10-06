import { AlertCircle, BookOpen, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';

export function LoadingState({ label = 'Cargando...' }: { label?: string }) {
    return <div className="glass-panel state-panel" role="status"><LoaderCircle className="animate-spin" size={24} /><span>{label}</span></div>;
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
