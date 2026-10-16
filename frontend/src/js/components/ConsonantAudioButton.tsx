import { Volume2 } from 'lucide-react';
import type { LessonAudioPlayback } from '../hooks/useLessonAudio';

export function ConsonantAudioButton({ playback }: { playback: LessonAudioPlayback }) {
    const { state, play } = playback;
    const selected = state.clip === 'consonantes';
    const active = selected && (state.phase === 'loading' || state.phase === 'playing');

    return <button
        type="button"
        className={`cometa-consonant-audio${active ? ' is-active' : ''}`}
        onClick={() => play('consonantes')}
        aria-label="Escuchar todas las consonantes"
        title="Escuchar todas las consonantes"
    >
        <Volume2 size={19} aria-hidden="true" />
        <span aria-hidden="true">{active ? (state.phase === 'playing' ? 'Sonando' : 'Cargando…') : 'Escuchar'}</span>
    </button>;
}
