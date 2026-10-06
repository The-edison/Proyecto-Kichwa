import { createContext, useContext, useState, useRef, useEffect, type ReactNode } from 'react';
const ToastContext = createContext<(message: string, error?: boolean) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
    const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => () => clearTimeout(timer.current), []);
    function show(message: string, error = false) { clearTimeout(timer.current); setNotice({ message, error }); timer.current = setTimeout(() => setNotice(null), 6000); }
    return <ToastContext.Provider value={show}>{children}{notice && <div role={notice.error ? 'alert' : 'status'} className={`fixed bottom-5 left-4 right-4 z-50 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-xl border bg-white p-4 shadow-xl ${notice.error ? 'border-rose-300 text-rose-900' : 'border-emerald-300 text-forest'}`}>
        <span>{notice.message}</span><button type="button" className="min-h-11 min-w-11" aria-label="Cerrar notificación" onClick={() => setNotice(null)}>×</button></div>}</ToastContext.Provider>;
}
export const useToast = () => useContext(ToastContext);
