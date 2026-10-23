import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, LoaderCircle, Palette, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError, apiPost } from '../services/api';
import { avatarOptions, resolveAvatarId, UserAvatar } from './UserAvatar';

export function AvatarPicker() {
    const { user, refreshUser } = useAuth();
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const container = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const sending = useRef(false);
    const selectedAvatar = resolveAvatarId(user?.avatar);

    useEffect(() => {
        if (!open) return;
        const outside = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
        const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
        document.addEventListener('pointerdown', outside);
        document.addEventListener('keydown', escape);
        container.current?.querySelector<HTMLButtonElement>('.avatar-picker-options button')?.focus();
        return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
    }, [open]);

    async function save(preset: string) {
        if (sending.current || user?.role !== 'student') return;
        sending.current = true; setBusy(true); setError(''); setMessage('');
        try {
            await apiPost('/auth/avatar', { preset });
            await refreshUser();
            setMessage('Avatar actualizado.'); setOpen(false); trigger.current?.focus();
        } catch (reason) {
            setError(reason instanceof ApiError ? Object.values(reason.errors).flat().join(' ') || reason.message : reason instanceof Error ? reason.message : 'No se pudo guardar tu avatar. Inténtalo de nuevo.');
        } finally { sending.current = false; setBusy(false); }
    }

    if (user?.role !== 'student') return null;

    return <div className="avatar-picker" ref={container}>
        <button ref={trigger} type="button" className="avatar-picker-trigger" aria-label="Cambiar avatar" aria-expanded={open} aria-controls="avatar-picker-panel" disabled={busy || user?.debe_cambiar_contrasena} onClick={() => { setOpen(!open); setError(''); setMessage(''); }}>
            <UserAvatar name={user?.name} avatar={user?.avatar} className="account-profile-avatar" />
            <span className="avatar-edit-badge" aria-hidden="true"><Palette size={15} /></span>
        </button>
        {message && <span className="avatar-picker-saved" role="status">{message}</span>}
        {open && <div id="avatar-picker-panel" className="avatar-picker-panel" role="dialog" aria-labelledby="avatar-picker-title" aria-busy={busy}>
            <div className="avatar-picker-heading"><div><h3 id="avatar-picker-title">Elige tu avatar</h3><p>12 avatares para acompañarte. Elige el que más te guste.</p></div><button type="button" className="glass-icon-button" aria-label="Cerrar selector de avatares" onClick={() => { setOpen(false); trigger.current?.focus(); }}><X size={16} /></button></div>
            <div className="avatar-picker-options">{avatarOptions.map(option => <button key={option.id} type="button" title={option.label} aria-label={option.label} aria-pressed={selectedAvatar === option.id} disabled={busy} onClick={() => void save(option.id)}>
                <UserAvatar avatar={option.id} /><span>{option.label}</span>{selectedAvatar === option.id && <CheckCircle2 className="avatar-selected-mark" size={17} aria-hidden="true" />}
            </button>)}</div>
            <button type="button" className="avatar-use-initial" disabled={busy || !user?.avatar} onClick={() => void save('initial')}>Usar mi inicial</button>
            {busy && <p className="avatar-picker-status" role="status"><LoaderCircle size={15} className="animate-spin" aria-hidden="true" />Guardando avatar…</p>}
            {error && <p className="form-error" role="alert">{error}</p>}
        </div>}
    </div>;
}
