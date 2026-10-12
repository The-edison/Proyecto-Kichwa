import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

const key = 'yachay-theme';
export function ThemeToggle() {
    const [theme, setTheme] = useState(() => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const sync = () => {
            let saved: string | null = null;
            try { saved = localStorage.getItem(key); } catch { /* Storage is optional. */ }
            const next = saved === 'dark' || saved === 'light' ? saved : media.matches ? 'dark' : 'light';
            document.documentElement.dataset.theme = next;
            setTheme(next);
        };
        media.addEventListener('change', sync);
        window.addEventListener('storage', sync);
        return () => { media.removeEventListener('change', sync); window.removeEventListener('storage', sync); };
    }, []);
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
