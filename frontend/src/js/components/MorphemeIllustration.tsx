import type { CSSProperties } from 'react';

/** Cells in the four-column, three-row illustration sheet. */
export function MorphemeIllustration({ cell, description, className = '' }: { cell: number; description: string; className?: string }) {
    return <span role="img" aria-label={description} className={`morpheme-illustration ${className}`} style={{
        backgroundPosition: `${(cell % 4) * 100 / 3}% ${Math.floor(cell / 4) * 50}%`,
    } as CSSProperties} />;
}
