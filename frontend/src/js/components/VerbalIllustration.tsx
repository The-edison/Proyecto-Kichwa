import atlas from '../../images/verbal-practice-scenes.png';
import disgust from '../../images/verbal-disgust.png';

export function VerbalIllustration({ cell, description }: { cell: number; description: string }) {
    if (cell === 12) return <img className="verbal-practice-illustration" src={disgust} alt={description} width={1024} height={1024} decoding="async" style={{ display: 'block', width: '100%', aspectRatio: '1', objectFit: 'contain', borderRadius: 14 }} />;
    return <span className="verbal-practice-illustration" style={{ display: 'block', position: 'relative', width: '100%', aspectRatio: '1', overflow: 'hidden', borderRadius: 14 }}><img src={atlas} alt={description} decoding="async" width={1448} height={1086} style={{ position: 'absolute', width: '400%', maxWidth: 'none', height: '300%', left: `${cell % 4 * -100}%`, top: `${Math.floor(cell / 4) * -100}%` }} /></span>;
}
