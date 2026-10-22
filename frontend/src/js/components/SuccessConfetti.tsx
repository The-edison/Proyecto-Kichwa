import '../../css/success-confetti.css';

const colors = ['#8b5cf6', '#f7b84b', '#4ac6a7', '#f26b8a', '#5c9de8'];
const pieces = Array.from({ length: 42 }, (_, index) => ({
    left: `${(index * 37 + 11) % 100}%`,
    delay: `${(index * 67) % 430}ms`,
    duration: `${1400 + (index * 53) % 550}ms`,
    color: colors[index % colors.length],
}));

export function SuccessConfetti({ onDone }: { onDone: () => void }) {
    return <div className="success-confetti" aria-hidden="true" onAnimationEnd={event => {
        if (event.target === event.currentTarget) onDone();
    }}>
        {pieces.map((piece, index) => <span key={index} className="success-confetti-piece" style={{
            left: piece.left, animationDelay: piece.delay, animationDuration: piece.duration, backgroundColor: piece.color,
        }} />)}
    </div>;
}
