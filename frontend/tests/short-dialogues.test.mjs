import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/components/ShortDialoguesIntroduction.tsx', import.meta.url), 'utf8'), 'ShortDialoguesIntroduction.tsx');
const lesson = JSON.parse(await readFile(new URL('../../backend/resources/lessons/intermediate-dialogues.json', import.meta.url), 'utf8'));
const jsx = (type, props) => typeof type === 'function' ? type(props) : ({ type, props });
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : tree?.props ? [tree, ...nodes(tree.props.children)] : [];
const text = tree => Array.isArray(tree) ? tree.map(text).join('') : tree?.props ? text(tree.props.children) : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : '';

async function screen() {
    let cursor = 0, page = 0;
    const state = [];
    const context = vm.createContext({});
    const module = new vm.SourceTextModule(code, { context });
    await module.link(specifier => {
        const dep = specifier === 'react' ? {
            useState(initial) { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], next => state[index] = typeof next === 'function' ? next(state[index]) : next]; },
            useRef(initial) { const index = cursor++; return state[index] ??= { current: initial }; }, useEffect() {},
        } : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' }
            : specifier === 'lucide-react' ? Object.fromEntries(['ArrowRight', 'BookOpen', 'BriefcaseBusiness', 'CalendarDays', 'Eye', 'EyeOff', 'Hand', 'House', 'Leaf', 'MapPin', 'MessageCircle', 'PenLine', 'Plus', 'School', 'UsersRound'].map(name => [name, name]))
            : specifier.endsWith('.json') ? { default: lesson }
            : specifier.endsWith('/LessonCardGrid') ? { LessonCardGrid: 'LessonCardGrid' }
            : specifier.endsWith('/LessonOverview') ? { LessonNote: 'LessonNote', LessonOverview: 'LessonOverview' } : {};
        return new vm.SyntheticModule(Object.keys(dep), function () { for (const [key, value] of Object.entries(dep)) this.setExport(key, value); }, { context });
    });
    await module.evaluate();
    return {
        render() { cursor = 0; return module.namespace.ShortDialoguesIntroduction({ page, onSelectPage: next => page = next }); },
        page(next) { page = next; },
    };
}

function click(view, label) {
    const button = nodes(view.render()).find(node => node.type === 'button' && text(node).trim() === label);
    assert.ok(button, `Missing button: ${label}`);
    button.props.onClick();
}
const model = view => nodes(view.render()).find(node => node.props.id === 'short-dialogue-model');

test('translations can be hidden and restored without removing turns or changing speakers', async () => {
    const view = await screen();
    const turns = () => nodes(model(view)).filter(node => node.type === 'li');
    const translations = () => nodes(model(view)).filter(node => node.props.className === 'short-dialogue-translation');
    const speakers = () => nodes(model(view)).filter(node => node.props.className === 'short-dialogue-speaker').map(text);
    const initialSpeakers = speakers();
    assert.equal(turns().length, 8);
    assert.equal(translations().length, 8);
    click(view, 'Ocultar traducciones');
    assert.equal(turns().length, 8);
    assert.equal(translations().length, 0);
    assert.deepEqual(speakers(), initialSpeakers);
    assert.match(text(model(view)), /Mayman rinki\?/);
    click(view, 'Mostrar traducciones');
    assert.equal(translations().length, 8);
    assert.match(text(model(view)), /Trabajo en Quito/);
});

test('changing a destination updates the present reply, future plan, paragraph and word bank together', async () => {
    const view = await screen();
    view.page(1);
    click(view, 'La escuela');
    assert.match(text(model(view)), /Ñuka yachanawasiman rini\./);
    assert.match(text(model(view)), /Kaya ñuka yachanawasiman risha\./);
    assert.doesNotMatch(text(model(view)), /Ñuka wasiman rini\./);
    view.page(3);
    const paragraph = () => nodes(view.render()).find(node => node.props.id === 'short-paragraph-model');
    assert.match(text(paragraph()), /Yachanawasipi yachasha\./);
    assert.match(text(paragraph()), /En la escuela aprenderé/);
    click(view, 'Quito');
    assert.match(text(paragraph()), /Kaya ñuka Kitoman risha\. Kitopi llankasha\./);
    assert.doesNotMatch(text(paragraph()), /yachanawasi/i);
    const bank = nodes(view.render()).find(node => node.props['aria-label'] === 'Banco de palabras');
    assert.deepEqual(nodes(bank).filter(node => node.type === 'li').map(text), ['Kaya', 'ñuka', 'Kitoman', 'risha', 'Kitopi', 'llankasha']);
    assert.equal(nodes(view.render()).filter(node => node.type === 'button' && node.props['aria-pressed'] === true).length, 1);
    view.page(1);
    assert.match(text(model(view)), /Ñuka Kitoman rini\./);
    assert.match(text(model(view)), /Mañana yo iré a Quito/);
});

test('conversation themes replace the context, turns and guidance while keeping the translation preference', async () => {
    const view = await screen();
    click(view, 'Ocultar traducciones');
    view.page(2);
    assert.match(text(model(view)), /Ñuka yayaka wasipi kan/);
    click(view, 'Naturaleza');
    assert.match(text(model(view)), /Urkuka hatunmi kan/);
    assert.doesNotMatch(text(model(view)), /yayaka|papá|Pay mikukun/);
    assert.equal(nodes(model(view)).filter(node => node.props.className === 'short-dialogue-translation').length, 0);
    click(view, 'Mostrar traducciones');
    assert.match(text(model(view)), /La montaña es grande/);
    click(view, 'Familia');
    assert.match(text(model(view)), /Él está comiendo/);
    assert.doesNotMatch(text(model(view)), /montaña/);
});
