import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/components/VerbFillPractice.tsx', import.meta.url), 'utf8'), 'VerbFillPractice.tsx');
const context = vm.createContext({});
const jsx = (type, props) => ({ type, props });
const dependencies = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    './ExerciseCard': { mediaUrl: path => '/api/media/' + path },
};
const module = new vm.SourceTextModule(code, { context });
await module.link(specifier => new vm.SyntheticModule(Object.keys(dependencies[specifier]), function () {
    for (const [key, value] of Object.entries(dependencies[specifier])) this.setExport(key, value);
}, { context }));
await module.evaluate();

function nodes(tree) {
    if (Array.isArray(tree)) return tree.flatMap(nodes);
    if (!tree?.props) return [];
    return [tree, ...nodes(tree.props.children)];
}

test('a scene and six tactile options fill and clear the blank without submitting', () => {
    const exercise = {
        type: 'completar', elements: [{ id: 'word', texto: 'purina → _____ + na', opciones: ['puri', 'purina', 'pu', 'rina', 'puna', 'pur'] }],
        config: { prompt_image: 'walking.webp', prompt_image_alt: 'Una persona camina.' },
    };
    let answer = {};
    const render = () => module.namespace.VerbFillPractice({ exercise, answer, busy: false, onChange: value => { answer = value; } });
    const first = nodes(render());
    assert.equal(first.find(node => node.type === 'img').props.src, '/api/media/walking.webp');
    assert.equal(first.filter(node => node.type === 'button' && exercise.elements[0].opciones.includes(node.props.children)).length, 6);
    first.find(node => node.type === 'button' && node.props.children === 'puri').props.onClick();
    assert.equal(answer.textos.word, 'puri');
    const selected = nodes(render()).find(node => node.type === 'button' && node.props.children === 'puri' && node.props['aria-pressed'] !== undefined);
    assert.equal(selected.props['aria-pressed'], true);
    selected.props.onClick();
    assert.equal(answer.textos.word, '');
});
