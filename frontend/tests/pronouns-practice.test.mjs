import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const sources = await Promise.all(['components/PronounsPracticePanel.tsx', 'hooks/useLessonAudio.ts', 'components/ExerciseCard.tsx', 'components/TopicIntroduction.tsx'].map(async path =>
    (await transformWithOxc(await readFile(new URL(`../src/js/${path}`, import.meta.url), 'utf8'), path)).code));
const jsx = (type, props) => ({ type, props });
function nodes(tree) { if (Array.isArray(tree)) return tree.flatMap(nodes); return tree?.props ? [tree, ...nodes(tree.props.children)] : []; }
function text(tree) { return Array.isArray(tree) ? tree.map(text).join('') : tree?.props ? text(tree.props.children) : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : ''; }
const exercise = (id, activity, elements) => ({ id, type: 'completar', prompt: 'Practica', zones: [], config: { pronouns_activity: activity, title: activity }, elements });

async function screen(exercises) {
    let cursor = 0, answers = {}, feedback = {}, busy = false;
    const states = [], cleanups = [], audios = [];
    class Audio {
        constructor(src) { this.src = src; this.promise = new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; }); audios.push(this); }
        play() { return this.promise; }
        pause() { this.paused = true; }
    }
    const context = vm.createContext({ Audio });
    const dependencies = {
        react: {
            useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = value; }]; },
            useRef(initial) { const i = cursor++; return states[i] ??= { current: initial }; },
            useEffect(effect) { const i = cursor++; if (!(i in states)) { states[i] = true; cleanups.push(effect()); } },
        },
        'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
        'lucide-react': Object.fromEntries(['CheckCircle2', 'RotateCcw', 'Volume2', 'Bed', 'Fingerprint', 'Hand', 'UserRound', 'UserRoundCheck', 'Users', 'UsersRound', 'Utensils'].map(name => [name, name])),
        api: { apiBaseUrl: '', apiPost() {}, ApiError: class extends Error {} },
        LearningCompanion: { LearningCompanion: 'LearningCompanion' },
        SuccessConfetti: { SuccessConfetti: 'SuccessConfetti' },
        useAnswerSound: { useAnswerSound: () => () => {} },
        'pronouns-practice.css': {},
        'guided-introduction.css': {}, 'guided-topics.css': {},
        'guided-topics.json': { default: JSON.parse(await readFile(new URL('../../backend/resources/lessons/guided-topics.json', import.meta.url), 'utf8')) },
        LessonOverview: { LessonOverview: 'LessonOverview', LessonNote: 'LessonNote', LessonText: 'LessonText' },
        LessonCardGrid: { LessonCardGrid: 'LessonCardGrid' },
        TopicVisual: { TopicSectionIcon: 'TopicSectionIcon', TopicWordVisual: 'TopicWordVisual' },
    };
    const modules = sources.map(code => new vm.SourceTextModule(code, { context, initializeImportMeta(meta) { meta.env = { BASE_URL: '/yachay/' }; } }));
    const cache = new Map();
    function link(specifier) {
        if (specifier.endsWith('/useLessonAudio')) return modules[1];
        if (specifier.endsWith('/ExerciseCard')) return modules[2];
        const key = dependencies[specifier] ? specifier : specifier.split('/').at(-1);
        if (!cache.has(key)) {
            const dependency = dependencies[key];
            assert.ok(dependency, `Missing dependency: ${specifier}`);
            cache.set(key, new vm.SyntheticModule(Object.keys(dependency), function () { for (const [name, value] of Object.entries(dependency)) this.setExport(name, value); }, { context }));
        }
        return cache.get(key);
    }
    await modules[0].link(link); await modules[0].evaluate();
    await modules[3].link(link); await modules[3].evaluate();
    return {
        audios,
        render() { cursor = 0; return modules[0].namespace.PronounsPracticePanel({ exercises, answers, feedback, busy, start: 1, onChange(item, answer) { answers[item.id] = answer; } }); },
        topic(lesson = 'pronouns') { cursor = 0; return modules[3].namespace.TopicIntroduction({ lesson }); },
        complete(id) { return modules[2].namespace.answerComplete(exercises.find(item => item.id === id), answers[id] ?? {}); },
        answers: () => JSON.parse(JSON.stringify(answers)),
        grade(id, correct = true) { feedback[id] = { is_correct: correct, feedback: correct ? 'Bien hecho' : 'Revisa tus elecciones' }; },
        busy(value) { busy = value; },
        unmount() { cleanups.forEach(cleanup => cleanup?.()); },
    };
}
const find = (view, label) => nodes(view.render()).find(node => node.props['aria-label'] === label);
const options = ['Ñuka', 'Kan', 'Pay'];

test('two cards retain three independent answers and lock only the successfully checked card', async () => {
    const elements = ['yo', 'tu', 'el'].map(id => ({ id, texto: id, imagen: 'kichwa/imagenes/scenes.webp', opciones: options }));
    const view = await screen([exercise(1, 'persons', elements), exercise(2, 'groups', elements)]);
    assert.equal(nodes(view.render()).filter(node => node.type === 'select').length, 6);
    assert.equal(nodes(view.render()).filter(node => node.props.role === 'img').length, 6);
    assert.equal(nodes(view.render()).some(node => node.type === 'button' && text(node) === 'Comprobar'), false);
    assert.equal(view.complete(1), false);
    for (let i = 0; i < 3; i++) nodes(view.render()).filter(node => node.type === 'select')[i].props.onChange({ target: { value: options[i] } });
    assert.deepEqual(view.answers()[1].textos, { yo: 'Ñuka', tu: 'Kan', el: 'Pay' });
    assert.equal(view.complete(1), true);
    assert.equal(view.complete(2), false);
    view.grade(1);
    view.grade(2, false);
    assert.ok(text(view.render()).includes('Ejercicio 1: correcto'));
    assert.ok(text(view.render()).includes('Ejercicio 2: revisa tus respuestas'));
    const selects = nodes(view.render()).filter(node => node.type === 'select');
    assert.equal(selects[0].props.disabled, true); assert.equal(selects[3].props.disabled, false);
    selects[0].props.onChange({ target: { value: 'Pay' } });
    assert.equal(view.answers()[1].textos.yo, 'Ñuka');
});

test('word tiles require all three complete sentences, support removing words and reset one row', async () => {
    const view = await screen([exercise(5, 'order', ['comer', 'no-trabajan', 'vigilan'].map(id => ({ id, texto: id, opciones: ['mikuni', 'Ñuka'] })))]);
    const bank = row => nodes(view.render()).filter(node => node.props.className === 'pronouns-order-bank')[row];
    const select = (row, word) => nodes(bank(row)).find(node => node.type === 'button' && text(node) === word).props.onClick();
    select(0, 'Ñuka'); assert.equal(view.complete(5), false);
    select(0, 'mikuni'); select(1, 'Ñuka'); select(1, 'mikuni'); select(2, 'Ñuka');
    assert.equal(view.complete(5), false);
    select(2, 'mikuni'); assert.equal(view.complete(5), true);
    find(view, 'Quitar Ñuka de la posición 1').props.onClick();
    assert.equal(view.answers()[5].textos.comer, 'mikuni');
    assert.equal(view.complete(5), false);
    find(view, 'Reiniciar oración 2').props.onClick();
    assert.equal(view.answers()[5].textos['no-trabajan'], ''); assert.equal(view.answers()[5].textos.vigilan, 'Ñuka mikuni');
});

test('both listening exercises use the same three MP3s, recover from failures and stop on leaving', async () => {
    const elements = ['audio1', 'audio2', 'audio3'].map(id => ({ id, texto: id, opciones: options }));
    const view = await screen([exercise(3, 'listening', elements), exercise(6, 'listening-pronouns', elements)]);
    assert.equal(view.audios.length, 0);
    find(view, 'Escuchar audio 1 del ejercicio 1').props.onClick();
    assert.equal(view.audios[0].src, '/yachay/audios/unidad-3/pronombres/yo-como.mp3');
    find(view, 'Escuchar audio 2 del ejercicio 1').props.onClick();
    assert.equal(view.audios[0].paused, true);
    assert.equal(view.audios[1].src, '/yachay/audios/unidad-3/pronombres/tu-juegas.mp3');
    view.audios[1].reject(Error('missing')); await new Promise(resolve => setImmediate(resolve));
    assert.ok(text(view.render()).includes('No se pudo reproducir la oración 2'));
    find(view, 'Escuchar audio 2 del ejercicio 2').props.onClick();
    assert.equal(view.audios[2].src, view.audios[1].src);
    find(view, 'Escuchar audio 3 del ejercicio 2').props.onClick();
    assert.equal(view.audios[3].src, '/yachay/audios/unidad-3/pronombres/el-duerme.mp3');
    assert.deepEqual(view.answers(), {});
    view.unmount(); assert.equal(view.audios[3].paused, true);
});

test('the six pronoun words play their own recordings, stop the preceding audio and expose recoverable errors', async () => {
    const view = await screen([]);
    const words = [['ñuka','nuka'],['kan','kan'],['pay','pay'],['ñukanchik','nukanchik'],['kankuna','kankuna'],['paykuna','paykuna']];
    assert.equal(nodes(view.topic()).filter(node => node.type === 'button').length, 6);
    assert.equal(view.audios.length, 0);
    for (const [word,file] of words) {
        nodes(view.topic()).find(node => node.props['aria-label'] === `Escuchar ${word}`).props.onClick();
        assert.equal(view.audios.at(-1).src, `/yachay/audios/unidad-3/pronombres/${file}.mp3`);
        if (view.audios.length > 1) assert.equal(view.audios.at(-2).paused, true);
    }
    view.audios.at(-1).reject(Error('missing'));
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(text(view.topic()).includes('No se pudo reproducir el audio de «paykuna»'));
    nodes(view.topic()).find(node => node.props['aria-label'] === 'Escuchar paykuna').props.onClick();
    assert.equal(view.audios.length, 7);
    view.unmount(); assert.equal(view.audios.at(-1).paused, true);
    assert.equal(nodes(view.topic('numbers')).some(node => node.type === 'button'), false);
});
