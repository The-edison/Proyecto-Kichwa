const steppedCross =
    'M 175 30 H 305 V 85 H 360 V 140 H 415 V 340 H 360 V 395 H 305 V 450 H 175 V 395 H 120 V 340 H 65 V 140 H 120 V 85 H 175 Z';

const bands = [
    { scale: 1, fill: '#b94e3a' },
    { scale: 0.86, fill: '#e99b3c' },
    { scale: 0.72, fill: '#f2c75b' },
    { scale: 0.58, fill: '#3c936b' },
    { scale: 0.44, fill: '#247e91' },
];

export function ChakanaIllustration({ compact = false }: { compact?: boolean }) {
    return (
        <svg
            viewBox="0 0 480 480"
            role="img"
            aria-labelledby="chakana-title"
            className={`relative z-10 h-auto shrink-0 drop-shadow-[0_22px_26px_#9b714c55] ${compact ? 'w-32 lg:w-40' : 'w-[min(100%,300px)]'}`}
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
            <circle cx="240" cy="240" r="60" fill="#fffaf1" />
            <circle cx="240" cy="240" r="37" fill="#24598d" />
            <circle cx="240" cy="240" r="21" fill="#fffaf1" />
        </svg>
    );
}
