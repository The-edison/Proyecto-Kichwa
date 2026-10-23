import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const validationCode = stripTypeScriptTypes(await readFile(new URL('../src/js/services/registration.ts', import.meta.url), 'utf8'), { mode: 'transform' });
const { code: formCode } = await transformWithOxc(await readFile(new URL('../src/js/components/RegisterForm.tsx', import.meta.url), 'utf8'), 'RegisterForm.tsx');
const valid = { first_name: 'María José', last_name: 'Yánez Ñacato', cedula: '1710034065', email: 'maria@example.test', password: 'MiClaveSegura#2026', password_confirmation: 'MiClaveSegura#2026' };

async function screen({ fail = false } = {}) {
    let hook = 0;
    const states = [], requests = [], focused = [];
    const context = vm.createContext({ TextEncoder, document: { getElementById: id => ({ focus: () => focused.push(id) }) } });
    const validation = new vm.SourceTextModule(validationCode, { context });
    await validation.link(() => {}); await validation.evaluate();
    const jsx = (type, props) => ({ type, props });
    const form = new vm.SourceTextModule(formCode, { context });
    await form.link(specifier => {
        if (specifier.endsWith('/registration')) return validation;
        const dependency = specifier === 'react' ? {
            useState: initial => { const index = hook++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
            useRef: initial => { const index = hook++; return states[index] ??= { current: initial }; },
        } : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' }
            : specifier === 'react-router-dom' ? { useSearchParams: () => [new URLSearchParams()] }
            : specifier === 'lucide-react' ? { ArrowRight: 'ArrowRight', Check: 'Check', LoaderCircle: 'LoaderCircle' }
            : specifier.endsWith('/AuthContext') ? { useAuth: () => ({ register: async payload => { requests.push(payload); if (fail) throw new Error('Sin conexión'); } }) }
            : { PrivacyNotice: 'PrivacyNotice', Link: 'Link', GoogleAuthButton: 'GoogleAuthButton', PasswordInput: 'PasswordInput', ApiError: class ApiError extends Error {} };
        return new vm.SyntheticModule(Object.keys(dependency), function () { for (const [key, value] of Object.entries(dependency)) this.setExport(key, value); }, { context });
    });
    await form.evaluate();
    return { validation: validation.namespace, requests, focused, render: () => { hook = 0; return form.namespace.RegisterForm(); } };
}
function nodes(tree) {
    if (Array.isArray(tree)) return tree.flatMap(nodes);
    if (!tree || typeof tree !== 'object' || !tree.props) return [];
    return [tree, ...nodes(tree.props.children)];
}
const field = (view, id) => nodes(view.render()).find(node => node.props.id === id);
function fill(view, values) { for (const [key, value] of Object.entries(values)) field(view, key).props.onChange({ target: { value } }); }
const submit = view => nodes(view.render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });

test('cedula validation accepts leading zeros, province 24, consular numbers and a zero verifier', async () => {
    const { validation } = await screen();
    for (const number of ['1710034065', '0100000017', '2400000002', '3050178882', '0100000090']) assert.equal(validation.cedulaError(number), undefined, number);
    for (const number of ['171003406', '17100340650', '171003406A', '0010000008', '2500000001', '3100000003', '1760000009', '1710034064']) assert.ok(validation.cedulaError(number), number);
});

test('validation accepts accented names and rejects digits, punctuation, invalid emails and weak passwords', async () => {
    const { validation } = await screen();
    assert.equal(Object.keys(validation.registrationErrors(valid)).length, 0);
    for (const [key, value] of [['first_name', 'María123'], ['last_name', 'Yánez-Ñacato'], ['first_name', ''], ['email', 'sin-correo'], ['email', 'ana@mailinator.com'], ['password', 'Aa1#'], ['password', 'a'.repeat(12)], ['password', 'Aa1#' + 'é'.repeat(35)], ['password_confirmation', 'otra']]) assert.ok(validation.registrationErrors({ ...valid, [key]: value })[key], key);
});

test('name and cedula inputs refuse invalid typing and pasting without altering existing valid text', async () => {
    const view = await screen();
    fill(view, { first_name: 'Ana', last_name: 'Ñacato', cedula: '171' });
    fill(view, { first_name: 'Ana1', last_name: '<script>', cedula: '171x' });
    assert.equal(field(view, 'first_name').props.value, 'Ana');
    assert.equal(field(view, 'last_name').props.value, 'Ñacato');
    assert.equal(field(view, 'cedula').props.value, '171');
    assert.equal(field(view, 'first_name').props['aria-invalid'], true);
});

test('registration sends separate normalized names and prevents duplicate submissions', async () => {
    const view = await screen();
    fill(view, { ...valid, first_name: ' María   José ', email: ' MARIA@EXAMPLE.TEST ' });
    await submit(view); await submit(view);
    assert.equal(view.requests.length, 1);
    assert.equal(view.requests[0].first_name, 'María José');
    assert.equal(view.requests[0].last_name, 'Yánez Ñacato');
    assert.equal(view.requests[0].email, 'maria@example.test');
    assert.equal(view.requests[0].name, undefined);
});

test('invalid cedula and mismatched confirmation prevent submission and focus the first failing field', async () => {
    const view = await screen();
    fill(view, { ...valid, cedula: '1710034064', password_confirmation: 'OtraClave#2026' });
    await submit(view);
    assert.equal(view.requests.length, 0);
    assert.equal(view.focused[0], 'cedula');
    assert.equal(field(view, 'password_confirmation').props['aria-invalid'], true);
});

test('network failures preserve input and allow retry', async () => {
    const view = await screen({ fail: true });
    fill(view, valid);
    await submit(view); await submit(view);
    assert.equal(view.requests.length, 2);
    assert.equal(field(view, 'first_name').props.value, 'María José');
    assert.equal(field(view, 'password').props.value, 'MiClaveSegura#2026');
    assert.ok(nodes(view.render()).some(node => node.props.role === 'alert'));
});
