import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { ModuleLockNotice } from './ModuleLockNotice';
import type { ModuleLock } from '../types';

export function ModuleAccessDialog() {
    const [lock, setLock] = useState<ModuleLock | null>(null);
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const show = (event: Event) => setLock((event as CustomEvent<ModuleLock>).detail);
        window.addEventListener('yachay:module-locked', show);
        return () => window.removeEventListener('yachay:module-locked', show);
    }, []);
    useEffect(() => {
        if (!lock || !dialog.current) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        if (!dialog.current.open) dialog.current.showModal();
        return () => { document.body.style.overflow = previousOverflow; };
    }, [lock]);
    const close = () => { dialog.current?.close(); setLock(null); };
    return <dialog ref={dialog} className="module-access-dialog glass-panel" aria-label="Módulo pendiente de desbloquear" onCancel={close} onClose={() => setLock(null)} onClick={event => { if (event.target === event.currentTarget) close(); }}>
        {lock && <div className="module-access-dialog-body"><button type="button" className="glass-icon-button module-access-close" aria-label="Cerrar aviso" onClick={close}><X size={20} /></button><ModuleLockNotice lock={lock} onNavigate={close} /></div>}
    </dialog>;
}
