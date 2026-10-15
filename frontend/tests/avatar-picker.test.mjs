import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const compile = async path => (await transformWithOxc(await readFile(new URL('../src/js/' + path, import.meta.url), 'utf8'), path)).code;
const pickerCode = await compile('components/AvatarPicker.tsx');
const avatarCode = await compile('components/UserAvatar.tsx');
const accountCode = await compile('pages/Account/Index.tsx');
const jsx = (type, props) => ({ type, props });
function nodes(tree) { if (Array.isArray(tree)) return tree.flatMap(nodes); return tree?.props ? [tree, ...nodes(tree.props.children)] : []; }
function content(tree) { if (Array.isArray(tree)) return tree.map(content).join(''); return tree?.props ? content(tree.props.children) : typeof tree === 'string' ? tree : ''; }

async function screen({ post, role = 'student', avatar = null } = {}) {
    let cursor = 0, refreshes = 0, saved = avatar;
    const states = [], requests = [];
    const user = { id: 1, name: 'Ana', avatar, role, email: 'ana@example.test', email_verified: true };
    class ApiError extends Error { constructor(message, errors = {}) { super(message); this.errors = errors; } }
    const context = vm.createContext({ FormData, window: { location: { search: '' } }, URLSearchParams });
    const dependencies = {
        react: { useState: initial => { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = value; }]; }, useRef: initial => { const index = cursor++; return states[index] ??= { current: initial }; }, useEffect() {} },
        'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
        'lucide-react': Object.fromEntries(['Camera', 'LoaderCircle', 'Upload', 'X', 'Flower2', 'MoonStar', 'Sun', 'CheckCircle2', 'KeyRound', 'Mail', 'ShieldCheck', 'UserRound'].map(name => [name, name])),
        AuthContext: { useAuth: () => ({ user, refreshUser: async () => { refreshes++; user.avatar = saved; } }) },
        api: { apiBaseUrl: 'https://campus.test', ApiError, apiPost: async (path, payload) => { requests.push({ path, payload }); if (post) await post({ payload, ApiError }); saved = payload instanceof FormData ? 'avatars/' + 'a'.repeat(40) + '.webp' : payload.preset === 'initial' ? null : payload.preset; return { avatar: saved }; } },
        navigation: { Head: 'Head' }, AppLayout: { AppLayout: 'AppLayout' }, PasswordChange: { PasswordChange: 'PasswordChange' },
    };
    const cache = new Map();
    const avatarModule = new vm.SourceTextModule(avatarCode, { context });
    const pickerModule = new vm.SourceTextModule(pickerCode, { context });
    async function link(specifier) {
        if (specifier.endsWith('/UserAvatar')) return avatarModule;
        if (specifier.endsWith('/AvatarPicker')) return pickerModule;
        if (!cache.has(specifier)) {
            const exports = specifier.endsWith('.webp') ? { default: specifier } : specifier.endsWith('.css') ? {} : dependencies[specifier] ?? dependencies[specifier.split('/').at(-1)];
            assert.ok(exports, specifier);
            cache.set(specifier, new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context }));
        }
        return cache.get(specifier);
    }
    await avatarModule.link(link); await avatarModule.evaluate();
    await pickerModule.link(link); await pickerModule.evaluate();
    const accountModule = new vm.SourceTextModule(accountCode, { context });
    await accountModule.link(link); await accountModule.evaluate();
    return { requests, user, refreshes: () => refreshes, render: () => { cursor = 0; return pickerModule.namespace.AvatarPicker(); }, account: () => { cursor = 0; return accountModule.namespace.default(); }, avatar: props => avatarModule.namespace.UserAvatar(props) };
}
const button = (view, label) => nodes(view.render()).find(node => node.type === 'button' && node.props['aria-label'] === label);
const settle = () => new Promise(resolve => setImmediate(resolve));
const open = view => button(view, 'Cambiar avatar').props.onClick();
function upload(view, file) { const target = { files: file ? [file] : [], value: 'selected' }; nodes(view.render()).find(node => node.type === 'input').props.onChange({ target }); return target; }

test('student account omits the three shortcut buttons and retains its account sections and avatar picker', async () => {
    const view = await screen();
    const tree = view.account();
    assert.equal(nodes(tree).some(node => node.type === 'nav'), false);
    assert.ok(nodes(tree).some(node => node.props.id === 'account-details'));
    assert.ok(nodes(tree).some(node => node.props.id === 'account-access'));
    assert.ok(nodes(tree).some(node => node.type === 'PasswordChange'));
    assert.ok(nodes(tree).some(node => typeof node.type === 'function' && node.type.name === 'AvatarPicker'));
    const admin = await screen({ role: 'admin' });
    assert.ok(nodes(admin.account()).some(node => node.type === 'nav'));
});

test('clicking the profile avatar opens six choices and choosing Cometa saves and refreshes the global user', async () => {
    const view = await screen();
    assert.equal(button(view, 'Cambiar avatar').props['aria-expanded'], false);
    open(view);
    assert.equal(button(view, 'Cambiar avatar').props['aria-expanded'], true);
    assert.equal(nodes(view.render()).filter(node => node.type === 'button' && 'aria-pressed' in node.props).length, 6);
    button(view, 'Cometa').props.onClick(); await settle();
    assert.equal(view.requests[0].path, '/auth/avatar');
    assert.equal(view.requests[0].payload.preset, 'cometa');
    assert.equal(view.user.avatar, 'cometa');
    assert.equal(view.refreshes(), 1);
    assert.equal(button(view, 'Cambiar avatar').props['aria-expanded'], false);
    assert.match(content(view.render()), /Avatar actualizado/);
});

test('upload submits a multipart image and resets the input so the same file can be chosen again', async () => {
    const view = await screen(); open(view);
    const file = new File(['image bytes'], 'foto.png', { type: 'image/png' });
    const target = upload(view, file); await settle();
    assert.equal(target.value, '');
    assert.ok(view.requests[0].payload instanceof FormData);
    assert.equal(view.requests[0].payload.get('image').name, 'foto.png');
    assert.match(view.user.avatar, /^avatars\//);
});

test('invalid uploads are explained without sending a request and canceling does nothing', async () => {
    const view = await screen(); open(view);
    upload(view, new File(['<svg/>'], 'foto.svg', { type: 'image/svg+xml' }));
    assert.ok(nodes(view.render()).some(node => node.props.role === 'alert'));
    upload(view, new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'foto.png', { type: 'image/png' }));
    assert.match(content(view.render()), /2 MB/);
    upload(view, null);
    assert.equal(view.requests.length, 0);
});

test('failed save stays open and duplicate clicks cannot send another upload while saving', async () => {
    let reject;
    const view = await screen({ post: ({ ApiError }) => new Promise((_, fail) => { reject = () => fail(new ApiError('No disponible')); }) });
    open(view); button(view, 'Cometa').props.onClick(); button(view, 'Luna').props.onClick();
    assert.equal(view.requests.length, 1);
    assert.equal(button(view, 'Luna').props.disabled, true);
    reject(); await settle();
    assert.equal(view.refreshes(), 0);
    assert.equal(button(view, 'Cambiar avatar').props['aria-expanded'], true);
    assert.match(content(view.render()), /No disponible/);
    assert.equal(button(view, 'Luna').props.disabled, false);
});

test('shared avatar renderer supports preset pictures, icons, uploads and safe initial fallback', async () => {
    const view = await screen();
    assert.ok(nodes(view.avatar({ avatar: 'cometa' })).some(node => node.type === 'img' && node.props.src.endsWith('.webp')));
    assert.ok(nodes(view.avatar({ avatar: 'sol' })).some(node => node.type === 'Sun'));
    const path = 'avatars/' + 'b'.repeat(40) + '.webp';
    assert.equal(nodes(view.avatar({ avatar: path })).find(node => node.type === 'img').props.src, 'https://campus.test/api/' + path);
    const fallback = view.avatar({ avatar: 'https://untrusted.test/image.svg', name: 'Ana' });
    assert.equal(nodes(fallback).some(node => node.type === 'img'), false);
    assert.equal(content(fallback), 'A');
});
