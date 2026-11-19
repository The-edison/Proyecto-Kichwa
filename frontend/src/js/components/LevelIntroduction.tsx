import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, LockKeyhole, Play } from 'lucide-react';
import '../../css/level-introduction.css';

export function hasFinishedLevelIntroduction(userId: number, levelId: number): boolean {
    try { return localStorage.getItem(`yachay-level-introduction:${userId}:${levelId}`) === 'complete'; }
    catch { return false; }
}

export function LevelIntroduction({ levelName, videoSrc, onComplete }: { levelName: string; videoSrc: string; onComplete: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const furthestTime = useRef(0);
    const [started, setStarted] = useState(false);
    const [error, setError] = useState(false);
    const [buffering, setBuffering] = useState(false);
    const starting = useRef(false);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const dialog = dialogRef.current;
        dialog?.showModal();
        return () => {
            dialog?.close();
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    const start = async () => {
        const video = videoRef.current;
        if (!video || starting.current) return;
        starting.current = true;
        setError(false);
        setBuffering(true);
        try {
            video.playbackRate = 1;
            await video.play();
            setStarted(true);
        } catch { setError(true); setBuffering(false); }
        finally { starting.current = false; }
    };

    return <dialog ref={dialogRef} className="level-introduction" aria-labelledby="level-introduction-title"
        aria-describedby="level-introduction-note" onCancel={event => event.preventDefault()}>
        <header className="level-introduction-header">
            <span className="level-introduction-icon"><Play size={22} fill="currentColor" aria-hidden="true" /></span>
            <div><p>Nivel {levelName}</p><h2 id="level-introduction-title">Video de bienvenida</h2></div>
        </header>
        <div className="level-introduction-player">
        <video ref={videoRef} src={videoSrc} playsInline preload="auto" disablePictureInPicture controls={started}
            controlsList="nodownload noremoteplayback nofullscreen" onContextMenu={event => event.preventDefault()}
            onTimeUpdate={event => { furthestTime.current = Math.max(furthestTime.current, event.currentTarget.currentTime); }}
            onSeeking={event => {
                const video = event.currentTarget;
                if (video.currentTime > furthestTime.current + 0.5) video.currentTime = furthestTime.current;
            }}
            onRateChange={event => { if (event.currentTarget.playbackRate !== 1) event.currentTarget.playbackRate = 1; }}
            onPlaying={() => { setStarted(true); setBuffering(false); }}
            onWaiting={() => setBuffering(true)}
            onPause={event => { if (!event.currentTarget.ended) { setStarted(false); setBuffering(false); } }}
            onEnded={onComplete} onError={() => { setError(true); setStarted(false); setBuffering(false); }} />
        {!started && <div className="level-introduction-start">
            <h3>Bienvenido al nivel {levelName}</h3>
            <p>Mira el video completo para comenzar tus unidades.</p>
            <button type="button" autoFocus disabled={buffering} className="primary-button" onClick={() => void start()}>
                {buffering ? <LoaderCircle className="level-introduction-spinner" size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
                {buffering ? 'Cargando video…' : furthestTime.current > 0 ? 'Continuar video' : 'Reproducir video'}
            </button>
            {error && <p role="alert">No se pudo reproducir el video. Inténtalo de nuevo.</p>}
        </div>}
        {started && buffering && <p className="level-introduction-buffering" role="status"><LoaderCircle className="level-introduction-spinner" size={18} aria-hidden="true" /> Cargando video…</p>}
        </div>
        <p id="level-introduction-note" className="level-introduction-note"><LockKeyhole size={18} aria-hidden="true" /> Las unidades estarán disponibles al terminar el video.</p>
    </dialog>;
}
