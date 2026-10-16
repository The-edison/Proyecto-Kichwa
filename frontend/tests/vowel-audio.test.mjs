import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/components/VowelAudioButtons.tsx', import.meta.url), 'utf8'), 'VowelAudioButtons.tsx');
const { code: hookCode } = await transformWithOxc(await readFile(new URL('../src/js/hooks/useLessonAudio.ts', import.meta.url), 'utf8'), 'useLessonAudio.ts');
const { code: consonantCode } = await transformWithOxc(await readFile(new URL('../src/js/components/ConsonantAudioButton.tsx', import.meta.url), 'utf8'), 'ConsonantAudioButton.tsx');
const { code: missingCode } = await transformWithOxc(await readFile(new URL('../src/js/components/MissingVowelExercise.tsx', import.meta.url), 'utf8'), 'MissingVowelExercise.tsx');
const jsx = (type, props) => ({ type, props });
function nodes(tree) { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!tree?.props) return []; return [tree, ...nodes(tree.props.children)]; }

async function screen(base = '/') {
    const states = [], audios = [];
    let cursor = 0, cleanup;
    let missingAnswer = {};
    class Audio {
        constructor(src) { this.src = src; this.paused = false; this.promise = new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; }); audios.push(this); }
        play() { this.playCalls = (this.playCalls ?? 0) + 1; return this.promise; }
        pause() { this.paused = true; }
    }
    const context = vm.createContext({ Audio });
    const link = specifier => {
        if (specifier.endsWith('/useLessonAudio')) return hook;
        const dependency = specifier === 'react' ? {
            useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = value; }]; },
            useRef(initial) { const index = cursor++; return states[index] ??= { current: initial }; },
            useEffect(effect) { const index = cursor++; if (!(index in states)) { states[index] = true; cleanup = effect(); } },
        } : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' } : { Volume2: 'Volume2', RotateCcw: 'RotateCcw' };
        return new vm.SyntheticModule(Object.keys(dependency), function () { for (const [name, value] of Object.entries(dependency)) this.setExport(name, value); }, { context });
    };
    const hook = new vm.SourceTextModule(hookCode, { context, initializeImportMeta(meta) { meta.env = { BASE_URL: base }; } });
    const module = new vm.SourceTextModule(code, { context });
    const consonants = new vm.SourceTextModule(consonantCode, { context });
    const missing = new vm.SourceTextModule(missingCode, { context });
    for (const item of [hook, module, consonants, missing]) { await item.link(link); await item.evaluate(); }
    let playback;
    const view = {
        audios,
        render() { cursor = 0; playback = hook.namespace.useLessonAudio(); return module.namespace.VowelAudioButtons({ playback }); },
        consonantButton() { view.render(); return consonants.namespace.ConsonantAudioButton({ playback }); },
        consonantStatus() { view.render(); return playback.state.clip === 'consonantes' ? playback.state.message : ''; },
        click(vowel) { nodes(view.render()).find(node => node.props['aria-label'] === `Escuchar la vocal ${vowel}`).props.onClick(); },
        status() { return nodes(view.render()).find(node => node.props.role === 'status').props.children; },
        missing(disabled = false) { cursor = 0; return missing.namespace.MissingVowelExercise({ exercise: { id: 16, elements: [{ id: 'audio1', texto: 'sh_nku' }, { id: 'audio2', texto: 'p_rina' }, { id: 'audio3', texto: 'll_ma' }] }, answer: missingAnswer, disabled, onChange(value) { missingAnswer = value; } }); },
        missingAnswer() { return missingAnswer; },
        unmount() { cleanup(); },
    };
    view.render();
    return view;
}

test('three accessible native buttons load the correct MP3 only on click and respect the base URL', async () => {
    const view = await screen('/kichwa/');
    assert.equal(view.audios.length, 0);
    const buttons = nodes(view.render()).filter(node => node.type === 'button');
    assert.equal(buttons.length, 3);
    assert.ok(buttons.every(button => button.props.type === 'button'));
    for (const vowel of ['a', 'i', 'u']) {
        view.click(vowel);
        assert.equal(view.audios.at(-1).src, `/kichwa/audios/vocales/${vowel}.mp3`);
        assert.equal(view.audios.at(-1).playCalls, 1);
    }
});

test('switching or repeating a vowel stops the previous audio and starts a fresh recording', async () => {
    const view = await screen();
    view.click('a');
    view.audios[0].onplaying();
    assert.match(view.status(), /Reproduciendo la vocal a/);
    view.click('i');
    assert.equal(view.audios[0].paused, true);
    assert.equal(view.audios[0].onended, null);
    view.click('i');
    assert.equal(view.audios[1].paused, true);
    assert.notEqual(view.audios[1], view.audios[2]);
    view.audios[2].onplaying();
    view.audios[2].onended();
    assert.equal(view.status(), '');
    assert.equal(nodes(view.render()).some(node => node.props.className === 'is-active'), false);
});

test('a missing file or rejected playback shows a recoverable message without an unhandled rejection', async () => {
    const view = await screen();
    view.click('u');
    view.audios[0].reject(new Error('Unsupported or missing audio'));
    await Promise.resolve();
    assert.match(view.status(), /No se pudo reproducir el audio de «u»/);
    view.click('u');
    assert.doesNotMatch(view.status(), /No se pudo/);
    view.audios[1].onerror();
    assert.match(view.status(), /No se pudo reproducir/);
    view.click('a');
    view.audios[2].onplaying();
    assert.match(view.status(), /Reproduciendo la vocal a/);
});

test('late failures from an interrupted sound cannot replace the current status', async () => {
    const view = await screen();
    view.click('a');
    const staleEnded = view.audios[0].onended;
    const stalePlaying = view.audios[0].onplaying;
    view.click('i');
    view.audios[1].onplaying();
    view.audios[0].reject(new Error('Interrupted'));
    staleEnded();
    stalePlaying();
    await Promise.resolve();
    assert.match(view.status(), /Reproduciendo la vocal i/);
});

test('leaving the lesson stops playback and ignores pending failures', async () => {
    const view = await screen();
    view.click('a');
    view.unmount();
    assert.equal(view.audios[0].paused, true);
    assert.equal(view.audios[0].onplaying, null);
    view.audios[0].reject(new Error('Interrupted on unmount'));
    await Promise.resolve();
    assert.doesNotMatch(view.status(), /No se pudo/);
});

test('one consonant button plays the full recording and shares playback with vowels', async () => {
    const view = await screen('/kichwa/');
    assert.equal(view.consonantButton().props['aria-label'], 'Escuchar todas las consonantes');
    assert.equal(view.consonantButton().props.type, 'button');
    view.click('a');
    view.consonantButton().props.onClick();
    assert.equal(view.audios[0].paused, true);
    assert.equal(view.audios[1].src, '/kichwa/audios/consonantes/consonantes.mp3');
    assert.match(view.consonantStatus(), /Cargando las consonantes/);
    assert.equal(view.status(), '');
    view.audios[1].onplaying();
    assert.match(view.consonantStatus(), /Reproduciendo las consonantes/);
    assert.match(view.consonantButton().props.className, /is-active/);
    view.click('i');
    assert.equal(view.audios[1].paused, true);
    assert.equal(view.consonantStatus(), '');
    assert.doesNotMatch(view.consonantButton().props.className, /is-active/);
});

test('consonant playback can restart, finish, recover from errors and stop on leaving', async () => {
    const view = await screen();
    view.consonantButton().props.onClick();
    const stalePlaying = view.audios[0].onplaying;
    view.consonantButton().props.onClick();
    assert.equal(view.audios[0].paused, true);
    view.audios[0].reject(new Error('Interrupted'));
    stalePlaying();
    await Promise.resolve();
    assert.match(view.consonantStatus(), /Cargando las consonantes/);
    view.audios[1].reject(new Error('Missing file'));
    await Promise.resolve();
    assert.match(view.consonantStatus(), /No se pudo reproducir el audio de las consonantes/);
    assert.doesNotMatch(view.consonantButton().props.className, /is-active/);
    view.consonantButton().props.onClick();
    view.audios[2].onplaying();
    view.audios[2].onended();
    assert.equal(view.consonantStatus(), '');
    view.consonantButton().props.onClick();
    view.unmount();
    assert.equal(view.audios[3].paused, true);
    assert.equal(view.audios[3].onplaying, null);
});

test('listening rows map each audio and repeat button to the right recording without overlap', async () => {
    const view = await screen('/kichwa/');
    for (const [index, word] of ['shunku', 'purina', 'llama'].entries()) {
        nodes(view.missing()).find(node => node.props['aria-label'] === `Escuchar el audio ${index + 1}`).props.onClick();
        assert.equal(view.audios.at(-1).src, `/kichwa/audios/vocal-que-falta/${word}.mp3`);
        if (index > 0) assert.equal(view.audios.at(-2).paused, true);
        nodes(view.missing()).find(node => node.props['aria-label'] === `Repetir el audio ${index + 1}`).props.onClick();
        assert.equal(view.audios.at(-2).paused, true);
        assert.equal(view.audios.at(-1).src, `/kichwa/audios/vocal-que-falta/${word}.mp3`);
    }
    view.audios.at(-1).reject(new Error('Missing file'));
    await Promise.resolve();
    assert.match(nodes(view.missing()).find(node => node.props.role === 'status').props.children, /No se pudo reproducir el audio 3/);
    view.unmount();
});

test('listening inputs save one Kichwa vowel per word, normalize uppercase and lock successful answers', async () => {
    const view = await screen();
    const inputs = () => nodes(view.missing()).filter(node => node.type === 'input');
    assert.equal(inputs().length, 3);
    assert.ok(inputs().every(node => node.props.maxLength === 1));
    inputs()[0].props.onChange({ target: { value: 'U' } });
    inputs()[1].props.onChange({ target: { value: 'e' } });
    inputs()[2].props.onChange({ target: { value: 'A' } });
    assert.equal(view.missingAnswer().textos.audio1, 'u');
    assert.equal(view.missingAnswer().textos.audio2, '');
    assert.equal(view.missingAnswer().textos.audio3, 'a');
    const locked = nodes(view.missing(true)).filter(node => node.type === 'input');
    assert.ok(locked.every(node => node.props.disabled));
    locked[0].props.onChange({ target: { value: 'a' } });
    assert.equal(view.missingAnswer().textos.audio1, 'u');
    assert.ok(nodes(view.missing(true)).filter(node => node.type === 'button').every(node => !node.props.disabled));
});
