import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/pages/Admin/Dictionary.tsx', import.meta.url), 'utf8'), 'Dictionary.tsx');

async function screen(post = async () => ({ message: '2 palabras añadidas; 1 duplicadas omitidas.' })) {
    let cursor = 0;
    const states = [], requests = [], paths = [];
    class ApiError extends Error { constructor(message, errors) { super(message); this.errors = errors; } }
    const jsx = (type, props) => ({ type, props });
    const context = vm.createContext({ FormData, encodeURIComponent });
    const module = new vm.SourceTextModule(code, { context });
    await module.link(specifier => {
        const key = specifier.split('/').at(-1);
        const dependency = specifier === 'react' ? {
            useState: initial => { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = value; }]; },
            useRef: initial => { const index = cursor++; return states[index] ??= { current: initial }; },
        } : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' }
            : specifier === 'lucide-react' ? Object.fromEntries(['Download', 'Languages', 'Plus', 'Search', 'Upload'].map(name => [name, name]))
                : key === 'api' ? { ApiError, apiPost: async (path, payload) => { requests.push({ path, payload }); return post({ path, payload, ApiError }); } }
                    : key === 'useApi' ? { useApi: path => { paths.push(path); return { loading: false, error: null, data: { data: [{ id: 88, kichwa: 'yura', español: 'árbol' }], total: 21, current_page: Number(new URL('http://test' + path).searchParams.get('page')), last_page: 2 } }; } }
                        : key === 'navigation' ? { Head: 'Head' }
                            : key === 'AppLayout' ? { AppLayout: 'AppLayout' }
                                : key === 'States' ? { ErrorState: 'ErrorState', LoadingState: 'LoadingState' }
                                    : key === 'Pagination' ? { Pagination: 'Pagination' } : {};
        return new vm.SyntheticModule(Object.keys(dependency), function () { for (const [name, value] of Object.entries(dependency)) this.setExport(name, value); }, { context });
    });
    await module.evaluate();
    return { requests, paths, render() { cursor = 0; return module.namespace.default(); } };
}
function nodes(tree) { if (Array.isArray(tree)) return tree.flatMap(nodes); return tree?.props ? [tree, ...nodes(tree.props.children)] : []; }
function content(tree) { if (Array.isArray(tree)) return tree.map(content).join(''); return tree?.props ? content(tree.props.children) : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : ''; }
const input = (view, id) => nodes(view.render()).find(node => node.props.id === id);
const form = (view, index) => nodes(view.render()).filter(node => node.type === 'form')[index];
const change = (view, id, value) => input(view, id).props.onChange({ target: { value } });
const submit = (view, index) => form(view, index).props.onSubmit({ preventDefault() {} });
const tick = () => new Promise(resolve => setImmediate(resolve));

test('individual creation sends trimmed words once and clears the form after success', async () => {
    let resolve;
    const view = await screen(() => new Promise(done => { resolve = done; }));
    change(view, 'dictionary-kichwa', ' wasi '); change(view, 'dictionary-spanish', ' casa ');
    submit(view, 0); submit(view, 0);
    assert.equal(view.requests.length, 1);
    assert.equal(view.requests[0].path, '/admin/diccionario');
    assert.equal(view.requests[0].payload.kichwa, 'wasi');
    assert.equal(view.requests[0].payload.español, 'casa');
    assert.equal(nodes(view.render()).find(node => node.type === 'fieldset').props.disabled, true);
    resolve({ id: 9 }); await tick();
    assert.equal(input(view, 'dictionary-kichwa').props.value, '');
    assert.equal(input(view, 'dictionary-spanish').props.value, '');
    assert.ok(content(view.render()).includes('Palabra añadida al diccionario.'));
});

test('duplicate validation displays its message and keeps the entered words', async () => {
    const view = await screen(({ ApiError }) => { throw new ApiError('Entrada existente.', { kichwa: ['Esta entrada del diccionario ya existe.'] }); });
    change(view, 'dictionary-kichwa', 'yura'); change(view, 'dictionary-spanish', 'árbol');
    submit(view, 0); await tick();
    assert.equal(input(view, 'dictionary-kichwa').props.value, 'yura');
    assert.equal(input(view, 'dictionary-spanish').props.value, 'árbol');
    assert.equal(input(view, 'dictionary-kichwa').props['aria-invalid'], true);
    assert.ok(content(view.render()).includes('Esta entrada del diccionario ya existe.'));
});

test('CSV import sends the selected file as multipart data and reports skipped duplicates', async () => {
    const view = await screen();
    const file = new File(['kichwa,español\nwasi,casa\n'], 'palabras.csv', { type: 'text/csv' });
    input(view, 'dictionary-csv').props.onChange({ target: { files: [file] } });
    submit(view, 1); await tick();
    assert.equal(view.requests[0].path, '/admin/diccionario/import');
    assert.ok(view.requests[0].payload instanceof FormData);
    assert.equal(view.requests[0].payload.get('file').name, 'palabras.csv');
    assert.equal(await view.requests[0].payload.get('file').text(), await file.text());
    assert.ok(content(view.render()).includes('2 palabras añadidas; 1 duplicadas omitidas.'));
    assert.equal(nodes(form(view, 1)).find(node => node.type === 'button').props.disabled, true);
});

test('invalid CSV selection makes no request and a failed import keeps the selected file available for retry', async () => {
    const view = await screen(() => { throw Error('offline'); });
    for (const file of [{ name: 'palabras.xlsx', size: 10 }, { name: 'palabras.csv', size: 2097153 }]) {
        input(view, 'dictionary-csv').props.onChange({ target: { files: [file] } });
        submit(view, 1);
        assert.equal(view.requests.length, 0);
        assert.ok(content(view.render()).includes('Selecciona un archivo CSV de hasta 2 MB.'));
    }
    const file = new File(['kichwa,español\nwasi,casa\n'], 'palabras.csv', { type: 'text/csv' });
    input(view, 'dictionary-csv').props.onChange({ target: { files: [file] } });
    submit(view, 1); await tick();
    assert.ok(content(view.render()).includes('No se pudo guardar.'));
    assert.equal(nodes(form(view, 1)).find(node => node.type === 'button').props.disabled, false);
    submit(view, 1); await tick();
    assert.equal(view.requests.length, 2);
    assert.equal(view.requests[1].payload.get('file').name, 'palabras.csv');
});

test('search starts on page one and the downloadable template contains the required UTF-8 columns', async () => {
    const view = await screen();
    nodes(view.render()).find(node => node.type === 'Pagination').props.onChange(2);
    const search = nodes(view.render()).find(node => node.props['aria-label'] === 'Buscar palabras en kichwa o español');
    search.props.onChange({ target: { value: ' árbol ' } });
    submit(view, 2); view.render();
    assert.equal(view.paths.at(-1), '/admin/diccionario?page=1&q=%C3%A1rbol');
    const template = nodes(view.render()).find(node => node.props.download === 'plantilla-diccionario.csv');
    assert.equal(decodeURIComponent(template.props.href.split(',')[1]), '\uFEFFkichwa,español\nwasi,casa\nyura,árbol\n');
});
