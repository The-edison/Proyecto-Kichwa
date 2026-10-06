import { Link } from '../navigation';

export function Brand({ compact = false }: { compact?: boolean }) {
    return (
        <Link href="/" className="brand inline-flex items-center gap-3" aria-label="Yachay, ir al inicio">
            <span className="brand-icon" aria-hidden="true">
                <span className="brand-rainbow" />
                <span className="brand-sun" />
            </span>
            {!compact && <span className="leading-none"><strong className="brand-name block">Yachay</strong><small className="brand-kicker">KICHWA VIVO</small></span>}
        </Link>
    );
}
