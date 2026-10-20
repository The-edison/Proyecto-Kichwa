import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type SetStateAction } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, LoaderCircle, RotateCcw, X } from 'lucide-react';
import '../../css/guided-unit.css';
import { Head, Link } from '../navigation';
import { useApi } from '../hooks/useApi';
import { ApiError, apiPost, withProgressBatch } from '../services/api';
import { answerComplete, feedbackMessage, mediaUrl } from './ExerciseCard';
import { ErrorState, LoadingState } from './States';
import { LearningCompanion } from './LearningCompanion';
import { GuidedIntroduction } from './GuidedIntroduction';
import { GreetingsIntroduction } from './GreetingsIntroduction';
import { TopicIntroduction } from './TopicIntroduction';
import { MissingVowelExercise } from './MissingVowelExercise';
import { AudioMatchingExercise } from './AudioMatchingExercise';
import { ListeningGreetingsExercise } from './ListeningGreetingsExercise';
import { ConversationMatchingExercise } from './ConversationMatchingExercise';
import { SceneChoicePanel } from './SceneChoicePanel';
import { SentenceOrderPanel } from './SentenceOrderPanel';
import { NumbersPractice } from './NumbersPractice';
import { useAuth } from '../context/AuthContext';
import { useAnswerSound } from '../hooks/useAnswerSound';
import { emptyGuidedAttempt, readGuidedAttempt, writeGuidedAttempt, subscribeGuidedAttempt, type GuidedAttempt, type GuidedResult } from '../services/guidedAttempt';
import type { Exercise, ExerciseAnswer, ExerciseFeedback, Unit } from '../types';

interface GuidedData { exercises: Array<Exercise & { completed: boolean }>; completed_count: number; total: number; }
type GuidedUnitData = Unit & { level_id: number; level_name: string; module_name: string };

export function GuidedUnit({ unit }: { unit: GuidedUnitData }) {
    const playAnswerSound = useAnswerSound();
    const sequence = useApi<GuidedData>(`/units/${unit.id}/guided`);
    const { user } = useAuth();
    const draftKey = `yachay:guided-attempt:v1:${user?.id}:${unit.id}`;
    const attempt = useSyncExternalStore(listener => subscribeGuidedAttempt(draftKey, listener), () => readGuidedAttempt(draftKey));
    const { step, answers, feedback, xpEarned, summary, selectedOrigin } = attempt;
    function setField<K extends keyof GuidedAttempt>(key: K, value: SetStateAction<GuidedAttempt[K]>) {
        const previous = readGuidedAttempt(draftKey);
        writeGuidedAttempt(draftKey, { ...previous, [key]: typeof value === 'function' ? (value as (old: GuidedAttempt[K]) => GuidedAttempt[K])(previous[key]) : value });
    }
    const setStep = (value: SetStateAction<number>) => setField('step', value);
    const setSummary = (value: GuidedResult | null) => setField('summary', value);
    const setSelectedOrigin = (value: SetStateAction<string>) => setField('selectedOrigin', value);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const sending = useRef(false);
    const heading = useRef<HTMLHeadingElement>(null);
    const main = useRef<HTMLElement>(null);
    const preloadedImages = useRef(new Set<string>());
    const exercises = sequence.data?.exercises ?? [];
    const greetingChoices = exercises.slice(0, 3);
    const greetingsPanel = unit.config?.guided_lesson === 'greetings' && greetingChoices.length === 3
        && greetingChoices.every(exercise => exercise.type === 'seleccion_multiple' && exercise.config?.prompt_image && !exercise.config?.scene_choice);
    function panelLength(start: number) {
        if (greetingsPanel && start === 1) return 3;
        const triple = exercises.slice(start - 1, start + 2);
        if (triple.length === 3 && triple[0].config?.conversation_group !== 'c' && triple.every(exercise => exercise.type === 'seleccion_multiple' && exercise.config?.scene_choice
            && exercise.config.conversation_group === triple[0].config?.conversation_group)) return 3;
        const pair = exercises.slice(start - 1, start + 1);
        if (pair.length === 2 && pair.every(exercise => exercise.type === 'ordenar' && exercise.config?.sentence_order)) return 2;
        if (pair.length === 2 && pair.every(exercise => exercise.type === 'seleccion_multiple' && exercise.config?.scene_choice
            && exercise.config.conversation_group === pair[0].config?.conversation_group)) return 2;
        return unit.config?.guided_lesson !== 'greetings' && pair.length === 2
            && pair.every(exercise => exercise.type === 'seleccion_multiple' && exercise.config?.prompt_image) ? 2 : 1;
    }
    function panelStart(position: number) {
        if (position < 1) return position;
        for (let start = 1; start <= exercises.length;) {
            const end = start + panelLength(start) - 1;
            if (position >= start && position <= end) return start;
            start = end + 1;
        }
        return position;
    }
    const groupStart = panelStart(step);
    const length = step > 0 ? panelLength(groupStart) : 1;
    const groupedChoices = length > 1 ? exercises.slice(groupStart - 1, groupStart - 1 + length) : [];
    const isGrouped = groupedChoices.length > 1;
    const scenePanel = isGrouped && groupedChoices.every(exercise => exercise.config?.scene_choice);
    const orderPanel = isGrouped && groupedChoices.every(exercise => exercise.type === 'ordenar' && exercise.config?.sentence_order);
    const lastPanelStep = isGrouped ? groupStart + groupedChoices.length - 1 : step;
    const previousStep = panelStart((isGrouped ? groupStart : step) - 1);
    const current = step > 0 ? sequence.data?.exercises[step - 1] : undefined;
    const answer = current ? answers[current.id] ?? {} : {};
    const result = current ? feedback[current.id] : undefined;
    const feedbackText = result ? feedbackMessage(result.feedback) : '';
    const checked = isGrouped ? groupedChoices.every(exercise => feedback[exercise.id]?.response_id) : Boolean(result?.response_id);
    const correct = isGrouped ? groupedChoices.every(exercise => feedback[exercise.id]?.is_correct === true) : result?.is_correct === true;
    const canCheck = isGrouped ? groupedChoices.every(exercise => feedback[exercise.id]?.is_correct || answerComplete(exercise, answers[exercise.id] ?? {})) : Boolean(current && answerComplete(current, answer));
    const displayResult = isGrouped ? (checked ? {
        is_correct: groupedChoices.every(exercise => feedback[exercise.id]?.is_correct),
        xp_earned: groupedChoices.reduce((total, exercise) => total + (feedback[exercise.id]?.xp_earned ?? 0), 0),
        response_id: groupedChoices.map(exercise => feedback[exercise.id]?.response_id).join('-'),
    } : undefined) : result;
    const activityCount = sequence.data?.exercises.length ?? 0;
    const screenCount = activityCount + 1;
    const ready = activityCount > 0 && sequence.data?.total === activityCount;
    const moduleHref = `/aprender/modulo/${unit.module_id}`;
    const catalog = useMemo(() => sequence.data ? JSON.stringify(sequence.data.exercises.map(({ id, type, prompt, elements, zones, config }) => ({ id, type, prompt, elements, zones, config }))) : null, [sequence.data]);

    useEffect(() => {
        if (!catalog) return;
        const saved = readGuidedAttempt(draftKey);
        if ((saved.catalog && saved.catalog !== catalog) || saved.step > screenCount) {
            writeGuidedAttempt(draftKey, emptyGuidedAttempt(catalog));
            return;
        }
        const incomplete = exercises.findIndex(exercise => saved.feedback[exercise.id]?.is_correct !== true);
        const allowedStep = incomplete < 0 ? screenCount : panelStart(incomplete + 1);
        if (saved.step > allowedStep) {
            writeGuidedAttempt(draftKey, { ...saved, catalog, step: allowedStep, summary: null });
        } else if (saved.summary && incomplete < 0 && saved.summary.max_score !== activityCount) {
            writeGuidedAttempt(draftKey, { ...saved, catalog, summary: { ...saved.summary, score: activityCount, max_score: activityCount, correct_count: activityCount, total_items: activityCount, passed: true } });
        } else if (!saved.catalog) {
            writeGuidedAttempt(draftKey, { ...saved, catalog });
        }
    }, [catalog, draftKey, screenCount]);

    useEffect(() => { if (step > 0) heading.current?.focus(); main.current?.scrollTo({ top: 0 }); window.scrollTo({ top: 0 }); }, [step]);
    useEffect(() => {
        const paths = (sequence.data?.exercises.slice(Math.max(0, step - 1)) ?? [])
            .flatMap(exercise => [exercise.config?.prompt_image, ...exercise.elements.map(element => element.imagen)]).filter((path): path is string => Boolean(path));
        const images = [...new Set(paths)].slice(0, unit.config?.guided_lesson === 'greetings' ? 6 : 4);
        images.forEach(path => {
            const url = mediaUrl(path);
            if (!url || preloadedImages.current.has(url)) return;
            preloadedImages.current.add(url);
            const image = new Image();
            image.decoding = 'async';
            image.fetchPriority = 'low';
            image.onerror = () => { preloadedImages.current.delete(url); };
            image.src = url;
            void image.decode?.().catch(() => {});
        });
    }, [sequence.data, step]);

    function updateExercise(exercise: Exercise, value: ExerciseAnswer) {
        const latest = readGuidedAttempt(draftKey);
        if (busy || latest.feedback[exercise.id]?.is_correct) return;
        writeGuidedAttempt(draftKey, { ...latest, answers: { ...latest.answers, [exercise.id]: value },
            feedback: { ...latest.feedback, [exercise.id]: undefined }, submissions: { ...latest.submissions, [exercise.id]: undefined } });
        setError('');
    }
    function update(value: ExerciseAnswer) { if (current) updateExercise(current, value); }
    function selectOrigin(origin: string) {
        if (busy || result?.is_correct) return;
        if (answer.pares?.some(item => item.origen === origin)) {
            update({ pares: answer.pares.filter(item => item.origen !== origin) });
            setSelectedOrigin('');
            return;
        }
        setSelectedOrigin(previous => previous === origin ? '' : origin);
    }
    function pair(destination: string) {
        if (busy || result?.is_correct) return;
        if (answer.pares?.some(item => item.destino === destination)) {
            update({ pares: answer.pares.filter(item => item.destino !== destination) });
            setSelectedOrigin('');
            return;
        }
        if (!selectedOrigin) {
            return;
        }
        update({ pares: [...(answer.pares ?? []).filter(item => item.origen !== selectedOrigin && item.destino !== destination), { origen: selectedOrigin, destino: destination }] });
        setSelectedOrigin('');
    }
    function move(next: number) {
        const saved = readGuidedAttempt(draftKey);
        if (next > saved.step && exercises.slice(0, next - 1).some(exercise => saved.feedback[exercise.id]?.is_correct !== true)) return;
        setStep(next); setSelectedOrigin(''); setError('');
    }
    function retry() {
        writeGuidedAttempt(draftKey, emptyGuidedAttempt(catalog ?? ''));
        setError('');
    }
    async function finish() {
        const saved = readGuidedAttempt(draftKey);
        const responseIds = exercises.map(exercise => saved.feedback[exercise.id]?.response_id);
        if (sending.current || !ready || responseIds.some(id => !id) || exercises.some(exercise => saved.feedback[exercise.id]?.is_correct !== true)) return;
        sending.current = true; setBusy(true); setError('');
        const finishingAttemptId = readGuidedAttempt(draftKey).practiceAttemptId;
        try {
            const response = await apiPost<GuidedResult>(`/units/${unit.id}/guided/result`, { response_ids: responseIds, practice_attempt_id: finishingAttemptId });
            if (readGuidedAttempt(draftKey).practiceAttemptId !== finishingAttemptId) return;
            setSummary(response); move(screenCount);
        } catch (reason) {
            setError(reason instanceof ApiError ? Object.values(reason.errors).flat().join(' ') || reason.message : 'No se pudo cargar tu puntaje. Tus respuestas están guardadas; vuelve a intentarlo.');
        } finally { sending.current = false; setBusy(false); }
    }
    async function check() {
        const targets = (isGrouped ? groupedChoices : current ? [current] : []).filter(exercise => !feedback[exercise.id]?.is_correct);
        if (!targets.length || targets.some(exercise => !answerComplete(exercise, answers[exercise.id] ?? {})) || sending.current) return;
        sending.current = true; setBusy(true); setError('');
        try {
            const saved = readGuidedAttempt(draftKey);
            const submissions = { ...saved.submissions };
            targets.forEach(exercise => { submissions[exercise.id] ??= crypto.randomUUID(); });
            writeGuidedAttempt(draftKey, { ...saved, practiceAttemptId: saved.practiceAttemptId ?? crypto.randomUUID(), submissions });
            const pending = readGuidedAttempt(draftKey);
            const outcomes = await withProgressBatch(() => Promise.allSettled(targets.map(async exercise => {
                const before = readGuidedAttempt(draftKey);
                if (before.practiceAttemptId !== pending.practiceAttemptId || before.submissions[exercise.id] !== pending.submissions[exercise.id]) return;
                if (before.feedback[exercise.id]?.is_correct) return;
                const submittedAnswer = pending.answers[exercise.id] ?? {};
                const response = await apiPost<ExerciseFeedback>(`/exercises/${exercise.id}/answer`, { answer: submittedAnswer, practice_attempt_id: pending.practiceAttemptId, submission_id: pending.submissions[exercise.id] });
                const latest = readGuidedAttempt(draftKey);
                if (latest.practiceAttemptId !== pending.practiceAttemptId || latest.submissions[exercise.id] !== pending.submissions[exercise.id]
                    || (response.response_id !== undefined && latest.feedback[exercise.id]?.response_id === response.response_id)) return;
                writeGuidedAttempt(draftKey, { ...latest, feedback: { ...latest.feedback, [exercise.id]: response },
                    xpEarned: response.xp_attempt === undefined ? latest.xpEarned + (response.xp_earned ?? 0) : Math.max(latest.xpEarned, response.xp_attempt) });
                return response;
            })));
            const failed = outcomes.find(outcome => outcome.status === 'rejected');
            if (failed?.status === 'rejected') throw failed.reason;
            const graded = outcomes.flatMap(outcome => outcome.status === 'fulfilled' && outcome.value ? [outcome.value] : []);
            if (graded.length) playAnswerSound(graded.every(response => response.is_correct === true));
        } catch (reason) {
            setError(reason instanceof ApiError ? Object.values(reason.errors).flat().join(' ') || reason.message : 'No se pudo guardar tu respuesta. Se conserva tu selección; vuelve a intentarlo.');
        } finally { sending.current = false; setBusy(false); }
    }
    const origins = current?.elements.filter(item => item.grupo === 'origen') ?? [];
    const destinations = current?.elements.filter(item => item.grupo === 'destino') ?? [];

    return <div className={`guided-unit-shell${unit.config?.guided_lesson === 'pronouns' ? ' is-pronouns' : ''}${unit.config?.guided_lesson === 'greetings' ? ' is-greetings' : ''}${unit.config?.guided_lesson === 'numbers' ? ' is-numbers' : ''}${step > 0 && step < screenCount ? ' is-activity' : ''}${summary && step === screenCount ? ' is-result' : ''}`}>
        <Head title={`${unit.title} · Actividades`} />
        <header className="guided-unit-header">
            <Link href={moduleHref} className="guided-unit-brand"><BookOpen size={24} aria-hidden="true" /><span>KICHWA</span></Link>
            <span className="guided-unit-level">NIVEL {unit.level_name}</span>
            <div className="guided-unit-location"><span title={unit.module_name}>Unidad {unit.sort_order} · {unit.title}</span><Link href={moduleHref} aria-label="Salir de las actividades" title="Volver al módulo"><X size={22} aria-hidden="true" /></Link></div>
        </header>
        <section ref={main} className="guided-unit-main" aria-label="Contenido de la unidad" aria-busy={sequence.loading || busy}>
            {sequence.loading ? <LoadingState label="Preparando tu unidad…" /> : sequence.error ? <ErrorState message={sequence.error} /> : !ready ? <ErrorState message="Las actividades de esta unidad están en preparación." /> : summary && step === screenCount ? <section className="guided-result" aria-labelledby="guided-result-title">
                <p className="eyebrow">RESULTADO DE LA UNIDAD</p>
                <LearningCompanion final portraitOnly correct={summary.passed} score={`${summary.score} / ${summary.max_score}`} xpEarned={summary.xp_earned ?? xpEarned} />
                <h1 id="guided-result-title" ref={heading} tabIndex={-1}>{summary.passed ? '¡Buen trabajo!' : 'Sigue practicando'}</h1>
                <p className={`guided-result-status ${summary.passed ? 'is-passed' : ''}`}>{summary.passed ? 'Meta alcanzada' : 'Por debajo de la meta'}</p>
                <div className="guided-result-metrics">
                    <div><span>EJERCICIOS CORRECTOS</span><p className="guided-result-score" aria-label={`${summary.score} de ${summary.max_score} ejercicios correctos`}>{summary.score}<span> / {summary.max_score}</span></p></div>
                    <div><span>XP DE ESTE INTENTO</span><p className="guided-result-earned">+{summary.xp_earned ?? xpEarned}<span> XP</span></p></div>
                </div>
                <p className="guided-result-note">Cada ejercicio correcto suma <strong>10 XP</strong>.</p>
                <div className="guided-result-actions">
                    <button type="button" className="secondary-button" onClick={retry}><RotateCcw size={18} aria-hidden="true" />Reintentar</button>
                    <Link className="primary-button" href={summary.next_unit_id ? `/aprender/unidad/${summary.next_unit_id}` : `/aprender/nivel/${unit.level_id}`}>Continuar <ArrowRight size={18} aria-hidden="true" /></Link>
                    <Link className="guided-result-exit" href={moduleHref}><ArrowLeft size={17} aria-hidden="true" />Salir a unidades</Link>
                </div>
            </section> : <>
                {step > 0 && <div className="exercise-companion-header"><div><h1 className="guided-exercise-heading" ref={heading} tabIndex={-1}>{current?.config?.title}</h1>
                <p className="guided-unit-description">{orderPanel ? 'Toca las palabras para formar cada oración en kichwa. Puedes quitar una palabra o reiniciar para cambiar el orden.' : scenePanel ? `Observa las ${groupedChoices.length === 2 ? 'dos' : 'tres'} escenas. Escucha las opciones y elige la expresión en kichwa que corresponde a cada una.` : isGrouped ? greetingsPanel ? 'Observa las tres imágenes. Elige el saludo en kichwa que corresponde a cada momento del día.' : unit.config?.guided_lesson === 'pronouns' ? 'Observa las dos escenas. Selecciona el pronombre correcto en kichwa para cada una.' : 'Observa las dos imágenes. Selecciona el nombre en kichwa de cada una.' : current?.prompt}</p></div><LearningCompanion key={displayResult ? `response-${displayResult.response_id}` : `ready-${current?.id}`} correct={displayResult?.is_correct} xpEarned={displayResult?.xp_earned} xpTotal={isGrouped ? undefined : result?.xp_total} /></div>}
                {step === 0 ? (unit.config?.guided_lesson === 'greetings' ? <GreetingsIntroduction /> : unit.config?.guided_lesson && ['pronouns', 'numbers', 'calendar', 'animals-colors', 'body', 'nature', 'verbs'].includes(unit.config.guided_lesson) ? <TopicIntroduction lesson={unit.config.guided_lesson} /> : <GuidedIntroduction />) : orderPanel ? <SentenceOrderPanel exercises={groupedChoices} answers={answers} feedback={feedback} busy={busy} onChange={updateExercise} /> : scenePanel ? <SceneChoicePanel key={groupStart} exercises={groupedChoices} answers={answers} feedback={feedback} busy={busy} onChange={updateExercise} /> : isGrouped ? <section className="guided-choice-panel" aria-label={greetingsPanel ? "Reconoce los tres saludos" : "Reconoce las dos imágenes"}>
                    {groupedChoices.map((exercise, index) => {
                        const selection = answers[exercise.id] ?? {};
                        const graded = feedback[exercise.id];
                        const message = graded ? feedbackMessage(graded.feedback) : '';
                        return <article className="guided-choice-panel-item" key={exercise.id}>
                            <fieldset className="guided-choice" disabled={busy || graded?.is_correct === true}>
                                <legend className="guided-choice-panel-label">Imagen {index + 1}</legend>
                                <figure className="guided-choice-visual"><img className="guided-choice-image" src={mediaUrl(exercise.config?.prompt_image)} alt={exercise.config?.prompt_image_alt ?? 'Imagen para reconocer una palabra en kichwa'} width={280} height={210} decoding="async" fetchPriority="high" />{greetingsPanel && exercise.config?.context_text && <figcaption className="guided-image-time" aria-label={`Hora de la escena: ${exercise.config.context_text}`}>{exercise.config.context_text}</figcaption>}</figure>
                                {!greetingsPanel && exercise.config?.context_text && <p className="guided-choice-context">{exercise.config.context_text}</p>}
                                <div className="guided-choice-options">{exercise.elements.map(option => <label key={option.id} className={selection.seleccion?.includes(option.id) ? 'is-selected' : ''}>
                                    <input type="radio" name={`guided-${exercise.id}`} value={option.id} checked={selection.seleccion?.includes(option.id) ?? false} onChange={() => updateExercise(exercise, { seleccion: [option.id] })} /><span>{option.texto}</span>
                                </label>)}</div>
                            </fieldset>
                            {graded && message && <p className={`guided-feedback ${graded.is_correct ? 'is-correct' : 'is-incorrect'}`} role="status">{graded.is_correct && <CheckCircle2 size={20} aria-hidden="true" />}<span>{message}</span></p>}
                        </article>;
                    })}
                </section> : current?.type === 'seleccion_multiple' ? <fieldset className="guided-choice" disabled={busy || result?.is_correct === true}>
                    <legend className="sr-only">Selecciona el nombre en kichwa de la imagen</legend>
                    <figure className="guided-choice-visual">
                        <img className="guided-choice-image" src={mediaUrl(current.config?.prompt_image)} alt={current.config?.prompt_image_alt ?? "Imagen del ejercicio para reconocer una palabra en kichwa"} width={280} height={210} decoding="async" fetchPriority="high" />
                        {unit.config?.guided_lesson === 'greetings' && current.config?.context_text && <figcaption className="guided-image-time" aria-label={`Hora de la escena: ${current.config.context_text}`}>{current.config.context_text}</figcaption>}
                    </figure>
                    <div className="guided-choice-options">{current.elements.map(option => <label key={option.id} className={answer.seleccion?.includes(option.id) ? 'is-selected' : ''}>
                        <input type="radio" name={`guided-${current.id}`} value={option.id} checked={answer.seleccion?.includes(option.id) ?? false} onChange={() => update({ seleccion: [option.id] })} /><span>{option.texto}</span>
                    </label>)}</div>
                </fieldset> : current?.type === 'completar' && (current.config?.numbers_activity === 'count' || current.config?.numbers_activity === 'sentences') ? <NumbersPractice key={current.id} exercise={current} answer={answer} disabled={busy || result?.is_correct === true} onChange={update} /> : current?.type === 'relacionar' && current.config?.conversation_pairs ? <ConversationMatchingExercise key={current.id} group={current.config.conversation_group ?? 'q'} exercise={current} answer={answer} selectedOrigin={selectedOrigin} disabled={busy || result?.is_correct === true} onSelectOrigin={selectOrigin} onPair={pair} /> : current?.type === 'completar' && (current.config?.listening_greetings || current.config?.listening_questions) ? <ListeningGreetingsExercise key={current.id} exercise={current} answer={answer} disabled={busy || result?.is_correct === true} onChange={update} /> : current?.type === 'relacionar' && current.config?.listening_questions ? <AudioMatchingExercise key={current.id} exercise={current} answer={answer} selectedOrigin={selectedOrigin} disabled={busy || result?.is_correct === true} onSelectOrigin={selectOrigin} onPair={pair} /> : current?.type === 'completar' && current.config?.listening_vowels ? <MissingVowelExercise key={current.id} exercise={current} answer={answer} disabled={busy || result?.is_correct === true} onChange={update} /> : <section className="guided-matching-panel" aria-label="Asociación de palabras">
                    <header className="guided-matching-intro">
                        <div className="guided-matching-progress"><span><strong>{answer.pares?.length ?? 0}<small> / {origins.length}</small></strong><span>parejas</span></span><progress value={answer.pares?.length ?? 0} max={origins.length || 1} aria-label="Parejas seleccionadas" /></div>
                    </header>
                    <fieldset className="guided-matching" disabled={busy || result?.is_correct === true}>
                    <legend className="sr-only">Relaciona cada expresión en español con su pareja en kichwa</legend>
                    <div className="guided-matching-column"><div className="guided-matching-column-heading"><h3>ESPAÑOL</h3></div>{origins.map((origin, index) => <button type="button" key={origin.id} className={`${selectedOrigin === origin.id ? 'is-selected' : ''}${answer.pares?.some(item => item.origen === origin.id) ? ' is-paired' : ''}`} aria-label={origin.texto} aria-pressed={selectedOrigin === origin.id || answer.pares?.some(item => item.origen === origin.id) === true} onClick={() => selectOrigin(origin.id)}>
                        <span className="guided-matching-word"><strong>{origin.texto}</strong></span>{answer.pares?.some(item => item.origen === origin.id) ? <span className="guided-pair-number" aria-label={`Pareja ${index + 1}`}>{index + 1}</span> : <span className="guided-matching-dot" aria-hidden="true" />}
                    </button>)}</div>
                    <div className="guided-matching-column"><div className="guided-matching-column-heading"><h3>KICHWA</h3></div>{destinations.map(destination => {
                        const matched = answer.pares?.find(item => item.destino === destination.id);
                        const number = matched ? origins.findIndex(origin => origin.id === matched.origen) + 1 : 0;
                        return <button type="button" key={destination.id} className={matched ? 'is-paired' : ''} aria-label={destination.texto} aria-pressed={Boolean(matched)} disabled={(!selectedOrigin && !matched) || busy} onClick={() => pair(destination.id)}><span className="guided-matching-word"><strong>{destination.texto}</strong></span>{number > 0 ? <span className="guided-pair-number" aria-label={`Pareja ${number}`}>{number}</span> : <span className="guided-matching-dot" aria-hidden="true" />}</button>;
                    })}</div>
                    <p className="sr-only" role="status">{answer.pares?.length ?? 0} de {origins.length} parejas seleccionadas. {result?.is_correct ? 'Las parejas están comprobadas.' : selectedOrigin ? `Ahora elige la pareja de «${origins.find(origin => origin.id === selectedOrigin)?.texto}» en kichwa.` : 'Puedes cambiar una pareja antes de comprobar.'}</p>
                    </fieldset>

                </section>}
                {!isGrouped && result && feedbackText && <p className={`guided-feedback ${result.is_correct ? 'is-correct' : 'is-incorrect'}`} role="status">{result.is_correct && <CheckCircle2 size={20} aria-hidden="true" />}<span>{feedbackText}</span></p>}
                {error && <p className="form-error" role="alert">{error}</p>}
            </>}
        </section>
        {step < screenCount && <footer className="guided-unit-footer">
            {step === 0 ? <Link href={moduleHref} className="guided-back"><ArrowLeft size={16} aria-hidden="true" />Volver</Link> : <button type="button" className="guided-back" disabled={busy} onClick={() => move(previousStep)}><ArrowLeft size={16} aria-hidden="true" />Volver</button>}
            {step > 0 && <div className="guided-attempt-progress"><span className="guided-step" aria-label={isGrouped ? `Ejercicios ${groupStart} ${greetingsPanel ? 'a' : 'y'} ${lastPanelStep} de ${activityCount}` : `Ejercicio ${step} de ${activityCount}`}>{isGrouped ? `${String(groupStart).padStart(2, '0')}–${String(lastPanelStep).padStart(2, '0')}` : String(step).padStart(2, '0')} <span>/ {String(activityCount).padStart(2, '0')}</span></span><span className="guided-attempt-xp">{xpEarned} XP en este intento</span></div>}
            {ready && !sequence.error && !sequence.loading && (step === 0 ? <button type="button" className="primary-button" onClick={() => move(1)}>Continuar <ArrowRight size={17} aria-hidden="true" /></button> : correct ? <button type="button" className="primary-button" disabled={busy} onClick={() => lastPanelStep === activityCount ? void finish() : move(lastPanelStep + 1)}>{busy ? <><LoaderCircle size={17} className="animate-spin" aria-hidden="true" />Calculando…</> : lastPanelStep === activityCount ? <>Ver mi puntaje <ArrowRight size={17} aria-hidden="true" /></> : <>Continuar <ArrowRight size={17} aria-hidden="true" /></>}</button> : <button type="button" className="primary-button" disabled={busy || !canCheck} onClick={() => void check()}>{busy && <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />}{busy ? 'Comprobando…' : 'Comprobar'}</button>)}
        </footer>}
    </div>;
}
