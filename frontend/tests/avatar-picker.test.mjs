import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const compile = async path => (await transformWithOxc(await readFile(new URL('../src/js/' + path, import.meta.url), 'utf8'), path)).code;
const pickerCode = await compile('components/AvatarPicker.tsx');
const avatarCode = await compile('components/UserAvatar.tsx');
const presets = JSON.parse(await readFile(new URL('../../backend/resources/avatar-presets.json', import.meta.url), 'utf8'));
const accountCode = await compile('pages/Account/Index.tsx');
const jsx = (type, props) => ({ type, props });
function nodes(tree) { if (Array.isArray(tree)) return tree.flatMap(nodes); return tree?.props ? [tree, ...nodes(tree.props.children)] : []; }
function content(tree) { if (Array.isArray(tree)) return tree.map(content).join(''); return tree?.props ? content(tree.props.children) : typeof tree === 'string' ? tree : ''; }

async function screen({ post, role = 'student', avatar = null } = {}) {
    let cursor = 0, refreshes = 0, saved = avatar;
    const states = [], requests = [];
    const user = { id: 1, name: 'Ana', avatar, role, email: 'ana@example.test', email_verified: true };
    class ApiError extends Error { constructor(message, errors = {}) { super(message); this.errors = errors; } }
    const context = vm.createContext({ window: { location: { search: '' } }, URLSearchParams });
    const dependencies = {
        react: { useState: initial => { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = value; }]; }, useRef: initial => { const index = cursor++; return states[index] ??= { current: initial }; }, useEffect() {} },
        'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
        'lucide-react': Object.fromEntries(['Palette', 'LoaderCircle', 'X', 'CheckCircle2', 'KeyRound', 'Mail', 'ShieldCheck', 'UserRound'].map(name => [name, name])),
        AuthContext: { useAuth: () => ({ user, refreshUser: async () => { refreshes++; user.avatar = saved; } }) },
        api: { apiBaseUrl: 'https://campus.test', ApiError, apiPost: async (path, payload) => { requests.push({ path, payload }); if (post) await post({ payload, ApiError }); saved = payload.preset === 'initial' ? null : payload.preset; return { avatar: saved }; } },
        AvatarIllustration: { AvatarIllustration: 'AvatarIllustration' },
        navigation: { Head: 'Head' }, AppLayout: { AppLayout: 'AppLayout' }, PasswordChange: { PasswordChange: 'PasswordChange' },
    };
    const cache = new Map();
    const avatarModule = new vm.SourceTextModule(avatarCode, { context });
    const pickerModule = new vm.SourceTextModule(pickerCode, { context });
    async function link(specifier) {
        if (specifier.endsWith('/UserAvatar')) return avatarModule;
        if (specifier.endsWith('/AvatarPicker')) return pickerModule;
        if (!cache.has(specifier)) {
            const exports = specifier.endsWith('.json') ? { default: presets } : specifier.endsWith('.css') ? {} : dependencies[specifier] ?? dependencies[specifier.split('/').at(-1)];
            assert.ok(exports, specifier);
            cache.set(specifier, new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context }));
        }
        return cache.get(specifier);
    }
    await avatarModule.link(link); await avatarModule.evaluate();
    await pickerModule.link(link); await pickerModule.evaluate();
    const accountModule = new vm.SourceTextModule(accountCode, { context });
    await accountModule.link(link); await accountModule.evaluate();
    return { requests, user, refreshes: () => refreshes, render: () => { cursor = 0; return pickerModule.namespace.AvatarPicker(); }, account: () => { cursor = 0; return accountModule.namespace.default(); }, avatar: props => { cursor = 0; return avatarModule.namespace.UserAvatar(props); } };
}
const button = (view, label) => nodes(view.render()).find(node => node.type === 'button' && node.props['aria-label'] === label);
const settle = () => new Promise(resolve => setImmediate(resolve));
const open = view => button(view, 'Cambiar avatar').props.onClick();

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
    assert.equal(nodes(admin.account()).some(node => typeof node.type === 'function' && node.type.name === 'AvatarPicker'), false);
    assert.ok(nodes(admin.account()).some(node => typeof node.type === 'function' && node.type.name === 'UserAvatar'));
    assert.equal(admin.render(), null);
    assert.equal(admin.requests.length, 0);
});


test('the selector offers twelve illustrations ending with a woman and a man, without file uploads', async () => {
    const view = await screen(); open(view);
    const choices = nodes(view.render()).filter(node => node.type === 'button' && 'aria-pressed' in node.props);
    assert.equal(choices.length, 12);
    assert.deepEqual(choices.slice(-2).map(node => node.props['aria-label']), ['Mujer', 'Hombre']);
    assert.deepEqual(choices.map(node => node.props['aria-label']), presets.map(item => item.label));
    assert.equal(nodes(view.render()).some(node => node.type === 'input'), false);
    assert.doesNotMatch(content(view.render()), /computadora|JPG|PNG|WebP|Subir/);
    for (const preset of presets) {
        const avatar = nodes(view.avatar({ avatar: preset.id })).find(node => node.type === 'AvatarIllustration');
        assert.equal(avatar.props.id, preset.id);
        assert.equal(avatar.props.background, preset.background);
    }
});

test('all twelve avatars save their own preset and refresh the shared profile', async () => {
    for (const preset of presets) {
        const view = await screen(); open(view);
        button(view, preset.label).props.onClick(); await settle();
        assert.equal(view.requests[0].path, '/auth/avatar');
        assert.equal(view.requests[0].payload.preset, preset.id);
        assert.equal(view.user.avatar, preset.id);
        assert.equal(view.refreshes(), 1);
        assert.equal(button(view, 'Cambiar avatar').props['aria-expanded'], false);
        assert.match(content(view.render()), /Avatar actualizado/);
        open(view);
        assert.equal(nodes(view.render()).filter(node => node.type === 'button' && node.props['aria-pressed']).length, 1);
        assert.equal(button(view, preset.label).props['aria-pressed'], true);
    }
});

test('using the initial clears an animal and refreshes the account', async () => {
    const view = await screen({ avatar: 'condor' }); open(view);
    nodes(view.render()).find(node => node.type === 'button' && content(node) === 'Usar mi inicial').props.onClick(); await settle();
    assert.equal(view.requests[0].payload.preset, 'initial');
    assert.equal(view.user.avatar, null);
    assert.equal(content(view.avatar({ avatar: view.user.avatar, name: 'Ana' })), 'A');
});

test('failed saves stay open and duplicate clicks cannot send another selection while saving', async () => {
    let reject;
    const view = await screen({ post: ({ ApiError }) => new Promise((_, fail) => { reject = () => fail(new ApiError('No disponible')); }) });
    open(view); button(view, presets[0].label).props.onClick(); button(view, presets[1].label).props.onClick();
    assert.equal(view.requests.length, 1);
    assert.equal(button(view, presets[1].label).props.disabled, true);
    reject(); await settle();
    assert.equal(view.refreshes(), 0);
    assert.equal(button(view, 'Cambiar avatar').props['aria-expanded'], true);
    assert.match(content(view.render()), /No disponible/);
    assert.equal(button(view, presets[1].label).props.disabled, false);
});

test('previous presets use new illustrations and old uploads or unknown paths fall back to initials', async () => {
    const view = await screen({ avatar: 'cometa-guia' }); open(view);
    assert.equal(button(view, presets[0].label).props['aria-pressed'], true);
    const aliases = { cometa: 'llama', 'cometa-guia': 'condor', 'cometa-animo': 'colibri', sol: 'jaguar', luna: 'oso', flor: 'mariposa' };
    for (const [avatar, id] of Object.entries(aliases)) {
        assert.equal(nodes(view.avatar({ avatar })).find(node => node.type === 'AvatarIllustration').props.id, id);
    }
    for (const avatar of [null, 'avatars/' + 'a'.repeat(40) + '.webp', 'https://untrusted.test/image.svg', 'unknown']) {
        const tree = view.avatar({ avatar, name: 'Ana' });
        assert.equal(content(tree), 'A');
        assert.equal(nodes(tree).some(node => node.type === 'img'), false);
    }
});
