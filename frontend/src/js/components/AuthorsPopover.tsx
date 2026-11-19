import { useRef, useState } from 'react';
import { GraduationCap, Heart, UsersRound, X } from 'lucide-react';
import '../../css/authors-popover.css';

const authors = [
    { name: 'Edgar Punina', initials: 'EP', username: 'EdgarPunina', href: 'https://github.com/EdgarPunina' },
    { name: 'Edison Aucatoma', initials: 'EA', username: 'The-edison', href: 'https://github.com/The-edison' },
];

export function AuthorsPopover() {
    const panel = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);

    return <div className="authors-popover">
        <button type="button" className="authors-trigger" popoverTarget="site-authors-panel"
            aria-label="Autores de Yachay" aria-expanded={open} aria-controls="site-authors-panel"
            onClick={event => {
                const rect = event.currentTarget.getBoundingClientRect();
                if (panel.current) {
                    panel.current.style.right = `${Math.max(16, Math.min(window.innerWidth - rect.right, window.innerWidth - 376))}px`;
                    panel.current.style.bottom = `${Math.max(16, window.innerHeight - rect.top + 12)}px`;
                    panel.current.style.maxHeight = `${Math.max(160, rect.top - 28)}px`;
                }
            }}>
            <UsersRound size={18} aria-hidden="true" /><span>Autores</span>
        </button>
        <div ref={panel} id="site-authors-panel" className="authors-panel" popover="auto"
            role="dialog" aria-labelledby="site-authors-title"
            onToggle={event => setOpen(event.currentTarget.matches(':popover-open'))}>
            <header className="authors-heading">
                <span className="authors-symbol"><UsersRound size={22} aria-hidden="true" /></span>
                <div><p>DETRÁS DE YACHAY</p><h2 id="site-authors-title">Nuestros autores</h2></div>
                <button type="button" className="authors-close" popoverTarget="site-authors-panel"
                    popoverTargetAction="hide" aria-label="Cerrar autores"><X size={18} aria-hidden="true" /></button>
            </header>
            <p className="authors-institution"><GraduationCap size={19} aria-hidden="true" /><span>Creado en la <strong>UEB · FACAGEI</strong></span></p>
            <h3 className="authors-section-title">Desarrolladores</h3>
            <ul className="authors-list">
                {authors.map(author => <li key={author.username} className="authors-card">
                    <span className="authors-avatar" aria-hidden="true">{author.initials}</span>
                    <div className="authors-copy"><h4>{author.name}</h4><p>@{author.username}</p></div>
                    <a className="authors-github" href={author.href} target="_blank" rel="noopener noreferrer"
                        aria-label={`GitHub de ${author.name} (abre en una pestaña nueva)`} title={`Ver GitHub de ${author.name}`}>
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.043-1.416-4.043-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.085 1.839 1.237 1.839 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.776.419-1.305.762-1.605-2.665-.304-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.323 3.301 1.23A11.52 11.52 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.553 3.297-1.23 3.297-1.23.654 1.652.243 2.873.119 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.822 1.102.822 2.222v3.293c0 .319.192.694.801.576C20.565 21.795 24 17.3 24 12c0-6.627-5.373-12-12-12Z" />
                        </svg>
                    </a>
                </li>)}
            </ul>
            <section className="authors-direction" aria-labelledby="authors-director-title">
                <h3 id="authors-director-title" className="authors-section-title">Directora</h3>
                <p>Ing. Monica Bonilla</p>
            </section>
            <p className="authors-note"><Heart size={14} aria-hidden="true" /> Creado para aprender y compartir.</p>
        </div>
    </div>;
}
