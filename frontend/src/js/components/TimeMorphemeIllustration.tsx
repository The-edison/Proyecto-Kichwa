import atlas from '../../images/time-morpheme-scenes.png';

export function TimeMorphemeIllustration({ cell, description }: { cell: number; description: string }) {
    return <span className="time-practice-illustration" style={{ display: 'block', position: 'relative', width: '100%', aspectRatio: '1', overflow: 'hidden', borderRadius: 14 }}>
        <img src={atlas} alt={description} width={1292} height={1217} decoding="async" style={{ position: 'absolute', width: '300%', maxWidth: 'none', height: '300%', left: `${cell % 3 * -100}%`, top: `${Math.floor(cell / 3) * -100}%` }} />
    </span>;
}
