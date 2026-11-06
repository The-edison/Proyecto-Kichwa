import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/components/TimeMorphemePractice.tsx', import.meta.url), 'utf8'), 'TimeMorphemePractice.tsx');
const jsx = (type, props) => ({ type, props });
function nodes(tree) { return Array.isArray(tree) ? tree.flatMap(nodes) : tree?.props ? [tree, ...nodes(tree.props.children)] : []; }
async function view(activity, elements) {
    let answer = {}, feedback, busy = false, selectedWord;
    const context = vm.createContext({});
    const module = new vm.SourceTextModule(code, { context, initializeImportMeta: meta => { meta.env = { BASE_URL: '/' }; } });
    await module.link(specifier => {
        const exports = specifier === 'react' ? { useRef: () => ({ current: null }), useState: initial => [selectedWord ?? initial, value => { selectedWord = value; }] }
            : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' }
            : specifier === 'lucide-react' ? { ArrowRight: 'ArrowRight', Volume2: 'Volume2' }
            : specifier.endsWith('/MorphemePractice') ? { MorphemePractice: 'MorphemePractice' }
            : specifier.endsWith('/TimeMorphemeIllustration') ? { TimeMorphemeIllustration: 'TimeMorphemeIllustration' } : {};
        return new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context });
    });
    await module.evaluate();
    return {
        render: () => module.namespace.TimeMorphemePractice({ exercise: { id: 2, type: 'completar', config: { time_practice: activity }, elements }, answer, feedback, busy, onChange: value => { answer = value; } }),
        answer: () => JSON.parse(JSON.stringify(answer)), lock: () => { feedback = { is_correct: true }; }, busy: () => { busy = true; },
    };
}

test('past selects preserve every previous answer and lock after correct grading', async () => {
    for (const activity of [4]) {
        const elements = activity === 4 ? [{ id: 'chaya', texto: 'Pay chaya___ a la comunidad.', opciones: ['rka', 'sha'] }, { id: 'puri', texto: 'Ñuka puri___ por el mercado.', opciones: ['rkani', 'sha'] }]
            : [{ id: 'samari', texto: 'Samarirka', opciones: ['rka', 'sha'] }, { id: 'sentence', texto: 'Ñuka llanka___ mañana.', opciones: ['rka', 'sha'] }];
        const page = await view(activity, elements);
        nodes(page.render()).filter(node => node.type === 'select')[0].props.onChange({ target: { value: 'rka' } });
        nodes(page.render()).filter(node => node.type === 'select')[1].props.onChange({ target: { value: 'sha' } });
        assert.deepEqual(page.answer(), { textos: Object.fromEntries([[elements[0].id, 'rka'], [elements[1].id, 'sha']]) });
        page.lock();
        assert.ok(nodes(page.render()).filter(node => node.type === 'select').every(node => node.props.disabled));
    }
});

test('compact comparison navigation keeps written words when switching actions', async () => {
    const ids = ['samari-past', 'samari-future', 'chaya-past', 'chaya-future', 'sira-past', 'sira-future'];
    const page = await view(7, ids.map(id => ({ id, texto: id, opciones: [] })));
    nodes(page.render()).find(node => node.type === 'input').props.onChange({ target: { value: 'samarirka' } });
    const nav = () => nodes(page.render()).find(node => node.type === 'nav');
    const tabs = () => nodes(nav()).filter(node => node.type === 'button');
    tabs()[1].props.onClick();
    assert.equal(tabs()[1].props['aria-pressed'], true);
    assert.equal(nodes(page.render()).find(node => node.type === 'article' && node.props.className.includes('is-active')).props['aria-label'], 'Conjuga llegar');
    tabs()[0].props.onClick();
    assert.equal(nodes(page.render()).find(node => node.type === 'input').props.value, 'samarirka');
    assert.deepEqual(page.answer(), { textos: { 'samari-past': 'samarirka' } });
});

test('integrative activity uses clear past and future choices plus complete sentences while preserving all answers', async () => {
    const elements = ['samari', 'puri', 'chinkari', 'yachachi', 'sentence'].map((id, index) => ({ id, texto: ['Samarirka', 'Purisha', 'Chinkarirka', 'Yachachisha', 'Ñuka llanka___ mañana.'][index], opciones: ['rka', 'sha'] }));
    const page = await view(8, elements);
    assert.equal(nodes(page.render()).filter(node => node.type === 'select').length, 0);
    const choices = () => nodes(page.render()).filter(node => node.type === 'input' && node.props.type === 'radio');
    assert.equal(choices().length, 10);
    for (const [index, selected] of [[0, 'rka'], [1, 'sha'], [2, 'rka'], [3, 'sha'], [4, 'sha']]) {
        choices().find(node => node.props.name === `time-2-${elements[index].id}` && node.props.value === selected).props.onChange();
    }
    assert.deepEqual(page.answer(), { textos: { samari: 'rka', puri: 'sha', chinkari: 'rka', yachachi: 'sha', sentence: 'sha' } });
    const labels = nodes(page.render()).filter(node => node.type === 'span').map(node => node.props.children);
    assert.ok(labels.includes('Pasado'));
    assert.ok(labels.includes('Futuro'));
    assert.ok(labels.includes('Kayna ñuka llankarkani.'));
    assert.ok(labels.includes('Kaya ñuka llankasha.'));
    assert.equal(choices().filter(node => node.props.checked).length, 5);
    page.lock();
    assert.ok(nodes(page.render()).filter(node => node.type === 'fieldset').every(node => node.props.disabled));
});

test('future word inputs and comparison cells keep their own answers', async () => {
    for (const activity of [5, 7]) {
        const ids = activity === 5 ? ['llanka', 'yachachi', 'puri', 'kuya', 'sira'] : ['samari-past', 'samari-future', 'chaya-past', 'chaya-future', 'sira-past', 'sira-future'];
        const page = await view(activity, ids.map(id => ({ id, texto: id, opciones: [] })));
        for (let index = 0; index < ids.length; index++) nodes(page.render()).filter(node => node.type === 'input')[index].props.onChange({ target: { value: `answer-${index}` } });
        assert.deepEqual(page.answer(), { textos: Object.fromEntries(ids.map((id, index) => [id, `answer-${index}`])) });
        page.busy();
        assert.ok(nodes(page.render()).filter(node => node.type === 'input').every(node => node.props.disabled));
    }
});

test('matching and both listening activities retain the shared audio and pairing component', async () => {
    for (const activity of [2, 3, 6]) {
        const page = await view(activity, []);
        assert.equal(nodes(page.render()).find(node => node.type === 'MorphemePractice').props.exercise.config.time_practice, activity);
    }
});
