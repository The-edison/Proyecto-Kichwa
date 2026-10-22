import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/components/NumbersPractice.tsx', import.meta.url), 'utf8'), 'NumbersPractice.tsx');
const jsx = (type, props) => ({ type, props });
const context = vm.createContext({});
const module = new vm.SourceTextModule(code, { context, initializeImportMeta: meta => { meta.env = { BASE_URL: '/' }; } });
await module.link(async specifier => {
    const dependencies = specifier === 'react' ? { useState: initial => [initial, () => {}] }
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

test('counting cards show every group and keep answers from other cards', () => {
    const exercise = { config: { numbers_activity: 'count' }, elements: [
        { id: 'leaves', texto: 'Hojas' }, { id: 'women', texto: 'Mujeres' },
    ] };
    let answer = { textos: { leaves: 'ishkay' } };
    const render = () => module.namespace.NumbersPractice({ exercise, answer, disabled: false, onChange: value => { answer = value; } });
    const tree = render();
    assert.deepEqual(nodes(tree).filter(node => node.props.role === 'img').map(node => node.props['aria-label']), ['2 hojas', '3 mujeres']);
    assert.equal(nodes(tree).filter(node => node.type === 'img').length, 5);
    assert.ok(nodes(tree).filter(node => node.type === 'img').every(node => node.props.src.startsWith('/images/numbers-count/')));
    nodes(tree).find(node => node.type === 'input' && node.props.value === '').props.onChange({ target: { value: 'kimsa' } });
    assert.deepEqual(JSON.parse(JSON.stringify(answer.textos)), { leaves: 'ishkay', women: 'kimsa' });
});

test('sentence cards expose the word bank and keep each blank separate', () => {
    const exercise = { config: { numbers_activity: 'sentences' }, elements: [
        { id: 'children', texto: '_____ wawakuna pukllankuna · Cinco niños juegan', opciones: ['pichka', 'kimsa'] },
        { id: 'women', texto: '_____ warmikuna tushunkuna · Tres mujeres bailan', opciones: ['pichka', 'kimsa'] },
    ] };
    let answer = { textos: { children: 'pichka' } };
    const tree = module.namespace.NumbersPractice({ exercise, answer, disabled: false, onChange: value => { answer = value; } });
    assert.equal(nodes(tree).filter(node => node.type === 'select').length, 2);
    nodes(tree).find(node => node.type === 'select' && node.props['aria-label'] === 'Número para la frase 2').props.onChange({ target: { value: 'kimsa' } });
    assert.deepEqual(JSON.parse(JSON.stringify(answer.textos)), { children: 'pichka', women: 'kimsa' });
});
