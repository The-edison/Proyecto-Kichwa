import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/pages/Student/Evaluation.tsx', import.meta.url), 'utf8'), 'Evaluation.tsx');
const summarySource = (await transformWithOxc(await readFile(new URL('../src/js/components/EvaluationResultSummary.tsx', import.meta.url), 'utf8'), 'EvaluationResultSummary.tsx')).code;
const jsx = (type, props) => typeof type === 'function' ? type(props) : ({ type, props });
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : tree?.props ? [tree, ...nodes(tree.props.children)] : [];
const text = tree => Array.isArray(tree) ? tree.map(text).join('') : tree?.props ? text(tree.props.children) : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : '';

async function screen(overrides = {}) {
    const states = [], requests = [];
    let cursor = 0;
    const context = vm.createContext({ window: {} });
    const data = { id: 10, module_id: 8, level_id: 1, type: 'unidad', title: 'Prueba', config: { managed: true }, history: [{ id: 77, number: 1, state: 'en_curso' }], ...overrides };
    const attempt = { attempt_id: 77, evaluation_id: 8, state: 'en_curso', questions: [{ id: 5, type: 'seleccion_multiple', prompt: 'Elige.', elements: [{ id: 'yes', texto: 'Sí' }], config: {} }], answers: { 5: { seleccion: ['yes'] } }, result: null };
    const dependencies = {
        react: { useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => states[index] = typeof value === 'function' ? value(states[index]) : value]; }, useRef(initial) { const index = cursor++; return states[index] ??= { current: initial }; }, useEffect() {} },
        'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
        navigation: { Head: 'Head', Link: 'Link' }, ModuleFinalEvaluation: { default: 'ModuleFinalEvaluation' },
        useAnswerSound: { useAnswerSound: () => () => {} }, AppLayout: { AppLayout: 'AppLayout' },
        ExerciseCard: { ExerciseInteraction: 'ExerciseInteraction', answerComplete: (_question, answer) => Boolean(answer.seleccion?.length) },
        LearningCompanion: { LearningCompanion: 'LearningCompanion' }, States: { ErrorState: 'ErrorState', LoadingState: 'LoadingState', EmptyState: 'EmptyState' },
        useApi: { useApi: () => ({ data, loading: false }) }, 'exercise-page-turn.css': {}, 'module-final.css': {},
        api: { ApiError: class extends Error {}, apiDelete() {}, async apiGet(path) { requests.push({ path }); return attempt; }, async apiPatch(path, payload) { requests.push({ path, payload }); return { saved: true }; }, async apiPost(path, payload) { requests.push({ path, payload }); return path.endsWith('/attempts') ? payload?.new_version ? { ...attempt, evaluation_id: 10, answers: {} } : attempt : { score: 100, passed: true, correct_count: 1, total_questions: 1, results: [{question_id: 5, is_correct: true, feedback: 'Correcto.'}] }; } },
    };
    const summary = new vm.SourceTextModule(summarySource, { context });
    await summary.link(specifier => { const dep = dependencies[specifier] ?? dependencies[specifier.split('/').at(-1)]; assert.ok(dep, specifier); return new vm.SyntheticModule(Object.keys(dep), function () { for (const [key, value] of Object.entries(dep)) this.setExport(key, value); }, { context }); });
    await summary.evaluate();
    dependencies.EvaluationResultSummary = { EvaluationResultSummary: summary.namespace.EvaluationResultSummary, EvaluationAnswerReview: summary.namespace.EvaluationAnswerReview };
    const module = new vm.SourceTextModule(code, { context });
    await module.link(specifier => { const dep = dependencies[specifier] ?? dependencies[specifier.split('/').at(-1)]; assert.ok(dep, specifier); return new vm.SyntheticModule(Object.keys(dep), function () { for (const [key, value] of Object.entries(dep)) this.setExport(key, value); }, { context }); });
    await module.evaluate();
    return { requests, render() { cursor = 0; return nodes(module.namespace.default({ evaluationId: 10 })); } };
}

test('unit tests retain restored answers and submit to the version of the resumed attempt', async () => {
    for (const action of ['Continuar prueba', 'Retomar']) {
        const view = await screen();
        await view.render().find(node => node.type === 'button' && text(node) === action).props.onClick();
        await new Promise(resolve => setImmediate(resolve));
        const interaction = view.render().find(node => node.type === 'ExerciseInteraction');
        assert.ok(interaction, action + ': ' + text(view.render()));
        assert.deepEqual(interaction.props.answer, { seleccion: ['yes'] });
        await view.render().find(node => node.type === 'button' && text(node) === 'Finalizar prueba').props.onClick();
        const submission = view.requests.find(request => request.path.endsWith('/submit'));
        assert.equal(submission.path, '/evaluations/8/submit');
        assert.equal(submission.payload.attempt_id, 77);
        assert.equal(submission.payload.answers[0].question_id, 5);
    }
});

test('unit results allow repeated fresh attempts, answer review and return to their module', async () => {
    const view = await screen();
    await view.render().find(node => node.type === 'button' && text(node) === 'Continuar prueba').props.onClick();
    for (let retry = 0; retry < 3; retry++) {
        view.render().find(node => node.type === 'ExerciseInteraction').props.onChange({ seleccion: ['yes'] });
        await view.render().find(node => node.type === 'button' && text(node) === 'Finalizar prueba').props.onClick();
        const actions = view.render().filter(node => node.type === 'button' || node.type === 'Link' || node.type === 'summary');
        assert.deepEqual(actions.map(text), ['Reintentar', 'Volver a las unidades', 'Revisar respuestas']);
        assert.equal(actions.find(node => node.type === 'Link').props.href, '/aprender/modulo/8');
        assert.ok(text(view.render()).includes('Tu respuesta: Sí'));
        assert.equal(text(view.render()).includes('XP'), false);
        await view.render().find(node => node.type === 'button' && text(node) === 'Reintentar').props.onClick();
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(view.requests.filter(request => request.path.endsWith('/attempts')).at(-1).payload.new_version, true);
        const answer = view.render().find(node => node.type === 'ExerciseInteraction').props.answer;
        assert.deepEqual(JSON.parse(JSON.stringify(answer)), {});
    }
});

test('unit exams start for the first time, retry after completion and enter focused mode', async () => {
    for (const [history, label] of [
        [[], 'Iniciar prueba'],
        [[{ id: 80, number: 3, state: 'finalizado', result: { score: 70 } }, { id: 77, number: 2, state: 'finalizado', result: { score: 90 } }], 'Reintentar'],
    ]) {
        const view = await screen({ history });
        assert.equal(view.render().find(node => node.type === 'AppLayout').props.focused, false);
        assert.equal(text(view.render()).includes('90%'), false);
        await view.render().find(node => node.type === 'button' && text(node) === label).props.onClick();
        assert.equal(view.render().find(node => node.type === 'AppLayout').props.focused, true);
        if (history.length) assert.equal(view.requests.at(-1).payload.new_version, true);
    }
});
