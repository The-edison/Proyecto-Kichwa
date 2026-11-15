import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/pages/Admin/Dashboard.tsx', import.meta.url), 'utf8'), 'Dashboard.tsx');
async function screen({ groupsError = null } = {}) {
    let filter = '';
    const paths = [];
    const context = vm.createContext({});
    const jsx = (type, props) => ({ type, props });
    const module = new vm.SourceTextModule(code, { context });
    await module.link(specifier => {
        const name = specifier.split('/').at(-1);
        const exports = specifier === 'react' ? { useState: () => [filter, value => { filter = value; }] }
            : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' }
                : specifier === 'lucide-react' ? Object.fromEntries(['ArrowRight', 'BookOpen', 'ClipboardCheck', 'Users', 'Plus', 'ChartNoAxesCombined'].map(name => [name, name]))
                    : name === 'navigation' ? { Head: 'Head', Link: 'Link' }
                        : name === 'AppLayout' ? { AppLayout: 'AppLayout' }
                            : name === 'MonthlyUsage' ? { MonthlyUsage: 'MonthlyUsage' }
                                : name === 'useApi' ? { useApi: path => {
                                    paths.push(path);
                                    if (path === '/admin/grupos') return { data: { data: [{ id: 7, nombre: 'Kichwa A', activo: true }, { id: 8, nombre: 'Kichwa B', activo: false }] }, loading: false, error: groupsError };
                                    return { data: { students: filter === '7' ? 4 : filter === 'sin_grupo' ? 2 : 30, contents: 18, exercises: 42 }, loading: false, error: null };
                                } } : { LoadingState: 'LoadingState', ErrorState: 'ErrorState' };
        return new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context });
    });
    await module.evaluate();
    return { render: () => module.namespace.default(), paths };
}
function nodes(tree) { return Array.isArray(tree) ? tree.flatMap(nodes) : tree?.props ? [tree, ...nodes(tree.props.children)] : []; }
function text(tree) { return Array.isArray(tree) ? tree.map(text).join('') : tree?.props ? text(tree.props.children) : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : ''; }

test('the dashboard filter scopes student counts, monthly usage and the link to the student directory', async () => {
    const view = await screen();
    assert.ok(view.render());
    assert.equal(view.paths.at(-1), '/admin/overview');
    nodes(view.render()).find(node => node.type === 'select').props.onChange({ target: { value: '7' } });
    const tree = view.render();
    assert.equal(view.paths.at(-1), '/admin/overview?grupo_id=7');
    const monthly = nodes(tree).find(node => node.type === 'MonthlyUsage');
    assert.equal(monthly.props.groupFilter, '7');
    assert.equal(monthly.props.groupName, 'Kichwa A');
    const card = nodes(tree).find(node => node.type === 'Link' && node.props.href === '/admin/estudiantes?grupo_id=7');
    assert.equal(text(nodes(card).find(node => node.props.className === 'stat-value')), '4');
});

test('the dashboard supports no group, inactive groups and returning to all students', async () => {
    const view = await screen();
    const options = nodes(view.render()).filter(node => node.type === 'option').map(text);
    assert.ok(options.includes('Kichwa B · Inactivo'));
    nodes(view.render()).find(node => node.type === 'select').props.onChange({ target: { value: 'sin_grupo' } });
    assert.equal(nodes(view.render()).find(node => node.type === 'MonthlyUsage').props.groupFilter, 'sin_grupo');
    assert.equal(view.paths.at(-1), '/admin/overview?grupo_id=sin_grupo');
    nodes(view.render()).find(node => node.type === 'select').props.onChange({ target: { value: '' } });
    assert.equal(nodes(view.render()).find(node => node.type === 'MonthlyUsage').props.groupFilter, '');
    assert.equal(view.paths.at(-1), '/admin/overview');
});

test('a failed group list disables the filter and offers a retry without hiding the overall summary', async () => {
    const view = await screen({ groupsError: 'Error' });
    assert.equal(nodes(view.render()).find(node => node.type === 'select').props.disabled, true);
    assert.ok(nodes(view.render()).some(node => node.props.role === 'alert'));
    assert.ok(nodes(view.render()).some(node => node.type === 'MonthlyUsage'));
});
