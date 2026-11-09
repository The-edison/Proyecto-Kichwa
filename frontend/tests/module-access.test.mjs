import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const jsx = (type, props) => ({ type, props });
function nodes(tree) { if (Array.isArray(tree)) return tree.flatMap(nodes); return tree?.props ? [tree, ...nodes(tree.props.children)] : []; }
function text(tree) { if (Array.isArray(tree)) return tree.map(text).join(''); return tree?.props ? text(tree.props.children) : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : ''; }
const lock = { module_id: 2, module_title: 'Vocabulario y gramática', prerequisite: { id: 1, title: 'Primeros contactos', level_id: 1 }, completed_units: 2, total_units: 5, final_passed: false, final_ready: true, resume: { kind: 'unit', id: 3 }, message: 'Termina el módulo anterior.' };
const helperCode = (await transformWithOxc(await readFile(new URL('../src/js/services/moduleAccess.ts', import.meta.url), 'utf8'), 'moduleAccess.ts')).code;

async function component(path, dependencies, globals = {}) {
    const context = vm.createContext(globals);
    const code = (await transformWithOxc(await readFile(new URL(path, import.meta.url), 'utf8'), path)).code;
    const main = new vm.SourceTextModule(code, { context });
    await main.link(async specifier => {
        if (specifier.endsWith('/moduleAccess')) {
            const helper = new vm.SourceTextModule(helperCode, { context });
            await helper.link(() => { throw Error('Unexpected runtime dependency'); });
            return helper;
        }
        const values = specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' }
            : specifier === 'lucide-react' ? Object.fromEntries(['ArrowRight', 'BookOpen', 'CheckCircle2', 'ClipboardCheck', 'LockKeyhole', 'Check', 'ChevronRight', 'Sparkles', 'X'].map(name => [name, name]))
            : specifier.endsWith('/navigation') ? { Link: 'Link', Head: 'Head' }
            : dependencies[specifier] ?? (specifier.endsWith('.jpg') ? { default: specifier } : {});
        return new vm.SyntheticModule(Object.keys(values), function () { for (const [key, value] of Object.entries(values)) this.setExport(key, value); }, { context });
    });
    await main.evaluate();
    return main.namespace;
}

test('the lock notice shows remaining units and returns to the pending lesson', async () => {
    const module = await component('../src/js/components/ModuleLockNotice.tsx', {});
    const tree = module.ModuleLockNotice({ lock });
    assert.ok(text(tree).includes('Tu siguiente reto te espera'));
    assert.ok(text(tree).includes('2 de 5'));
    assert.ok(text(tree).includes('Pendiente de aprobar'));
    const action = nodes(tree).find(node => node.type === 'Link');
    assert.equal(action.props.href, '/aprender/unidad/3');
    assert.ok(text(action).includes('Continuar mi aprendizaje'));
    const exam = module.ModuleLockNotice({ lock: { ...lock, completed_units: 5, resume: { kind: 'module_final', id: 8 } } });
    assert.equal(nodes(exam).find(node => node.type === 'Link').props.href, '/aprender/evaluacion/8');
    assert.ok(text(exam).includes('Ir a la prueba final'));
    const pending = module.ModuleLockNotice({ lock: { ...lock, completed_units: 5, final_ready: false, resume: { kind: 'module', id: 1 } } });
    assert.ok(text(pending).includes('En preparación'));
    assert.equal(nodes(pending).find(node => node.type === 'Link').props.href, '/aprender/modulo/1');
});

test('locked module cards cancel navigation and request the matching notice', async () => {
    const events = [];
    const modules = [{ id: 1, title: 'Primeros contactos', description: 'Objetivo', sort_order: 1, percentage: 100, completed: false, unlocked: true }, { id: 2, title: lock.module_title, description: 'Objetivo', sort_order: 2, percentage: 0, unlocked: false, lock }];
    const module = await component('../src/js/pages/Student/Level.tsx', {
        react: { useState: initial => [initial, () => {}] },
        '../../hooks/useApi': { useApi: path => ({ data: path.includes('/modules?') ? { data: modules, total: 2, per_page: 20 } : path === '/progress' ? [] : { data: [] } }) },
        '../../layouts/AppLayout': { AppLayout: 'AppLayout' },
        '../../components/States': { LoadingState: 'LoadingState', ErrorState: 'ErrorState', EmptyState: 'EmptyState' },
        '../../components/Pagination': { Pagination: 'Pagination' },
        '../../components/LearningProgress': { LearningProgress: 'LearningProgress', LearningProgressRing: 'LearningProgressRing', progressValue: value => value ?? 0 },
    }, { CustomEvent, window: { dispatchEvent: event => events.push(event) } });
    const tree = module.default({ level: { id: 1, name: 'Básico', code: 'basic' } });
    const cards = nodes(tree).filter(node => node.type === 'Link' && node.props.className?.includes('learning-module-card'));
    let prevented = false;
    cards[1].props.onClick({ preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(events[0].type, 'yachay:module-locked');
    assert.equal(events[0].detail, lock);
    assert.ok(text(cards[1]).includes('Bloqueado'));
    assert.equal(text(cards[0]).includes('Completado'), false);
    prevented = false;
    cards[0].props.onClick({ preventDefault() { prevented = true; } });
    assert.equal(prevented, false);
});

test('the module lock dialog opens on a blocked access and restores scrolling when closed', async () => {
    let cursor = 0;
    const states = [], dependencies = [], cleanups = [], effects = [], listeners = new Map();
    const dialog = { open: false, showModal() { this.open = true; }, close() { this.open = false; } };
    const document = { body: { style: { overflow: 'auto' } } };
    const module = await component('../src/js/components/ModuleAccessDialog.tsx', {
        react: {
            useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = value; }]; },
            useRef() { cursor++; return { current: dialog }; },
            useEffect(effect, deps) { const index = cursor++; if (!dependencies[index] || deps.some((value, i) => value !== dependencies[index][i])) { dependencies[index] = deps; effects.push(() => { cleanups[index]?.(); cleanups[index] = effect(); }); } },
        },
        './ModuleLockNotice': { ModuleLockNotice: 'ModuleLockNotice' },
    }, { document, window: { addEventListener: (name, listener) => listeners.set(name, listener), removeEventListener: name => listeners.delete(name) } });
    const render = () => { cursor = 0; const tree = module.ModuleAccessDialog(); effects.splice(0).forEach(effect => effect()); return tree; };
    render();
    assert.equal(dialog.open, false);
    listeners.get('yachay:module-locked')({ detail: lock });
    let tree = render();
    assert.equal(dialog.open, true);
    assert.equal(document.body.style.overflow, 'hidden');
    assert.equal(nodes(tree).find(node => node.type === 'ModuleLockNotice').props.lock, lock);
    nodes(tree).find(node => node.type === 'button').props.onClick();
    render();
    assert.equal(dialog.open, false);
    assert.equal(document.body.style.overflow, 'auto');
    cleanups.forEach(cleanup => cleanup?.());
    assert.equal(listeners.size, 0);
});
