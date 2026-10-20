import { useEffect, useRef } from 'react';

let activeSound: HTMLAudioElement | null = null;

export function useAnswerSound() {
    const sounds = useRef<Partial<Record<'correcto' | 'incorrecto', HTMLAudioElement>>>({});
    const mounted = useRef(true);
    const playback = useRef(0);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
            playback.current++;
            Object.values(sounds.current).forEach(audio => {
                audio.pause();
                audio.onerror = null;
                if (activeSound === audio) activeSound = null;
            });
        };
    }, []);

    return (correct: boolean) => {
        if (!mounted.current || typeof Audio === 'undefined') return;
        const request = ++playback.current;
        try {
            const name = correct ? 'correcto' : 'incorrecto';
            const audio = sounds.current[name] ??= new Audio(`${import.meta.env.BASE_URL}audios/respuestas/${name}.mp3`);
            activeSound?.pause();
            activeSound = audio;
            audio.volume = 0.6;
            audio.currentTime = 0;
            const fail = () => { if (playback.current === request && activeSound === audio) { audio.pause(); activeSound = null; } };
            audio.onerror = fail;
            void audio.play().catch(fail);
        } catch {
            // Sound availability must never interrupt answer checking.
        }
    };
}
