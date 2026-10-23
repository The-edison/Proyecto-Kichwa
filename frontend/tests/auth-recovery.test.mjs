import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const validationCode = stripTypeScriptTypes(await readFile(new URL('../src/js/services/registration.ts', import.meta.url), 'utf8'), { mode: 'transform' });

async function screen(component = 'PasswordRecovery', { query = '', post, googleEnabled = true } = {}) {
    let hook = 0;
    const states = [], requests = [], destinations = [], focused = [];
    const context = vm.createContext({ TextEncoder,
        document: { getElementById: id => ({ focus: () => focused.push(id) }) },
        window: { location: { assign: url => destinations.push(url) } },
    });
    const validation = new vm.SourceTextModule(validationCode, { context });
    await validation.link(() => {}); await validation.evaluate();
    const path = component === 'PasswordRecovery' ? '../src/js/pages/Auth/PasswordRecovery.tsx' : `../src/js/components/${component}.tsx`;
    const { code } = await transformWithOxc(await readFile(new URL(path, import.meta.url), 'utf8'), component + '.tsx');
    const jsx = (type, props) => ({ type, props });
    class ApiError extends Error { constructor(message, status = 422, errors = {}) { super(message); this.status = status; this.errors = errors; } }
    const module = new vm.SourceTextModule(code, { context });
    await module.link(specifier => {
        if (specifier.endsWith('/registration')) return validation;
        const dependency = specifier === 'react' ? {
            useState: initial => { const index = hook++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
            useRef: initial => { const index = hook++; return states[index] ??= { current: initial }; }, useEffect: () => {},
        } : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' }
            : specifier === 'react-router-dom' ? { useSearchParams: () => [new URLSearchParams(query)], useNavigate: () => (...args) => destinations.push(args) }
            : specifier === 'lucide-react' ? Object.fromEntries(['ArrowLeft', 'ArrowRight', 'Check', 'CheckCircle2', 'KeyRound', 'LoaderCircle', 'Mail'].map(name => [name, name]))
            : specifier.endsWith('/AuthContext') ? { useAuth: () => ({ googleEnabled, googleLoading: false, login: async () => {} }) }
            : specifier.endsWith('/api') ? { ApiError, apiPost: async (path, payload) => { requests.push({ path, payload }); return post ? post(ApiError) : path === '/auth/google/prepare' ? { url: 'http://127.0.0.1:8000/auth/google' } : { message: 'Revisa tu correo.' }; } }
            : Object.fromEntries(['Link', 'Head', 'PublicLayout', 'PasswordInput', 'GoogleAuthButton', 'PrivacyNotice'].map(name => [name, name]));
        return new vm.SyntheticModule(Object.keys(dependency), function () { for (const [key, value] of Object.entries(dependency)) this.setExport(key, value); }, { context });
    });
    await module.evaluate();
    return { requests, destinations, focused, render: () => { hook = 0; return (module.namespace.default ?? module.namespace[component])({}); } };
}
function nodes(tree) {
    if (Array.isArray(tree)) return tree.flatMap(nodes);
    if (!tree || typeof tree !== 'object' || !tree.props) return [];
    return [tree, ...nodes(tree.props.children)];
}
const byId = (view, id) => nodes(view.render()).find(node => node.props.id === id);
const submit = view => nodes(view.render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
function fillPasswords(view, confirmation = 'NuevaClaveSegura#2026') {
    byId(view, 'recovery-password').props.onChange({ target: { value: 'NuevaClaveSegura#2026' } });
    byId(view, 'recovery-password_confirmation').props.onChange({ target: { value: confirmation } });
}

test('requesting recovery normalizes the email and shows the sent confirmation', async () => {
    const view = await screen();
    byId(view, 'recovery-email').props.onChange({ target: { value: ' ANA@EXAMPLE.TEST ' } });
    await submit(view);
    assert.equal(view.requests[0].path, '/auth/forgot-password');
    assert.equal(view.requests[0].payload.email, 'ana@example.test');
    assert.equal(view.requests[0].payload.password, undefined);
    assert.ok(nodes(view.render()).some(node => node.props.role === 'status'));
});

test('resetting a password uses the emailed token and returns to login with a success message', async () => {
    const view = await screen('PasswordRecovery', { query: 'token=secure-token&email=ana%40example.test' });
    fillPasswords(view);
    await submit(view);
    assert.equal(view.requests[0].path, '/auth/reset-password');
    assert.equal(view.requests[0].payload.token, 'secure-token');
    assert.equal(view.requests[0].payload.password_confirmation, 'NuevaClaveSegura#2026');
    assert.equal(view.destinations[0][0], '/iniciar-sesion?password_reset=1');
    assert.equal(view.destinations[0][1].replace, true);
});

test('mismatched passwords and incomplete tokens cannot be submitted', async () => {
    const view = await screen('PasswordRecovery', { query: 'token=valid&email=ana%40example.test' });
    fillPasswords(view, 'OtraClaveSegura#2026');
    await submit(view);
    assert.equal(view.requests.length, 0);
    assert.equal(view.focused[0], 'recovery-password_confirmation');
    const missing = await screen('PasswordRecovery', { query: 'token=&email=ana%40example.test' });
    fillPasswords(missing);
    await submit(missing);
    assert.equal(missing.requests.length, 0);
});

test('expired links display the server message and offer a new recovery link', async () => {
    const view = await screen('PasswordRecovery', { query: 'token=old&email=ana%40example.test', post: ApiError => { throw new ApiError('No válido', 422, { email: ['El enlace es inválido o venció. Solicita uno nuevo.'] }); } });
    fillPasswords(view);
    await submit(view);
    assert.equal(byId(view, 'recovery-email-error').props.children, 'El enlace es inválido o venció. Solicita uno nuevo.');
    assert.ok(nodes(view.render()).some(node => node.props.href === '/recuperar-contrasena?email=ana%40example.test'));
    assert.equal(byId(view, 'recovery-password').props.value, 'NuevaClaveSegura#2026');
});

test('double submission during recovery sends one request', async () => {
    let finish;
    const view = await screen('PasswordRecovery', { query: 'email=ana%40example.test', post: () => new Promise(resolve => { finish = resolve; }) });
    const pending = submit(view);
    await submit(view);
    assert.equal(view.requests.length, 1);
    finish({ message: 'Revisa tu correo.' });
    await pending;
});

test('Google prepares the tab before redirecting and prevents repeated clicks', async () => {
    const view = await screen('GoogleAuthButton');
    const click = nodes(view.render()).find(node => node.type === 'button').props.onClick;
    click(); click();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(view.requests.length, 1);
    assert.equal(view.requests[0].path, '/auth/google/prepare');
    assert.equal(view.destinations[0], 'http://127.0.0.1:8000/auth/google');
});

test('Google configuration errors are visible and leave the button ready to retry', async () => {
    const view = await screen('GoogleAuthButton', { post: ApiError => { throw new ApiError('Google no está configurado.', 503); } });
    nodes(view.render()).find(node => node.type === 'button').props.onClick();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(nodes(view.render()).find(node => node.props.role === 'alert').props.children, 'Google no está configurado.');
    assert.equal(nodes(view.render()).find(node => node.type === 'button').props.disabled, undefined);
    assert.equal(view.destinations.length, 0);
});

test('login exposes password recovery with the entered email and confirms a completed reset', async () => {
    const view = await screen('LoginForm', { query: 'password_reset=1' });
    byId(view, 'identifier').props.onChange({ target: { value: 'ana@example.test' } });
    assert.ok(nodes(view.render()).some(node => node.props.href === '/recuperar-contrasena?email=ana%40example.test'));
    assert.ok(nodes(view.render()).some(node => node.props.role === 'status'));
});
