import { Moon, Sun } from 'lucide-react';
import { useLayoutEffect, useState } from 'react';

type ThemeScope = 'public' | 'admin' | 'student';
export function ThemeToggle({ scope = 'public' }: { scope?: ThemeScope }) {
    // Keep the existing public preference; campus roles have separate keys.
    const key = scope === 'public' ? 'yachay-theme' : `yachay-theme:${scope}`;
    const [theme, setTheme] = useState(() => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
    useLayoutEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const sync = () => {
            let saved: string | null = null;
            try { saved = localStorage.getItem(key); } catch { /* Storage is optional. */ }
            const next = saved === 'dark' || saved === 'light' ? saved : media.matches ? 'dark' : 'light';
            document.documentElement.dataset.theme = next;
            setTheme(next);
        };
        const storageChanged = (event: StorageEvent) => {
            if (event.key === key || event.key === null) sync();
        };
        // Mi cuenta has a shared URL. Remember its role only in this tab so
        // the pre-render script can restore the right preference on reload.
        if (scope !== 'public') {
            try { sessionStorage.setItem('yachay-theme-scope', scope); } catch { /* Storage is optional. */ }
        }
        sync();
        media.addEventListener('change', sync);
        window.addEventListener('storage', storageChanged);
        return () => { media.removeEventListener('change', sync); window.removeEventListener('storage', storageChanged); };
    }, [key, scope]);
    function toggle() {
        const next = theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        setTheme(next);
        try { localStorage.setItem(key, next); } catch { /* Keep working without storage. */ }
    }
    return <button type="button" className="glass-icon-button theme-toggle" onClick={toggle}
        aria-label="Modo oscuro" aria-pressed={theme === 'dark'} title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
        {theme === 'dark' ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
    </button>;
}
