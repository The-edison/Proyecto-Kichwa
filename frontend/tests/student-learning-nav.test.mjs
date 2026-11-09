import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/components/StudentLearningNav.tsx', import.meta.url), 'utf8'), 'StudentLearningNav.tsx');
const data = [{ id: 1, name: 'Basico', available: true, modules: [{ id: 4, title: 'Primeros contactos', units: [{ id: 7, title: 'Conociendo el Kichwa' }, { id: 8, title: 'Saludos' }] }] }, { id: 2, name: 'Intermedio', available: true, modules: [{ id: 10, title: 'Conversaciones', units: [{ id: 12, title: 'En comunidad' }] }] }];
async function screen({ pathname = '/aprender', loading = false, error = null, catalog = data, blockedStorage = false } = {}) {
    let cursor = 0, expanded = 0, navigated = 0, refreshed = 0;
    const states = [], dependencies = [], effects = [], storage = new Map();
    const context = vm.createContext({ sessionStorage: { getItem(key) { if (blockedStorage) throw Error(); return storage.get(key) ?? null; }, setItem(key, value) { if (blockedStorage) throw Error(); storage.set(key, value); } } });
    const jsx = (type, props) => ({ type, props });
    const module = new vm.SourceTextModule(code, { context });
    await module.link(specifier => {
        const exports = specifier === 'react' ? {
            useState(initial) { const index = cursor++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
            useEffect(callback, deps) { const index = cursor++; if (!dependencies[index] || deps.some((value, i) => value !== dependencies[index][i])) { dependencies[index] = deps; effects.push(callback); } },
        } : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : specifier === 'react-router-dom' ? { useLocation: () => ({ pathname }) }
            : specifier === 'lucide-react' ? { BookOpen: 'BookOpen', ChevronDown: 'ChevronDown', GraduationCap: 'GraduationCap' }
            : specifier.endsWith('/useApi') ? { useApi: () => ({ data: catalog, loading, error, refresh: () => refreshed++ }) }
            : specifier.endsWith('/AuthContext') ? { useAuth: () => ({ user: { id: 3 } }) }
            : specifier.endsWith('/navigation') ? { Link: 'Link' } : {};
        return new vm.SyntheticModule(Object.keys(exports), function () { for (const [name, value] of Object.entries(exports)) this.setExport(name, value); }, { context });
    });
    await module.evaluate();
    const render = () => { cursor = 0; const tree = module.namespace.StudentLearningNav({ onExpand: () => expanded++, onNavigate: () => navigated++ }); effects.splice(0).forEach(callback => callback()); return tree; };
    render();
    return { render, navigate: value => { pathname = value; render(); }, expanded: () => expanded, navigated: () => navigated, refreshed: () => refreshed, storage };
}
function nodes(tree) { if (Array.isArray(tree)) return tree.flatMap(nodes); return tree?.props ? [tree, ...nodes(tree.props.children)] : []; }
const button = (view, label) => nodes(view.render()).find(node => node.type === 'button' && node.props['aria-label']?.startsWith(label));
const links = view => nodes(view.render()).filter(node => node.type === 'Link');

test('both levels expand into their modules and functional unit destinations', async () => {
    const view = await screen();
    assert.equal(links(view).length, 0);
    button(view, 'Nivel Basico').props.onClick();
    button(view, 'Módulo 1: Primeros contactos').props.onClick();
    assert.deepEqual(links(view).map(node => node.props.href), ['/aprender/nivel/1', '/aprender/modulo/4', '/aprender/unidad/7', '/aprender/unidad/8']);
    links(view).at(-1).props.onClick();
    assert.equal(view.navigated(), 1);
    button(view, 'Nivel Intermedio').props.onClick();
    button(view, 'Módulo 1: Conversaciones').props.onClick();
    assert.ok(links(view).some(node => node.props.href === '/aprender/unidad/12'));
    assert.equal(view.expanded(), 4);
});

test('direct unit routes open their ancestors and update the current destination on navigation', async () => {
    const view = await screen({ pathname: '/aprender/unidad/8' });
    assert.equal(button(view, 'Nivel Basico').props['aria-expanded'], true);
    assert.equal(button(view, 'Módulo 1: Primeros contactos').props['aria-expanded'], true);
    assert.deepEqual(links(view).filter(node => node.props['aria-current']).map(node => node.props.href), ['/aprender/unidad/8']);
    view.navigate('/aprender/unidad/12');
    assert.deepEqual(links(view).filter(node => node.props['aria-current']).map(node => node.props.href), ['/aprender/unidad/12']);
    assert.equal(button(view, 'Nivel Intermedio').props['aria-expanded'], true);
    button(view, 'Nivel Intermedio').props.onClick();
    assert.equal(button(view, 'Nivel Intermedio').props['aria-expanded'], false);
});

test('unavailable levels, loading and retry remain usable when browser storage is blocked', async () => {
    const view = await screen({ blockedStorage: true, catalog: [{ ...data[1], available: false, modules: [] }] });
    assert.equal(button(view, 'Nivel Intermedio').props.disabled, true);
    const loading = await screen({ loading: true, catalog: null });
    assert.ok(nodes(loading.render()).some(node => node.props.role === 'status'));
    const failed = await screen({ error: 'Failed', catalog: null });
    nodes(failed.render()).find(node => node.type === 'button').props.onClick();
    assert.equal(failed.refreshed(), 1);
});

test('guided units retain the application sidebar and avoid loading unused classic endpoints', async () => {
    const { code: unitCode } = await transformWithOxc(await readFile(new URL('../src/js/pages/Student/Unit.tsx', import.meta.url), 'utf8'), 'Unit.tsx');
    const paths = [];
    const context = vm.createContext({});
    const jsx = (type, props) => ({ type, props });
    const module = new vm.SourceTextModule(unitCode, { context });
    await module.link(specifier => {
        const exports = specifier === 'react' ? { useState: initial => [initial, () => {}], useEffect() {} }
            : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' }
            : specifier === 'react-router-dom' ? { useSearchParams: () => [new URLSearchParams(), () => {}] }
            : specifier.endsWith('/useApi') ? { useApi: path => { paths.push(path); return { data: path === '/units/7' ? { id: 7, title: 'Saludos', config: { learning_mode: 'guided' } } : null }; } }
            : specifier.endsWith('/queryClient') ? { queryClient: {} }
            : Object.fromEntries(['Head', 'Link', 'AppLayout', 'UnitSequence', 'GuidedUnit', 'ExerciseCard', 'EmptyState', 'ErrorState', 'LoadingState', 'Pagination'].map(name => [name, name]));
        return new vm.SyntheticModule(Object.keys(exports), function () { for (const [name, value] of Object.entries(exports)) this.setExport(name, value); }, { context });
    });
    await module.evaluate();
    const tree = module.namespace.default({ unitId: 7 });
    assert.equal(tree.type, 'AppLayout');
    assert.equal(tree.props.immersive, true);
    assert.equal(tree.props.children.type, 'GuidedUnit');
    assert.deepEqual(paths.filter(Boolean), ['/units/7']);
});
