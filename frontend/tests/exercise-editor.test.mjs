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
        const dependency = specifier === 'react' ? { useState: initial => [initial, () => {}], useEffect: () => {} }
            : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' }
            : specifier === './ExerciseCard' ? { ExerciseInteraction: () => null, mediaUrl: path => path }
            : specifier === './AdminExerciseSketch' ? { AdminExerciseSketch: 'AdminExerciseSketch' }
            : { apiPost: () => {}, apiGet: () => {}, ApiError: class extends Error {} };
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

test('word builders derive the missing letter and create distinct repeated-letter tokens', async () => {
    const api=await editor();let value={...api.newExercise('completar'),config:{presentation:'letter',word_target:'WASI',missing_index:2},elements:[{id:'word',texto:'WA_I',opciones:['S','M','N']}],solution:{textos:{word:['S']}}};
    let tree=api.ExerciseEditor({value,onChange:next=>{value=next;}});nodes(tree).find(n=>n.type==='input'&&n.props.value==='WASI').props.onChange({target:{value:'SHUNKU'}});
    assert.equal(value.elements[0].texto,'SH_NKU');assert.deepEqual(plain(value.solution.textos.word),['U']);
    value={...api.newExercise('ordenar'),config:{presentation:'tiles',word_target:''}};tree=api.ExerciseEditor({value,onChange:next=>{value=next;}});
    nodes(tree).find(n=>n.type==='input'&&n.props.maxLength===50).props.onChange({target:{value:'SISA'}});
    assert.equal(new Set(value.elements.map(e=>e.id)).size,4);assert.equal(value.elements.filter(e=>e.texto==='S').length,2);
});

test('creation shows format examples and a live publication sketch', async () => {
    const api = await editor();
    let value = api.newExercise();
    let tree = api.ExerciseEditor({ value, onChange: next => { value = next; } });
    const sketches = nodes(tree).filter(node => node.type === 'AdminExerciseSketch');
    assert.equal(sketches.length, 2);
    assert.equal(sketches[0].props.exercise.type, 'seleccion_multiple');
    assert.equal(sketches[1].props.exercise, value);
    nodes(tree).find(node => node.type === 'button' && node.props['aria-pressed'] === false && node.props.children[0].props.children === 'Relacionar palabras o imágenes').props.onClick();
    assert.equal(value.type, 'relacionar');
    tree = api.ExerciseEditor({ value, onChange: next => { value = next; } });
    assert.equal(nodes(tree).filter(node => node.type === 'AdminExerciseSketch')[0].props.exercise.type, 'relacionar');
});

test('editing a published exercise keeps its saved sketch separate from the draft preview', async () => {
    const api = await editor();
    const published = { ...api.newExercise(), id: 18, published: true, prompt: 'Versión publicada' };
    const draft = { ...published, prompt: 'Cambio sin guardar' };
    const tree = api.ExerciseEditor({ value: draft, publishedExercise: published, onChange: () => {} });
    const sketches = nodes(tree).filter(node => node.type === 'AdminExerciseSketch');
    assert.equal(sketches.length, 3);
    assert.equal(sketches[0].props.exercise.prompt, 'Versión publicada');
    assert.equal(sketches[2].props.exercise.prompt, 'Cambio sin guardar');
});
