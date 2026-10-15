import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/components/GuidedUnit.tsx', import.meta.url), 'utf8'), 'GuidedUnit.tsx');
const { code: interactionCode } = await transformWithOxc(await readFile(new URL('../src/js/components/ExerciseCard.tsx', import.meta.url), 'utf8'), 'ExerciseCard.tsx');
const { code: persistenceCode } = await transformWithOxc(await readFile(new URL('../src/js/services/guidedAttempt.ts', import.meta.url), 'utf8'), 'guidedAttempt.ts');
const choice = { id: 11, type: 'seleccion_multiple', prompt: 'Observa la imagen.', elements: ['shunku', 'sisa', 'wasi', 'llama'].map(id => ({ id, texto: id })), zones: [], config: { title: '¿Qué palabra corresponde?', prompt_image: 'kichwa/imagenes/casa.webp', max_selections: 1, exact_selections: true } };
const matching = { id: 12, type: 'relacionar', prompt: 'Selecciona una palabra y su pareja.', elements: [...['Flor', 'Oveja', 'Corazón', 'Caminar'].map((texto, index) => ({ id: ['flor', 'oveja', 'corazon', 'caminar'][index], texto, grupo: 'origen' })), ...['purina', 'shunku', 'sisa', 'llama'].map(id => ({ id, texto: id, grupo: 'destino' }))], zones: [], config: { title: 'Palabras en dos idiomas' } };
const perfectScore = { score: 20, max_score: 20, correct_count: 5, total_items: 5, passed: true, next_unit_id: 5, details: [{ exercise_id: 11, title: '¿Qué palabra corresponde?', correct: 1, total: 1 }, { exercise_id: 12, title: 'Palabras en dos idiomas', correct: 4, total: 4 }] };

async function screen({ completed = false, post, exercises = [choice, matching], config, storage = new Map(), userId = 3, unitId = 4, blockedStorage = false } = {}) {
    let cursor = 0, refreshes = 0;
    const states = [], requests = [];
    const effects = [], effectDeps = [];
    const context = vm.createContext({ crypto: { randomUUID }, Image: class { }, window: { scrollTo() {}, sessionStorage: { getItem(key) { if (blockedStorage) throw Error('blocked'); return storage.get(key) ?? null; }, setItem(key, value) { if (blockedStorage) throw Error('blocked'); storage.set(key, value); } } } });
    const jsx = (type, props) => ({ type, props });
    class ApiError extends Error { constructor(message) { super(message); this.errors = {}; } }
    const dependencies = {
        react: {
            useState: initial => { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
            useRef: initial => { const index = cursor++; return states[index] ??= { current: initial }; },
            useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
            useEffect(callback, deps) { const index = cursor++; if (!effectDeps[index] || deps.some((value, i) => value !== effectDeps[index][i])) { effectDeps[index] = deps; effects.push(callback); } },
        },
        'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
        'lucide-react': Object.fromEntries(['ArrowLeft', 'ArrowRight', 'BookOpen', 'CheckCircle2', 'LoaderCircle', 'RotateCcw', 'Star', 'X'].map(name => [name, name])),
        'guided-unit.css': {},
        navigation: { Head: 'Head', Link: 'Link' },
        useApi: { useApi: () => ({ data: { exercises: exercises.map(item => ({ ...item, completed })), total: exercises.length, completed_count: completed ? exercises.length : 0 }, loading: false, error: '', refresh: async () => { refreshes++; } }) },
        api: { ApiError, apiBaseUrl: '', apiPost: async (path, payload) => { requests.push({ path, payload }); return post ? post({ path, payload, ApiError }) : path.endsWith('/guided/result') ? perfectScore : { response_id: requests.length + 100, is_correct: true, feedback: 'Respuesta correcta.' }; } },
        LearningCompanion: { LearningCompanion: 'LearningCompanion' },
        GuidedIntroduction: { GuidedIntroduction: 'GuidedIntroduction' },
        GreetingsIntroduction: { GreetingsIntroduction: 'GreetingsIntroduction' },
        States: { ErrorState: 'ErrorState', LoadingState: 'LoadingState' },
        AuthContext: { useAuth: () => ({ user: { id: userId } }) },
    };
    const cache = new Map();
    const interaction = new vm.SourceTextModule(interactionCode, { context });
    const persistence = new vm.SourceTextModule(persistenceCode, { context });
    await persistence.link(() => { throw Error('Unexpected persistence dependency'); });
    await persistence.evaluate();
    async function link(specifier) {
        if (specifier.endsWith('/ExerciseCard')) return interaction;
        if (specifier.endsWith('/guidedAttempt')) return persistence;
        const key = specifier.split('/').at(-1);
        const name = dependencies[specifier] ? specifier : key;
        if (!cache.has(name)) {
            const exports = dependencies[name];
            assert.ok(exports, `Missing dependency ${specifier}`);
            cache.set(name, new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context }));
        }
        return cache.get(name);
    }
    await interaction.link(link); await interaction.evaluate();
    const module = new vm.SourceTextModule(code, { context });
    await module.link(link); await module.evaluate();
    const render = () => { cursor = 0; const tree = module.namespace.GuidedUnit({ unit: { config, id: unitId, module_id: 8, level_id: 1, title: 'Conociendo el Kichwa', level_name: 'Básico', module_name: 'Módulo 1', sort_order: 1 } }); effects.splice(0).forEach(callback => callback()); return tree; };
    return { requests, storage, refreshes: () => refreshes, render, remount() { states.length = 0; effectDeps.length = 0; effects.length = 0; render(); } };
}
function nodes(tree) { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!tree?.props) return []; return [tree, ...nodes(tree.props.children)]; }
function content(tree) { if (Array.isArray(tree)) return tree.map(content).join(''); return tree?.props ? content(tree.props.children) : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : ''; }
const button = (view, label) => nodes(view.render()).find(node => node.type === 'button' && (content(node).trim() === label || Array.isArray(node.props.children) && content(node.props.children[0]) === label));
const choose = (view, id) => nodes(view.render()).find(node => node.type === 'input' && node.props.value === id).props.onChange();
const click = (view, label) => button(view, label).props.onClick();
async function check(view) { click(view, 'Comprobar'); await new Promise(resolve => setImmediate(resolve)); }
async function finish(view) { click(view, 'Ver mi puntaje'); await new Promise(resolve => setImmediate(resolve)); }
function pair(view, spanish, kichwa) { click(view, spanish); click(view, kichwa); }
async function complete(view) {
    click(view, 'Continuar'); choose(view, 'wasi'); await check(view); click(view, 'Continuar');
    for (const [spanish, kichwa] of [['Flor', 'sisa'], ['Oveja', 'llama'], ['Corazón', 'shunku'], ['Caminar', 'purina']]) pair(view, spanish, kichwa);
    await check(view); await finish(view);
}

test('three dedicated screens grade both exercises and show the server score with three working actions', async () => {
    const view = await screen();
    assert.ok(nodes(view.render()).some(node => node.type === 'GuidedIntroduction'));
    click(view, 'Continuar');
    assert.equal(button(view, 'Comprobar').props.disabled, true);
    assert.equal(nodes(view.render()).find(node => node.type === 'img').props.src, '/api/media/kichwa/imagenes/casa.webp');
    choose(view, 'wasi'); await check(view);
    assert.equal(view.requests[0].path, '/exercises/11/answer');
    assert.equal(view.requests[0].payload.answer.seleccion[0], 'wasi');
    click(view, 'Continuar');
    assert.equal(button(view, 'Comprobar').props.disabled, true);
    for (const [spanish, kichwa] of [['Flor', 'sisa'], ['Oveja', 'llama'], ['Corazón', 'shunku'], ['Caminar', 'purina']]) pair(view, spanish, kichwa);
    assert.equal(button(view, 'Comprobar').props.disabled, false);
    await check(view);
    assert.equal(view.requests[1].payload.answer.pares.length, 4);
    await finish(view);
    assert.equal(view.requests[2].path, '/units/4/guided/result');
    assert.deepEqual(Array.from(view.requests[2].payload.response_ids), [101, 102]);
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === '20 de 20 puntos'));
    assert.ok(nodes(view.render()).some(node => node.type === 'Link' && content(node).trim() === 'Continuar' && node.props.href === '/aprender/unidad/5'));
    assert.ok(nodes(view.render()).some(node => node.type === 'Link' && content(node).trim() === 'Salir a unidades' && node.props.href === '/aprender/modulo/8'));
    assert.ok(button(view, 'Reintentar'));
    assert.equal(view.refreshes(), 0);
});

test('wrong answers can be corrected and selection survives navigation backwards', async () => {
    const view = await screen({ post: ({ payload }) => ({ response_id: 101, is_correct: payload.answer.seleccion[0] === 'wasi', feedback: 'Revisa tu respuesta.' }) });
    click(view, 'Continuar'); choose(view, 'sisa'); await check(view);
    assert.ok(button(view, 'Continuar'));
    assert.ok(nodes(view.render()).some(node => node.props.role === 'status' && content(node) === 'Revisa tu respuesta.'));
    click(view, 'Volver'); click(view, 'Continuar');
    assert.equal(nodes(view.render()).find(node => node.props.value === 'sisa').props.checked, true);
    choose(view, 'wasi'); await check(view);
    assert.ok(button(view, 'Continuar'));
});

test('changing a pair removes its previous destination and never duplicates a destination', async () => {
    const view = await screen({ completed: true });
    click(view, 'Continuar'); choose(view, 'wasi'); await check(view); click(view, 'Continuar');
    pair(view, 'Flor', 'sisa'); pair(view, 'Oveja', 'sisa');
    assert.ok(content(view.render()).includes('1 de 4 parejas seleccionadas'));
    pair(view, 'Flor', 'llama'); pair(view, 'Corazón', 'shunku'); pair(view, 'Caminar', 'purina');
    await check(view);
    const pairs = view.requests[1].payload.answer.pares;
    assert.equal(new Set(pairs.map(item => item.destino)).size, 4);
    assert.equal(pairs.find(item => item.origen === 'oveja').destino, 'sisa');
});

test('clicking either side of an existing pair removes both highlights and its answer', async () => {
    const view = await screen();
    click(view, 'Continuar'); choose(view, 'wasi'); await check(view); click(view, 'Continuar');
    pair(view, 'Flor', 'sisa'); pair(view, 'Oveja', 'llama');
    click(view, 'Flor');
    assert.equal(button(view, 'Flor').props.className.trim(), '');
    assert.equal(button(view, 'sisa').props.className, '');
    assert.equal(button(view, 'Flor').props['aria-pressed'], false);
    assert.ok(content(view.render()).includes('1 de 4 parejas seleccionadas'));
    assert.equal(button(view, 'llama').props.disabled, false);
    click(view, 'llama');
    assert.equal(button(view, 'Oveja').props.className.trim(), '');
    assert.equal(button(view, 'llama').props.className, '');
    assert.ok(content(view.render()).includes('0 de 4 parejas seleccionadas'));
    assert.equal(button(view, 'Comprobar').props.disabled, true);
    for (const [spanish, kichwa] of [['Flor', 'sisa'], ['Oveja', 'llama'], ['Corazón', 'shunku'], ['Caminar', 'purina']]) pair(view, spanish, kichwa);
    await check(view);
    assert.equal(view.requests.at(-1).payload.answer.pares.length, 4);
    click(view, 'Flor'); click(view, 'sisa');
    assert.match(button(view, 'Flor').props.className, /is-paired/);
    assert.match(button(view, 'sisa').props.className, /is-paired/);
});

test('network failure keeps the answer and repeated clicks send only one request', async () => {
    let reject;
    const view = await screen({ post: () => new Promise((resolve, fail) => { reject = fail; }) });
    click(view, 'Continuar'); choose(view, 'wasi');
    click(view, 'Comprobar'); click(view, 'Comprobando…');
    assert.equal(view.requests.length, 1);
    reject(new Error('offline')); await new Promise(resolve => setImmediate(resolve));
    assert.ok(nodes(view.render()).some(node => node.props.role === 'alert'));
    assert.equal(nodes(view.render()).find(node => node.props.value === 'wasi').props.checked, true);
    assert.equal(button(view, 'Comprobar').props.disabled, false);
});

test('retry starts a fresh scored run even when the unit was completed previously', async () => {
    const view = await screen({ completed: true });
    await complete(view);
    click(view, 'Reintentar'); click(view, 'Continuar');
    assert.equal(button(view, 'Comprobar').props.disabled, true);
    assert.equal(button(view, 'Continuar'), undefined);
    assert.equal(nodes(view.render()).filter(node => node.type === 'input' && node.props.checked).length, 0);
    choose(view, 'wasi'); await check(view);
    assert.equal(view.requests.length, 4);
});

test('below target score is taken from the server and continuing falls back to the level when there is no next unit', async () => {
    const view = await screen({ post: ({ path }) => path.endsWith('/guided/result') ? { ...perfectScore, score: 12, correct_count: 3, passed: false, next_unit_id: null } : { response_id: path.includes('/11/') ? 201 : 202, is_correct: false, feedback: 'Revisa tus respuestas.' } });
    await complete(view);
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === '12 de 20 puntos'));
    assert.ok(content(view.render()).includes('Por debajo de la meta'));
    assert.ok(nodes(view.render()).some(node => node.type === 'Link' && content(node).trim() === 'Continuar' && node.props.href === '/aprender/nivel/1'));
});

test('a failed score request can be retried without losing or resubmitting the exercise answers', async () => {
    let fail = true;
    const view = await screen({ post: ({ path }) => {
        if (path.endsWith('/guided/result')) { if (fail) throw new Error('offline'); return perfectScore; }
        return { response_id: path.includes('/11/') ? 301 : 302, is_correct: true, feedback: 'Correcto.' };
    } });
    await complete(view);
    assert.ok(nodes(view.render()).some(node => node.props.role === 'alert'));
    fail = false; await finish(view);
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === '20 de 20 puntos'));
    assert.equal(view.requests.filter(request => request.path.endsWith('/answer')).length, 2);
});

test('guided companion shows checked XP, clears stale feedback and sums only earned XP in the final score', async () => {
    let checks = 0;
    const view = await screen({ post: ({ path }) => path.endsWith('/guided/result') ? perfectScore : {
        response_id: ++checks, is_correct: checks !== 1, feedback: 'Respuesta comprobada.', xp_earned: checks === 2 ? 10 : 0, xp_total: 40,
    } });
    const companion = () => nodes(view.render()).find(node => node.type === 'LearningCompanion')?.props;
    assert.equal(companion(), undefined);
    click(view, 'Continuar');
    assert.equal(companion().xpEarned, undefined);
    choose(view, 'sisa'); await check(view);
    assert.equal(companion().xpEarned, 0);
    choose(view, 'wasi');
    assert.equal(companion().xpEarned, undefined);
    choose(view, 'wasi'); await check(view);
    assert.equal(companion().xpEarned, 10);
    click(view, 'Continuar');
    for (const [spanish, kichwa] of [['Flor', 'sisa'], ['Oveja', 'llama'], ['Corazón', 'shunku'], ['Caminar', 'purina']]) pair(view, spanish, kichwa);
    await check(view); await finish(view);
    assert.equal(companion().final, true);
    assert.equal(companion().score, '20 / 20');
    assert.equal(companion().xpEarned, 10);
    click(view, 'Reintentar');
    await complete(view);
    assert.equal(companion().xpEarned, 0);
});

test('guided correct selections and matching answers stay locked when navigating backwards', async () => {
    const view = await screen();
    click(view, 'Continuar'); choose(view, 'wasi'); await check(view);
    assert.equal(nodes(view.render()).find(node => node.props.className === 'guided-choice').props.disabled, true);
    choose(view, 'sisa');
    assert.equal(nodes(view.render()).find(node => node.props.value === 'wasi').props.checked, true);
    assert.ok(button(view, 'Continuar'));
    click(view, 'Continuar');
    for (const [spanish, kichwa] of [['Flor', 'sisa'], ['Oveja', 'llama'], ['Corazón', 'shunku'], ['Caminar', 'purina']]) pair(view, spanish, kichwa);
    await check(view);
    assert.equal(nodes(view.render()).find(node => node.props.className === 'guided-matching').props.disabled, true);
    pair(view, 'Flor', 'purina');
    assert.equal(view.requests.length, 2);
    click(view, 'Volver');
    assert.equal(nodes(view.render()).find(node => node.props.className === 'guided-choice').props.disabled, true);
    assert.equal(nodes(view.render()).find(node => node.props.value === 'wasi').props.checked, true);
});

test('four activities show house, flower and walking in order and score only after the matching activity', async () => {
    const flower = { ...choice, id: 13, config: { ...choice.config, prompt_image: 'kichwa/imagenes/flor.webp', prompt_image_alt: 'Una flor rosada.' } };
    const walking = { ...choice, id: 14, elements: [...choice.elements, { id: 'purina', texto: 'purina' }], config: { ...choice.config, prompt_image: 'kichwa/imagenes/purina.webp', prompt_image_alt: 'Una persona caminando.' } };
    const view = await screen({ exercises: [choice, flower, walking, matching], post: ({ path }) => path.endsWith('/guided/result') ? {
        ...perfectScore, correct_count: 7, total_items: 7,
    } : { response_id: Number(path.split('/')[2]) + 100, is_correct: true, xp_earned: 10, feedback: 'Alli rurashka.' } });
    assert.equal(nodes(view.render()).some(node => node.props['aria-label']?.startsWith('Ejercicio ')), false);
    click(view, 'Continuar');
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === 'Ejercicio 1 de 4'));
    for (const [id, word, image, alt] of [[11, 'wasi', 'casa', undefined], [13, 'sisa', 'flor', 'Una flor rosada.'], [14, 'purina', 'purina', 'Una persona caminando.']]) {
        const picture = nodes(view.render()).find(node => node.type === 'img');
        assert.equal(picture.props.src, `/api/media/kichwa/imagenes/${image}.webp`);
        if (alt) assert.equal(picture.props.alt, alt);
        assert.equal(button(view, 'Comprobar').props.disabled, true);
        choose(view, word); await check(view);
        assert.equal(view.requests.at(-1).path, `/exercises/${id}/answer`);
        assert.equal(button(view, 'Ver mi puntaje'), undefined);
        assert.equal(nodes(view.render()).find(node => node.type === 'LearningCompanion').props.xpEarned, 10);
        click(view, 'Continuar');
    }
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === 'Ejercicio 4 de 4'));
    click(view, 'Volver');
    assert.equal(nodes(view.render()).find(node => node.props.value === 'purina').props.checked, true);
    click(view, 'Continuar');
    for (const [spanish, kichwa] of [['Flor', 'sisa'], ['Oveja', 'llama'], ['Corazón', 'shunku'], ['Caminar', 'purina']]) pair(view, spanish, kichwa);
    await check(view); await finish(view);
    assert.deepEqual(Array.from(view.requests.at(-1).payload.response_ids), [111, 113, 114, 112]);
    assert.equal(view.refreshes(), 0);
    const mascot = nodes(view.render()).find(node => node.type === 'LearningCompanion').props;
    assert.equal(mascot.final, true);
    assert.equal(mascot.score, '20 / 20');
    assert.equal(mascot.xpEarned, 40);
    assert.equal(nodes(view.render()).some(node => node.props.className === 'guided-unit-footer'), false);
    click(view, 'Reintentar');
    assert.ok(nodes(view.render()).some(node => node.type === 'GuidedIntroduction'));
    click(view, 'Continuar');
    assert.equal(button(view, 'Comprobar').props.disabled, true);
});

test('guided feedback shows the explanation without repeating Cometa and keeps numbering after returning to the lesson', async () => {
    const view = await screen({ post: () => ({ response_id: 1, is_correct: false, feedback: 'Kutin rurapay. Observa la flor y vuelve a intentarlo.' }) });
    assert.equal(nodes(view.render()).some(node => node.props.className === 'guided-attempt-progress'), false);
    click(view, 'Continuar');
    choose(view, 'sisa'); await check(view);
    const notice = nodes(view.render()).find(node => node.props.className === 'guided-feedback is-incorrect');
    assert.equal(content(notice), 'Observa la flor y vuelve a intentarlo.');
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === 'Ejercicio 1 de 2'));
    click(view, 'Volver');
    assert.equal(nodes(view.render()).some(node => node.props['aria-label']?.startsWith('Ejercicio ')), false);
    click(view, 'Continuar');
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === 'Ejercicio 1 de 2'));
});

test('a guided retry starts with zero XP and a new attempt ID while the server keeps the accumulated total', async () => {
    const attempts = new Map();
    let total = 0;
    const view = await screen({ post: ({ path, payload }) => {
        if (path.endsWith('/guided/result')) return { ...perfectScore, xp_earned: attempts.get(payload.practice_attempt_id), xp_total: total };
        const xp = (attempts.get(payload.practice_attempt_id) ?? 0) + 10;
        attempts.set(payload.practice_attempt_id, xp); total += 10;
        return { response_id: total, is_correct: true, feedback: 'Alli rurashka', xp_earned: 10, xp_attempt: xp, xp_total: total };
    } });
    await complete(view);
    const first = view.requests[0].payload.practice_attempt_id;
    assert.equal(nodes(view.render()).find(node => node.type === 'LearningCompanion').props.xpEarned, 20);
    click(view, 'Reintentar');
    assert.equal(nodes(view.render()).some(node => node.props.className === 'guided-attempt-progress'), false);
    await complete(view);
    const second = view.requests[3].payload.practice_attempt_id;
    assert.notEqual(second, first);
    assert.equal(view.requests[4].payload.practice_attempt_id, second);
    assert.equal(view.requests[5].payload.practice_attempt_id, second);
    assert.equal(nodes(view.render()).find(node => node.type === 'LearningCompanion').props.xpEarned, 20);
    assert.equal(total, 40);
});


test('greetings unit uses its lesson and three images with locked successes, final score and fresh retry XP', async () => {
    const words = ['puncha', 'chishi', 'tuta'];
    const exercises = words.map((word, index) => ({ ...choice, id: 21 + index, elements: words.map(id => ({ id, texto: 'Alli ' + id })), config: { ...choice.config, context_text: ['08:00', '17:30', '21:00'][index], prompt_image: 'kichwa/imagenes/' + word + '.webp' } }));
    const view = await screen({ config: { learning_mode: 'guided', guided_lesson: 'greetings' }, exercises,
        post: ({ path, payload }) => path.endsWith('/guided/result')
            ? { ...perfectScore, correct_count: 3, total_items: 3, xp_earned: 30 }
            : { response_id: payload.answer.seleccion[0].length + 200, is_correct: true, xp_earned: 10 }
    });
    assert.ok(nodes(view.render()).some(node => node.type === 'GreetingsIntroduction'));
    assert.ok(!nodes(view.render()).some(node => node.type === 'GuidedIntroduction'));
    for (const word of words) {
        click(view, 'Continuar');
        assert.equal(nodes(view.render()).find(node => node.type === 'img').props.src, '/api/media/kichwa/imagenes/' + word + '.webp');
        assert.ok(nodes(view.render()).some(node => node.type === 'figcaption' && content(node) === exercises[words.indexOf(word)].config.context_text));
        choose(view, word); await check(view);
        assert.equal(nodes(view.render()).find(node => node.type === 'fieldset').props.disabled, true);
        choose(view, words.find(other => other !== word));
        assert.equal(nodes(view.render()).find(node => node.props.value === word).props.checked, true);
    }
    await finish(view);
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === '20 de 20 puntos'));
    assert.equal(nodes(view.render()).find(node => node.type === 'LearningCompanion').props.xpEarned, 30);
    const firstAttempt = view.requests[0].payload.practice_attempt_id;
    click(view, 'Reintentar');
    assert.equal(nodes(view.render()).some(node => node.props.className === 'guided-attempt-progress'), false);
    click(view, 'Continuar');
    assert.ok(content(view.render()).includes('0 XP en este intento'));
    choose(view, 'puncha'); await check(view);
    assert.notEqual(view.requests.at(-1).payload.practice_attempt_id, firstAttempt);
});

test('returning from the dictionary restores the exercise, unfinished pairs, checked answers and attempt XP', async () => {
    const storage = new Map();
    const post = ({ path }) => path.endsWith('/guided/result') ? { ...perfectScore, xp_earned: 20 } : { response_id: path.includes('/11/') ? 101 : 102, is_correct: true, feedback: 'Correcto.', xp_earned: 10 };
    const first = await screen({ storage, post });
    click(first, 'Continuar'); choose(first, 'wasi'); await check(first); click(first, 'Continuar');
    pair(first, 'Flor', 'sisa'); click(first, 'Oveja');
    const attemptId = first.requests[0].payload.practice_attempt_id;
    const resumed = await screen({ storage, post });
    assert.ok(nodes(resumed.render()).some(node => node.props['aria-label'] === 'Ejercicio 2 de 2'));
    assert.ok(content(resumed.render()).includes('1 de 4 parejas seleccionadas'));
    assert.equal(button(resumed, 'Oveja').props['aria-pressed'], true);
    assert.ok(content(resumed.render()).includes('10 XP en este intento'));
    click(resumed, 'Volver');
    assert.equal(nodes(resumed.render()).find(node => node.props.value === 'wasi').props.checked, true);
    assert.equal(nodes(resumed.render()).find(node => node.type === 'fieldset').props.disabled, true);
    click(resumed, 'Continuar'); click(resumed, 'Oveja'); click(resumed, 'llama');
    pair(resumed, 'Corazón', 'shunku'); pair(resumed, 'Caminar', 'purina');
    await check(resumed); await finish(resumed);
    assert.equal(resumed.requests[0].payload.practice_attempt_id, attemptId);
    assert.deepEqual(Array.from(resumed.requests[1].payload.response_ids), [101, 102]);
    const result = await screen({ storage, post });
    assert.ok(nodes(result.render()).some(node => node.props['aria-label'] === '20 de 20 puntos'));
    assert.equal(nodes(result.render()).find(node => node.type === 'LearningCompanion').props.xpEarned, 20);
    click(result, 'Reintentar');
    const fresh = await screen({ storage, post });
    assert.ok(nodes(fresh.render()).some(node => node.type === 'GuidedIntroduction'));
    click(fresh, 'Continuar');
    assert.ok(content(fresh.render()).includes('0 XP en este intento'));
    choose(fresh, 'wasi'); await check(fresh);
    assert.notEqual(fresh.requests[0].payload.practice_attempt_id, attemptId);
});

test('unchecked choices survive return while another student or unit starts independently', async () => {
    const storage = new Map();
    const first = await screen({ storage });
    click(first, 'Continuar'); choose(first, 'sisa');
    const resumed = await screen({ storage });
    assert.equal(nodes(resumed.render()).find(node => node.props.value === 'sisa').props.checked, true);
    assert.equal(button(resumed, 'Comprobar').props.disabled, false);
    assert.equal(resumed.requests.length, 0);
    for (const options of [{ userId: 8 }, { unitId: 9 }]) {
        const independent = await screen({ storage, ...options });
        assert.ok(nodes(independent.render()).some(node => node.type === 'GuidedIntroduction'));
    }
});

test('a failed submission retains its idempotency IDs across leaving and returning', async () => {
    const storage = new Map();
    const first = await screen({ storage, post: () => { throw Error('offline'); } });
    click(first, 'Continuar'); choose(first, 'wasi'); await check(first);
    const resumed = await screen({ storage });
    await check(resumed);
    assert.equal(resumed.requests[0].payload.submission_id, first.requests[0].payload.submission_id);
    assert.equal(resumed.requests[0].payload.practice_attempt_id, first.requests[0].payload.practice_attempt_id);
});

test('invalid drafts are ignored and changed exercise content starts a compatible attempt', async () => {
    const key = 'yachay:guided-attempt:v1:3:4';
    const malformed = await screen({ storage: new Map([[key, '{broken json']]) });
    assert.ok(nodes(malformed.render()).some(node => node.type === 'GuidedIntroduction'));
    const storage = new Map();
    const first = await screen({ storage });
    click(first, 'Continuar'); choose(first, 'sisa');
    const changed = await screen({ storage, exercises: [{ ...choice, id: 99 }, matching] });
    changed.render();
    assert.ok(nodes(changed.render()).some(node => node.type === 'GuidedIntroduction'));
});

test('navigation preserves the attempt in memory when browser storage is blocked', async () => {
    const view = await screen({ blockedStorage: true });
    click(view, 'Continuar'); choose(view, 'sisa');
    view.remount();
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === 'Ejercicio 1 de 2'));
    assert.equal(nodes(view.render()).find(node => node.props.value === 'sisa').props.checked, true);
});

test('a response received after leaving updates the resumed attempt and cannot overwrite a newer choice', async () => {
    let resolve;
    const view = await screen({ post: () => new Promise(done => { resolve = done; }) });
    click(view, 'Continuar'); choose(view, 'wasi'); click(view, 'Comprobar');
    view.remount();
    resolve({ response_id: 101, is_correct: true, feedback: 'Correcto.', xp_earned: 10 });
    await new Promise(done => setImmediate(done));
    assert.equal(nodes(view.render()).find(node => node.type === 'fieldset').props.disabled, true);
    assert.ok(content(view.render()).includes('10 XP en este intento'));

    const changed = await screen({ post: () => new Promise(done => { resolve = done; }) });
    click(changed, 'Continuar'); choose(changed, 'sisa'); click(changed, 'Comprobar');
    changed.remount(); choose(changed, 'wasi');
    resolve({ response_id: 102, is_correct: false, feedback: 'Revisa la imagen.', xp_earned: 0 });
    await new Promise(done => setImmediate(done));
    assert.equal(nodes(changed.render()).find(node => node.props.value === 'wasi').props.checked, true);
    assert.equal(nodes(changed.render()).find(node => node.type === 'fieldset').props.disabled, false);
    assert.equal(nodes(changed.render()).find(node => node.type === 'LearningCompanion').props.correct, undefined);
});
