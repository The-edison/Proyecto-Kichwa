import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, LoaderCircle, Upload, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError, apiPost } from '../services/api';
import { avatarOptions, UserAvatar } from './UserAvatar';

export function AvatarPicker() {
    const { user, refreshUser } = useAuth();
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const container = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const sending = useRef(false);

    useEffect(() => {
        if (!open) return;
        const outside = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
        const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
        document.addEventListener('pointerdown', outside);
        document.addEventListener('keydown', escape);
        container.current?.querySelector<HTMLButtonElement>('.avatar-picker-options button')?.focus();
        return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
    }, [open]);

    async function save(data: FormData | { preset: string }) {
        if (sending.current) return;
        sending.current = true; setBusy(true); setError(''); setMessage('');
        try {
            await apiPost('/auth/avatar', data);
            await refreshUser();
            setMessage('Avatar actualizado.'); setOpen(false); trigger.current?.focus();
        } catch (reason) {
            setError(reason instanceof ApiError ? Object.values(reason.errors).flat().join(' ') || reason.message : 'No se pudo guardar tu avatar. Inténtalo de nuevo.');
        } finally { sending.current = false; setBusy(false); }
    }

    function upload(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setMessage('');
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Selecciona una imagen JPG, PNG o WebP.'); return; }
        if (file.size > 2 * 1024 * 1024) { setError('La imagen debe pesar como máximo 2 MB.'); return; }
        const data = new FormData(); data.append('image', file);
        void save(data);
    }

    return <div className="avatar-picker" ref={container}>
        <button ref={trigger} type="button" className="avatar-picker-trigger" aria-label="Cambiar avatar" aria-expanded={open} aria-controls="avatar-picker-panel" disabled={busy || user?.debe_cambiar_contrasena} onClick={() => { setOpen(!open); setError(''); setMessage(''); }}>
            <UserAvatar name={user?.name} avatar={user?.avatar} className="account-profile-avatar" />
            <span className="avatar-edit-badge" aria-hidden="true"><Camera size={15} /></span>
        </button>
        {message && <span className="avatar-picker-saved" role="status">{message}</span>}
        {open && <div id="avatar-picker-panel" className="avatar-picker-panel" role="dialog" aria-labelledby="avatar-picker-title" aria-busy={busy}>
            <div className="avatar-picker-heading"><div><h3 id="avatar-picker-title">Elige tu avatar</h3><p>Un toque personal para tu aprendizaje.</p></div><button type="button" className="glass-icon-button" aria-label="Cerrar selector de avatares" onClick={() => { setOpen(false); trigger.current?.focus(); }}><X size={16} /></button></div>
            <div className="avatar-picker-options">{avatarOptions.map(option => <button key={option.id} type="button" title={option.label} aria-label={option.label} aria-pressed={user?.avatar === option.id} disabled={busy} onClick={() => void save({ preset: option.id })}>
                <UserAvatar avatar={option.id} /><span>{option.label}</span>
            </button>)}</div>
            <input ref={fileInput} type="file" className="sr-only" tabIndex={-1} accept="image/jpeg,image/png,image/webp" aria-label="Selecciona una imagen de tu computadora" disabled={busy} onChange={upload} />
            <button type="button" className="secondary-button avatar-upload-button" disabled={busy} onClick={() => fileInput.current?.click()}><Upload size={16} aria-hidden="true" />Subir desde mi computadora</button>
            <p className="avatar-picker-hint">JPG, PNG o WebP · Máximo 2 MB</p>
            <button type="button" className="avatar-use-initial" disabled={busy || !user?.avatar} onClick={() => void save({ preset: 'initial' })}>Usar mi inicial</button>
            {busy && <p className="avatar-picker-status" role="status"><LoaderCircle size={15} className="animate-spin" aria-hidden="true" />Guardando avatar…</p>}
            {error && <p className="form-error" role="alert">{error}</p>}
        </div>}
    </div>;
}
