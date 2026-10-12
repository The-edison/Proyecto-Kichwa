import { createContext, useContext, useState, useRef, useEffect, type ReactNode } from 'react';
import { CircleCheck, CircleAlert, X } from 'lucide-react';
const ToastContext = createContext<(message: string, error?: boolean) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
    const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => () => clearTimeout(timer.current), []);
    function show(message: string, error = false) { clearTimeout(timer.current); setNotice({ message, error }); timer.current = setTimeout(() => setNotice(null), 6000); }
    return <ToastContext.Provider value={show}>{children}{notice && <div role={notice.error ? 'alert' : 'status'} className={`toast fixed bottom-5 left-4 right-4 z-50 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-xl border p-4 ${notice.error ? 'text-negative' : 'text-forest'}`}>
        {notice.error ? <CircleAlert size={22} aria-hidden="true" /> : <CircleCheck size={22} aria-hidden="true" />}<span className="flex-1">{notice.message}</span><button type="button" className="glass-icon-button" aria-label="Cerrar notificación" onClick={() => setNotice(null)}><X size={18} /></button></div>}</ToastContext.Provider>;
}
export const useToast = () => useContext(ToastContext);
