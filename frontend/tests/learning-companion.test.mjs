import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import { transformWithOxc } from 'vite';

const transform = async name => (await transformWithOxc(await readFile(new URL(`../src/js/components/${name}.tsx`, import.meta.url), 'utf8'), `${name}.tsx`)).code;
const companionCode = await transform('LearningCompanion');
const cardCode = await transform('ExerciseCard');
const jsx = (type, props) => ({ type, props });
function nodes(tree) { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!tree?.props) return []; return [tree, ...nodes(tree.props.children)]; }
function content(tree) { if (Array.isArray(tree)) return tree.map(content).join(''); return tree?.props ? content(tree.props.children) : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : ''; }
async function load(code, dependencies) {
    const context = vm.createContext({ crypto: { randomUUID } });
    const module = new vm.SourceTextModule(code, { context });
    await module.link(specifier => {
        const exports = specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' } : dependencies(specifier);
        assert.ok(exports, `Missing dependency ${specifier}`);
        return new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context });
    });
    await module.evaluate();
    return module.namespace;
}
const { LearningCompanion } = await load(companionCode, specifier => specifier.endsWith('.webp') ? { default: specifier } : {});

test('companion reveals no reward or score before checking', () => {
    const view = LearningCompanion({});
    assert.match(view.props.className, /is-ready/);
    assert.equal(content(view).includes('XP'), false);
    assert.equal(nodes(view).some(n => n.props.className === 'learning-companion-score'), false);
});

test('graded exercise responses hide the companion badge and XP', () => {
    const success = LearningCompanion({ correct: true, xpEarned: 10, xpTotal: 70 });
    const retry = LearningCompanion({ correct: false, xpEarned: 0, xpTotal: 70 });
    assert.notEqual(nodes(success).find(n => n.type === 'img').props.src, nodes(retry).find(n => n.type === 'img').props.src);
    assert.doesNotMatch(content(success), /\+10 XP|Alli rurashka|Bien hecho/);
    assert.doesNotMatch(content(retry), /\+0 XP|Kutin rurapay|Cada intento/);
    assert.equal(nodes(success).some(n => n.props.className === 'learning-companion-message'), false);
    assert.equal(nodes(retry).some(n => n.props.className === 'learning-companion-message'), false);
    for (const view of [success, retry]) {
        assert.doesNotMatch(content(view), /ganados en esta actividad|Total acumulado|70 XP/);
    }
    assert.match(retry.props.className, /is-encourage/);
    assert.equal(nodes(retry).some(n => n.props.role === 'status'), false);
});

test('zero XP stays zero on an already rewarded or unrewarded correct activity', () => {
    const view = LearningCompanion({ correct: true, xpEarned: 0 });
    assert.doesNotMatch(content(view), /\+0 XP|ya cuentan en este intento/);
    assert.equal(content(view).includes('undefined'), false);
});

test('final score appears below the portrait for both passed and below-target results', () => {
    for (const correct of [true, false]) {
        const view = LearningCompanion({ final: true, correct, score: correct ? '20 / 20' : '12 / 20', xpEarned: 10 });
        assert.match(view.props.className, /is-final/);
        assert.match(content(view), /Puntuación final/);
        assert.match(content(view), correct ? /20 \/ 20/ : /12 \/ 20/);
        assert.match(content(view), /\+10 XP/);
    }
});

test('portrait-only results leave the grade and XP to the result panel', () => {
    const view = LearningCompanion({ final: true, portraitOnly: true, correct: true, score: '20 / 20', xpEarned: 50 });
    assert.equal(nodes(view).filter(node => node.type === 'img').length, 1);
    assert.equal(nodes(view).some(node => node.props.className === 'learning-companion-message'), false);
    assert.doesNotMatch(content(view), /20 \/ 20|50 XP|Puntuación final/);
});

async function card(post) {
    let cursor = 0;
    const states = [], requests = [];
    const module = await load(cardCode, specifier => specifier.endsWith('/useAnswerSound') ? { useAnswerSound: () => () => {} } : specifier === 'react' ? {
        useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
        useRef(initial) { const index = cursor++; return states[index] ??= { current: initial }; },
    } : specifier.endsWith('/LearningCompanion') ? { LearningCompanion: 'LearningCompanion' } : specifier.endsWith('/SuccessConfetti') ? { SuccessConfetti: 'SuccessConfetti' } : {
        apiBaseUrl: '', ApiError: class extends Error {}, apiPost: async (path, payload) => { requests.push({ path, payload }); return post(payload); },
    });
    return {
        requests,
        render() { cursor = 0; return module.ExerciseCard({ exercise: { id: 3, type: 'seleccion_multiple', prompt: 'Elige una palabra', elements: [{ id: 'wasi', texto: 'wasi' }], zones: [], config: { max_selections: 1 } }, index: 0 }); },
    };
}
const companion = view => nodes(view.render()).find(n => n.type === 'LearningCompanion').props;
const select = view => nodes(view.render()).find(n => typeof n.type === 'function').props.onChange({ seleccion: ['wasi'] });
const check = view => nodes(view.render()).find(n => n.type === 'button').props.onClick();

test('exercise feedback leaves Cometa greetings out and preserves the explanation', async () => {
    for (const [message, expected] of [
        ['Alli rurashka. Sisa significa flor.', 'Sisa significa flor.'],
        ['Kutin rurapay. Observa la flor y vuelve a intentarlo.', 'Observa la flor y vuelve a intentarlo.'],
        ['Respuesta correcta.', 'Respuesta correcta.'],
        ['Alli rurashka', ''],
    ]) {
        const view = await card(() => ({ response_id: 4, is_correct: true, feedback: message }));
        select(view); await check(view);
        const notice = nodes(view.render()).find(n => n.type === 'p' && n.props.role === 'status');
        assert.equal(notice ? content(notice) : '', expected);
    }
});

test('a correct activity locks its answer and keeps its graded feedback', async () => {
    const view = await card(() => ({ response_id: 4, is_correct: true, feedback: 'Correcto', xp_earned: 10, xp_total: 30 }));
    assert.equal(companion(view).xpEarned, undefined);
    select(view); await check(view);
    assert.equal(view.requests[0].path, '/exercises/3/answer');
    assert.equal(companion(view).correct, true);
    assert.equal(companion(view).xpEarned, 10);
    assert.equal(companion(view).xpTotal, 30);
    select(view);
    assert.equal(companion(view).xpEarned, 10);
    assert.equal(companion(view).correct, true);
    assert.equal(nodes(view.render()).find(n => n.type === 'fieldset').props.disabled, true);
});

test('standalone exercises celebrate a correct submission and clear confetti for a new attempt', async () => {
    let correct = false;
    const view = await card(() => ({ response_id: correct ? 2 : 1, is_correct: correct, feedback: 'Revisado.' }));
    const celebrates = () => nodes(view.render()).some(node => node.type === 'SuccessConfetti');
    select(view); await check(view);
    assert.equal(celebrates(), false);
    correct = true;
    await check(view);
    assert.equal(celebrates(), true);
    nodes(view.render()).find(node => node.type === 'button' && node.props.children === 'Nuevo intento').props.onClick();
    assert.equal(celebrates(), false);
});

test('an incorrect activity stays editable until it is corrected', async () => {
    let correct = false;
    const view = await card(() => ({ response_id: 4, is_correct: correct, feedback: 'Revisa tu respuesta', xp_earned: correct ? 10 : 0 }));
    select(view); await check(view);
    assert.equal(nodes(view.render()).find(n => n.type === 'fieldset').props.disabled, false);
    select(view);
    assert.equal(companion(view).correct, undefined);
    correct = true; await check(view);
    assert.equal(companion(view).correct, true);
    assert.equal(nodes(view.render()).find(n => n.type === 'fieldset').props.disabled, true);
});

test('activity double clicks send one request and network failures do not invent rewards', async () => {
    let reject;
    const view = await card(() => new Promise((resolve, fail) => { reject = fail; }));
    select(view);
    const pending = check(view);
    await check(view);
    assert.equal(view.requests.length, 1);
    assert.equal(companion(view).xpEarned, undefined);
    reject(new Error('offline')); await pending;
    assert.equal(companion(view).xpEarned, undefined);
    assert.ok(nodes(view.render()).some(n => n.props.role === 'alert'));
    assert.equal(nodes(view.render()).find(n => n.type === 'button').props.disabled, false);
});

test('a new activity attempt clears the answer and uses a fresh reward scope', async () => {
    const view = await card(() => ({ response_id: 4, is_correct: true, feedback: 'Alli rurashka', xp_earned: 10, xp_total: 20 }));
    select(view); await check(view);
    const first = view.requests[0].payload;
    nodes(view.render()).find(n => n.type === 'button' && n.props.children === 'Nuevo intento').props.onClick();
    assert.equal(companion(view).xpEarned, undefined);
    assert.equal(nodes(view.render()).find(n => n.type === 'button').props.disabled, true);
    select(view); await check(view);
    assert.notEqual(view.requests[1].payload.practice_attempt_id, first.practice_attempt_id);
    assert.notEqual(view.requests[1].payload.submission_id, first.submission_id);
    assert.equal(companion(view).xpEarned, 10);
});

test('retrying a failed answer request keeps its submission ID until the answer changes', async () => {
    let fail = true;
    const view = await card(() => { if (fail) throw new Error('offline'); return { response_id: 4, is_correct: true, feedback: 'Alli rurashka', xp_earned: 10 }; });
    select(view); await check(view);
    const first = view.requests[0].payload;
    fail = false; await check(view);
    assert.equal(view.requests[1].payload.submission_id, first.submission_id);
    assert.equal(view.requests[1].payload.practice_attempt_id, first.practice_attempt_id);
});
