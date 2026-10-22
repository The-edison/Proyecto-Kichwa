import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/components/InteractiveSentencePractice.tsx', import.meta.url), 'utf8'), 'InteractiveSentencePractice.tsx');
const context = vm.createContext({});
const jsx = (type, props) => ({ type, props });
const module = new vm.SourceTextModule(code, { context });
await module.link(async specifier => {
    const dependencies = specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' }
        : specifier === 'lucide-react' ? { CalendarDays: 'CalendarDays', Hash: 'Hash', RotateCcw: 'RotateCcw' } : {};
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
function render(exercise, answer, onChange, lesson = 'numbers', disabled = false) {
    return module.namespace.InteractiveSentencePractice({ exercise, answer, disabled, lesson, onChange });
}

test('word tiles build an ordered expression and let the learner remove a misplaced tile', () => {
    const exercise = { type: 'ordenar', config: { interactive_activity: 'tiles', context_meaning: 'Diecisiete' }, elements: [
        { id: 'kanchis', texto: 'kanchis' }, { id: 'chunka', texto: 'chunka' },
    ] };
    let answer = { orden: [] };
    const view = () => nodes(render(exercise, answer, value => { answer = value; }));
    view().find(node => node.type === 'button' && node.props.children === 'kanchis').props.onClick();
    assert.deepEqual(JSON.parse(JSON.stringify(answer)), { orden: ['kanchis'] });
    view().find(node => node.props['aria-label'] === 'Quitar kanchis de la posición 1').props.onClick();
    view().find(node => node.type === 'button' && node.props.children === 'chunka').props.onClick();
    view().find(node => node.type === 'button' && node.props.children === 'kanchis' && !node.props.disabled).props.onClick();
    assert.deepEqual(JSON.parse(JSON.stringify(answer)), { orden: ['chunka', 'kanchis'] });
});

test('choice and writing keep the same answer shape used by server grading', () => {
    const choice = { type: 'completar', config: { interactive_activity: 'choice' }, elements: [
        { id: 'day', texto: 'Kaya _____ · Mañana, martes', opciones: ['awaki', 'awkarik'] },
    ] };
    let answer = { textos: {} };
    const view = () => nodes(render(choice, answer, value => { answer = value; }, 'calendar'));
    view().find(node => node.type === 'button' && node.props.children === 'awkarik').props.onClick();
    assert.deepEqual(JSON.parse(JSON.stringify(answer)), { textos: { day: 'awkarik' } });
    view().find(node => node.props['aria-label'] === 'Quitar awkarik').props.onClick();
    assert.equal(answer.textos.day, '');

    const writing = { type: 'completar', config: { interactive_activity: 'writing' }, elements: [
        { id: 'month', texto: '_____ killapi · En febrero' },
    ] };
    const input = nodes(render(writing, answer, value => { answer = value; }, 'calendar')).find(node => node.type === 'input');
    input.props.onChange({ target: { value: 'panchi' } });
    assert.deepEqual(JSON.parse(JSON.stringify(answer)), { textos: { day: '', month: 'panchi' } });
    assert.equal(nodes(render(writing, answer, () => {}, 'calendar', true))[0].props.disabled, true);
});
