import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/components/MatchingLines.tsx', import.meta.url), 'utf8'), 'MatchingLines.tsx');
async function screen() {
    let cursor = 0, resize, cleanup, effectDeps, callback, animationEnd;
    const state = [], refs = [], observed = [], removed = [];
    const origin = { dataset: { matchingOrigin: 'a' }, getBoundingClientRect: () => ({ right: 100, top: 90, height: 40 }) };
    let destinationTop = 200;
    const destination = { dataset: { matchingDestination: 'b' }, getBoundingClientRect: () => ({ left: 250, top: destinationTop, height: 40 }) };
    const board = { offsetWidth: 400, offsetHeight: 500, clientLeft: 2, clientTop: 2,
        closest: () => ({ addEventListener(name, fn) { assert.equal(name, 'animationend'); animationEnd = fn; }, removeEventListener(name, fn) { removed.push([name, fn]); } }),
        getBoundingClientRect: () => ({ left: 20, top: 50, width: 400, height: 500 }),
        querySelectorAll: selector => selector.includes(',') ? [origin, destination] : selector.includes('origin') ? [origin] : [destination] };
    const context = vm.createContext({
        window: { addEventListener(name, fn) { assert.equal(name, 'resize'); resize = fn; }, removeEventListener(name, fn) { removed.push([name, fn]); } },
        document: {}, ResizeObserver: class { constructor(fn) { callback = fn; } observe(node) { observed.push(node); } disconnect() { observed.length = 0; } },
    });
    const module = new vm.SourceTextModule(code, { context });
    await module.link(specifier => {
        const jsx = (type, props) => ({ type, props });
        const dep = specifier === 'react' ? {
            useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], next => state[i] = next]; },
            useRef() { const i = cursor++; return refs[i] ??= { current: { closest: () => board } }; },
            useLayoutEffect(effect, deps) { if (!effectDeps || deps.some((value, i) => value !== effectDeps[i])) { cleanup?.(); effectDeps = deps; cleanup = effect(); } },
        } : { jsx, jsxs: jsx };
        return new vm.SyntheticModule(Object.keys(dep), function () { for (const [key, value] of Object.entries(dep)) this.setExport(key, value); }, { context });
    });
    await module.evaluate();
    return { module: module.namespace, board, origin, destination, observed, removed,
        render(props = {}) { cursor = 0; return module.namespace.MatchingLines(props); },
        resize(top) { destinationTop = top; resize(); }, observeResize(top) { destinationTop = top; callback(); }, finishAnimation(top) { destinationTop = top; animationEnd(); }, unmount() { cleanup(); } };
}
const paths = tree => tree.props.children;

test('connections follow saved pairs, change endpoints on resize, and keep per-answer grades', async () => {
    const view = await screen();
    const props = { pairs: [{ origen: 'a', destino: 'b' }], feedback: { is_correct: false, item_results: { a: true } } };
    view.render(props);
    let line = paths(view.render(props))[0];
    assert.equal(line.props.d, 'M78,58 C153,58 153,168 228,168');
    assert.equal(line.props['data-answer-correct'], true);
    assert.equal(view.observed.length, 3);
    view.resize(300);
    assert.match(paths(view.render(props))[0].props.d, /228,268$/);
    view.observeResize(180);
    assert.match(paths(view.render(props))[0].props.d, /228,148$/);
    view.finishAnimation(250);
    assert.match(paths(view.render(props))[0].props.d, /228,218$/);
    props.feedback.item_results.a = false;
    assert.equal(paths(view.render(props))[0].props['data-answer-correct'], false);
    props.pairs = [];
    view.render(props);
    assert.equal(paths(view.render(props)).length, 0);
    view.unmount();
    assert.equal(view.observed.length, 0);
    assert.equal(view.removed.at(-2)[0], 'resize');
    assert.equal(view.removed.at(-1)[0], 'animationend');
});

test('measurement handles page animation scale, borders, missing endpoints and hidden boards', async () => {
    const view = await screen();
    view.board.getBoundingClientRect = () => ({ left: 20, top: 50, width: 200, height: 250 });
    const pairs = [{ origen: 'a', destino: 'b' }, { origen: 'missing', destino: 'b' }];
    const result = view.module.measureConnections(pairs, view.board, new Map([['a', view.origin]]), new Map([['b', view.destination]]));
    assert.deepEqual(JSON.parse(JSON.stringify(result)), [{ id: 'a', x1: 158, y1: 118, x2: 458, y2: 338 }]);
    view.board.getBoundingClientRect = () => ({ width: 0, height: 0 });
    assert.equal(view.module.measureConnections(pairs, view.board, new Map(), new Map()).length, 0);
    assert.equal(paths(view.render()).length, 0);
    assert.equal(paths(view.render()).length, 0);
    view.unmount();
});
