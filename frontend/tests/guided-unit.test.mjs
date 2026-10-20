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
const perfectScore = { score: 2, max_score: 2, correct_count: 2, total_items: 2, passed: true, next_unit_id: 5, details: [{ exercise_id: 11, title: '¿Qué palabra corresponde?', correct: 1, total: 1 }, { exercise_id: 12, title: 'Palabras en dos idiomas', correct: 1, total: 1 }] };

async function screen({ completed = false, post, exercises = [choice, matching], config, storage = new Map(), userId = 3, unitId = 4, blockedStorage = false } = {}) {
    let cursor = 0, refreshes = 0;
    const states = [], requests = [], preloads = [], sounds = [];
    const effects = [], effectDeps = [];
    const context = vm.createContext({ crypto: { randomUUID }, Image: class { constructor() { preloads.push(this); } decode() { return Promise.resolve(); } }, window: { scrollTo() {}, sessionStorage: { getItem(key) { if (blockedStorage) throw Error('blocked'); return storage.get(key) ?? null; }, setItem(key, value) { if (blockedStorage) throw Error('blocked'); storage.set(key, value); } } } });
    const jsx = (type, props) => ({ type, props });
    class ApiError extends Error { constructor(message) { super(message); this.errors = {}; } }
    const dependencies = {
        useAnswerSound: { useAnswerSound: () => correct => sounds.push(correct) },
        react: {
            useMemo: create => create(),
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
        api: { withProgressBatch: work => work(), ApiError, apiBaseUrl: '', apiPost: async (path, payload) => { requests.push({ path, payload }); return post ? post({ path, payload, ApiError }) : path.endsWith('/guided/result') ? perfectScore : { response_id: requests.length + 100, is_correct: true, feedback: 'Respuesta correcta.' }; } },
        LearningCompanion: { LearningCompanion: 'LearningCompanion' },
        GuidedIntroduction: { GuidedIntroduction: 'GuidedIntroduction' },
        GreetingsIntroduction: { GreetingsIntroduction: 'GreetingsIntroduction' },
        TopicIntroduction: { TopicIntroduction: 'TopicIntroduction' },
        MissingVowelExercise: { MissingVowelExercise: 'MissingVowelExercise' },
        AudioMatchingExercise: { AudioMatchingExercise: 'AudioMatchingExercise' },
        ListeningGreetingsExercise: { ListeningGreetingsExercise: 'ListeningGreetingsExercise' },
        ConversationMatchingExercise: { ConversationMatchingExercise: 'ConversationMatchingExercise' },
        SceneChoicePanel: { SceneChoicePanel: 'SceneChoicePanel' },
        SentenceOrderPanel: { SentenceOrderPanel: 'SentenceOrderPanel' },
        NumbersPractice: { NumbersPractice: 'NumbersPractice' },
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
    return { requests, storage, preloads, sounds, refreshes: () => refreshes, render, remount() { states.length = 0; effectDeps.length = 0; effects.length = 0; render(); } };
}
function nodes(tree) { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!tree?.props) return []; return [tree, ...nodes(tree.props.children)]; }
function content(tree) { if (Array.isArray(tree)) return tree.map(content).join(''); return tree?.props ? content(tree.props.children) : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : ''; }
const button = (view, label) => nodes(view.render()).find(node => node.type === 'button' && (node.props['aria-label'] === label || content(node).trim() === label || Array.isArray(node.props.children) && content(node.props.children[0]) === label));
const choose = (view, id, exerciseId) => nodes(view.render()).find(node => node.type === 'input' && node.props.value === id && (!exerciseId || node.props.name === `guided-${exerciseId}`)).props.onChange();
const click = (view, label) => button(view, label).props.onClick();
async function check(view) { click(view, 'Comprobar'); await new Promise(resolve => setImmediate(resolve)); }
async function finish(view) { click(view, 'Ver mi puntaje'); await new Promise(resolve => setImmediate(resolve)); }
function pair(view, spanish, kichwa) { click(view, spanish); click(view, kichwa); }
async function complete(view) {
    click(view, 'Continuar'); choose(view, 'wasi'); await check(view); click(view, 'Continuar');
    for (const [spanish, kichwa] of [['Flor', 'sisa'], ['Oveja', 'llama'], ['Corazón', 'shunku'], ['Caminar', 'purina']]) pair(view, spanish, kichwa);
    await check(view); await finish(view);
}

test('choosing an answer persists the complete draft in one storage write', async () => {
    const storage=new Map();let writes=0;
    storage.set=function(key,value){writes++;return Map.prototype.set.call(this,key,value)};
    const view=await screen({storage});click(view,'Continuar');
    const before=writes;choose(view,'wasi');assert.equal(writes-before,1);
    const draft=JSON.parse([...storage.values()][0]);
    assert.deepEqual(draft.answers['11'],{seleccion:['wasi']});
    assert.equal(draft.feedback['11'],undefined);assert.equal(draft.submissions['11'],undefined);
});

test('greetings preload six unique images including images inside listening exercises', async () => {
    const listening={...matching,id:90,elements:[0,1,2,3,4].map(i=>({id:String(i),texto:'Image '+i,imagen:'inside-'+i+'.webp'}))};
    const view=await screen({config:{guided_lesson:'greetings'},exercises:[choice,listening,{...choice,id:91}]});
    view.render();assert.equal(view.preloads.length,6);
    assert.ok(view.preloads.some(i=>i.src.endsWith('inside-4.webp')));
    view.render();assert.equal(view.preloads.length,6);
});

test('six pronoun pairs are followed by exactly two panels of two images with working back navigation', async () => {
    const words = ['nuka', 'kan', 'pay', 'nukanchik', 'kankuna', 'paykuna'];
    const six = { ...matching, elements: [...words.map(id => ({ id: `es-${id}`, texto: `ES ${id}`, grupo: 'origen' })), ...words.map(id => ({ id, texto: id, grupo: 'destino' }))] };
    const answers = ['nuka', 'kan', 'nukanchik', 'paykuna'];
    const images = answers.map((word, i) => ({ ...choice, id: 20 + i, elements: answers.map(id => ({ id, texto: id })),
        config: { ...choice.config, context_text: `Contexto ${word}`, prompt_image: `kichwa/imagenes/${word}.webp` } }));
    let responseId = 100;
    const view = await screen({ config: { guided_lesson: 'pronouns' }, exercises: [six, ...images], post: ({ path }) => path.endsWith('/guided/result')
        ? { ...perfectScore, score: 5, max_score: 5, total_items: 5, correct_count: 5 }
        : { response_id: ++responseId, is_correct: true } });
    click(view, 'Continuar');
    assert.equal(button(view, 'Comprobar').props.disabled, true);
    for (const word of words.slice(0, 5)) pair(view, `ES ${word}`, word);
    assert.equal(button(view, 'Comprobar').props.disabled, true);
    pair(view, 'ES paykuna', 'paykuna'); await check(view); click(view, 'Continuar');
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === 'Ejercicios 2 y 3 de 5'));
    assert.equal(nodes(view.render()).filter(node => node.props.className === 'guided-choice-panel-item').length, 2);
    assert.ok(content(view.render()).includes('Contexto nuka'));
    choose(view, 'nuka', 20); assert.equal(button(view, 'Comprobar').props.disabled, true);
    choose(view, 'kan', 21); await check(view); click(view, 'Continuar');
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === 'Ejercicios 4 y 5 de 5'));
    assert.equal(nodes(view.render()).filter(node => node.type === 'img').length, 2);
    click(view, 'Volver');
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === 'Ejercicios 2 y 3 de 5'));
    click(view, 'Volver');
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === 'Ejercicio 1 de 5'));
    click(view, 'Continuar'); click(view, 'Continuar');
    choose(view, 'nukanchik', 22); choose(view, 'paykuna', 23); await check(view); await finish(view);
    assert.equal(view.requests.filter(request => request.path.endsWith('/answer')).length, 5);
    assert.equal(view.requests.at(-1).payload.response_ids.length, 5);
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === '5 de 5 ejercicios correctos'));
});

for (const lesson of ['pronouns', 'numbers', 'calendar', 'animals-colors', 'body', 'nature', 'verbs']) {
    test(`${lesson} opens its own lesson and completes the guided exercise flow`, async () => {
        const view = await screen({ config: { learning_mode: 'guided', guided_lesson: lesson } });
        const introduction = nodes(view.render()).find(node => node.type === 'TopicIntroduction');
        assert.equal(introduction?.props.lesson, lesson);
        assert.ok(!nodes(view.render()).some(node => node.type === 'GuidedIntroduction'));
        await complete(view);
        assert.equal(view.requests.at(-1).path, '/units/4/guided/result');
        assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === '2 de 2 ejercicios correctos'));
    });
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
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === '2 de 2 ejercicios correctos'));
    assert.ok(nodes(view.render()).some(node => node.type === 'Link' && content(node).trim() === 'Continuar' && node.props.href === '/aprender/unidad/5'));
    assert.ok(nodes(view.render()).some(node => node.type === 'Link' && content(node).trim() === 'Salir a unidades' && node.props.href === '/aprender/modulo/8'));
    assert.ok(button(view, 'Reintentar'));
    assert.equal(nodes(view.render()).some(node => node.props.className === 'guided-result-details'), false);
    assert.equal(nodes(view.render()).find(node => node.type === 'LearningCompanion').props.portraitOnly, true);
    assert.ok(content(view.render()).includes('Cada ejercicio correcto suma 10 XP.'));
    assert.equal(view.refreshes(), 0);
});

test('wrong answers can be corrected and selection survives navigation backwards', async () => {
    const view = await screen({ post: ({ payload }) => ({ response_id: 101, is_correct: payload.answer.seleccion[0] === 'wasi', feedback: 'Revisa tu respuesta.' }) });
    click(view, 'Continuar'); choose(view, 'sisa'); await check(view);
    assert.equal(button(view, 'Continuar'), undefined);
    assert.ok(button(view, 'Comprobar'));
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
    assert.ok(content(view.render()).includes('0 de 4 parejas seleccionadas'));
    pair(view, 'Oveja', 'sisa');
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

test('continuing after completion falls back to the level when there is no next unit', async () => {
    const view = await screen({ post: ({ path }) => path.endsWith('/guided/result') ? { ...perfectScore, next_unit_id: null } : { response_id: path.includes('/11/') ? 201 : 202, is_correct: true, feedback: 'Correcto.' } });
    await complete(view);
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === '2 de 2 ejercicios correctos'));
    assert.ok(content(view.render()).includes('Meta alcanzada'));
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
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === '2 de 2 ejercicios correctos'));
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
    assert.equal(companion().score, '2 / 2');
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

test('house and flower share one panel, preserve individual answers and score after the remaining activities', async () => {
    const flower = { ...choice, id: 13, config: { ...choice.config, prompt_image: 'kichwa/imagenes/flor.webp', prompt_image_alt: 'Una flor rosada.' } };
    const walking = { ...choice, id: 14, elements: [...choice.elements, { id: 'purina', texto: 'purina' }], config: { ...choice.config, prompt_image: 'kichwa/imagenes/purina.webp', prompt_image_alt: 'Una persona caminando.' } };
    const view = await screen({ exercises: [choice, flower, walking, matching], post: ({ path }) => path.endsWith('/guided/result') ? {
        ...perfectScore, score: 4, max_score: 4, correct_count: 4, total_items: 4,
    } : { response_id: Number(path.split('/')[2]) + 100, is_correct: true, xp_earned: 10, feedback: 'Alli rurashka.' } });
    assert.equal(nodes(view.render()).some(node => node.props['aria-label']?.startsWith('Ejercicio ')), false);
    click(view, 'Continuar');
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === 'Ejercicios 1 y 2 de 4'));
    const pictures = nodes(view.render()).filter(node => node.type === 'img');
    assert.equal(pictures.length, 2);
    assert.equal(pictures[0].props.src, '/api/media/kichwa/imagenes/casa.webp');
    assert.equal(pictures[1].props.src, '/api/media/kichwa/imagenes/flor.webp');
    assert.equal(pictures[1].props.alt, 'Una flor rosada.');
    assert.equal(button(view, 'Comprobar').props.disabled, true);
    choose(view, 'wasi', 11);
    assert.equal(button(view, 'Comprobar').props.disabled, true);
    choose(view, 'sisa', 13);
    assert.equal(button(view, 'Comprobar').props.disabled, false);
    await check(view);
    assert.deepEqual(view.requests.map(request => request.path), ['/exercises/11/answer', '/exercises/13/answer']);
    assert.equal(nodes(view.render()).filter(node => node.type === 'fieldset' && node.props.disabled).length, 2);
    assert.equal(nodes(view.render()).find(node => node.type === 'LearningCompanion').props.xpEarned, 20);
    click(view, 'Continuar');
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === 'Ejercicio 3 de 4'));
    assert.equal(nodes(view.render()).find(node => node.type === 'img').props.src, '/api/media/kichwa/imagenes/purina.webp');
    click(view, 'Volver');
    assert.equal(nodes(view.render()).filter(node => node.type === 'input' && node.props.checked).length, 2);
    click(view, 'Continuar');
    choose(view, 'purina'); await check(view);
    assert.equal(view.requests.at(-1).path, '/exercises/14/answer');
    assert.equal(button(view, 'Ver mi puntaje'), undefined);
    click(view, 'Continuar');
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
    assert.equal(mascot.score, '4 / 4');
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
            ? { ...perfectScore, score: 3, max_score: 3, correct_count: 3, total_items: 3, xp_earned: 30 }
            : { response_id: payload.answer.seleccion[0].length + 200, is_correct: true, xp_earned: 10 }
    });
    assert.ok(nodes(view.render()).some(node => node.type === 'GreetingsIntroduction'));
    assert.ok(!nodes(view.render()).some(node => node.type === 'GuidedIntroduction'));
    click(view, 'Continuar');
    assert.equal(nodes(view.render()).filter(node => node.type === 'img').length, 3);
    assert.equal(nodes(view.render()).filter(node => node.type === 'input').length, 9);
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === 'Ejercicios 1 a 3 de 3'));
    for (const [index, word] of words.entries()) {
        assert.ok(nodes(view.render()).some(node => node.type === 'figcaption' && content(node) === exercises[index].config.context_text));
        assert.equal(button(view, 'Comprobar').props.disabled, true);
        choose(view, word, exercises[index].id);
    }
    await check(view);
    assert.equal(view.requests.length, 3);
    assert.ok(nodes(view.render()).filter(node => node.type === 'fieldset').every(node => node.props.disabled));
    await finish(view);
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === '3 de 3 ejercicios correctos'));
    assert.equal(nodes(view.render()).find(node => node.type === 'LearningCompanion').props.xpEarned, 30);
    const firstAttempt = view.requests[0].payload.practice_attempt_id;
    click(view, 'Reintentar');
    assert.equal(nodes(view.render()).some(node => node.props.className === 'guided-attempt-progress'), false);
    click(view, 'Continuar');
    assert.ok(content(view.render()).includes('0 XP en este intento'));
    words.forEach((word, index) => choose(view, word, exercises[index].id)); await check(view);
    assert.notEqual(view.requests.at(-1).payload.practice_attempt_id, firstAttempt);
});

test('the three greetings keep correct answers locked and retry only the mistaken greeting', async () => {
    const exercises = [21, 22, 23].map(id => ({ ...choice, id }));
    const view = await screen({ config: { guided_lesson: 'greetings' }, exercises,
        post: ({ path, payload }) => ({ response_id: Number(path.split('/')[2]), is_correct: payload.answer.seleccion[0] === 'wasi', xp_earned: payload.answer.seleccion[0] === 'wasi' ? 10 : 0 }) });
    click(view, 'Continuar');
    choose(view, 'wasi', 21); choose(view, 'sisa', 22); choose(view, 'wasi', 23);
    await check(view);
    assert.deepEqual(nodes(view.render()).filter(node => node.type === 'fieldset').map(node => node.props.disabled), [true, false, true]);
    assert.ok(content(view.render()).includes('20 XP en este intento'));
    choose(view, 'wasi', 22); await check(view);
    assert.equal(view.requests.length, 4);
    assert.equal(view.requests.at(-1).path, '/exercises/22/answer');
    assert.ok(content(view.render()).includes('30 XP en este intento'));
    assert.ok(button(view, 'Ver mi puntaje'));
});

test('saved separate greeting screens resume in the shared panel without losing selections', async () => {
    const exercises = [21, 22, 23].map(id => ({ ...choice, id }));
    const storage = new Map();
    const options = { config: { guided_lesson: 'greetings' }, exercises, storage };
    const view = await screen(options);
    click(view, 'Continuar'); choose(view, 'wasi', 21); choose(view, 'sisa', 22);
    const key = 'yachay:guided-attempt:v1:3:4';
    const saved = JSON.parse(storage.get(key));
    storage.set(key, JSON.stringify({ ...saved, step: 3 }));
    const resumed = await screen(options);
    assert.equal(nodes(resumed.render()).filter(node => node.type === 'img').length, 3);
    assert.ok(nodes(resumed.render()).some(node => node.props['aria-label'] === 'Ejercicios 1 a 3 de 3'));
    const checked = nodes(resumed.render()).filter(node => node.type === 'input' && node.props.checked);
    assert.deepEqual(checked.map(node => [node.props.name, node.props.value]), [['guided-21', 'wasi'], ['guided-22', 'sisa']]);
    assert.equal(resumed.requests.length, 0);
});

test('checking a grouped panel plays exactly one tone, reports any mistake and stays silent on restore or network failure', async () => {
    let wrong = true, failed = false, responseId = 100;
    const view = await screen({ config:{guided_lesson:'greetings'}, exercises:[21,22,23].map(id => ({...choice,id})),
        post:({path}) => {
            if (failed) throw Error('Offline');
            return {response_id:++responseId,is_correct:!(wrong && path.includes('/22/')),xp_earned:0};
        } });
    click(view,'Continuar'); [21,22,23].forEach(id => choose(view,'wasi',id)); await check(view);
    assert.deepEqual(view.sounds,[false]);
    view.render(); view.remount();
    assert.deepEqual(view.sounds,[false]);
    wrong=false; failed=true; await check(view);
    assert.deepEqual(view.sounds,[false]);
    failed=false; await check(view);
    assert.deepEqual(view.sounds,[false,true]);
    assert.equal(view.requests.length,5);
});

test('six questions and six responses form four panels of three with independent feedback and retries', async () => {
    const scenes=['q','a'].flatMap((group,g)=>Array.from({length:6},(_,i)=>({...choice,id:31+g*6+i,elements:[i,(i+2)%6,(i+4)%6].map(n=>({id:group+'-'+n,texto:'K '+group+' '+n})),config:{...choice.config,scene_choice:true,conversation_group:group,context_text:'Scene '+group+' '+i}})));
    let wrong=true,responseId=100;
    const view=await screen({config:{guided_lesson:'greetings'},exercises:[...[21,22,23].map(id=>({...choice,id})),...scenes],post:({path})=>path.endsWith('/guided/result')?{...perfectScore,score:15,max_score:15,correct_count:15,total_items:15}:{response_id:++responseId,is_correct:!(wrong&&path.includes('/31/')),xp_earned:0}});
    click(view,'Continuar');[21,22,23].forEach(id=>choose(view,'wasi',id));await check(view);click(view,'Continuar');
    const panel=()=>nodes(view.render()).find(n=>n.type==='SceneChoicePanel');
    for(let p=0;p<4;p++){
        assert.equal(panel().props.exercises.length,3);
        assert.deepEqual(Array.from(panel().props.exercises,e=>e.id),scenes.slice(p*3,p*3+3).map(e=>e.id));
        assert.ok(panel().props.exercises.every(e=>e.config.conversation_group===(p<2?'q':'a')));
        for(const exercise of panel().props.exercises){
            assert.equal(button(view,'Comprobar').props.disabled,true);
            panel().props.onChange(exercise,{seleccion:[exercise.elements[0].id]});
        }
        await check(view);
        if(p===0){
            assert.equal(panel().props.feedback[31].is_correct,false);
            assert.equal(panel().props.feedback[32].is_correct,true);
            const before=view.requests.length;wrong=false;await check(view);
            assert.equal(view.requests.length,before+1);
            assert.equal(view.requests.at(-1).path,'/exercises/31/answer');
        }
        if(p===1){click(view,'Volver');assert.equal(panel().props.exercises[0].id,31);click(view,'Continuar');assert.equal(panel().props.exercises[0].id,34);}
        if(p<3)click(view,'Continuar');
    }
    await finish(view);
    assert.ok(nodes(view.render()).some(n=>n.props['aria-label']==='15 de 15 ejercicios correctos'));
});

test('five farewells form a panel of three and a panel of two without including courtesy', async () => {
    const scenes=Array.from({length:5},(_,i)=>({...choice,id:51+i,elements:[0,1,2].map(n=>({id:'d-'+n,texto:'Farewell '+n})),config:{...choice.config,scene_choice:true,conversation_group:'d'}}));
    const courtesy={...matching,id:70,config:{conversation_pairs:true,conversation_group:'c'}};
    const view=await screen({config:{guided_lesson:'greetings'},exercises:[...[21,22,23].map(id=>({...choice,id})),...scenes,courtesy]});
    click(view,'Continuar');[21,22,23].forEach(id=>choose(view,'wasi',id));await check(view);click(view,'Continuar');
    const panel=()=>nodes(view.render()).find(n=>n.type==='SceneChoicePanel');
    assert.deepEqual(Array.from(panel().props.exercises,e=>e.id),[51,52,53]);
    for(const e of panel().props.exercises)panel().props.onChange(e,{seleccion:['d-0']});
    await check(view);click(view,'Continuar');
    assert.deepEqual(Array.from(panel().props.exercises,e=>e.id),[54,55]);
    click(view,'Volver');assert.equal(panel().props.exercises[0].id,51);click(view,'Continuar');
    for(const e of panel().props.exercises)panel().props.onChange(e,{seleccion:['d-0']});
    await check(view);click(view,'Continuar');
    assert.ok(nodes(view.render()).some(n=>n.type==='ConversationMatchingExercise'&&n.props.group==='c'));
});

test('four courtesy scenes form two panels of two and retain separate results', async () => {
    const scenes=Array.from({length:4},(_,i)=>({...choice,id:81+i,elements:[0,1,2].map(n=>({id:'c-'+n,texto:'Courtesy '+n})),config:{...choice.config,scene_choice:true,conversation_group:'c'}}));
    let responseId=200;
    const view=await screen({config:{guided_lesson:'greetings'},exercises:scenes,post:({path})=>path.endsWith('/guided/result')?{...perfectScore,score:4,max_score:4,correct_count:4,total_items:4}:{response_id:++responseId,is_correct:true}});
    click(view,'Continuar');
    const panel=()=>nodes(view.render()).find(n=>n.type==='SceneChoicePanel');
    assert.deepEqual(Array.from(panel().props.exercises,e=>e.id),[81,82]);
    for(const e of panel().props.exercises)panel().props.onChange(e,{seleccion:['c-0']});
    await check(view);click(view,'Continuar');
    assert.deepEqual(Array.from(panel().props.exercises,e=>e.id),[83,84]);
    click(view,'Volver');assert.ok(panel().props.feedback[81].is_correct);click(view,'Continuar');
    for(const e of panel().props.exercises)panel().props.onChange(e,{seleccion:['c-0']});
    await check(view);await finish(view);
    assert.ok(nodes(view.render()).some(n=>n.props['aria-label']==='4 de 4 ejercicios correctos'));
});

test('four ordered sentences form two panels, save drafts and retry only the incorrect sentence', async () => {
    const exercises=Array.from({length:4},(_,i)=>({...choice,id:91+i,type:'ordenar',elements:[{id:'b',texto:'mamita'},{id:'a',texto:'pacha'}],config:{sentence_order:true,prompt_image:'order.webp'}}));
    let wrong=true,responseId=400;
    const view=await screen({config:{guided_lesson:'greetings'},exercises,post:({path})=>path.endsWith('/guided/result')?{...perfectScore,score:4,max_score:4,correct_count:4,total_items:4}:{response_id:++responseId,is_correct:!(wrong&&path.includes('/92/')),xp_earned:0}});
    click(view,'Continuar');
    const panel=()=>nodes(view.render()).find(n=>n.type==='SentenceOrderPanel');
    assert.deepEqual(Array.from(panel().props.exercises,e=>e.id),[91,92]);
    panel().props.onChange(exercises[0],{orden:['a']});
    assert.ok(button(view,'Comprobar').props.disabled);
    click(view,'Volver');click(view,'Continuar');
    assert.deepEqual(Array.from(panel().props.answers[91].orden),['a']);
    for(const e of panel().props.exercises)panel().props.onChange(e,{orden:['a','b']});
    await check(view);assert.ok(panel().props.feedback[91].is_correct);
    const before=view.requests.length;wrong=false;await check(view);assert.equal(view.requests.length,before+1);
    assert.equal(view.requests.at(-1).path,'/exercises/92/answer');click(view,'Continuar');
    assert.deepEqual(Array.from(panel().props.exercises,e=>e.id),[93,94]);
    for(const e of panel().props.exercises)panel().props.onChange(e,{orden:['a','b']});
    await check(view);await finish(view);
    assert.ok(nodes(view.render()).some(n=>n.props['aria-label']==='4 de 4 ejercicios correctos'));
});

test('questions and responses are graded independently and only a failed exercise is retried', async () => {
    const exercises=['q','a'].map((group,index)=>({...matching,id:31+index,config:{title:group,conversation_pairs:true,conversation_group:group},elements:[
        ...Array.from({length:6},(_,i)=>({id:group+'-'+i,texto:'K '+group+' '+i,grupo:'origen'})),
        ...Array.from({length:6},(_,i)=>({id:'es-'+group+'-'+i,texto:'E '+group+' '+i,grupo:'destino'})),
    ]}));
    let corrected=false, responseId=100;
    const view=await screen({config:{guided_lesson:'greetings'},exercises,post:({path})=>({response_id:++responseId,is_correct:path.includes('/31/')||corrected,xp_earned:path.includes('/31/')||corrected?10:0})});
    click(view,'Continuar');
    const panel=()=>nodes(view.render()).find(n=>n.type==='ConversationMatchingExercise');
    for(const group of ['q','a']){
        assert.equal(panel().props.group,group);
        for(let i=0;i<6;i++){
            assert.equal(button(view,'Comprobar').props.disabled,true);
            panel().props.onSelectOrigin(group+'-'+i);panel().props.onPair('es-'+group+'-'+i);
        }
        assert.equal(panel().props.answer.pares.length,6);
        await check(view);
        assert.equal(view.requests.at(-1).path,'/exercises/'+(group==='q'?31:32)+'/answer');
        if(group==='q'){
            assert.equal(panel().props.disabled,true);
            assert.ok(content(view.render()).includes('10 XP en este intento'));
            click(view,'Continuar');
        }
    }
    assert.equal(panel().props.disabled,false);
    click(view,'Volver');
    assert.equal(panel().props.group,'q');
    assert.equal(panel().props.disabled,true);
    click(view,'Continuar');
    assert.equal(panel().props.answer.pares.length,6);
    corrected=true;await check(view);
    assert.equal(view.requests.length,3);
    assert.equal(view.requests.at(-1).path,'/exercises/32/answer');
    assert.equal(panel().props.disabled,true);
    assert.ok(content(view.render()).includes('20 XP en este intento'));
});

test('three listening sentences follow the greeting images and require all selections before checking', async () => {
    const sentences = { id:25, type:'completar', prompt:'Escucha y completa las tres oraciones.', zones:[],
        elements:['alli-puncha-churi','alli-chishi-kusa','alli-tuta-tayta'].map(id => ({ id, texto:'Alli _____', opciones:['puncha','chishi','tuta'] })), config:{ title:'La palabra que falta', listening_greetings:true } };
    const view = await screen({ config:{guided_lesson:'greetings'}, exercises:[...[21,22,23].map(id => ({...choice,id})), sentences, matching] });
    click(view,'Continuar');
    [21,22,23].forEach(id => choose(view,'wasi',id)); await check(view); click(view,'Continuar');
    const panel = () => nodes(view.render()).find(node => node.type === 'ListeningGreetingsExercise');
    assert.ok(panel());
    for (const [id,value] of [['alli-puncha-churi','puncha'],['alli-chishi-kusa','chishi']]) {
        panel().props.onChange({textos:{...panel().props.answer.textos,[id]:value}});
        assert.equal(button(view,'Comprobar').props.disabled,true);
    }
    click(view,'Volver'); click(view,'Continuar');
    assert.equal(Object.keys(panel().props.answer.textos).length,2);
    panel().props.onChange({textos:{...panel().props.answer.textos,'alli-tuta-tayta':'tuta'}});
    await check(view);
    assert.equal(view.requests.at(-1).path,'/exercises/25/answer');
    assert.equal(panel().props.disabled,true);
    click(view,'Continuar');
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === 'Ejercicio 5 de 5'));
});

test('greetings keep their single image panel before the new three-audio matching exercise', async () => {
    const images = [21, 22, 23].map(id => ({ ...choice, id }));
    const audio = { ...matching, id: 24, config: { title: '1. PREGUNTAS Y RESPUESTAS ( TAPUYKUNA KUTICHIKUNAPASH)', listening_questions: true }, elements: [
        ...['imatak', 'pitak-kan', 'imamanta'].map(id => ({ id, texto: id, grupo: 'origen' })),
        ...['que-es', 'quien-es', 'por-que'].map(id => ({ id, texto: id, grupo: 'destino' })),
    ] };
    const view = await screen({ config: { guided_lesson: 'greetings' }, exercises: [...images, audio],
        post: ({ path }) => path.endsWith('/guided/result') ? { ...perfectScore, score: 4, max_score: 4, total_items: 4, correct_count: 4 }
            : { response_id: Number(path.split('/')[2]), is_correct: true, xp_earned: 10 } });
    click(view, 'Continuar');
    assert.equal(nodes(view.render()).filter(node => node.type === 'img').length, 3);
    images.forEach(exercise => choose(view, 'wasi', exercise.id)); await check(view); click(view, 'Continuar');
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === 'Ejercicio 4 de 4'));
    assert.equal(button(view, 'Comprobar').props.disabled, true);
    const component = () => nodes(view.render()).find(node => node.type === 'AudioMatchingExercise');
    component().props.onSelectOrigin('imatak');
    assert.equal(component().props.selectedOrigin, 'imatak');
    component().props.onSelectOrigin('imatak');
    assert.equal(component().props.selectedOrigin, '');
    component().props.onSelectOrigin('imatak'); component().props.onPair('que-es');
    component().props.onSelectOrigin('imatak');
    assert.equal(component().props.answer.pares.length, 0);
    component().props.onSelectOrigin('imatak'); component().props.onPair('que-es');
    component().props.onPair('que-es');
    assert.equal(component().props.answer.pares.length, 0);
    for (const [origin, destination] of [['imatak', 'que-es'], ['pitak-kan', 'quien-es']]) {
        component().props.onSelectOrigin(origin); component().props.onPair(destination);
        assert.equal(button(view, 'Comprobar').props.disabled, true);
    }
    click(view, 'Volver');
    assert.equal(nodes(view.render()).filter(node => node.type === 'img').length, 3);
    click(view, 'Continuar');
    assert.equal(component().props.answer.pares.length, 2);
    component().props.onSelectOrigin('imamanta'); component().props.onPair('por-que');
    await check(view);
    assert.equal(component().props.disabled, true);
    assert.deepEqual(JSON.parse(JSON.stringify(view.requests.at(-1).payload.answer)), { pares: [
        { origen: 'imatak', destino: 'que-es' }, { origen: 'pitak-kan', destino: 'quien-es' }, { origen: 'imamanta', destino: 'por-que' },
    ] });
    await finish(view);
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === '4 de 4 ejercicios correctos'));
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
    assert.ok(nodes(result.render()).some(node => node.props['aria-label'] === '2 de 2 ejercicios correctos'));
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

const flowerChoice = { ...choice, id: 13, config: { ...choice.config, prompt_image: 'kichwa/imagenes/flor.webp' } };

test('grouped choices keep successful answers and retry only the failed request with its original IDs', async () => {
    let fail = true;
    const storage = new Map();
    const post = ({ path }) => {
        if (path.includes('/13/') && fail) throw Error('offline');
        return { response_id: path.includes('/11/') ? 101 : 103, is_correct: true, xp_earned: 10 };
    };
    const view = await screen({ storage, exercises: [choice, flowerChoice, matching], post });
    click(view, 'Continuar'); choose(view, 'wasi', 11); choose(view, 'sisa', 13); await check(view);
    assert.equal(view.requests.length, 2);
    assert.equal(nodes(view.render()).filter(node => node.type === 'fieldset' && node.props.disabled).length, 1);
    assert.ok(nodes(view.render()).some(node => node.props.role === 'alert'));
    assert.equal(button(view, 'Continuar'), undefined);
    const failed = view.requests[1].payload;
    fail = false;
    const resumed = await screen({ storage, exercises: [choice, flowerChoice, matching], post });
    await check(resumed);
    assert.equal(resumed.requests.length, 1);
    assert.equal(resumed.requests[0].path, '/exercises/13/answer');
    assert.equal(resumed.requests[0].payload.practice_attempt_id, failed.practice_attempt_id);
    assert.equal(resumed.requests[0].payload.submission_id, failed.submission_id);
    assert.ok(content(resumed.render()).includes('20 XP en este intento'));
    click(resumed, 'Continuar');
    assert.ok(nodes(resumed.render()).some(node => node.props['aria-label'] === 'Ejercicio 3 de 3'));
});

test('an incorrect grouped answer stays editable without changing or rewarding its correct neighbor twice', async () => {
    const view = await screen({ exercises: [choice, flowerChoice], post: ({ path, payload }) => ({
        response_id: path.includes('/11/') ? 101 : payload.answer.seleccion[0] === 'sisa' ? 104 : 103,
        is_correct: path.includes('/11/') || payload.answer.seleccion[0] === 'sisa',
        xp_earned: path.includes('/11/') || payload.answer.seleccion[0] === 'sisa' ? 10 : 0,
        feedback: 'Respuesta comprobada.',
    }) });
    click(view, 'Continuar'); choose(view, 'wasi', 11); choose(view, 'llama', 13); await check(view);
    assert.equal(button(view, 'Ver mi puntaje'), undefined);
    assert.ok(button(view, 'Comprobar'));
    choose(view, 'shunku', 11);
    assert.equal(nodes(view.render()).find(node => node.props.name === 'guided-11' && node.props.value === 'wasi').props.checked, true);
    choose(view, 'sisa', 13);
    assert.equal(button(view, 'Ver mi puntaje'), undefined);
    await check(view);
    assert.equal(view.requests.filter(request => request.path === '/exercises/11/answer').length, 1);
    assert.equal(view.requests.filter(request => request.path === '/exercises/13/answer').length, 2);
    assert.equal(view.requests[1].payload.practice_attempt_id, view.requests[2].payload.practice_attempt_id);
    assert.notEqual(view.requests[1].payload.submission_id, view.requests[2].payload.submission_id);
    assert.ok(content(view.render()).includes('20 XP en este intento'));
    assert.ok(button(view, 'Ver mi puntaje'));
});

test('old drafts on the second choice open the combined panel and move back to the lesson', async () => {
    const storage = new Map();
    const view = await screen({ storage, exercises: [choice, flowerChoice, matching] });
    view.render();
    const key = 'yachay:guided-attempt:v1:3:4';
    const saved = JSON.parse(storage.get(key));
    saved.step = 2;
    saved.answers = { 11: { seleccion: ['wasi'] }, 13: { seleccion: ['sisa'] } };
    storage.set(key, JSON.stringify(saved));
    const resumed = await screen({ storage, exercises: [choice, flowerChoice, matching] });
    assert.equal(nodes(resumed.render()).filter(node => node.type === 'img').length, 2);
    assert.equal(nodes(resumed.render()).filter(node => node.type === 'input' && node.props.checked).length, 2);
    click(resumed, 'Volver');
    assert.ok(nodes(resumed.render()).some(node => node.type === 'GuidedIntroduction'));
});

test('double clicks do not duplicate a batch and changed resumed answers cancel pending submissions', async () => {
    const pending = new Map();
    const view = await screen({ exercises: [choice, flowerChoice], post: ({ path }) => new Promise(done => { pending.set(path, done); }) });
    click(view, 'Continuar'); choose(view, 'wasi', 11); choose(view, 'sisa', 13);
    click(view, 'Comprobar'); click(view, 'Comprobando…');
    assert.equal(view.requests.length, 2);
    view.remount();
    choose(view, 'llama', 13);
    pending.get('/exercises/11/answer')({ response_id: 101, is_correct: true, xp_earned: 10 });
    pending.get('/exercises/13/answer')({ response_id: 103, is_correct: true, xp_earned: 10 });
    await new Promise(done => setImmediate(done));
    assert.equal(view.requests.length, 2);
    assert.equal(nodes(view.render()).find(node => node.props.name === 'guided-13' && node.props.value === 'llama').props.checked, true);
    assert.equal(button(view, 'Comprobar').props.disabled, false);
});

test('both image answers start together and out-of-order responses preserve the authoritative XP total', async () => {
    const pending = new Map();
    const view = await screen({ exercises: [choice, flowerChoice], post: ({ path }) => new Promise(done => pending.set(path, done)) });
    click(view, 'Continuar'); choose(view, 'wasi', 11); choose(view, 'sisa', 13); click(view, 'Comprobar');
    assert.equal(pending.size, 2);
    assert.equal(view.requests[0].payload.practice_attempt_id, view.requests[1].payload.practice_attempt_id);
    pending.get('/exercises/13/answer')({ response_id: 103, is_correct: true, xp_earned: 10, xp_attempt: 20 });
    await new Promise(done => setImmediate(done));
    assert.equal(button(view, 'Ver mi puntaje'), undefined);
    assert.equal(button(view, 'Comprobando…').props.disabled, true);
    pending.get('/exercises/11/answer')({ response_id: 101, is_correct: true, xp_earned: 10, xp_attempt: 10 });
    await new Promise(done => setImmediate(done));
    assert.ok(content(view.render()).includes('20 XP en este intento'));
    assert.ok(button(view, 'Ver mi puntaje'));
    const saved = JSON.parse([...view.storage.values()][0]);
    assert.equal(saved.feedback[11].response_id, 101);
    assert.equal(saved.feedback[13].response_id, 103);
});

test('a fast failed answer does not abandon its slower neighbor and retries only the failed submission', async () => {
    let resolveNeighbor;
    let retry = false;
    const view = await screen({ exercises: [choice, flowerChoice], post: ({ path }) => {
        if (path.includes('/11/')) { if (!retry) throw Error('offline'); return { response_id: 101, is_correct: true, xp_earned: 10 }; }
        return new Promise(done => { resolveNeighbor = done; });
    } });
    click(view, 'Continuar'); choose(view, 'wasi', 11); choose(view, 'sisa', 13); click(view, 'Comprobar');
    await new Promise(done => setImmediate(done));
    assert.equal(button(view, 'Comprobando…').props.disabled, true);
    resolveNeighbor({ response_id: 103, is_correct: true, xp_earned: 10 });
    await new Promise(done => setImmediate(done));
    assert.ok(nodes(view.render()).some(node => node.props.role === 'alert'));
    retry = true; await check(view);
    assert.equal(view.requests.length, 3);
    assert.equal(view.requests[2].path, '/exercises/11/answer');
    assert.equal(view.requests[0].payload.submission_id, view.requests[2].payload.submission_id);
    assert.ok(content(view.render()).includes('20 XP en este intento'));
});

test('the lesson preloads at most two image panels across intervening matching exercises without repeated loads', async () => {
    const images = Array.from({ length: 5 }, (_, i) => ({ ...choice, id: 30 + i, config: { ...choice.config, prompt_image: `kichwa/imagenes/test${i}.webp` } }));
    const view = await screen({ exercises: [matching, ...images] });
    view.render();
    assert.equal(view.preloads.length, 4);
    assert.deepEqual(view.preloads.map(image => image.src), images.slice(0, 4).map(image => '/api/media/' + image.config.prompt_image));
    assert.ok(view.preloads.every(image => image.decoding === 'async' && image.fetchPriority === 'low'));
    view.render(); click(view, 'Continuar');
    assert.equal(view.preloads.length, 4);
    for (const [spanish, kichwa] of [['Flor', 'sisa'], ['Oveja', 'llama'], ['Corazón', 'shunku'], ['Caminar', 'purina']]) pair(view, spanish, kichwa);
    await check(view); click(view, 'Continuar');
    assert.equal(view.preloads.length, 4);
    choose(view, 'wasi', 30); choose(view, 'wasi', 31); await check(view); click(view, 'Continuar');
    view.render();
    assert.equal(view.preloads.length, 5);
    assert.equal(view.preloads.at(-1).src, '/api/media/kichwa/imagenes/test4.webp');
});

test('an image that failed to preload can be requested again on the next screen', async () => {
    const view = await screen({ exercises: [matching, choice, flowerChoice] });
    view.render();
    assert.equal(view.preloads.length, 2);
    view.preloads[0].onerror();
    click(view, 'Continuar'); view.render();
    assert.equal(view.preloads.length, 3);
    assert.equal(view.preloads[2].src, view.preloads[0].src);
});

test('walking and yura share the second panel and all five exercises keep their own results and XP', async () => {
    const walking = { ...choice, id: 14, elements: ['wasi', 'shunku', 'purina', 'sisa'].map(id => ({ id, texto: id })), config: { ...choice.config, prompt_image: 'kichwa/imagenes/purina.webp' } };
    const tree = { ...choice, id: 15, elements: ['sisa', 'yura', 'wasi', 'purina'].map(id => ({ id, texto: id })), config: { ...choice.config, prompt_image: 'kichwa/imagenes/yura.webp', prompt_image_alt: 'Un árbol de copa verde y tronco marrón.' } };
    const exercises = [choice, flowerChoice, walking, tree, matching];
    const storage = new Map();
    const post = ({ path }) => path.endsWith('/guided/result')
        ? { ...perfectScore, total_items: 8, correct_count: 8, xp_earned: 50 }
        : { response_id: Number(path.split('/')[2]) + 100, is_correct: true, xp_earned: 10, feedback: path.includes('/15/') ? 'Yura significa árbol.' : 'Correcto.' };
    const view = await screen({ exercises, storage, post });
    click(view, 'Continuar'); choose(view, 'wasi', 11); choose(view, 'sisa', 13); await check(view);
    click(view, 'Continuar');
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === 'Ejercicios 3 y 4 de 5'));
    const pictures = nodes(view.render()).filter(node => node.type === 'img');
    assert.deepEqual(pictures.map(node => node.props.src), ['/api/media/kichwa/imagenes/purina.webp', '/api/media/kichwa/imagenes/yura.webp']);
    assert.equal(pictures[1].props.alt, 'Un árbol de copa verde y tronco marrón.');
    choose(view, 'purina', 14);
    assert.equal(button(view, 'Comprobar').props.disabled, true);
    choose(view, 'yura', 15);
    const resumed = await screen({ exercises, storage, post });
    assert.equal(nodes(resumed.render()).filter(node => node.type === 'input' && node.props.checked).length, 2);
    await check(resumed);
    assert.deepEqual(resumed.requests.map(request => request.path), ['/exercises/14/answer', '/exercises/15/answer']);
    assert.ok(content(resumed.render()).includes('Yura significa árbol.'));
    assert.ok(content(resumed.render()).includes('40 XP en este intento'));
    assert.equal(button(resumed, 'Ver mi puntaje'), undefined);
    click(resumed, 'Volver');
    assert.ok(nodes(resumed.render()).some(node => node.props['aria-label'] === 'Ejercicios 1 y 2 de 5'));
    click(resumed, 'Continuar'); click(resumed, 'Continuar');
    assert.ok(nodes(resumed.render()).some(node => node.props['aria-label'] === 'Ejercicio 5 de 5'));
    click(resumed, 'Volver');
    assert.ok(nodes(resumed.render()).some(node => node.props['aria-label'] === 'Ejercicios 3 y 4 de 5'));
    assert.equal(nodes(resumed.render()).filter(node => node.type === 'fieldset' && node.props.disabled).length, 2);
    click(resumed, 'Continuar');
    for (const [spanish, kichwa] of [['Flor', 'sisa'], ['Oveja', 'llama'], ['Corazón', 'shunku'], ['Caminar', 'purina']]) pair(resumed, spanish, kichwa);
    await check(resumed); await finish(resumed);
    assert.deepEqual(Array.from(resumed.requests.at(-1).payload.response_ids), [111, 113, 114, 115, 112]);
    assert.equal(nodes(resumed.render()).find(node => node.type === 'LearningCompanion').props.xpEarned, 50);
    click(resumed, 'Reintentar'); click(resumed, 'Continuar');
    assert.equal(nodes(resumed.render()).filter(node => node.type === 'input' && node.props.checked).length, 0);
});

test('matching progress follows selections without a visible pair summary', async () => {
    const view = await screen();
    click(view, 'Continuar'); choose(view, 'wasi'); await check(view); click(view, 'Continuar');
    const progress = () => nodes(view.render()).find(node => node.type === 'progress');
    assert.equal(nodes(view.render()).some(node => node.props['aria-label'] === 'Resumen de tus parejas'), false);
    assert.equal(progress().props.value, 0);
    assert.equal(progress().props.max, 4);
    click(view, 'Flor');
    assert.ok(content(view.render()).includes('Ahora elige la pareja de «Flor» en kichwa.'));
    click(view, 'sisa');
    assert.equal(progress().props.value, 1);
    pair(view, 'Oveja', 'sisa');
    assert.equal(progress().props.value, 0);
    pair(view, 'Oveja', 'sisa');
    assert.equal(progress().props.value, 1);
    click(view, 'sisa');
    assert.equal(progress().props.value, 0);
});

test('final listening panel requires three answers, preserves drafts, awards ten XP and finishes the unit', async () => {
    const listening = { id: 16, type: 'completar', prompt: 'Escucha y escribe la vocal.', elements: [{ id: 'audio1', texto: 'sh_nku' }, { id: 'audio2', texto: 'p_rina' }, { id: 'audio3', texto: 'll_ma' }], zones: [], config: { title: 'La vocal que falta', presentation: 'writing', listening_vowels: true } };
    const exercises = [matching, listening];
    const storage = new Map();
    const post = ({ path, payload }) => path.endsWith('/guided/result') ? { ...perfectScore, xp_earned: 20 } : {
        response_id: path.includes('/12/') ? 112 : payload.answer.textos.audio3 === 'a' ? 116 : 117,
        is_correct: !payload.answer.textos || payload.answer.textos.audio3 === 'a',
        xp_earned: !payload.answer.textos || payload.answer.textos.audio3 === 'a' ? 10 : 0,
    };
    const view = await screen({ exercises, storage, post });
    click(view, 'Continuar');
    for (const [spanish, kichwa] of [['Flor', 'sisa'], ['Oveja', 'llama'], ['Corazón', 'shunku'], ['Caminar', 'purina']]) pair(view, spanish, kichwa);
    await check(view); click(view, 'Continuar');
    const panel = target => nodes(target.render()).find(node => node.type === 'MissingVowelExercise');
    assert.ok(panel(view));
    assert.equal(button(view, 'Comprobar').props.disabled, true);
    panel(view).props.onChange({ textos: { audio1: 'u', audio2: 'u' } });
    assert.equal(button(view, 'Comprobar').props.disabled, true);
    panel(view).props.onChange({ textos: { audio1: 'u', audio2: 'u', audio3: 'i' } });
    await check(view);
    assert.equal(button(view, 'Ver mi puntaje'), undefined);
    assert.equal(panel(view).props.disabled, false);
    panel(view).props.onChange({ textos: { audio1: 'u', audio2: 'u', audio3: 'a' } });
    const resumed = await screen({ exercises, storage, post });
    assert.equal(panel(resumed).props.answer.textos.audio3, 'a');
    await check(resumed);
    assert.equal(resumed.requests[0].path, '/exercises/16/answer');
    assert.equal(panel(resumed).props.disabled, true);
    assert.ok(content(resumed.render()).includes('20 XP en este intento'));
    await finish(resumed);
    assert.deepEqual(Array.from(resumed.requests.at(-1).payload.response_ids), [112, 116]);
    assert.equal(nodes(resumed.render()).find(node => node.type === 'LearningCompanion').props.xpEarned, 20);
});

test('incorrect matching cannot finish until every pair is correct', async () => {
    const view = await screen({ exercises: [matching], post: ({ path, payload }) => path.endsWith('/guided/result')
        ? { ...perfectScore, score: 1, max_score: 1, correct_count: 1, total_items: 1 }
        : { response_id: payload.answer.pares.find(pair => pair.origen === 'flor').destino === 'sisa' ? 112 : 111, is_correct: payload.answer.pares.find(pair => pair.origen === 'flor').destino === 'sisa', feedback: 'Revisa las parejas.' }
    });
    click(view, 'Continuar');
    for (const [spanish, kichwa] of [['Flor', 'llama'], ['Oveja', 'sisa'], ['Corazón', 'shunku'], ['Caminar', 'purina']]) pair(view, spanish, kichwa);
    await check(view);
    assert.equal(button(view, 'Ver mi puntaje'), undefined);
    assert.ok(button(view, 'Comprobar'));
    assert.equal(view.requests.some(request => request.path.endsWith('/guided/result')), false);
    click(view, 'Flor'); click(view, 'Oveja');
    pair(view, 'Flor', 'sisa'); pair(view, 'Oveja', 'llama');
    await check(view); await finish(view);
    assert.ok(nodes(view.render()).some(node => node.props['aria-label'] === '1 de 1 ejercicios correctos'));
});

test('resuming a legacy draft returns to the first incorrect exercise without losing answers or XP', async () => {
    const storage = new Map();
    const view = await screen({ storage });
    view.render();
    const key = 'yachay:guided-attempt:v1:3:4';
    const saved = JSON.parse(storage.get(key));
    saved.step = 3;
    saved.answers = { 11: { seleccion: ['sisa'] } };
    saved.feedback = { 11: { response_id: 101, is_correct: false } };
    saved.xpEarned = 10;
    saved.summary = { ...perfectScore, score: 12, max_score: 20, passed: false };
    storage.set(key, JSON.stringify(saved));
    const resumed = await screen({ storage });
    resumed.render();
    assert.equal(nodes(resumed.render()).find(node => node.props.value === 'sisa').props.checked, true);
    assert.equal(button(resumed, 'Continuar'), undefined);
    assert.ok(button(resumed, 'Comprobar'));
    assert.equal(JSON.parse(storage.get(key)).summary, null);
    assert.equal(JSON.parse(storage.get(key)).xpEarned, 10);
    assert.equal(resumed.requests.length, 0);
});

test('saved results on the twenty point scale display the number of exercises instead', async () => {
    const storage = new Map();
    const view = await screen({ storage });
    await complete(view);
    const key = 'yachay:guided-attempt:v1:3:4';
    const saved = JSON.parse(storage.get(key));
    saved.summary = { ...saved.summary, score: 20, max_score: 20 };
    storage.set(key, JSON.stringify(saved));
    const resumed = await screen({ storage });
    resumed.render();
    assert.ok(nodes(resumed.render()).some(node => node.props['aria-label'] === '2 de 2 ejercicios correctos'));
});
