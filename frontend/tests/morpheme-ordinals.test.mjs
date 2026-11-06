import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/components/MorphemeOrdinalExercise.tsx', import.meta.url), 'utf8'), 'MorphemeOrdinalExercise.tsx');
const jsx = (type, props) => ({ type, props });
function nodes(tree) { if (Array.isArray(tree)) return tree.flatMap(nodes); return tree?.props ? [tree, ...nodes(tree.props.children)] : []; }
const elements = ['Shukniki', 'Ishkayniki', 'Kimsaniki', 'Chuskuniki', 'Pichkaniki', 'Suktaniki', 'Kanchisniki', 'Pusakniki', 'Iskunniki'].map((texto, index) => ({ id: String(index + 1), texto }));

async function screen(initial = {}) {
    let cursor = 0, answer = initial, disabled = false, feedback;
    const states = [];
    const context = vm.createContext({});
    const module = new vm.SourceTextModule(code, { context });
    await module.link(specifier => {
        const values = specifier === 'react' ? { useState: initial => { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; } }
            : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx }
            : { Check: 'Check', RotateCcw: 'RotateCcw', X: 'X' };
        return new vm.SyntheticModule(Object.keys(values), function () { for (const [key, value] of Object.entries(values)) this.setExport(key, value); }, { context });
    });
    await module.evaluate();
    function render() { cursor = 0; return nodes(module.namespace.MorphemeOrdinalExercise({ exercise: { id: 5, type: 'ordenar', elements }, answer, feedback, disabled, onChange: value => { answer = value; feedback = undefined; } })); }
    return {
        nodes: render,
        answer: () => JSON.parse(JSON.stringify(answer)),
        word: id => render().find(node => node.props['aria-label'] === `Elegir ${elements[Number(id) - 1].texto}`),
        slot: index => render().filter(node => node.type === 'button' && node.props.className === 'ordinal-target')[index],
        label: label => render().find(node => node.props['aria-label'] === label),
        disable: () => { disabled = true; },
        grade: value => { feedback = value; },
    };
}

test('words can be placed in any numbered slot and removing a word never shifts another position', async () => {
    const view = await screen();
    view.word('9').props.onClick(); view.slot(8).props.onClick();
    assert.deepEqual(view.answer().orden, ['', '', '', '', '', '', '', '', '9']);
    view.slot(0).props.onClick(); view.word('1').props.onClick();
    assert.equal(view.answer().orden[0], '1');
    assert.equal(view.answer().orden[8], '9');
    assert.equal(view.word('1').props.disabled, true);
    view.label('Quitar Shukniki del 1.º lugar').props.onClick();
    assert.equal(view.answer().orden[0], '');
    assert.equal(view.answer().orden[8], '9');
    assert.equal(view.word('1').props.disabled, false);
    const restored = await screen(view.answer());
    assert.match(restored.slot(8).props['aria-label'], /9.º Noveno: Iskunniki/);
});

test('dragging swaps occupied places, replacement returns the old word and reset clears all positions', async () => {
    const view = await screen({ orden: ['1', '', '', '', '', '', '', '', '9'] });
    view.slot(8).props.onDrop({ preventDefault() {}, dataTransfer: { getData: () => '1' } });
    assert.deepEqual(view.answer().orden, ['9', '', '', '', '', '', '', '', '1']);
    view.word('2').props.onClick(); view.slot(0).props.onClick();
    assert.equal(view.answer().orden[0], '2');
    assert.equal(view.word('9').props.disabled, false);
    const saved = view.answer();
    view.slot(2).props.onDrop({ preventDefault() {}, dataTransfer: { getData: () => 'unknown' } });
    assert.deepEqual(view.answer(), saved);
    view.label('Reiniciar ordinales').props.onClick();
    assert.deepEqual(view.answer(), { orden: [] });
});

test('grades belong to the placed word and disabled cards reject clicks, drops, removal and reset', async () => {
    const view = await screen({ orden: ['2', '1', '3', '4', '5', '6', '7', '8', '9'] });
    view.grade({ is_correct: false, item_results: { 1: false, 2: false, 3: true } });
    assert.equal(view.slot(0).props['data-answer-correct'], false);
    assert.equal(view.slot(2).props['data-answer-correct'], true);
    view.disable();
    const saved = view.answer();
    assert.ok(view.nodes().filter(node => node.type === 'button').every(node => node.props.disabled));
    view.slot(0).props.onDrop({ preventDefault() {}, dataTransfer: { getData: () => '9' } });
    view.slot(0).props.onClick();
    assert.deepEqual(view.answer(), saved);
    assert.equal(view.label('Quitar Ishkayniki del 1.º lugar'), undefined);
});
