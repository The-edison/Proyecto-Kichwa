import { useState } from 'react';
import type { Exercise, ExerciseAnswer } from '../types';
import { ExerciseInteraction } from './ExerciseCard';
import { AnimalsPracticePanel } from './AnimalsPracticePanel';
import { BodyPracticePanel } from './BodyPracticePanel';
import { ColorsPracticePanel } from './ColorsPracticePanel';
import { InteractiveSentencePractice } from './InteractiveSentencePractice';
import { ListeningGreetingsExercise } from './ListeningGreetingsExercise';
import { MissingVowelExercise } from './MissingVowelExercise';
import { NumbersPractice } from './NumbersPractice';
import { PronounsPracticePanel } from './PronounsPracticePanel';
import { SceneChoicePanel } from './SceneChoicePanel';
import { SentenceOrderPanel } from './SentenceOrderPanel';
import { NumbersMatchingExercise } from './NumbersMatchingExercise';
import { ConversationMatchingExercise } from './ConversationMatchingExercise';
import { AudioMatchingExercise } from './AudioMatchingExercise';

export const exerciseFormatNames: Record<Exercise['type'], string> = {
    seleccion_multiple: 'Selección múltiple',
    completar: 'Completar',
    relacionar: 'Relacionar',
    arrastrar: 'Arrastrar',
    ordenar: 'Ordenar',
};

export function AdminExerciseSketch({ exercise, lesson, answer: controlledAnswer, onAnswerChange, statusLabel }: {
    exercise: Exercise; lesson?: 'numbers' | 'calendar'; answer?: ExerciseAnswer;
    onAnswerChange?: (answer: ExerciseAnswer) => void; statusLabel?: string;
}) {
    const [localAnswer, setLocalAnswer] = useState<ExerciseAnswer>({});
    const [selectedOrigin, setSelectedOrigin] = useState('');
    const answer = controlledAnswer ?? localAnswer;
    const setAnswer = onAnswerChange ?? setLocalAnswer;
    function selectOrigin(origin: string) {
        if (answer.pares?.some(pair => pair.origen === origin)) setAnswer({ pares: answer.pares.filter(pair => pair.origen !== origin) });
        setSelectedOrigin(current => current === origin ? '' : origin);
    }
    function pair(destination: string) {
        if (!selectedOrigin) return;
        setAnswer({ pares: [...(answer.pares ?? []).filter(item => item.origen !== selectedOrigin && item.destino !== destination), { origen: selectedOrigin, destino: destination }] });
        setSelectedOrigin('');
    }
    const answers = { [exercise.id]: answer };
    const update = (_exercise: Exercise, next: ExerciseAnswer) => setAnswer(next);
    const config = exercise.config;
    const interaction = config?.animal_activity ?
        <AnimalsPracticePanel exercise={exercise} answer={answer} busy={false} onChange={setAnswer} /> :
        config?.color_activity ?
        <ColorsPracticePanel exercises={[exercise]} answers={answers} feedback={{}} busy={false} onChange={update} /> :
        config?.body_activity ?
        <BodyPracticePanel exercises={[exercise]} answers={answers} feedback={{}} busy={false} onChange={update} /> :
        config?.pronouns_activity ?
        <PronounsPracticePanel exercises={[exercise]} answers={answers} feedback={{}} busy={false} start={1} onChange={update} /> :
        config?.scene_choice ?
        <SceneChoicePanel exercises={[exercise]} answers={answers} feedback={{}} busy={false} onChange={update} /> :
        config?.sentence_order ?
        <SentenceOrderPanel exercises={[exercise]} answers={answers} feedback={{}} busy={false} onChange={update} /> :
        config?.interactive_activity && lesson ?
        <InteractiveSentencePractice exercise={exercise} answer={answer} disabled={false} lesson={lesson} onChange={setAnswer} /> :
        config?.numbers_activity === 'count' || config?.numbers_activity === 'sentences' ?
        <NumbersPractice exercise={exercise} answer={answer} disabled={false} onChange={setAnswer} /> :
        exercise.type === 'relacionar' && config?.numbers_activity === 'small' ?
        <NumbersMatchingExercise exercise={exercise} answer={answer} selectedOrigin={selectedOrigin} disabled={false} onSelectOrigin={selectOrigin} onPair={pair} /> :
        exercise.type === 'relacionar' && config?.conversation_pairs ?
        <ConversationMatchingExercise exercise={exercise} answer={answer} selectedOrigin={selectedOrigin} disabled={false} onSelectOrigin={selectOrigin} onPair={pair} group={config.conversation_group ?? 'q'} /> :
        exercise.type === 'relacionar' && config?.listening_questions ?
        <AudioMatchingExercise exercise={exercise} answer={answer} selectedOrigin={selectedOrigin} disabled={false} onSelectOrigin={selectOrigin} onPair={pair} /> :
        exercise.type === 'completar' && (config?.listening_greetings || config?.listening_questions) ?
        <ListeningGreetingsExercise exercise={exercise} answer={answer} disabled={false} onChange={setAnswer} /> :
        config?.listening_vowels ?
        <MissingVowelExercise exercise={exercise} answer={answer} disabled={false} onChange={setAnswer} /> :
        <ExerciseInteraction exercise={exercise} answer={answer} onChange={setAnswer} name={`admin-sketch-${exercise.id}`} />;

    return <section className="space-y-4 rounded-xl border border-line bg-card p-4" aria-label={`Boceto del ejercicio ${exercise.id}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="eyebrow">BOCETO DEL EJERCICIO · {exerciseFormatNames[exercise.type]}</span>
            <span className="text-sm text-muted">{statusLabel ?? (exercise.published ? 'Publicado' : 'Borrador')}</span>
        </div>
        <div>
            <h4 className="font-bold text-ink">{exercise.config?.title || exercise.prompt || 'La instrucción aparecerá aquí.'}</h4>
            {exercise.config?.title && <p className="mt-2 whitespace-pre-line text-muted">{exercise.prompt}</p>}
        </div>
        {interaction}
        <p className="border-t border-line pt-3 text-sm text-muted">Vista de prueba. Las respuestas aquí no se guardan ni conceden XP.</p>
    </section>;
}
