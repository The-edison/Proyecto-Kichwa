import type { LessonAudioPlayback } from '../hooks/useLessonAudio';
import { Volume2 } from 'lucide-react';

const vowels = ['a', 'i', 'u'] as const;

export function VowelAudioButtons({ playback }: { playback: LessonAudioPlayback }) {
    const { state, play } = playback;
    const isVowel = state.clip !== null && state.clip !== 'consonantes';
    const active = isVowel && (state.phase === 'loading' || state.phase === 'playing') ? state.clip : null;
    const playing = state.phase === 'playing';

    return <>
        <p className="cometa-vowel-instruction">Pulsa una vocal para escuchar su pronunciación.</p>
        <div className="cometa-vowel-tiles" role="group" aria-label="Escuchar las vocales">
            {vowels.map(vowel => <button
                key={vowel}
                type="button"
                className={active === vowel ? 'is-active' : undefined}
                aria-label={`Escuchar la vocal ${vowel}`}
                onClick={() => play(vowel)}
            >
                <span className="cometa-vowel-letter" aria-hidden="true">{vowel}</span>
                <span className="cometa-vowel-action" aria-hidden="true"><Volume2 size={14} />{active === vowel ? (playing ? 'Sonando' : 'Cargando…') : 'Escuchar'}</span>
            </button>)}
        </div>
        <p className="cometa-vowel-status" role="status" aria-live="polite">{isVowel ? state.message : ''}</p>
    </>;
}
