import '../../css/success-confetti.css';

const colors = ['#8b5cf6', '#f7b84b', '#4ac6a7', '#f26b8a', '#5c9de8', '#ff8c42', '#e879f9', '#facc15', '#22d3ee'];
const pieces = Array.from({ length: 420 }, (_, index) => ({
    left: `${(index * 37.7 + 11) % 100}%`,
    delay: `${(index * 67) % 900}ms`,
    duration: `${3000 + (index * 53) % 1200}ms`,
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
