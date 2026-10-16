import { useEffect, useRef, useState } from 'react';

type Clip = 'a' | 'i' | 'u' | 'consonantes' | 'audio1' | 'audio2' | 'audio3';
const wordAudios = { audio1: 'shunku', audio2: 'purina', audio3: 'llama' };
type PlaybackState = { clip: Clip | null; phase: 'idle' | 'loading' | 'playing' | 'error'; message: string };

export function useLessonAudio() {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [state, setState] = useState<PlaybackState>({ clip: null, phase: 'idle', message: '' });

    function stop() {
        const audio = audioRef.current;
        audioRef.current = null;
        if (audio) {
            audio.onended = audio.onerror = audio.onplaying = null;
            audio.pause();
        }
    }

    useEffect(() => stop, []);

    function play(clip: Clip) {
        stop();
        const isWordAudio = clip === 'audio1' || clip === 'audio2' || clip === 'audio3';
        const description = isWordAudio ? `el audio ${clip.slice(-1)}` : clip === 'consonantes' ? 'las consonantes' : `la vocal ${clip}`;
        setState({ clip, phase: 'loading', message: `Cargando ${description}.` });
        const path = isWordAudio ? `vocal-que-falta/${wordAudios[clip]}.mp3` : clip === 'consonantes' ? 'consonantes/consonantes.mp3' : `vocales/${clip}.mp3`;
        const audio = new Audio(`${import.meta.env.BASE_URL}audios/${path}`);
        audioRef.current = audio;

        const fail = () => {
            if (audioRef.current !== audio) return;
            stop();
            const subject = clip === 'consonantes' ? 'las consonantes' : `«${clip}»`;
            setState({ clip, phase: 'error', message: isWordAudio ? `No se pudo reproducir el audio ${clip.slice(-1)}. Inténtalo de nuevo.` : `No se pudo reproducir el audio de ${subject}. Inténtalo de nuevo.` });
        };
        audio.onplaying = () => {
            if (audioRef.current === audio) setState({ clip, phase: 'playing', message: `Reproduciendo ${description}.` });
        };
        audio.onended = () => {
            if (audioRef.current !== audio) return;
            stop();
            setState({ clip: null, phase: 'idle', message: '' });
        };
        audio.onerror = fail;
        // Start playback directly in the click handler for mobile browsers.
        void audio.play().catch(fail);
    }

    return { state, play };
}

export type LessonAudioPlayback = ReturnType<typeof useLessonAudio>;
