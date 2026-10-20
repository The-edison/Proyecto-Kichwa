import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';
import { QueryClient, QueryObserver } from '@tanstack/react-query';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/services/learningNavigation.ts', import.meta.url), 'utf8'), 'learningNavigation.ts');
const { code: linkCode } = await transformWithOxc(await readFile(new URL('../src/js/navigation.tsx', import.meta.url), 'utf8'), 'navigation.tsx');
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }

async function client({ connection, get = async () => ({}), load = async () => {} } = {}) {
    const requests = [], imports = [];
    const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, gcTime: Infinity, retry: false } } });
    const context = vm.createContext({ navigator: { connection } });
    const module = new vm.SourceTextModule(code, { context, importModuleDynamically: async specifier => {
        imports.push(specifier);
        await load(specifier);
        const chunk = new vm.SyntheticModule(['default'], function () { this.setExport('default', () => null); }, { context });
        await chunk.link(() => {}); await chunk.evaluate(); return chunk;
    } });
    await module.link(specifier => {
        const exports = specifier === './api' ? { apiGet: (path, signal) => { requests.push(path); return get(path, signal); } } : { queryClient };
        return new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context });
    });
    await module.evaluate();
    return { api: module.namespace, queryClient, requests, imports };
}

test('hover and keyboard intent preload only the matching code, without requesting private data', async () => {
    const view = await client();
    view.api.preloadLearningCode('/aprender/modulo/4');
    view.api.preloadLearningCode('/aprender/unidad/7');
    for (const href of ['https://other.test/aprender/unidad/7', '/admin/contenidos', '/aprender/unidad/7?tema=3', '/aprender/modulo/0']) view.api.preloadLearningCode(href);
    await tick();
    assert.deepEqual(view.imports, ['../pages/Student/Module', '../pages/Student/Unit']);
    assert.deepEqual(view.requests, []);
});

test('optional code preload respects data saving and slow connections and recovers from a failure', async () => {
    for (const connection of [{ saveData: true }, { effectiveType: '2g' }, { effectiveType: 'slow-2g' }]) {
        const view = await client({ connection });
        view.api.preloadLearningCode('/aprender/unidad/7');
        await tick(); assert.deepEqual(view.imports, []);
    }
    let attempts = 0;
    const view = await client({ load: async () => { if (++attempts === 1) throw Error('offline'); } });
    view.api.preloadLearningCode('/aprender/unidad/7'); await tick();
    await view.api.loadLearningUnit();
    assert.equal(attempts, 2);
});

test('module click starts both GETs together and mounting shares the pending request', async () => {
    const response = deferred();
    const view = await client({ get: () => response.promise });
    view.api.prefetchLearningData('/aprender/modulo/4');
    assert.deepEqual(view.requests, ['/modules/4', '/modules/4/units?page=1']);
    const observer = new QueryObserver(view.queryClient, { queryKey: ['api', '/modules/4'],
        queryFn: () => { throw Error('The mounted screen must share the in-flight query'); }, refetchOnMount: 'always' });
    const unsubscribe = observer.subscribe(() => {});
    response.resolve({ id: 4 }); await tick();
    assert.equal(observer.getCurrentResult().data.id, 4);
    assert.equal(view.requests.length, 2);
    unsubscribe(); view.queryClient.clear();
});

test('guided unit click starts its sequence after the unit response, before the screen mounts', async () => {
    const response = deferred();
    const view = await client({ get: path => path === '/units/7' ? response.promise : Promise.resolve({ exercises: [] }) });
    view.api.prefetchLearningData('/aprender/unidad/7');
    view.api.prefetchLearningData('/aprender/unidad/7');
    assert.deepEqual(view.requests, ['/units/7']);
    response.resolve({ id: 7, config: { learning_mode: 'guided' } }); await tick();
    assert.deepEqual(view.requests, ['/units/7', '/units/7/guided']);
    assert.equal(view.queryClient.getQueryData(['api', '/units/7']).id, 7);
    view.queryClient.clear();
});

test('classic and sequence units keep their existing endpoints and failed prefetch stays recoverable', async () => {
    for (const mode of ['classic', 'sequence']) {
        const view = await client({ get: async () => ({ config: { learning_mode: mode } }) });
        view.api.prefetchLearningData('/aprender/unidad/7'); await tick();
        assert.deepEqual(view.requests, ['/units/7']); view.queryClient.clear();
    }
    let online = false;
    const view = await client({ get: async () => { if (!online) throw Error('offline'); return { id: 7 }; } });
    view.api.prefetchLearningData('/aprender/unidad/7'); await tick();
    assert.equal(view.queryClient.getQueryData(['api', '/units/7']), undefined);
    online = true; view.api.prefetchLearningData('/aprender/unidad/7'); await tick();
    assert.equal(view.queryClient.getQueryData(['api', '/units/7']).id, 7); view.queryClient.clear();
});

test('clearing the authenticated cache cancels prefetch without repopulating data for another session', async () => {
    const response = deferred();
    const view = await client({ get: () => response.promise });
    view.api.prefetchLearningData('/aprender/unidad/7');
    view.queryClient.clear(); response.resolve({ id: 7, config: { learning_mode: 'guided' } }); await tick();
    assert.deepEqual(view.requests, ['/units/7']);
    assert.equal(view.queryClient.getQueryCache().getAll().length, 0);
});

test('prefetched data still revalidates on visit and invalidation using existing query rules', async () => {
    let revision = 0;
    const view = await client({ get: async () => ({ id: 4, revision: ++revision }) });
    view.api.prefetchLearningData('/aprender/modulo/4'); await tick();
    const observer = new QueryObserver(view.queryClient, { queryKey: ['api', '/modules/4'],
        queryFn: async () => ({ id: 4, revision: ++revision }), refetchOnMount: 'always' });
    const unsubscribe = observer.subscribe(() => {}); await tick();
    assert.equal(observer.getCurrentResult().data.revision, 3);
    await view.queryClient.invalidateQueries({ queryKey: ['api', '/modules/4'], exact: true });
    assert.equal(observer.getCurrentResult().data.revision, 4);
    unsubscribe(); view.queryClient.clear();
});

async function link(props) {
    const calls = [];
    const context = vm.createContext({});
    const module = new vm.SourceTextModule(linkCode, { context });
    await module.link(specifier => {
        const exports = specifier === 'react' ? { useEffect() {} } : specifier === 'react/jsx-runtime' ? { jsx: (type, props) => ({ type, props }) }
            : specifier === 'react-router-dom' ? { Link: 'RouterLink', useLocation: () => ({}) }
            : { preloadLearningCode: href => calls.push(['code', href]), prefetchLearningData: href => calls.push(['data', href]) };
        return new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context });
    });
    await module.evaluate();
    return { tree: module.namespace.Link({ href: '/aprender/unidad/7', ...props }), calls };
}

test('link preserves attributes, callbacks and navigation while preloading on mouse, keyboard and touch intent', async () => {
    const events = [];
    const { tree, calls } = await link({ className: 'student-unit-row', children: 'Abrir unidad', 'aria-current': 'page',
        onMouseEnter: () => events.push('mouse'), onFocus: () => events.push('focus'), onTouchStart: () => events.push('touch'), onClick: () => events.push('click') });
    for (const handler of ['onMouseEnter', 'onFocus', 'onTouchStart']) tree.props[handler]({ defaultPrevented: false });
    tree.props.onClick({ button: 0 });
    assert.deepEqual(events, ['mouse', 'focus', 'touch', 'click']);
    assert.deepEqual(calls, [['code', '/aprender/unidad/7'], ['code', '/aprender/unidad/7'], ['code', '/aprender/unidad/7'], ['data', '/aprender/unidad/7']]);
    assert.equal(tree.props.to, '/aprender/unidad/7');
    assert.equal(tree.props.className, 'student-unit-row');
    assert.equal(tree.props.children, 'Abrir unidad');
    assert.equal(tree.props['aria-current'], 'page');
});

test('cancelled clicks, modified clicks, downloads and new tabs do not start data requests', async () => {
    for (const props of [{ target: '_blank' }, { download: '' }, { onClick: event => { event.defaultPrevented = true; } }]) {
        const view = await link(props); view.tree.props.onClick({ button: 0 }); assert.deepEqual(view.calls, []);
    }
    const view = await link({});
    for (const event of [{ button: 1 }, { button: 0, ctrlKey: true }, { button: 0, metaKey: true }, { button: 0, shiftKey: true }, { button: 0, altKey: true }]) view.tree.props.onClick(event);
    assert.deepEqual(view.calls, []);
});
