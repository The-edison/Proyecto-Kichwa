import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const compile = async path => (await transformWithOxc(await readFile(new URL(`../src/js/${path}`, import.meta.url), 'utf8'), path)).code;
const studentCode = await compile('components/StudentGroup.tsx');
const adminCode = await compile('pages/Admin/Groups.tsx');
const group = { id: 7, nombre: 'Kichwa A', codigo: 'KCH-7F3A9', activo: true, estudiantes_count: 2 };
async function screen({ admin = false, member = null, postError = '', copyingFails = false, confirm = true } = {}) {
    let cursor = 0, membership = member, refreshes = 0;
    const states = [], requests = [], copied = [];
    const jsx = (type, props) => ({ type, props });
    class ApiError extends Error { constructor(message) { super(message); this.errors = { codigo: [message] }; } }
    const context = vm.createContext({ navigator: { clipboard: { writeText: async value => { if (copyingFails) throw Error('unavailable'); copied.push(value); } } }, window: { confirm: () => confirm } });
    const module = new vm.SourceTextModule(admin ? adminCode : studentCode, { context });
    await module.link(specifier => {
        const name = specifier.split('/').at(-1);
        const exports = specifier === 'react' ? { useState: initial => { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = value; }]; } }
            : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' }
                : specifier === 'lucide-react' ? Object.fromEntries(['Copy', 'Layers', 'Users'].map(name => [name, name]))
                    : name === 'useApi' ? { useApi: () => ({ data: admin ? { data: [group] } : { grupo: membership }, loading: false, error: null, refresh: async () => { refreshes++; } }) }
                        : name === 'api' ? { ApiError, apiPost: async (path, payload) => { requests.push({ method: 'POST', path, payload: structuredClone(payload) }); if (postError) throw new ApiError(postError); membership = group; return admin ? group : { grupo: group, message: 'Te uniste al grupo correctamente.' }; }, apiDelete: async path => { requests.push({ method: 'DELETE', path }); membership = null; }, apiPatch: async (path, payload) => { requests.push({ method: 'PATCH', path, payload: structuredClone(payload) }); } }
                            : name === 'navigation' ? { Head: 'Head', Link: 'Link' }
                                : name === 'AppLayout' ? { AppLayout: 'AppLayout' }
                                    : { EmptyState: 'EmptyState', ErrorState: 'ErrorState', LoadingState: 'LoadingState' };
        return new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context });
    });
    await module.evaluate();
    return { render: () => { cursor = 0; return admin ? module.namespace.default() : module.namespace.StudentGroup(); }, requests, copied, refreshes: () => refreshes };
}
function nodes(tree) { return Array.isArray(tree) ? tree.flatMap(nodes) : tree?.props ? [tree, ...nodes(tree.props.children)] : []; }
function text(tree) { return Array.isArray(tree) ? tree.map(text).join('') : tree?.props ? text(tree.props.children) : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : ''; }
const button = (view, label) => nodes(view.render()).find(node => node.type === 'button' && text(node) === label);
const settle = () => new Promise(resolve => setImmediate(resolve));

test('joining normalizes a code and displays membership after saving', async () => {
    const view = await screen();
    nodes(view.render()).find(node => node.type === 'input').props.onChange({ target: { value: ' kch-7f3a9 ' } });
    nodes(view.render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
    await settle();
    assert.deepEqual(view.requests[0], { method: 'POST', path: '/mi-grupo', payload: { codigo: 'KCH-7F3A9' } });
    assert.ok(text(view.render()).includes('Kichwa A'));
    assert.ok(button(view, 'Salir del grupo'));
    assert.equal(view.refreshes(), 1);
});

test('an invalid code keeps the input and displays the backend validation message', async () => {
    const view = await screen({ postError: 'Este grupo está desactivado.' });
    nodes(view.render()).find(node => node.type === 'input').props.onChange({ target: { value: 'KCH-7F3A9' } });
    nodes(view.render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
    await settle();
    assert.equal(nodes(view.render()).find(node => node.type === 'input').props.value, 'KCH-7F3A9');
    assert.equal(text(nodes(view.render()).find(node => node.props.role === 'alert')), 'Este grupo está desactivado.');
});

test('an existing member can leave an inactive group without losing the rest of their account', async () => {
    const view = await screen({ member: { ...group, activo: false } });
    assert.ok(text(view.render()).includes('Inactivo'));
    button(view, 'Salir del grupo').props.onClick();
    await settle();
    assert.deepEqual(view.requests, [{ method: 'DELETE', path: '/mi-grupo' }]);
    assert.ok(button(view, 'Unirme'));
});

test('cancelling leave sends no request', async () => {
    const view = await screen({ member: group, confirm: false });
    button(view, 'Salir del grupo').props.onClick();
    await settle();
    assert.equal(view.requests.length, 0);
});

test('admin creation sends only a name and displays the generated code with a working copy action', async () => {
    const view = await screen({ admin: true });
    nodes(view.render()).find(node => node.type === 'input').props.onChange({ target: { value: ' Kichwa A ' } });
    nodes(view.render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
    await settle();
    assert.deepEqual(view.requests[0], { method: 'POST', path: '/admin/grupos', payload: { nombre: 'Kichwa A' } });
    button(view, 'Copiar código').props.onClick();
    await settle();
    assert.deepEqual(view.copied, ['KCH-7F3A9']);
    assert.ok(text(view.render()).includes('Código copiado'));
    button(view, 'Desactivar').props.onClick();
    await settle();
    assert.deepEqual(view.requests[1], { method: 'PATCH', path: '/admin/grupos/7', payload: { activo: false } });
});

test('copy failures leave the code visible and explain how to copy it manually', async () => {
    const view = await screen({ admin: true, copyingFails: true });
    nodes(view.render()).find(node => node.props['aria-label'] === 'Copiar código de Kichwa A').props.onClick();
    await settle();
    assert.ok(text(view.render()).includes('KCH-7F3A9'));
    assert.ok(text(view.render()).includes('cópialo manualmente'));
});
