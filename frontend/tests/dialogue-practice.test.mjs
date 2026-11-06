import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/components/DialoguePractice.tsx', import.meta.url), 'utf8'), 'DialoguePractice.tsx');
const exercises = JSON.parse(await readFile(new URL('../../backend/resources/lessons/intermediate-dialogues-exercises.json', import.meta.url), 'utf8'));
const jsx = (type, props, key) => ({ type, props, key });
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : tree?.props ? [tree, ...nodes(tree.props.children)] : [];

async function screen(activity, initialAnswer = {}) {
    let cursor = 0;
    const state = [];
    let answer = initialAnswer;
    const controlledMath = Object.create(Math);
    let randomSeed = 123;
    controlledMath.random = () => ((randomSeed = (randomSeed * 16807) % 2147483647) - 1) / 2147483646;
    const context = vm.createContext({ Math: controlledMath });
    const module = new vm.SourceTextModule(code, { context });
    await module.link(specifier => {
        const dep = specifier === 'react' ? {
            useState(initial) { const index = cursor++; if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial; return [state[index], next => state[index] = next]; },
        } : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' }
            : specifier === 'lucide-react' ? Object.fromEntries(['ArrowDown', 'ArrowUp', 'BookOpen', 'GripVertical', 'MessageCircle', 'Plus', 'RotateCcw', 'X'].map(name => [name, name]))
            : specifier.endsWith('.png') || specifier.endsWith('.webp') ? { default: specifier } : {};
        return new vm.SyntheticModule(Object.keys(dep), function () { for (const [key, value] of Object.entries(dep)) this.setExport(key, value); }, { context });
    });
    await module.evaluate();
    return {
        render(extra = {}) { cursor = 0; return nodes(module.namespace.DialoguePractice({ exercise: { ...exercises[activity - 1], id: activity }, answer, busy: false, onChange: next => { answer = next; }, ...extra })); },
        answer() { return JSON.parse(JSON.stringify(answer)); },
    };
}

test('one list keeps all phrases while moving them up, down and resetting', async () => {
    const view = await screen(2, { orden: ['t5', 't4', 't3', 't2', 't1', 't0'] });
    const rows = () => view.render().filter(node => node.type === 'li');
    assert.equal(rows().length, 6);
    assert.equal(view.render().find(node => node.props['aria-label'] === 'Subir turno 1').props.disabled, true);
    assert.equal(view.render().find(node => node.props['aria-label'] === 'Bajar turno 6').props.disabled, true);
    view.render().find(node => node.props['aria-label'] === 'Bajar turno 1').props.onClick();
    assert.deepEqual(view.answer().orden, ['t4', 't5', 't3', 't2', 't1', 't0']);
    assert.equal(rows()[1].props.className, 'is-moving');
    assert.equal(rows().filter(node => node.props.className === 'is-moving').length, 1);
    view.render().find(node => node.props['aria-label'] === 'Subir turno 2').props.onClick();
    assert.deepEqual(view.answer().orden, ['t5', 't4', 't3', 't2', 't1', 't0']);
    assert.equal(rows()[0].props.className, 'is-moving');
    assert.equal(view.render({ feedback: { is_correct: true } }).some(node => node.props.className === 'is-moving'), false);
    assert.equal(rows().length, 6);
    assert.equal(view.render().some(node => node.props['data-answer-correct'] === true), false);
    view.render().find(node => node.type === 'button' && node.props.className === 'secondary-button').props.onClick();
    assert.deepEqual(view.answer().orden, []);
    assert.equal(rows().length, 6);
});

test('a partial draft from the previous interface restores all phrases exactly once', async () => {
    const view = await screen(6, { orden: ['t0', 't1', 't0', 'foreign'] });
    assert.equal(view.render().filter(node => node.type === 'li').length, 9);
    view.render().find(node => node.props['aria-label'] === 'Bajar turno 1').props.onClick();
    assert.deepEqual(view.answer().orden, ['t1', 't0', 't8', 't7', 't6', 't5', 't4', 't3', 't2']);
});

test('both ordering activities start mixed, stay stable and get a different mix on reset', async () => {
    for (const activity of [2, 6]) {
        const view = await screen(activity);
        const ids = () => view.render().filter(node => node.type === 'li').map(node => node.key);
        const original = exercises[activity - 1].elements.map(item => item.id);
        const first = ids();
        assert.deepEqual([...first].sort(), [...original].sort());
        assert.notDeepEqual(first, original);
        assert.notDeepEqual(first, [...original].reverse());
        assert.deepEqual(ids(), first);
        view.render().find(node => node.type === 'button' && node.props.className === 'secondary-button').props.onClick();
        const second = ids();
        assert.notDeepEqual(second, first);
        assert.notDeepEqual(second, original);
        assert.notDeepEqual(second, [...original].reverse());
        assert.deepEqual([...second].sort(), [...original].sort());
        assert.deepEqual(ids(), second);
        view.render().find(node => node.props['aria-label'] === 'Bajar turno 1').props.onClick();
        assert.deepEqual(view.answer().orden, [second[1], second[0], ...second.slice(2)]);
    }
});

test('completion uses only the selectors, rejects unrelated values, and moves a reused response', async () => {
    const view = await screen(3);
    assert.equal(view.render().some(node => node.props.className === 'dialogue-bank'), false);
    const choose = (slot, value) => view.render().filter(node => node.type === 'select')[slot].props.onChange({ target: { value } });
    choose(0, 'foreign text');
    assert.deepEqual(view.answer(), {});
    const option = exercises[2].elements[0].opciones[0];
    choose(0, option);
    assert.equal(view.answer().textos.t1, option);
    choose(1, option);
    assert.equal(view.answer().textos.t1, '');
    assert.equal(view.answer().textos.t2, option);
});

test('completion selectors are locked while submitting or after success', async () => {
    const view = await screen(7);
    for (const extra of [{ busy: true }, { feedback: { is_correct: true } }]) {
        const selectors = view.render(extra).filter(node => node.type === 'select');
        assert.equal(selectors.length, 3);
        assert.ok(selectors.every(node => node.props.disabled));
        selectors[0].props.onChange({ target: { value: exercises[6].elements[0].opciones[0] } });
        assert.deepEqual(view.answer(), {});
    }
});

test('continuation choices preserve other answers and do not claim success before grading', async () => {
    const view = await screen(4);
    view.render().find(node => node.type === 'input').props.onChange();
    view.render().filter(node => node.type === 'input')[3].props.onChange();
    assert.equal(Object.keys(view.answer().textos).length, 2);
    assert.equal(view.render().some(node => node.props['data-answer-correct'] === true), false);
});

test('Edgar and Janeth reading shows the corrected turns and farewell with the image below the choices', async () => {
    const view = await screen(5);
    const rendered = view.render();
    const reading = rendered.find(node => node.props.className === 'dialogue-reading');
    const side = rendered.find(node => node.props.className === 'dialogue-side');
    const lines = nodes(reading).filter(node => node.type === 'li');
    assert.equal(lines.length, 15);
    assert.equal(nodes(reading).some(node => node.type === 'img'), false);
    assert.equal(rendered.some(node => node.props.className === 'dialogue-key'), false);
    const children = nodes(side);
    assert.ok(children.findIndex(node => node.type === 'fieldset') < children.findIndex(node => node.type === 'img'));
    const texts = nodes(reading).filter(node => node.type === 'span' && node.props.lang === 'qu').map(node => node.props.children);
    assert.equal(texts[5], 'Mana casaranichu – kikinka.');
    assert.equal(texts[12], 'Ñukapish wasimanmi rikuni.');
    assert.equal(texts[13], 'Chashnaka hakuyari.');
    assert.equal(texts[14], 'Haku haku.');
    const options = rendered.filter(node => node.type === 'input');
    assert.equal(options.length, 3);
    options[2].props.onChange();
    assert.deepEqual(view.answer(), { seleccion: ['o2'] });
});

test('busy and completed exercises disable controls and ignore move mutations', async () => {
    const view = await screen(2);
    for (const extra of [{ busy: true }, { feedback: { is_correct: true } }]) {
        const rendered = view.render(extra);
        assert.ok(rendered.filter(node => node.type === 'button').every(node => node.props.disabled));
        rendered.find(node => node.props['aria-label'] === 'Bajar turno 1').props.onClick();
        assert.deepEqual(view.answer(), {});
    }
});
