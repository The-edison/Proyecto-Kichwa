import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : tree?.props ? [tree, ...nodes(tree.props.children)] : [];
const text = tree => Array.isArray(tree) ? tree.map(text).join('') : tree?.props ? text(tree.props.children) : typeof tree === 'string' ? tree : '';

async function render(path, exportName, props, api = {}) {
    const source = await readFile(new URL('../src/js/' + path, import.meta.url), 'utf8');
    const { code } = await transformWithOxc(source, path);
    const context = vm.createContext({});
    const jsx = (type, props) => ({ type, props });
    const module = new vm.SourceTextModule(code, { context });
    await module.link(specifier => {
        const exports = specifier.endsWith('.css') ? {}
            : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' }
            : specifier === 'react' ? { useState: initial => [initial, () => {}] }
            : specifier === 'lucide-react' ? Object.fromEntries(['ArrowRight', 'Award', 'BookOpen', 'CheckCircle2', 'ChevronRight', 'ClipboardCheck', 'LockKeyhole', 'Target'].map(name => [name, name]))
            : specifier.endsWith('/navigation') ? { Head: 'Head', Link: 'Link' }
            : specifier.endsWith('/useApi') ? { useApi: path => ({ data: api[path], loading: false, error: null }) }
            : specifier.endsWith('/LearningProgress') ? { LearningProgress: 'LearningProgress', progressValue: value => value }
            : Object.fromEntries(['AppLayout', 'EmptyState', 'ErrorState', 'LoadingState', 'Pagination', 'ModuleFinalCard'].map(name => [name, name]));
        return new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context });
    });
    await module.evaluate();
    return module.namespace[exportName](props);
}

function assertArrowOnly(row, unit) {
    assert.equal(row.type === 'Link', false);
    assert.equal(row.props.href, undefined);
    assert.equal(row.props.onClick, undefined);
    const links = nodes(row).filter(node => node.type === 'Link');
    assert.equal(links.length, 1);
    assert.equal(links[0].props.href, '/aprender/unidad/' + unit.id);
    assert.equal(links[0].props['aria-label'], 'Abrir unidad: ' + unit.title);
    assert.equal(text(links[0]), '');
    assert.ok(nodes(links[0]).some(node => node.type === 'ArrowRight'));
}

test('all module unit states open only through their arrow while titles, objectives and progress remain visible', async () => {
    const units = [0, 50, 100].map((percentage, index) => ({ id: index + 1, title: 'Unidad de prueba ' + index, description: 'Objetivo: Aprender nuevas palabras.', sort_order: index + 1, percentage }));
    const tree = await render('pages/Student/Module.tsx', 'default', { moduleId: 8 }, {
        '/modules/8': { title: 'Módulo de prueba', level_id: 1, level_name: 'Básico' },
        '/modules/8/units?page=1': { data: units, total: 3, per_page: 10, last_page: 1 },
    });
    const rows = nodes(tree).filter(node => node.type === 'article');
    assert.equal(rows.length, 3);
    rows.forEach((row, index) => {
        assertArrowOnly(row, units[index]);
        assert.ok(text(row).includes(units[index].title));
        assert.ok(text(row).includes('Aprender nuevas palabras.'));
        assert.equal(nodes(row).find(node => node.type === 'LearningProgress').props.value, units[index].percentage);
    });
});

test('learning journey unit rows use an arrow without linking the rest of the row', async () => {
    const unit = { id: 12, title: 'Saludos', completed: true, total_activities: 5, completed_activities: 5 };
    const report = { levels: [{ id: 1, title: 'Básico', modules: [{ id: 3, units: [unit] }] }] };
    const tree = await render('components/LearningJourney.tsx', 'LearningJourney', { report });
    const row = nodes(tree).find(node => node.type === 'ul' && node.props.className === 'journey-units').props.children[0];
    assertArrowOnly(row, unit);
});

test('final evaluation prerequisites are informational and only the main evaluation action remains', async () => {
    const unit = { id: 15, title: 'Números', completed: false, correct: 2, total: 5 };
    for (const status of [{ unlocked: false, passed: false }, { unlocked: true, passed: false }, { unlocked: true, passed: true }]) {
        const tree = await render('components/ModuleFinalCard.tsx', 'ModuleFinalCard', { status: { ...status, id: 8, units: [unit], preview_available: true } });
        const row = nodes(tree).find(node => node.type === 'ul').props.children[0];
        assert.equal(nodes(row).some(node => node.type === 'Link' || node.type === 'button'), false);
        assert.ok(text(row).includes(unit.title));
        const links = nodes(tree).filter(node => node.type === 'Link');
        assert.equal(links.length, status.unlocked ? 1 : 0);
        if (status.unlocked) {
            assert.equal(links[0].props.href, '/aprender/evaluacion/8');
            assert.equal(text(links[0]), status.passed ? 'Volver a practicar' : 'Abrir prueba');
        }
    }
});
