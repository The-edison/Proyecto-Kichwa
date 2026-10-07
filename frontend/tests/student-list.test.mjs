import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/pages/Admin/Students.tsx', import.meta.url), 'utf8'), 'Students.tsx');

async function screen() {
    let hook = 0;
    const states = [], effects = [], timers = new Map(), requests = [];
    const context = vm.createContext({
        setTimeout: callback => { const key = Symbol(); timers.set(key, callback); return key; },
        clearTimeout: key => timers.delete(key),
    });
    const jsx = (type, props) => ({ type, props });
    const component = name => Object.assign(() => null, { displayName: name });
    const pagination = Object.fromEntries(['Pagination', 'PaginationContent', 'PaginationEllipsis', 'PaginationItem', 'PaginationLink', 'PaginationNext', 'PaginationPrevious'].map(name => [name, component(name)]));
    const module = new vm.SourceTextModule(code, { context });
    await module.link(specifier => {
        const dependency = specifier === 'react' ? {
            useState: initial => { const index = hook++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = value; }]; },
            useEffect: (callback, deps) => { const index = hook++; const previous = effects[index]; if (!previous || deps.some((value, position) => value !== previous.deps[position])) { previous?.cleanup?.(); effects[index] = { deps, cleanup: callback() }; } },
        } : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' }
            : specifier.endsWith('/ui/pagination') ? pagination
            : specifier.endsWith('/useApi') ? { useApi: path => {
                requests.push(path);
                const params = new URL('http://test' + path).searchParams;
                const page = Number(params.get('page'));
                return { loading: false, error: null, refresh: () => {}, data: { total: 45, current_page: page, last_page: 3, per_page: 20, data: [{ id: page, name: 'Estudiante página ' + page, cedula: null, email: 'student@example.com', state: 'activo' }] } };
            } }
            : specifier.endsWith('/States') ? { EmptyState: component('EmptyState'), ErrorState: component('ErrorState'), LoadingState: component('LoadingState') }
            : specifier.endsWith('/AppLayout') ? { AppLayout: component('AppLayout') }
            : specifier.endsWith('/api') ? { apiPatch: () => {}, ApiError: class extends Error {} }
            : { Head: component('Head') };
        return new vm.SyntheticModule(Object.keys(dependency), function () {
            for (const [key, value] of Object.entries(dependency)) this.setExport(key, value);
        }, { context });
    });
    await module.evaluate();
    return {
        render: () => { hook = 0; return module.namespace.default(); },
        flushSearch: () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(callback => callback()); },
        requests,
    };
}
function nodes(tree) {
    if (Array.isArray(tree)) return tree.flatMap(nodes);
    if (!tree || typeof tree !== 'object' || !tree.props) return [];
    return [tree, ...nodes(tree.props.children)];
}
const click = node => node.props.onClick({ preventDefault() {} });

test('student page requests the initial list and shadcn controls load the selected page', async () => {
    const view = await screen();
    let tree = view.render();
    view.flushSearch();
    assert.equal(view.requests.at(-1), '/admin/students?q=&page=1');
    const previous = nodes(tree).find(node => node.props['aria-label'] === 'Ir a la página anterior');
    assert.equal(previous.props['aria-disabled'], true);
    click(previous);
    tree = view.render();
    assert.equal(view.requests.at(-1), '/admin/students?q=&page=1');
    click(nodes(tree).find(node => node.props['aria-label'] === 'Ir a la página 3'));
    tree = view.render();
    assert.equal(view.requests.at(-1), '/admin/students?q=&page=3');
    const next = nodes(tree).find(node => node.props['aria-label'] === 'Ir a la página siguiente');
    assert.equal(next.props['aria-disabled'], true);
    click(next);
    view.render();
    assert.equal(view.requests.at(-1), '/admin/students?q=&page=3');
});

test('typing a new search resets pagination together with the applied search', async () => {
    const view = await screen();
    let tree = view.render();
    view.flushSearch();
    click(nodes(tree).find(node => node.props['aria-label'] === 'Ir a la página 3'));
    tree = view.render();
    nodes(tree).find(node => node.props.id === 'student-search').props.onChange({ target: { value: ' Ana ' } });
    view.render();
    view.flushSearch();
    view.render();
    assert.equal(view.requests.at(-1), '/admin/students?q=Ana&page=1');
    assert.equal(view.requests.includes('/admin/students?q=Ana&page=3'), false);
});
