import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/components/StudentOpinionForm.tsx', import.meta.url), 'utf8'), 'StudentOpinionForm.tsx');

async function screen({ testimonial = null, loading = false, error = null, post } = {}) {
    let hook = 0;
    const states = [], effects = [], pendingEffects = [], requests = [];
    const context = vm.createContext({});
    const jsx = (type, props) => ({ type, props });
    class ApiError extends Error { constructor(message, errors = {}) { super(message); this.errors = errors; } }
    const module = new vm.SourceTextModule(code, { context });
    await module.link(specifier => {
        const dependency = specifier === 'react' ? {
            useId: () => 'student-opinion',
            useState: initial => { const index = hook++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = value; }]; },
            useRef: initial => { const index = hook++; return states[index] ??= { current: initial }; },
            useEffect: (callback, deps) => { const index = hook++; if (!effects[index] || deps.some((value, position) => value !== effects[index][position])) { effects[index] = deps; pendingEffects.push(callback); } },
        } : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' }
            : specifier === 'lucide-react' ? { ArrowRight: 'ArrowRight', CheckCircle2: 'CheckCircle2', Send: 'Send' }
            : specifier.endsWith('/navigation') ? { Link: 'Link' }
            : specifier.endsWith('/useApi') ? { useApi: () => ({ loading, error, data: { can_comment: true, has_commented: Boolean(testimonial), testimonial } }) }
            : { ApiError, apiPost: async (path, payload) => { requests.push({ path, body: payload.body }); return post ? post(ApiError) : { body: payload.body }; } };
        return new vm.SyntheticModule(Object.keys(dependency), function () { for (const [key, value] of Object.entries(dependency)) this.setExport(key, value); }, { context });
    });
    await module.evaluate();
    const render = () => { hook = 0; const tree = module.namespace.StudentOpinionForm(); pendingEffects.splice(0).forEach(callback => callback()); return tree; };
    render();
    return { render, requests };
}

function nodes(tree) {
    if (Array.isArray(tree)) return tree.flatMap(nodes);
    if (!tree || typeof tree !== 'object' || !tree.props) return [];
    return [tree, ...nodes(tree.props.children)];
}
const find = (tree, type) => nodes(tree).find(node => node.type === type);
const submit = tree => find(tree, 'form').props.onSubmit({ preventDefault() {} });

test('the form loads the existing opinion and publishes trimmed text', async () => {
    const view = await screen({ testimonial: { body: 'Mi experiencia anterior con Yachay.' } });
    assert.equal(find(view.render(), 'textarea').props.value, 'Mi experiencia anterior con Yachay.');
    find(view.render(), 'textarea').props.onChange({ target: { value: '  Mi nueva experiencia con la plataforma.  ' } });
    await submit(view.render());
    assert.deepEqual(view.requests, [{ path: '/testimonials', body: 'Mi nueva experiencia con la plataforma.' }]);
    assert.ok(nodes(view.render()).some(node => node.props.role === 'status'));
});

test('invalid short opinions do not reach the server', async () => {
    const view = await screen();
    find(view.render(), 'textarea').props.onChange({ target: { value: 'Muy corto' } });
    await submit(view.render());
    assert.equal(view.requests.length, 0);
    assert.ok(nodes(view.render()).some(node => node.props.role === 'alert'));
});

test('server errors keep the draft and display the validation message', async () => {
    const view = await screen({ post: ApiError => { throw new ApiError('No válido', { body: ['La opinión no es válida.'] }); } });
    find(view.render(), 'textarea').props.onChange({ target: { value: 'Mi experiencia que quiero conservar.' } });
    await submit(view.render());
    const tree = view.render();
    assert.equal(find(tree, 'textarea').props.value, 'Mi experiencia que quiero conservar.');
    assert.equal(nodes(tree).find(node => node.props.role === 'alert').props.children, 'La opinión no es válida.');
    assert.equal(find(tree, 'button').props.disabled, false);
});

test('repeated submission while saving sends only one request', async () => {
    let finish;
    const view = await screen({ post: () => new Promise(resolve => { finish = resolve; }) });
    find(view.render(), 'textarea').props.onChange({ target: { value: 'Una experiencia de aprendizaje con Yachay.' } });
    const pending = submit(view.render());
    assert.equal(find(view.render(), 'textarea').props.disabled, true);
    await submit(view.render());
    assert.equal(view.requests.length, 1);
    finish({});
    await pending;
    assert.equal(find(view.render(), 'textarea').props.disabled, false);
});

test('loading and eligibility failures do not expose a publishable form', async () => {
    const loading = await screen({ loading: true });
    assert.equal(find(loading.render(), 'form'), undefined);
    const failed = await screen({ error: 'No se pudo cargar tu opinión.' });
    assert.equal(find(failed.render(), 'form'), undefined);
    assert.ok(nodes(failed.render()).some(node => node.props.role === 'alert'));
});

async function dashboard(role) {
    const source = await readFile(new URL('../src/js/layouts/AppLayout.tsx', import.meta.url), 'utf8');
    const { code } = await transformWithOxc(source, 'AppLayout.tsx');
    const context = vm.createContext({});
    const jsx = (type, props) => ({ type, props });
    const module = new vm.SourceTextModule(code, { context });
    await module.link(specifier => {
        const dependency = specifier === 'react' ? { useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}], useEffect: () => {}, useRef: () => ({ current: null }) }
            : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx }
            : specifier === 'react-router-dom' ? { useLocation: () => ({ pathname: role === 'admin' ? '/admin' : '/aprender' }), useNavigate: () => () => {} }
            : specifier === 'lucide-react' ? Object.fromEntries(['BookOpen', 'ChartNoAxesCombined', 'ChevronLeft', 'ChevronRight', 'House', 'Languages', 'LayoutDashboard', 'LogOut', 'Menu', 'UserRound', 'Users', 'X', 'Search'].map(name => [name, name]))
            : specifier.endsWith('/useAuth') || specifier.endsWith('/AuthContext') ? { useAuth: () => ({ user: { role, name: 'Ana' }, logout: () => {} }) }
            : Object.fromEntries(['Link', 'Brand', 'ThemeToggle', 'ProfileMenu', 'UserAvatar', 'StudentOpinionMenu'].map(name => [name, name]));
        return new vm.SyntheticModule(Object.keys(dependency), function () { for (const [key, value] of Object.entries(dependency)) this.setExport(key, value); }, { context });
    });
    await module.evaluate();
    const wrapper = module.namespace.AppLayout({ title: 'Panel', children: null });
    return wrapper.type(wrapper.props);
}

test('the dashboard shows the opinion menu only to students and removes notifications for both roles', async () => {
    const student = nodes(await dashboard('student'));
    const admin = nodes(await dashboard('admin'));
    assert.ok(student.some(node => node.type === 'StudentOpinionMenu'));
    assert.equal(admin.some(node => node.type === 'StudentOpinionMenu'), false);
    assert.equal([...student, ...admin].some(node => node.props['aria-label'] === 'Notificaciones'), false);
});
