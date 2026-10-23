import mascot from '../../images/cuy-companion.webp';
import encouragingMascot from '../../images/cuy-companion-encourage.webp';
import '../../css/learning-companion.css';

interface CompanionProps {
    correct?: boolean;
    xpEarned?: number;
    xpTotal?: number;
    score?: string;
    final?: boolean;
    portraitOnly?: boolean;
}

/** Rewards and scores always come from the graded response, never from the selection. */
export function LearningCompanion({ correct, xpEarned, score, final = false, portraitOnly = false }: CompanionProps) {
    const state = correct === undefined ? 'ready' : correct ? 'success' : 'encourage';
    return <aside className={`learning-companion is-${state}${final ? ' is-final' : ''}`} aria-label="Inti, tu compañero de aprendizaje">
        <div className="learning-companion-portrait">
            <img src={correct === false ? encouragingMascot : mascot} width={160} height={180} alt={correct === false ? 'Inti, el cuy con poncho rojo, te anima a seguir practicando' : 'Inti, el cuy con poncho andino rojo, celebra tu aprendizaje'} decoding="async" />
            <span className="learning-companion-symbol" aria-hidden="true">{final ? correct ? '★' : '♡' : correct === undefined ? '✦' : correct ? '✓' : '♡'}</span>
        </div>
        {!portraitOnly && (final || correct === undefined) && <div className="learning-companion-message" role="status" aria-live="polite" aria-atomic="true">
            <strong>{correct === undefined ? '¡Vamos paso a paso!' : correct ? 'Alli rurashka' : 'Kutin rurapay'}</strong>
            {correct !== undefined && <span className="learning-companion-translation">{correct ? 'Bien hecho' : 'Reinténtalo'}</span>}
            {score !== undefined && <span className="learning-companion-score"><small>Puntuación final</small>{score}</span>}
            {xpEarned !== undefined && <span className="learning-companion-xp">+{xpEarned} XP</span>}
            {correct === true && xpEarned === 0 && !final && <small>Los XP de esta actividad ya cuentan en este intento.</small>}
            {correct === false && !final && <small>Cada intento te ayuda a aprender.</small>}
        </div>}
    </aside>;
}
