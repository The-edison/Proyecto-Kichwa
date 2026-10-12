const steppedCross =
    'M 175 30 H 305 V 85 H 360 V 140 H 415 V 340 H 360 V 395 H 305 V 450 H 175 V 395 H 120 V 340 H 65 V 140 H 120 V 85 H 175 Z';

const bands = [
    { scale: 1, fill: 'var(--color-primary)' },
    { scale: 0.86, fill: 'var(--color-soft)' },
    { scale: 0.72, fill: 'var(--color-accent)' },
    { scale: 0.58, fill: 'var(--color-secondary)' },
    { scale: 0.44, fill: 'var(--color-primary-button)' },
];

export function ChakanaIllustration({ compact = false }: { compact?: boolean }) {
    return (
        <svg
            viewBox="0 0 480 480"
            role="img"
            aria-labelledby="chakana-title"
            className={`relative z-10 h-auto shrink-0 ${compact ? 'w-32 lg:w-40' : 'w-[min(100%,300px)]'}`}
        >
            <title id="chakana-title">Chakana andina, cruz escalonada</title>
            {bands.map(({ scale, fill }) => (
                <path
                    key={fill}
                    d={steppedCross}
                    fill={fill}
                    transform={`translate(240 240) scale(${scale}) translate(-240 -240)`}
                />
            ))}
            <circle cx="240" cy="240" r="60" fill="var(--color-surface)" />
            <circle cx="240" cy="240" r="37" fill="var(--color-primary)" />
            <circle cx="240" cy="240" r="21" fill="var(--color-surface)" />
        </svg>
    );
}
