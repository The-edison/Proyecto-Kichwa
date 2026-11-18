import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import '../../css/level-introduction.css';

export function hasFinishedLevelIntroduction(userId: number, levelId: number): boolean {
    try { return localStorage.getItem(`yachay-level-introduction:${userId}:${levelId}`) === 'complete'; }
    catch { return false; }
}

export function LevelIntroduction({ levelName, videoSrc, onComplete }: { levelName: string; videoSrc: string; onComplete: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const furthestTime = useRef(0);
    const [started, setStarted] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previousOverflow; };
    }, []);

    const start = async () => {
        const video = videoRef.current;
        if (!video) return;
        setError(false);
        try {
            video.playbackRate = 1;
            await video.play();
            setStarted(true);
        } catch { setError(true); }
    };

    return <main className="level-introduction" aria-label={`Video de introducción al nivel ${levelName}`}>
        <video ref={videoRef} src={videoSrc} playsInline preload="auto" disablePictureInPicture
            controlsList="nodownload noremoteplayback nofullscreen" onContextMenu={event => event.preventDefault()}
            onTimeUpdate={event => { furthestTime.current = Math.max(furthestTime.current, event.currentTarget.currentTime); }}
            onSeeking={event => {
                const video = event.currentTarget;
                if (video.currentTime > furthestTime.current + 0.5) video.currentTime = furthestTime.current;
            }}
            onRateChange={event => { if (event.currentTarget.playbackRate !== 1) event.currentTarget.playbackRate = 1; }}
            onPause={event => { if (!event.currentTarget.ended) setStarted(false); }}
            onEnded={onComplete} onError={() => setError(true)} />
        {!started && <div className="level-introduction-start">
            <h1>Bienvenido al nivel {levelName}</h1>
            <p>Mira el video completo para comenzar tus unidades.</p>
            <button type="button" className="primary-button" onClick={() => void start()}><Play size={20} aria-hidden="true" /> {furthestTime.current > 0 ? 'Continuar video' : 'Reproducir video'}</button>
            {error && <p role="alert">No se pudo reproducir el video. Inténtalo de nuevo.</p>}
        </div>}
        {started && <p className="level-introduction-note">Las unidades estarán disponibles al terminar el video.</p>}
    </main>;
}
