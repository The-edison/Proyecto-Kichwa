import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const compile = async path => (await transformWithOxc(await readFile(new URL('../src/js/' + path, import.meta.url), 'utf8'), path)).code;
const progressCode = await compile('pages/Student/Progress.tsx');
const dashboardCode = await compile('pages/Student/Dashboard.tsx');
const learningCode = await compile('components/LearningProgress.tsx');
const journeyCode = await compile('components/LearningJourney.tsx');
const adminCode = await compile('components/StudentResults.tsx');
const progress = [
    { level: { id: 1, name: 'Básico' }, completed_activities: 3, total_activities: 4, percentage: 75, evaluation_results: [{ evaluation_id: 8, best_score: '90.00' }] },
    { level: { id: 2, name: 'Intermedio' }, completed_activities: 0, total_activities: 3, percentage: 0, evaluation_results: [] },
];
const mastery = { xp: 270, mastered_topics: [1], completed_units: [2], medals: ['Primer logro'], lessons: [{ topic_id: 1, name: 'Primeras palabras', best_score: 90, latest_score: 80, attempt_count: 3, stars: 2 }] };
const jsx = (type, props) => typeof type === 'function' ? type(props) : ({ type, props });
function nodes(tree) { if (Array.isArray(tree)) return tree.flatMap(nodes); return tree?.props ? [tree, ...nodes(tree.props.children)] : []; }
function content(tree) { if (Array.isArray(tree)) return tree.map(content).join(''); return tree?.props ? content(tree.props.children) : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : ''; }

async function screen({ component = 'progress', summaries = progress, rewards = mastery, progressLoading = false, progressError = null, masteryLoading = false, masteryError = null } = {}) {
    const requests = [];
    const context = vm.createContext({document:{activeElement:null},HTMLElement:class {}});
    const dependencies = {
        'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
        react: {useRef: initial=>({current:initial}),useEffect(){}},
        'lucide-react': Object.fromEntries(['ArrowRight', 'BookOpen', 'CheckCheck', 'CheckCircle2', 'ClipboardCheck', 'Star', 'Trophy', 'Zap', 'Sparkles', 'LockKeyhole','GraduationCap','X'].map(name => [name, name])),
        navigation: { Head: 'Head', Link: 'Link' }, AppLayout: { AppLayout: 'AppLayout' },
        States: { EmptyState: 'EmptyState', ErrorState: 'ErrorState', LoadingState: 'LoadingState' },
        AuthContext: { useAuth: () => ({ user: { name: 'Ana', role: 'student' } }) },
        useApi: { useApi: path => { requests.push(path); return path === '/progress' ? { data: summaries, loading: progressLoading, error: progressError } : path === '/mastery' ? { data: rewards, loading: masteryLoading, error: masteryError } : { data: [{ id: 1, name: 'Básico', available: true }], loading: false, error: null }; } },
    };
    const cache = new Map();
    async function link(specifier) {
        if (specifier.endsWith('/LearningProgress')) return learning;
        if (specifier.endsWith('/LearningJourney') || specifier === './LearningJourney') return journey;
        if (!cache.has(specifier)) {
            const exports = specifier.endsWith('.css') ? {} : specifier.endsWith('.jpg') ? { default: specifier } : dependencies[specifier] ?? dependencies[specifier.split('/').at(-1)];
            assert.ok(exports, specifier);
            cache.set(specifier, new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context }));
        }
        return cache.get(specifier);
    }
    const learning = new vm.SourceTextModule(learningCode, { context }); await learning.link(link); await learning.evaluate();
    const journey = new vm.SourceTextModule(journeyCode, { context }); await journey.link(link); await journey.evaluate();
    const module = new vm.SourceTextModule(component === 'progress' ? progressCode : component === 'admin' ? adminCode : dashboardCode, { context }); await module.link(link); await module.evaluate();
    return { tree: component==='admin' ? module.namespace.StudentResults({student:{id:7,name:'Ana',email:'ana@example.test'},data:rewards,loading:masteryLoading,error:masteryError,onClose(){}}) : module.namespace.default(), requests };
}

test('the four summary cards live in Mi progreso and use the shared activity and XP totals', async () => {
    const view = await screen();
    const summary = nodes(view.tree).find(node => node.props['aria-label'] === 'Resumen de aprendizaje');
    const cards = nodes(summary).filter(node => node.type === 'article');
    assert.equal(cards.length, 4);
    assert.match(content(cards[0]), /Práctica completada43%/);
    assert.match(content(cards[1]), /Actividades correctas37 actividades en total/);
    assert.match(content(cards[2]), /Unidades completadas1/);
    assert.match(content(cards[3]), /Experiencia ganada270XP acumulados de todos tus intentos/);
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

test('progress keeps results without badges, repeated curriculum or lesson listings', async () => {
    const { tree } = await screen();
    assert.ok(content(tree).includes('Mejor nota90%'));
    assert.equal(content(tree).includes('Primer logro'), false);
    assert.equal(content(tree).includes('Insignias conseguidas'), false);
    assert.equal(content(tree).includes('Primeras palabras'), false);
    assert.equal(nodes(tree).some(node => node.props.id === 'progress-performance-title'), false);
    assert.equal(nodes(tree).some(node => node.type === 'Link' && /^\/aprender\/(nivel|unidad)\//.test(node.props.href)), false);
});

test('new students see zero progress and useful empty states without invalid percentages', async () => {
    const { tree } = await screen({ summaries: [], rewards: { xp: 0, mastered_topics: [], completed_units: [], medals: [], lessons: [] } });
    assert.ok(content(tree).includes('Práctica completada0%'));
    assert.equal(content(tree).includes('NaN'), false);
    assert.ok(nodes(tree).some(node => node.type === 'EmptyState' && node.props.action.props.href === '/aprender'));
    assert.equal(content(tree).includes('insignias'), false);
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

const finalReport = {
    summary:{completed_activities:30,total_activities:40,percentage:75,completed_units:5,total_units:7,completed_modules:1,total_modules:2,passed_finals:1,total_finals:1},
    next_step:{kind:'unit',id:10,title:'Animales',level_id:1},
    levels:[{id:1,title:'Básico',percentage:75,completed:false,modules:[{id:8,level_id:1,title:'Primeros contactos',completed:true,completed_activities:30,total_activities:30,percentage:100,completed_units:5,total_units:5,
        units:[{id:4,module_id:8,title:'Conociendo el kichwa',completed:true,completed_activities:6,total_activities:6,percentage:100}],
        final_evaluation:{id:9,title:'Prueba final del módulo 1',passed:true,unlocked:true,best_score:80,latest_score:73.33,attempt_count:2,pass_percentage:80,in_progress:false}},
        {id:9,level_id:1,title:'Mundo que nos rodea',completed:false,completed_activities:0,total_activities:10,percentage:0,completed_units:0,total_units:2,units:[{id:10,title:'Animales',completed:false,completed_activities:0,total_activities:10,percentage:0},{id:11,title:'Próxima unidad',completed:false,completed_activities:0,total_activities:0,percentage:0}],final_evaluation:null}]}],
};
test('guided achievements show completed units and passed finals even with no legacy mastered lessons', async()=>{
    const {tree}=await screen({component:'dashboard',rewards:{...mastery,mastered_topics:[],completed_units:[4,5,6,7,8],learning_report:finalReport}});
    const counts=nodes(tree).find(node=>node.props.className==='achievement-counts');
    assert.match(content(counts),/Unidades completadas5 \/ 7/);
    assert.match(content(counts),/Módulos completados1 \/ 2/);
    assert.match(content(counts),/Pruebas finales aprobadas1 \/ 1/);
    assert.equal(content(tree).includes('lecciones dominadas'),false);
    assert.ok(nodes(tree).some(node=>node.type==='Link'&&node.props.href==='/aprender/unidad/10'));
});
test('progress shows each final once while admin retains the curriculum detail', async()=>{
    for(const component of ['progress','admin']) {
        const {tree}=await screen({component,rewards:{...mastery,learning_report:finalReport}});
        for(const label of ['Prueba final del módulo 1','Aprobada','80%','73.33%']) assert.ok(content(tree).includes(label),`${component}: ${label}`);
        if(component==='admin') for(const label of ['Conociendo el kichwa','2 intentos finalizados','En preparación']) assert.ok(content(tree).includes(label));
        else {
            assert.equal(content(tree).includes('Conociendo el kichwa'),false);
            assert.equal(content(tree).includes('Insignias conseguidas'),false);
            assert.equal(content(tree).includes('Cada nuevo intento puede sumar experiencia'),false);
            assert.equal(nodes(tree).filter(node=>node.type==='h3'&&content(node)==='Prueba final del módulo 1').length,1);
            assert.ok(content(tree).includes('Intentos finalizados2'));
        }
        assert.equal(content(tree).includes('Evaluación #'),false);
        const unitLinks=nodes(tree).filter(node=>node.type==='Link'&&node.props.href==='/aprender/unidad/4');
        assert.equal(unitLinks.length,0);
    }
});
test('the next action opens an available final and completed content does not suggest restarting it',async()=>{
    const pending=await screen({component:'dashboard',rewards:{...mastery,learning_report:{...finalReport,next_step:{kind:'module_final',id:9,title:'Prueba final',level_id:1}}}});
    assert.ok(nodes(pending.tree).some(node=>node.type==='Link'&&node.props.href==='/aprender/evaluacion/9'));
    const done=await screen({component:'dashboard',rewards:{...mastery,learning_report:{...finalReport,next_step:null}}});
    assert.ok(content(done.tree).includes('Has completado todo el contenido disponible'));
});
test('locked and unfinished finals communicate their state without inventing a score',async()=>{
    const report=structuredClone(finalReport);
    const final=report.levels[0].modules[0].final_evaluation;
    Object.assign(final,{passed:false,unlocked:false,best_score:null,latest_score:null,attempt_count:0});
    const locked=await screen({rewards:{...mastery,learning_report:report}});
    assert.ok(content(locked.tree).includes('Sin realizar'));assert.ok(content(locked.tree).includes('Sin resultado'));
    assert.equal(nodes(locked.tree).some(node=>node.type==='Link'&&node.props.href==='/aprender/evaluacion/9'),false);
    Object.assign(final,{unlocked:true,in_progress:true});
    const active=await screen({rewards:{...mastery,learning_report:report}});
    assert.ok(content(active.tree).includes('Intento en curso'));
    assert.ok(content(active.tree).includes('Intentos finalizados0'));
});
