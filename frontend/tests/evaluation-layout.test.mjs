import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/layouts/AppLayout.tsx', import.meta.url), 'utf8'), 'AppLayout.tsx');
const jsx = (type, props) => typeof type === 'function' ? type(props) : { type, props };
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : tree?.props ? [tree, ...nodes(tree.props.children)] : [];
const dependencies = {
    react: { useEffect() {}, useRef: () => ({ current: null }), useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}] },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    'react-router-dom': { useLocation: () => ({ pathname: '/aprender/evaluacion/9' }), useNavigate: () => () => {} },
    'lucide-react': Object.fromEntries(['BookOpen', 'ChevronLeft', 'ChevronRight', 'Languages', 'LayoutDashboard', 'LogOut', 'Menu', 'Users', 'X', 'Search'].map(name => [name, name])),
    navigation: { Link: 'Link' }, AuthContext: { useAuth: () => ({ user: { role: 'student', name: 'Estudiante' }, logout() {} }) },
    ...Object.fromEntries(['UserAvatar', 'Brand', 'ThemeToggle', 'ProfileMenu', 'StudentOpinionMenu', 'StudentLearningNav', 'StudentOverviewNav'].map(name => [name, { [name]: name }])),
};
const context = vm.createContext({});
const module = new vm.SourceTextModule(code, { context });
await module.link(specifier => {
    const dep = dependencies[specifier] ?? dependencies[specifier.split('/').at(-1)];
    assert.ok(dep, specifier);
    return new vm.SyntheticModule(Object.keys(dep), function () { for (const [key, value] of Object.entries(dep)) this.setExport(key, value); }, { context });
});
await module.evaluate();

test('focused exams render only the exam and restore the application shell outside the exam', () => {
    const exam = { type: 'article', props: { children: 'Pregunta de la prueba' } };
    const focused = nodes(module.namespace.AppLayout({ title: 'Prueba', focused: true, children: exam }));
    assert.equal(focused.some(node => node.type === 'aside' || node.type === 'header'), false);
    assert.ok(focused.some(node => node.type === 'main' && node.props.children === exam));
    const regular = nodes(module.namespace.AppLayout({ title: 'Prueba', focused: false, children: exam }));
    assert.ok(regular.some(node => node.type === 'aside'));
    assert.ok(regular.some(node => node.type === 'header'));
});
