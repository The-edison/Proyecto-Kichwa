import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/components/GuidedUnit.tsx', import.meta.url), 'utf8'), 'GuidedUnit.tsx');
const { code: interactionCode } = await transformWithOxc(await readFile(new URL('../src/js/components/ExerciseCard.tsx', import.meta.url), 'utf8'), 'ExerciseCard.tsx');
const choice = { id: 11, type: 'seleccion_multiple', prompt: 'Observa la imagen.', elements: ['shunku', 'sisa', 'wasi', 'llama'].map(id => ({ id, texto: id })), zones: [], config: { title: '¿Qué palabra corresponde?', prompt_image: 'kichwa/imagenes/casa.webp', max_selections: 1, exact_selections: true } };
const matching = { id: 12, type: 'relacionar', prompt: 'Selecciona una palabra y su pareja.', elements: [...['Flor', 'Oveja', 'Corazón', 'Caminar'].map((texto, index) => ({ id: ['flor', 'oveja', 'corazon', 'caminar'][index], texto, grupo: 'origen' })), ...['purina', 'shunku', 'sisa', 'llama'].map(id => ({ id, texto: id, grupo: 'destino' }))], zones: [], config: { title: 'Palabras en dos idiomas' } };
const perfectScore = { score: 20, max_score: 20, correct_count: 5, total_items: 5, passed: true, next_unit_id: 5, details: [{ exercise_id: 11, title: '¿Qué palabra corresponde?', correct: 1, total: 1 }, { exercise_id: 12, title: 'Palabras en dos idiomas', correct: 4, total: 4 }] };

async function screen({ completed = false, post } = {}) {
    let cursor = 0, refreshes = 0;
    const states = [], requests = [];
    const context = vm.createContext({ window: { scrollTo() {} } });
    const jsx = (type, props) => ({ type, props });
    class ApiError extends Error { constructor(message) { super(message); this.errors = {}; } }
    const dependencies = {
        react: {
            useState: initial => { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
            useRef: initial => { const index = cursor++; return states[index] ??= { current: initial }; }, useEffect() {},
        },
        'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
        'lucide-react': Object.fromEntries(['ArrowLeft', 'ArrowRight', 'BookOpen', 'CheckCircle2', 'LoaderCircle', 'RotateCcw', 'Star', 'X'].map(name => [name, name])),
        'guided-unit.css': {},
        navigation: { Head: 'Head', Link: 'Link' },
        useApi: { useApi: () => ({ data: { exercises: [choice, matching].map(item => ({ ...item, completed })), total: 2, completed_count: completed ? 2 : 0 }, loading: false, error: '', refresh: async () => { refreshes++; } }) },
        api: { ApiError, apiBaseUrl: '', apiPost: async (path, payload) => { requests.push({ path, payload }); return post ? post({ path, payload, ApiError }) : path.endsWith('/guided/result') ? perfectScore : { response_id: requests.length + 100, is_correct: true, feedback: 'Respuesta correcta.' }; } },
        States: { ErrorState: 'ErrorState', LoadingState: 'LoadingState' },
    };
    const cache = new Map();
    const interaction = new vm.SourceTextModule(interactionCode, { context });
    async function link(specifier) {
        if (specifier.endsWith('/ExerciseCard')) return interaction;
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
    return { requests, refreshes: () => refreshes, render: () => { cursor = 0; return module.namespace.GuidedUnit({ unit: { id: 4, module_id: 8, level_id: 1, title: 'Conociendo el Kichwa', level_name: 'Básico', module_name: 'Módulo 1', sort_order: 1 } }); } };
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
    assert.equal(nodes(view.render()).filter(node => node.type === 'section').length, 4);
    assert.ok(content(view.render()).includes('La escritura del kichwa'));
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
    assert.equal(view.refreshes(), 2);
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
