import { useEffect, useRef, useState } from 'react';

const greetingAudios = {
    'alli-puncha': 'Alli puncha', 'alli-chishi': 'Alli chishi', 'alli-tuta': 'Alli tuta',
    'imanalla-kanki': 'Imanalla kanki', 'allilla-kani': 'Allilla kani.',
    'maymanta-kanki': 'Maymanta kanki', 'maypitak-llankanki': 'Maypitak llankanki',
    kayakaman: 'Kayakaman', kipakaman: 'Kipakaman', yupaychani: 'Yupaychani', kishpichiway: 'Kishpichiway',
};
const questionAudios = { imatak: 'Audio 1', 'pitak-kan': 'Audio 2', imamanta: 'Audio 3' };
const sentenceAudios = { 'alli-puncha-churi': 'la oración 1', 'alli-chishi-kusa': 'la oración 2', 'alli-tuta-tayta': 'la oración 3' };
const pronounAudios = { 'u3-audio-1': 'yo-como', 'u3-audio-2': 'tu-juegas', 'u3-audio-3': 'el-duerme' };
const pronounWordAudios = {
    'pronoun-nuka': { word: 'ñuka', file: 'nuka' }, 'pronoun-kan': { word: 'kan', file: 'kan' },
    'pronoun-pay': { word: 'pay', file: 'pay' }, 'pronoun-nukanchik': { word: 'ñukanchik', file: 'nukanchik' },
    'pronoun-kankuna': { word: 'kankuna', file: 'kankuna' }, 'pronoun-paykuna': { word: 'paykuna', file: 'paykuna' },
};
const animalColorAudios = {
    'animal-allku': { word: 'allku', path: 'animales/allku' }, 'animal-misi': { word: 'misi', path: 'animales/misi' },
    'animal-kuy': { word: 'kuy', path: 'animales/kuy' }, 'animal-llama': { word: 'llama', path: 'animales/llama' },
    'animal-wakra': { word: 'wakra', path: 'animales/wakra' }, 'animal-kuchi': { word: 'kuchi', path: 'animales/kuchi' },
    'animal-atalpa': { word: 'atalpa', path: 'animales/atalpa' }, 'animal-kunu': { word: 'kunu', path: 'animales/kunu' },
    'animal-apiw': { word: 'apiw', path: 'animales/apiw' }, 'animal-chantasu': { word: 'chantasu', path: 'animales/chantasu' },
    'animal-taruka': { word: 'taruka', path: 'animales/taruka' }, 'animal-ukucha': { word: 'ukucha', path: 'animales/ukucha' },
    'animal-urpi': { word: 'urpi', path: 'animales/urpi' }, 'animal-hampatu': { word: 'hampatu', path: 'animales/hampatu' },
    'animal-pilpintu': { word: 'pilpintu', path: 'animales/pilpintu' }, 'animal-kinti': { word: 'kinti', path: 'animales/kinti' },
    'animal-atuk': { word: 'atuk', path: 'animales/atuk' }, 'animal-anas': { word: 'añas', path: 'animales/anas' },
    'animal-yutu': { word: 'yutu', path: 'animales/yutu' }, 'animal-uturunku': { word: 'uturunku', path: 'animales/uturunku' },
    'color-yurak': { word: 'yurak', path: 'colores/yurak' }, 'color-yana': { word: 'yana', path: 'colores/yana' },
    'color-puka': { word: 'puka', path: 'colores/puka' }, 'color-killu': { word: 'killu', path: 'colores/killu' },
    'color-ankas': { word: 'ankas', path: 'colores/ankas' }, 'color-waylla': { word: 'waylla', path: 'colores/waylla' },
    'color-paku': { word: 'paku', path: 'colores/paku' }, 'color-maywa': { word: 'maywa', path: 'colores/maywa' },
    'color-kishpu': { word: 'kishpu', path: 'colores/kishpu' }, 'color-waminsi': { word: 'waminsi', path: 'colores/waminsi' },
    'color-suku': { word: 'suku', path: 'colores/suku' },
    'animal-color-example': { word: 'Ñuka misika yanami kan.', path: 'ejemplos/mi-gato-es-negro' },
    'm2-domestic-1': { word: 'Ñuka mamaka shuk allkutami charin', path: 'oraciones/mi-mama-tiene-un-perro' },
    'm2-domestic-2': { word: 'Ñukami shuk sumak misita rantirkani', path: 'oraciones/me-compre-un-hermoso-gato' },
    'm2-domestic-3': { word: 'Joseka shuk llamatami rantirka', path: 'oraciones/jose-compro-una-oveja' },
    'color-sentence-hat': { word: 'Ñuka muchikuka yurakmi kan', path: 'oraciones/mi-sombrero-es-blanco' },
    'color-sentence-pants': { word: 'Paypak waraka yanami kan', path: 'oraciones/su-pantalon-es-negro' },
    'color-sentence-shawl': { word: 'Paypak llikllaka pukami kan', path: 'oraciones/su-reboso-es-rojo' },
    'color-sentence-necklace': { word: 'Paypak wallkaka killumi kan', path: 'oraciones/su-collar-es-amarillo' },
    'color-sentence-shoes': { word: 'Paypak ushukunaka ankasmi kan', path: 'oraciones/sus-zapatos-son-azules' },
};
export function animalColorClip(word: string, section: number): LessonAudioClip | null {
    const clip = section === 3 ? 'animal-color-example' : `${section === 2 ? 'color' : 'animal'}-${word === 'añas' ? 'anas' : word}`;
    return clip in animalColorAudios ? clip as keyof typeof animalColorAudios : null;
}
const bodyAudios = {
    'body-uma': { word: 'uma', file: 'uma' }, 'body-nawi': { word: 'ñawi', file: 'nawi' },
    'body-rinri': { word: 'rinri', file: 'rinri' }, 'body-shimi': { word: 'shimi', file: 'shimi' },
    'body-kiru': { word: 'kiru', file: 'kiru' }, 'body-hallu': { word: 'hallu', file: 'hallu' },
    'body-kunka': { word: 'kunka', file: 'kunka' }, 'body-rikra': { word: 'rikra', file: 'rikra' },
    'body-maki': { word: 'maki', file: 'maki' }, 'body-ruka': { word: 'ruka', file: 'ruka' },
    'body-sillu': { word: 'sillu', file: 'sillu' }, 'body-wiksa': { word: 'wiksa', file: 'wiksa' },
    'body-washa': { word: 'washa', file: 'washa' }, 'body-kunkuri': { word: 'kunkuri', file: 'kunkuri' },
    'body-chaki': { word: 'chaki', file: 'chaki' }, 'body-chaki-washa': { word: 'chaki washa', file: 'chaki-washa' },
    'body-example': { word: 'Chakitami nanan.', file: 'me-duele-el-pie' },
    'body-sentence-head': { word: 'Ñukatami umata nanan', file: 'me-duele-la-cabeza' },
    'body-sentence-belly': { word: 'Ñuka yayaka wiksa sapami', file: 'mi-papa-tiene-mucha-barriga' },
    'body-sentence-throat': { word: 'Kunkatami nanan', file: 'me-duele-la-garganta' },
};
export function bodyClip(word: string, section: number): LessonAudioClip | null {
    const clip = section === 3 ? 'body-example' : `body-${word === 'ñawi' ? 'nawi' : word.replaceAll(' ', '-')}`;
    return clip in bodyAudios ? clip as keyof typeof bodyAudios : null;
}
const expressionAudios = {
    'q-0': { word:'Imanalla kanki', path:'escenas/preguntas/imanalla-kanki' }, 'q-1': { word:'Maymanta kanki', path:'escenas/preguntas/maymanta-kanki' },
    'q-2': { word:'Maypitak llankanki', path:'escenas/preguntas/maypitak-llankanki' }, 'q-3': { word:'Mashna watakunatatak charinki', path:'escenas/preguntas/mashna-watakunatatak-charinki' },
    'q-4': { word:'Llakillachu kanki', path:'escenas/preguntas/llakillachu-kanki' }, 'q-5': { word:'Imata ruranki', path:'escenas/preguntas/imata-ruranki' },
    'a-0': { word:'Allilla kani', path:'escenas/respuestas/allilla-kani' }, 'a-1': { word:'Ambatomanta kani', path:'escenas/respuestas/ambatomanta-kani' },
    'a-2': { word:'Quitupi llankani', path:'escenas/respuestas/quitupi-llankani' }, 'a-3': { word:'Ishkay chunka watakuntami charini', path:'escenas/respuestas/ishkay-chunka-watakuntami-charini' },
    'a-4': { word:'Ari', path:'escenas/respuestas/ari' }, 'a-5': { word:'Nimata', path:'escenas/respuestas/nimata' },
    'd-0': { word:'Kipakaman', path:'despedidas/kipakaman' }, 'd-1': { word:'Kayakaman', path:'despedidas/kayakaman' },
    'd-2': { word:'Shukti punchakama', path:'despedidas/shukti-punchakama' }, 'd-3': { word:'Ashtak kaman', path:'despedidas/ashtak-kaman' },
    'd-4': { word:'Chisikaman', path:'despedidas/chisikaman' },
    'c-0': { word:'Alli shamushka', path:'cortesia/alli-shamushka' }, 'c-1': { word:'Yupaychani', path:'cortesia/yupaychani' },
    'c-2': { word:'Kishpichiway', path:'cortesia/kishpichiway' }, 'c-3': { word:'Tiyaripay', path:'cortesia/tiyaripay' },
};
const numberAudios = {
    'numbers-zero-ten': { description: 'los números del cero al diez', file: 'cero-al-diez' },
    'numbers-eleven-twenty': { description: 'los números del once al veinte', file: 'once-al-veinte' },
    'numbers-large': { description: 'las cantidades grandes', file: 'cantidades-grandes' },
};
const calendarAudios = {
    'calendar-weekdays': { description: 'los días de la semana', file: 'dias-de-la-semana' },
    'calendar-months': { description: 'los meses del año', file: 'meses-del-ano' },
    'calendar-seasons': { description: 'las estaciones del año', file: 'estaciones-del-ano' },
};
export type LessonAudioClip = 'a' | 'i' | 'u' | 'consonantes' | 'audio1' | 'audio2' | 'audio3' | keyof typeof numberAudios | keyof typeof calendarAudios | keyof typeof greetingAudios | keyof typeof questionAudios | keyof typeof sentenceAudios | keyof typeof expressionAudios | keyof typeof pronounAudios | keyof typeof pronounWordAudios | keyof typeof animalColorAudios | keyof typeof bodyAudios;
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
        const pronoun = clip in pronounAudios ? pronounAudios[clip as keyof typeof pronounAudios] : null;
        const pronounWord = clip in pronounWordAudios ? pronounWordAudios[clip as keyof typeof pronounWordAudios] : null;
        const animalColor = clip in animalColorAudios ? animalColorAudios[clip as keyof typeof animalColorAudios] : null;
        const body = clip in bodyAudios ? bodyAudios[clip as keyof typeof bodyAudios] : null;
        const numberAudio = clip in numberAudios ? numberAudios[clip as keyof typeof numberAudios] : null;
        const calendarAudio = clip in calendarAudios ? calendarAudios[clip as keyof typeof calendarAudios] : null;
        const description = body ? `«${body.word}»` : animalColor ? `«${animalColor.word}»` : pronounWord ? `«${pronounWord.word}»` : pronoun ? `la oración ${clip.slice(-1)}` : expression ? `«${expression.word}»` : sentence ?? (question ? question.toLowerCase() : greeting ? `«${greeting}»` : isWordAudio ? `el audio ${clip.slice(-1)}` : numberAudio ? numberAudio.description : calendarAudio ? calendarAudio.description : clip === 'consonantes' ? 'las consonantes' : `la vocal ${clip}`);
        setState({ clip, phase: 'loading', message: `Cargando ${description}.` });
        const path = expression ? `unidad-2/${expression.path}.mp3` : sentence ? `unidad-2/completar-saludos/${clip}.mp3` : question ? `unidad-2/preguntas-respuestas/${clip}.mp3` : greeting ? `saludos/${clip}.mp3` : isWordAudio ? `vocal-que-falta/${wordAudios[clip]}.mp3` : numberAudio ? `unidad-4/numeros/${numberAudio.file}.mp3` : calendarAudio ? `unidad-5/calendario/${calendarAudio.file}.mp3` : clip === 'consonantes' ? 'consonantes/consonantes.mp3' : `vocales/${clip}.mp3`;
        const audio = new Audio(`${import.meta.env.BASE_URL}audios/${body ? `modulo-2/unidad-2/${clip === 'body-example' ? 'ejemplos' : clip.startsWith('body-sentence-') ? 'oraciones' : 'partes'}/${body.file}.mp3` : animalColor ? `modulo-2/unidad-1/${animalColor.path}.mp3` : pronounWord ? `unidad-3/pronombres/${pronounWord.file}.mp3` : pronoun ? `unidad-3/pronombres/${pronoun}.mp3` : path}`);
        audioRef.current = audio;

        const fail = () => {
            if (audioRef.current !== audio) return;
            stop();
            const subject = body ? `«${body.word}»` : animalColor ? `«${animalColor.word}»` : pronounWord ? `«${pronounWord.word}»` : expression ? `«${expression.word}»` : greeting ? `«${greeting}»` : numberAudio ? numberAudio.description : calendarAudio ? calendarAudio.description : clip === 'consonantes' ? 'las consonantes' : `«${clip}»`;
            setState({ clip, phase: 'error', message: pronoun ? `No se pudo reproducir ${description}. Inténtalo de nuevo.` : sentence ? `No se pudo reproducir ${sentence}. Inténtalo de nuevo.` : question ? `No se pudo reproducir el ${description}. Inténtalo de nuevo.` : isWordAudio ? `No se pudo reproducir el audio ${clip.slice(-1)}. Inténtalo de nuevo.` : `No se pudo reproducir el audio de ${subject}. Inténtalo de nuevo.` });
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
