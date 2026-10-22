import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/components/NumbersMatchingExercise.tsx', import.meta.url), 'utf8'), 'NumbersMatchingExercise.tsx');
const jsx = (type, props) => ({ type, props });
const context = vm.createContext({});
const module = new vm.SourceTextModule(code, { context });
await module.link(async specifier => {
    const dependencies = specifier === 'react' ? { useRef: initial => ({ current: initial }), useState: initial => [initial, () => {}], useLayoutEffect: () => {} }
        : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : {};
    return new vm.SyntheticModule(Object.keys(dependencies), function () {
        for (const [key, value] of Object.entries(dependencies)) this.setExport(key, value);
    }, { context });
});
await module.evaluate();

function nodes(tree) {
    if (Array.isArray(tree)) return tree.flatMap(nodes);
    if (!tree?.props) return [];
    return [tree, ...nodes(tree.props.children)];
}

test('one to ten stay in one exercise with mixed names and pair only matching selections', () => {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const names = ['shuk', 'ishkay', 'kimsa', 'chusku', 'pichka', 'sukta', 'kanchis', 'pusak', 'iskun', 'chunka'];
    const exercise = { elements: [
        ...numbers.map(number => ({ id: `n-${number}`, texto: String(number), grupo: 'origen' })),
        ...numbers.map((number, index) => ({ id: `w-${number}`, texto: names[index], grupo: 'destino' })).reverse(),
    ] };
    const paired = [];
    const render = selectedOrigin => module.namespace.NumbersMatchingExercise({ exercise, answer: { pares: [] }, selectedOrigin, disabled: false,
        onSelectOrigin: () => {}, onPair: id => paired.push(id) });
    const buttons = selectedOrigin => nodes(render(selectedOrigin)).filter(node => node.type === 'button');
    assert.deepEqual(buttons('').slice(10).map(node => node.props['aria-label']),
        ['Seleccionar kanchis', 'Seleccionar ishkay', 'Seleccionar chunka', 'Seleccionar chusku', 'Seleccionar iskun',
            'Seleccionar shuk', 'Seleccionar sukta', 'Seleccionar pusak', 'Seleccionar kimsa', 'Seleccionar pichka']);
    buttons('n-1').find(node => node.props['aria-label'] === 'Seleccionar chunka').props.onClick();
    assert.deepEqual(paired, []);
    buttons('n-1').find(node => node.props['aria-label'] === 'Seleccionar shuk').props.onClick();
    assert.deepEqual(paired, ['w-1']);
});

test('saved connections use board layout coordinates after navigation or refresh', () => {
    const buttons = new Map([
        ['n-1', { offsetLeft: 12, offsetTop: 20, offsetWidth: 140, offsetHeight: 48 }],
        ['w-1', { offsetLeft: 220, offsetTop: 140, offsetWidth: 140, offsetHeight: 48 }],
        ['n-2', { offsetLeft: 12, offsetTop: 80, offsetWidth: 140, offsetHeight: 48 }],
        ['w-2', { offsetLeft: 220, offsetTop: 20, offsetWidth: 140, offsetHeight: 48 }],
    ]);
    assert.deepEqual(JSON.parse(JSON.stringify(module.namespace.measureMatchingLines([
        { origen: 'n-1', destino: 'w-1' }, { origen: 'n-2', destino: 'w-2' },
    ], buttons))), [
        { id: 'n-1', x1: 152, y1: 44, x2: 220, y2: 164 },
        { id: 'n-2', x1: 152, y1: 104, x2: 220, y2: 44 },
    ]);
});
