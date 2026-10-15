import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const compile = async path => (await transformWithOxc(await readFile(new URL('../src/js/' + path, import.meta.url), 'utf8'), path)).code;
const progressCode = await compile('pages/Student/Progress.tsx');
const dashboardCode = await compile('pages/Student/Dashboard.tsx');
const learningCode = await compile('components/LearningProgress.tsx');
const progress = [
    { level: { id: 1, name: 'Básico' }, completed_activities: 3, total_activities: 4, percentage: 75, evaluation_results: [{ evaluation_id: 8, best_score: '90.00' }] },
    { level: { id: 2, name: 'Intermedio' }, completed_activities: 0, total_activities: 3, percentage: 0, evaluation_results: [] },
];
const mastery = { xp: 270, mastered_topics: [1], completed_units: [2], medals: ['Primer logro'], lessons: [{ topic_id: 1, name: 'Primeras palabras', best_score: 90, latest_score: 80, attempt_count: 3, stars: 2 }] };
const jsx = (type, props) => ({ type, props });
function nodes(tree) { if (Array.isArray(tree)) return tree.flatMap(nodes); return tree?.props ? [tree, ...nodes(tree.props.children)] : []; }
function content(tree) { if (Array.isArray(tree)) return tree.map(content).join(''); return tree?.props ? content(tree.props.children) : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : ''; }

async function screen({ component = 'progress', summaries = progress, rewards = mastery, progressLoading = false, progressError = null, masteryLoading = false, masteryError = null } = {}) {
    const requests = [];
    const context = vm.createContext({});
    const dependencies = {
        'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
        'lucide-react': Object.fromEntries(['ArrowRight', 'BookOpen', 'CheckCheck', 'CheckCircle2', 'ClipboardCheck', 'Star', 'Trophy', 'Zap', 'Sparkles', 'LockKeyhole'].map(name => [name, name])),
        navigation: { Head: 'Head', Link: 'Link' }, AppLayout: { AppLayout: 'AppLayout' },
        States: { EmptyState: 'EmptyState', ErrorState: 'ErrorState', LoadingState: 'LoadingState' },
        AuthContext: { useAuth: () => ({ user: { name: 'Ana', role: 'student' } }) },
        useApi: { useApi: path => { requests.push(path); return path === '/progress' ? { data: summaries, loading: progressLoading, error: progressError } : path === '/mastery' ? { data: rewards, loading: masteryLoading, error: masteryError } : { data: [{ id: 1, name: 'Básico', available: true }], loading: false, error: null }; } },
    };
    const cache = new Map();
    async function link(specifier) {
        if (specifier.endsWith('/LearningProgress')) return learning;
        if (!cache.has(specifier)) {
            const exports = specifier.endsWith('.css') ? {} : specifier.endsWith('.jpg') ? { default: specifier } : dependencies[specifier] ?? dependencies[specifier.split('/').at(-1)];
            assert.ok(exports, specifier);
            cache.set(specifier, new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context }));
        }
        return cache.get(specifier);
    }
    const learning = new vm.SourceTextModule(learningCode, { context }); await learning.link(link); await learning.evaluate();
    const module = new vm.SourceTextModule(component === 'progress' ? progressCode : dashboardCode, { context }); await module.link(link); await module.evaluate();
    return { tree: module.namespace.default(), requests };
}

test('the four summary cards live in Mi progreso and use the shared activity and XP totals', async () => {
    const view = await screen();
    const summary = nodes(view.tree).find(node => node.props['aria-label'] === 'Resumen de aprendizaje');
    const cards = nodes(summary).filter(node => node.type === 'article');
    assert.equal(cards.length, 4);
    assert.match(content(cards[0]), /Progreso total43%/);
    assert.match(content(cards[1]), /Actividades completadas37 actividades en total/);
    assert.match(content(cards[2]), /Experiencia ganada270XP acumulados de todos tus intentos/);
    assert.match(content(cards[3]), /Evaluaciones realizadas1/);
    assert.deepEqual(view.requests, ['/progress', '/mastery']);
});

test('learning home retains courses and progress navigation without duplicating the summary cards', async () => {
    const { tree } = await screen({ component: 'dashboard' });
    assert.equal(nodes(tree).some(node => node.props['aria-label'] === 'Resumen de aprendizaje'), false);
    assert.ok(nodes(tree).some(node => node.type === 'Link' && node.props.href === '/aprender/progreso'));
    assert.ok(nodes(tree).some(node => node.type === 'Link' && node.props.href === '/aprender/nivel/1'));
    assert.ok(content(tree).includes('Tus niveles'));
    assert.ok(!content(tree).includes('Experiencia ganada'));
});

test('progress preserves level links, evaluation results and medals without the removed lesson section', async () => {
    const { tree } = await screen();
    assert.ok(content(tree).includes('Mejor nota: 90%'));
    assert.ok(content(tree).includes('Primer logro'));
    assert.equal(content(tree).includes('Primeras palabras'), false);
    assert.equal(nodes(tree).some(node => node.props.id === 'progress-performance-title'), false);
    assert.ok(nodes(tree).some(node => node.type === 'Link' && node.props.href === '/aprender/nivel/2'));
});

test('new students see zero progress and useful empty states without invalid percentages', async () => {
    const { tree } = await screen({ summaries: [], rewards: { xp: 0, mastered_topics: [], completed_units: [], medals: [], lessons: [] } });
    assert.ok(content(tree).includes('Progreso total0%'));
    assert.equal(content(tree).includes('NaN'), false);
    assert.ok(nodes(tree).some(node => node.type === 'EmptyState' && node.props.action.props.href === '/aprender'));
    assert.ok(content(tree).includes('primeras insignias'));
});

test('loading and failed XP requests never replace the students experience with a false zero', async () => {
    const loading = await screen({ rewards: null, masteryLoading: true });
    const loadingCard = nodes(loading.tree).find(node => node.type === 'article' && content(node).includes('Experiencia ganada'));
    assert.match(content(loadingCard), /Experiencia ganada…/);
    const failed = await screen({ rewards: null, masteryError: 'No se pudo cargar la experiencia.' });
    assert.ok(nodes(failed.tree).some(node => node.type === 'ErrorState' && node.props.message === 'No se pudo cargar la experiencia.'));
    assert.ok(content(failed.tree).includes('Experiencia ganada—'));
    const pending = await screen({ summaries: null, progressLoading: true });
    assert.equal(nodes(pending.tree).some(node => node.props['aria-label'] === 'Resumen de aprendizaje'), false);
    assert.ok(nodes(pending.tree).some(node => node.type === 'LoadingState'));
});
