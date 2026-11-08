import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const jsx = (type, props) => ({ type, props });
function nodes(tree) {
    if (Array.isArray(tree)) return tree.flatMap(nodes);
    if (!tree || typeof tree !== 'object' || !tree.props) return [];
    return [tree, ...nodes(tree.props.children)];
}
function content(tree) {
    if (Array.isArray(tree)) return tree.map(content).join('');
    return tree?.props ? content(tree.props.children) : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : '';
}
async function load(filename, dependencies) {
    const source = await readFile(new URL(`../src/js/components/${filename}`, import.meta.url), 'utf8');
    const { code } = await transformWithOxc(source, filename);
    const context = vm.createContext({});
    const module = new vm.SourceTextModule(code, { context });
    await module.link(specifier => {
        const dependency = specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' } : dependencies[specifier] ?? {};
        return new vm.SyntheticModule(Object.keys(dependency), function () {
            for (const [key, value] of Object.entries(dependency)) this.setExport(key, value);
        }, { context });
    });
    await module.evaluate();
    return module.namespace;
}

test('format catalog groups the actual exercises and opens a sketch for the selected record', async () => {
    const exercises = [
        { id: 8, unit_id: 1, type: 'seleccion_multiple', prompt: 'Elige la palabra', published: true, elements: [], zones: [], sort_order: 1 },
        { id: 9, unit_id: 1, type: 'relacionar', prompt: 'Une las palabras', published: false, elements: [], zones: [], sort_order: 2 },
    ];
    let selected = null;
    const api = await load('AdminExerciseFormats.tsx', {
        react: { useState: () => [selected, value => { selected = typeof value === 'function' ? value(selected) : value; }] },
        '../hooks/useApi': { useApi: path => ({ loading: false, error: null, data: path.includes('/exercises') ? { data: exercises, last_page: 1 } : { data: [{ id: 1, title: 'Conociendo el Kichwa' }] } }) },
        './AdminExerciseSketch': { AdminExerciseSketch: 'AdminExerciseSketch', exerciseFormatNames: { seleccion_multiple: 'Selección múltiple', completar: 'Completar', relacionar: 'Relacionar', arrastrar: 'Arrastrar', ordenar: 'Ordenar' } },
    });
    let tree = api.AdminExerciseFormats();
    assert.equal(nodes(tree).filter(node => node.type === 'details').length, 2);
    assert.match(content(tree), /Selección múltiple · 1 ejercicio/);
    assert.match(content(tree), /Relacionar · 1 ejercicio/);
    assert.match(content(tree), /Conociendo el Kichwa · Publicado/);
    assert.match(content(tree), /Conociendo el Kichwa · Borrador/);
    nodes(tree).find(node => node.type === 'button' && node.props['aria-controls'] === 'format-sketch-8').props.onClick();
    tree = api.AdminExerciseFormats();
    assert.equal(nodes(tree).find(node => node.type === 'AdminExerciseSketch').props.exercise.id, 8);
    assert.equal(nodes(tree).filter(node => node.type === 'AdminExerciseSketch').length, 1);
});

test('the saved sketch uses the student color panel without sending an answer', async () => {
    const panelNames = ['ExerciseCard', 'AnimalsPracticePanel', 'BodyPracticePanel', 'ColorsPracticePanel', 'InteractiveSentencePractice', 'ListeningGreetingsExercise', 'MissingVowelExercise', 'NumbersPractice', 'PronounsPracticePanel', 'SceneChoicePanel', 'SentenceOrderPanel', 'NumbersMatchingExercise', 'ConversationMatchingExercise', 'AudioMatchingExercise'];
    const dependencies = Object.fromEntries(panelNames.map(name => [`./${name}`, name === 'ExerciseCard' ? { ExerciseInteraction: 'ExerciseInteraction' } : { [name]: name }]));
    dependencies.react = { useState: initial => [initial, () => {}] };
    const api = await load('AdminExerciseSketch.tsx', dependencies);
    const tree = api.AdminExerciseSketch({ exercise: { id: 137, type: 'completar', prompt: 'Pinta el objeto', config: { color_activity: 'apply' }, elements: [], zones: [], sort_order: 1, published: true } });
    assert.ok(nodes(tree).some(node => node.type === 'ColorsPracticePanel'));
    assert.match(content(tree), /no se guardan ni conceden XP/);
});
