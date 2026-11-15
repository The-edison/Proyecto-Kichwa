import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/components/MonthlyUsage.tsx', import.meta.url), 'utf8'), 'MonthlyUsage.tsx');
const data = { current_month: '2026-11', timezone: 'America/Guayaquil', months: [
    { month: '2026-10', active_students: 0, exercise_answers: 0, completed_tests: 0, active_days: 0 },
    { month: '2026-11', active_students: 3, exercise_answers: 25, completed_tests: 2, active_days: 5 },
] };
async function screen(response = { data, loading: false, error: null }, props = {}) {
    let selected = '', refreshes = 0;
    const jsx = (type, props) => ({ type, props });
    const module = new vm.SourceTextModule(code, { context: vm.createContext({}) });
    await module.link(specifier => {
        const exports = specifier === 'react' ? { useState: () => [selected, value => { selected = value; }] }
            : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' }
                : specifier === 'lucide-react' ? Object.fromEntries(['CalendarDays', 'CheckCircle2', 'ClipboardCheck', 'Users'].map(name => [name, name]))
                    : specifier.endsWith('/useApi') ? { useApi: path => { assert.equal(path, `/admin/usage-monthly${props.groupFilter ? `?grupo_id=${props.groupFilter}` : ''}`); return { ...response, refresh: () => { refreshes++; } }; } }
                        : { LoadingState: 'LoadingState', ErrorState: 'ErrorState' };
        return new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context: module.context });
    });
    await module.evaluate();
    return { render: () => module.namespace.MonthlyUsage(props), refreshes: () => refreshes, props };
}
function nodes(tree) { return Array.isArray(tree) ? tree.flatMap(nodes) : tree?.props ? [tree, ...nodes(tree.props.children)] : []; }
function text(tree) { return Array.isArray(tree) ? tree.map(text).join('') : tree?.props ? text(tree.props.children) : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : ''; }

test('the current month shows actual counts and chart selection updates the complete summary', async () => {
    const view = await screen();
    assert.deepEqual(nodes(view.render()).filter(node => node.type === 'dd').map(node => text(node)), ['3', '25', '2']);
    const bars = nodes(view.render()).filter(node => node.type === 'button');
    assert.equal(bars[1].props['aria-pressed'], true);
    bars[0].props.onClick();
    assert.deepEqual(nodes(view.render()).filter(node => node.type === 'dd').map(node => text(node)), ['0', '0', '0']);
    assert.ok(text(view.render()).includes('Todavía no hay respuestas'));
    const select = nodes(view.render()).find(node => node.type === 'select');
    assert.equal(select.props.value, '2026-10');
    select.props.onChange({ target: { value: '2026-11' } });
    assert.ok(text(view.render()).includes('5 días con actividad'));
});

test('loading does not display misleading zero usage', async () => {
    const view = await screen({ data: null, loading: true, error: null });
    assert.ok(nodes(view.render()).some(node => node.type === 'LoadingState'));
    assert.equal(nodes(view.render()).filter(node => node.type === 'dd').length, 0);
});

test('a failed request provides retry without breaking the dashboard', async () => {
    const view = await screen({ data: null, loading: false, error: 'No se pudo cargar el uso.' });
    assert.equal(nodes(view.render()).find(node => node.type === 'ErrorState').props.message, 'No se pudo cargar el uso.');
    nodes(view.render()).find(node => node.type === 'button').props.onClick();
    assert.equal(view.refreshes(), 1);
});

test('monthly usage requests the selected group while retaining the selected month when switching groups', async () => {
    const view = await screen(undefined, { groupFilter: '7', groupName: 'Kichwa A' });
    assert.ok(text(view.render()).includes('Participación de Kichwa A'));
    nodes(view.render()).find(node => node.type === 'select').props.onChange({ target: { value: '2026-10' } });
    view.props.groupFilter = 'sin_grupo';
    view.props.groupName = 'estudiantes sin grupo';
    assert.equal(nodes(view.render()).find(node => node.type === 'select').props.value, '2026-10');
    assert.ok(text(view.render()).includes('Participación de estudiantes sin grupo'));
    assert.ok(text(view.render()).includes('grupo actual de cada estudiante'));
});
