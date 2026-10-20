import { useEffect, useRef, useState } from 'react';

const greetingAudios = {
    'alli-puncha': 'Alli puncha', 'alli-chishi': 'Alli chishi', 'alli-tuta': 'Alli tuta',
    'imanalla-kanki': 'Imanalla kanki?', 'allilla-kani': 'Allilla kani.',
    'maymanta-kanki': 'Maymanta kanki?', 'maypitak-llankanki': 'Maypitak llankanki?',
    kayakaman: 'Kayakaman', kipakaman: 'Kipakaman', yupaychani: 'Yupaychani', kishpichiway: 'Kishpichiway',
};
const questionAudios = { imatak: 'Audio 1', 'pitak-kan': 'Audio 2', imamanta: 'Audio 3' };
const sentenceAudios = { 'alli-puncha-churi': 'la oración 1', 'alli-chishi-kusa': 'la oración 2', 'alli-tuta-tayta': 'la oración 3' };
const expressionAudios = {
    'd-0': { word:'Kipakaman', path:'despedidas/kipakaman' }, 'd-1': { word:'Kayakaman', path:'despedidas/kayakaman' },
    'd-2': { word:'Shukti punchakama', path:'despedidas/shukti-punchakama' }, 'd-3': { word:'Ashtak kaman', path:'despedidas/ashtak-kaman' },
    'd-4': { word:'Chisikaman', path:'despedidas/chisikaman' },
    'c-0': { word:'Alli shamushka', path:'cortesia/alli-shamushka' }, 'c-1': { word:'Yupaychani', path:'cortesia/yupaychani' },
    'c-2': { word:'Kishpichiway', path:'cortesia/kishpichiway' }, 'c-3': { word:'Tiyaripay', path:'cortesia/tiyaripay' },
};
export type LessonAudioClip = 'a' | 'i' | 'u' | 'consonantes' | 'audio1' | 'audio2' | 'audio3' | keyof typeof greetingAudios | keyof typeof questionAudios | keyof typeof sentenceAudios | keyof typeof expressionAudios;
type Clip = LessonAudioClip;
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
        const greeting = clip in greetingAudios ? greetingAudios[clip as keyof typeof greetingAudios] : null;
        const question = clip in questionAudios ? questionAudios[clip as keyof typeof questionAudios] : null;
        const sentence = clip in sentenceAudios ? sentenceAudios[clip as keyof typeof sentenceAudios] : null;
        const expression = clip in expressionAudios ? expressionAudios[clip as keyof typeof expressionAudios] : null;
        const description = expression ? `«${expression.word}»` : sentence ?? (question ? question.toLowerCase() : greeting ? `«${greeting}»` : isWordAudio ? `el audio ${clip.slice(-1)}` : clip === 'consonantes' ? 'las consonantes' : `la vocal ${clip}`);
        setState({ clip, phase: 'loading', message: `Cargando ${description}.` });
        const path = expression ? `unidad-2/${expression.path}.mp3` : sentence ? `unidad-2/completar-saludos/${clip}.mp3` : question ? `unidad-2/preguntas-respuestas/${clip}.mp3` : greeting ? `saludos/${clip}.mp3` : isWordAudio ? `vocal-que-falta/${wordAudios[clip]}.mp3` : clip === 'consonantes' ? 'consonantes/consonantes.mp3' : `vocales/${clip}.mp3`;
        const audio = new Audio(`${import.meta.env.BASE_URL}audios/${path}`);
        audioRef.current = audio;

        const fail = () => {
            if (audioRef.current !== audio) return;
            stop();
            const subject = expression ? `«${expression.word}»` : greeting ? `«${greeting}»` : clip === 'consonantes' ? 'las consonantes' : `«${clip}»`;
            setState({ clip, phase: 'error', message: sentence ? `No se pudo reproducir ${sentence}. Inténtalo de nuevo.` : question ? `No se pudo reproducir el ${description}. Inténtalo de nuevo.` : isWordAudio ? `No se pudo reproducir el audio ${clip.slice(-1)}. Inténtalo de nuevo.` : `No se pudo reproducir el audio de ${subject}. Inténtalo de nuevo.` });
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
