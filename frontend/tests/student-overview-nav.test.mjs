import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/components/StudentOverviewNav.tsx', import.meta.url), 'utf8'), 'StudentOverviewNav.tsx');

async function screen(initialPathname = '/aprender') {
    let pathname = initialPathname;
    let cursor = 0;
    let expanded = 0;
    let navigated = 0;
    const states = [], dependencies = [], effects = [];
    const context = vm.createContext({});
    const jsx = (type, props) => ({ type, props });
    const module = new vm.SourceTextModule(code, { context });
    await module.link(specifier => {
        const exports = specifier === 'react' ? {
            useState(initial) { const index = cursor++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
            useEffect(callback, deps) { const index = cursor++; if (!dependencies[index] || deps.some((value, i) => value !== dependencies[index][i])) { dependencies[index] = deps; effects.push(callback); } },
        } : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx }
            : specifier === 'react-router-dom' ? { useLocation: () => ({ pathname }) }
            : specifier === 'lucide-react' ? Object.fromEntries(['ChartNoAxesCombined', 'ChevronDown', 'House'].map(name => [name, name]))
            : specifier.endsWith('/navigation') ? { Link: 'Link' } : {};
        return new vm.SyntheticModule(Object.keys(exports), function () { for (const [name, value] of Object.entries(exports)) this.setExport(name, value); }, { context });
    });
    await module.evaluate();
    const render = () => { cursor = 0; const tree = module.namespace.StudentOverviewNav({ onExpand: () => expanded++, onNavigate: () => navigated++ }); effects.splice(0).forEach(callback => callback()); return tree; };
    render();
    return { render, navigate(path) { pathname = path; render(); }, expanded: () => expanded, navigated: () => navigated };
}

function nodes(tree) { if (Array.isArray(tree)) return tree.flatMap(nodes); return tree?.props ? [tree, ...nodes(tree.props.children)] : []; }
const button = view => nodes(view.render()).find(node => node.type === 'button');
const links = view => nodes(view.render()).filter(node => node.type === 'Link');
const progressLinks = view => links(view).filter(node => node.props.href === '/aprender/progreso');

test('Mi aprendizaje expands to show only Mi progreso', async () => {
    const view = await screen('/');
    assert.equal(button(view).props['aria-expanded'], false);
    button(view).props.onClick();
    assert.equal(button(view).props['aria-expanded'], true);
    assert.deepEqual(links(view).map(node => node.props.href), ['/aprender', '/aprender/progreso']);
    assert.equal(view.expanded(), 1);
    progressLinks(view)[0].props.onClick();
    assert.equal(view.navigated(), 1);
    button(view).props.onClick();
    assert.equal(button(view).props['aria-expanded'], false);
});

test('direct progress and account routes open the menu, with only progress as a destination', async () => {
    const view = await screen('/aprender/progreso');
    assert.equal(button(view).props['aria-expanded'], true);
    assert.deepEqual(links(view).filter(node => node.props['aria-current']).map(node => node.props.href), ['/aprender/progreso']);
    view.navigate('/cuenta');
    assert.equal(button(view).props['aria-expanded'], true);
    assert.deepEqual(links(view).map(node => node.props.href), ['/aprender', '/aprender/progreso']);
    assert.equal(links(view).some(node => node.props['aria-current']), false);
});
