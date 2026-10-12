export function progressValue(value = 0) {
    return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
}

export function LearningProgress({ value, label }: { value: number; label: string }) {
    const percentage = progressValue(value);
    return <div className="learning-progress">
        <div className="learning-progress-label"><span>{label}</span><strong>{Math.round(percentage)}%</strong></div>
        <div className="progress-track" role="progressbar" aria-label={label} aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress-fill" style={{ width: `${percentage}%` }} />
        </div>
    </div>;
}

export function LearningProgressRing({ value, label }: { value: number; label: string }) {
    const percentage = progressValue(value);
    return <div className="learning-progress-ring" role="progressbar" aria-label={label} aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle className="learning-ring-track" cx="60" cy="60" r="50" /><circle className="learning-ring-fill" cx="60" cy="60" r="50" pathLength="100" strokeDasharray={`${percentage} 100`} transform="rotate(-90 60 60)" /></svg>
        <div><strong>{Math.round(percentage)}<small>%</small></strong><span>completado</span></div>
    </div>;
}
