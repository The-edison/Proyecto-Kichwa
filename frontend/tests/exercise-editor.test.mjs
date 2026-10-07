import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/components/ExerciseEditor.tsx', import.meta.url), 'utf8'), 'ExerciseEditor.tsx');

async function editor() {
    const context = vm.createContext({ crypto, confirm: () => true });
    const module = new vm.SourceTextModule(code, { context });
    const jsx = (type, props) => ({ type, props });
    await module.link(specifier => {
        const dependency = specifier === 'react' ? { useState: initial => [initial, () => {}] }
            : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' }
            : specifier === './ExerciseCard' ? { ExerciseInteraction: () => null, mediaUrl: path => path }
            : { apiPost: () => {}, ApiError: class extends Error {} };
        return new vm.SyntheticModule(Object.keys(dependency), function () {
            for (const [key, value] of Object.entries(dependency)) this.setExport(key, value);
        }, { context });
    });
    await module.evaluate();
    return module.namespace;
}

function nodes(tree) {
    if (Array.isArray(tree)) return tree.flatMap(nodes);
    if (!tree || typeof tree !== 'object' || !tree.props) return [];
    return [tree, ...nodes(tree.props.children)];
}
const plain = value => JSON.parse(JSON.stringify(value));

test('completing options preserve new lines while typing and save usable choices and variants', async () => {
    const api = await editor();
    let value = api.newExercise('completar');
    value.solution.textos.e1 = [' yachak ', '', 'mashi', ' '];
    const tree = api.ExerciseEditor({ value, onChange: next => { value = next; } });
    const options = nodes(tree).find(node => node.type === 'textarea' && node.props.placeholder?.startsWith('Una opción por línea'));
    options.props.onChange({ target: { value: 'yachak\n' } });
    assert.deepEqual(plain(value.elements[0].opciones), ['yachak', '']);
    options.props.onChange({ target: { value: ' yachak \n\nmashi\n' } });
    const saved = api.exerciseForSave(value);
    assert.deepEqual(plain(saved.elements[0].opciones), ['yachak', 'mashi']);
    assert.deepEqual(plain(saved.solution.textos.e1), ['yachak', 'mashi']);
    assert.equal(value.elements[0].opciones.length, 4);
});

test('reordering words keeps each group and its correct pairs intact', async () => {
    const api = await editor();
    let value = { ...api.newExercise('relacionar'), elements: [
        { id: 'k1', texto: 'Yaku', grupo: 'origen' }, { id: 'd1', texto: 'Agua', grupo: 'destino' },
        { id: 'k2', texto: 'Inti', grupo: 'origen' }, { id: 'd2', texto: 'Sol', grupo: 'destino' },
    ], solution: { pares: [{ origen: 'k1', destino: 'd1' }, { origen: 'k2', destino: 'd2' }] } };
    const tree = api.ExerciseEditor({ value, onChange: next => { value = next; } });
    nodes(tree).find(node => node.props['aria-label'] === 'Bajar palabra 1').props.onClick();
    assert.deepEqual(plain(value.elements.map(item => item.id)), ['k2', 'd1', 'k1', 'd2']);
    assert.deepEqual(plain(value.solution.pares), [{ origen: 'k1', destino: 'd1' }, { origen: 'k2', destino: 'd2' }]);
});

test('removing a destination removes obsolete correct pairs without changing the other answers', async () => {
    const api = await editor();
    let value = { ...api.newExercise('relacionar'), elements: [
        { id: 'k1', texto: 'Yaku', grupo: 'origen' }, { id: 'd1', texto: 'Agua', grupo: 'destino' },
        { id: 'k2', texto: 'Inti', grupo: 'origen' }, { id: 'd2', texto: 'Sol', grupo: 'destino' },
    ], solution: { pares: [{ origen: 'k1', destino: 'd1' }, { origen: 'k2', destino: 'd2' }] } };
    const tree = api.ExerciseEditor({ value, onChange: next => { value = next; } });
    nodes(tree).find(node => node.props['aria-label'] === 'Eliminar respuesta 1').props.onClick();
    assert.deepEqual(plain(value.elements.map(item => item.id)), ['k1', 'k2', 'd2']);
    assert.deepEqual(plain(value.solution.pares), [{ origen: 'k2', destino: 'd2' }]);
});
