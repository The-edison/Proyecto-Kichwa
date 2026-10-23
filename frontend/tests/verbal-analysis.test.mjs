import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const source = await readFile(new URL('../src/js/components/VerbalAnalysisIntroduction.tsx', import.meta.url), 'utf8');
const { code } = await transformWithOxc(source, 'VerbalAnalysisIntroduction.tsx');
const lesson = JSON.parse(await readFile(new URL('../../backend/resources/lessons/intermediate-verbal-analysis.json', import.meta.url), 'utf8'));
const jsx = (type, props) => ({ type, props });
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : tree?.props ? [tree, ...nodes(tree.props.children)] : [];
const text = tree => Array.isArray(tree) ? tree.map(text).join('') : tree?.props ? text(tree.props.children) : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : '';

async function screen() {
    let cursor = 0, page = 4;
    const state = [];
    const context = vm.createContext({});
    const module = new vm.SourceTextModule(code, { context });
    await module.link(specifier => {
        const dep = specifier === 'react' ? {
            useState(initial) { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], next => state[index] = next]; },
            useRef(initial) { const index = cursor++; return state[index] ??= { current: initial }; }, useEffect() {},
        } : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' }
            : specifier === 'lucide-react' ? Object.fromEntries(['ArrowRight', 'Baby', 'Blocks', 'BookOpen', 'CheckCircle2', 'Droplets', 'Ear', 'Gift', 'GraduationCap', 'Hand', 'Heart', 'House', 'MessageCircle', 'Play', 'Plus', 'UserRound', 'UsersRound', 'Utensils', 'PenLine'].map(name => [name, name]))
            : specifier.endsWith('.json') ? { default: lesson }
            : specifier.endsWith('/LessonCardGrid') ? { LessonCardGrid: 'LessonCardGrid' }
            : specifier.endsWith('/LessonOverview') ? { LessonNote: 'LessonNote', LessonOverview: 'LessonOverview' } : {};
        return new vm.SyntheticModule(Object.keys(dep), function () { for (const [key, value] of Object.entries(dep)) this.setExport(key, value); }, { context });
    });
    await module.evaluate();
    return { render() { cursor = 0; return module.namespace.VerbalAnalysisIntroduction({ page, onSelectPage: next => page = next }); } };
}

test('the word explorer replaces every segment, meaning and selected state without carrying over old endings', async () => {
    const view = await screen();
    const choose = word => nodes(view.render()).find(node => node.type === 'button' && text(node).includes(word)).props.onClick();
    const segments = () => nodes(nodes(view.render()).find(node => node.props.className === 'verbal-part-meanings')).filter(node => node.type === 'dt').map(text);
    const meaning = () => text(nodes(view.render()).find(node => node.type === 'figcaption'));
    assert.deepEqual(segments(), ['miku', 'ku', 'ni']);
    choose('wawapak');
    assert.deepEqual(segments(), ['wawa', 'pak']);
    assert.match(meaning(), /para el bebé/);
    choose('mikunkapak');
    assert.deepEqual(segments(), ['miku', 'nkapak']);
    assert.match(meaning(), /para comer/);
    assert.equal(nodes(view.render()).filter(node => node.type === 'button' && node.props['aria-pressed']).length, 1);
    choose('allimi'); assert.deepEqual(segments(), ['alli', 'mi']);
    choose('mikukuni'); assert.deepEqual(segments(), ['miku', 'ku', 'ni']);
    assert.match(meaning(), /estoy comiendo/);
});
