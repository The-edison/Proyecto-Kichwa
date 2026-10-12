import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const css = fs.readFileSync(new URL('../src/css/app.css', import.meta.url), 'utf8');
const readTokens = selector => Object.fromEntries([...css.match(new RegExp(selector + ' \\{([^}]+)\\}'))[1].matchAll(/(--[\w-]+):\s*(#[\da-fA-F]{6});/g)].map(match => [match[1], match[2]]));
const themes = { light: readTokens(':root'), dark: readTokens("\\[data-theme='dark'\\]") };
function luminance(hex) {
    const values = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
}
function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
for (const [theme, tokens] of Object.entries(themes)) {
    test(`${theme}: text, semantic messages and controls meet WCAG AA contrast`, () => {
        const pairs = [];
        for (const surface of ['bg', 'surface', 'elevated', 'soft']) for (const text of ['text', 'text-secondary', 'primary', 'secondary']) pairs.push([text, surface, 4.5]);
        for (const semantic of ['success', 'error', 'warning', 'info']) pairs.push([semantic, `${semantic}-bg`, 4.5]);
        pairs.push(['on-primary', 'primary-button', 4.5], ['on-primary', 'primary-hover', 4.5], ['accent-text', 'accent', 4.5], ['sidebar-muted', 'sidebar', 4.5], ['sidebar-text', 'sidebar-hover', 4.5]);
        for (const surface of ['bg', 'surface', 'elevated']) pairs.push(['control-border', surface, 3]);
        for (const [foreground, background, minimum] of pairs) {
            const ratio = contrast(tokens[`--color-${foreground}`], tokens[`--color-${background}`]);
            assert.ok(ratio >= minimum, `${foreground}/${background}: ${ratio.toFixed(2)} < ${minimum}`);
        }
    });
}
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)[1];
for (const [name, saved, systemDark, expected] of [
    ['first dark visit', null, true, 'dark'],
    ['first light visit', null, false, 'light'],
    ['saved light overrides system', 'light', true, 'light'],
    ['saved dark overrides system', 'dark', false, 'dark'],
    ['invalid stored theme falls back to system', 'invalid', true, 'dark'],
    ['blocked storage falls back to system', 'throw', true, 'dark'],
]) test(name, () => {
    const document = { documentElement: { dataset: {} } };
    vm.runInNewContext(bootstrap, { document, location: { pathname: '/' }, localStorage: { getItem: () => { if (saved === 'throw') throw new Error('blocked'); return saved; } }, matchMedia: () => ({ matches: systemDark }) });
    assert.equal(document.documentElement.dataset.theme, expected);
});

for (const [route, accountScope, expected] of [
    ['/admin', null, 'dark'], ['/admin/estudiantes', null, 'dark'],
    ['/aprender', null, 'light'], ['/aprender/unidad/1', null, 'light'],
    ['/cuenta', 'admin', 'dark'], ['/cuenta', 'student', 'light'],
    ['/cuenta', 'invalid', 'light'], ['/', 'admin', 'light'],
]) test(`theme before rendering: ${route}, account ${accountScope}`, () => {
    const document = { documentElement: { dataset: {} } };
    const saved = { 'yachay-theme': 'light', 'yachay-theme:admin': 'dark', 'yachay-theme:student': 'light' };
    vm.runInNewContext(bootstrap, { document, location: { pathname: route }, localStorage: { getItem: key => saved[key] }, sessionStorage: { getItem: () => accountScope }, matchMedia: () => ({ matches: false }) });
    assert.equal(document.documentElement.dataset.theme, expected);
});

const { code: toggleCode } = await transformWithOxc(fs.readFileSync(new URL('../src/js/components/ThemeToggle.tsx', import.meta.url), 'utf8'), 'ThemeToggle.tsx');
async function themeTab(saved, initialScope, systemDark = false, blocked = false) {
    let hook = 0, scope = initialScope;
    const states = [], effects = [], listeners = new Map(), systemListeners = new Set(), tabStorage = new Map();
    const document = { documentElement: { dataset: { theme: 'light' } } };
    const media = { matches: systemDark, addEventListener: (_, cb) => systemListeners.add(cb), removeEventListener: (_, cb) => systemListeners.delete(cb) };
    const context = vm.createContext({ document,
        localStorage: { getItem: key => { if (blocked) throw Error('blocked'); return saved.get(key) ?? null; }, setItem: (key, value) => { if (blocked) throw Error('blocked'); saved.set(key, value); } },
        sessionStorage: { setItem: (key, value) => tabStorage.set(key, value) },
        window: { matchMedia: () => media, addEventListener: (event, cb) => { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(cb); }, removeEventListener: (event, cb) => listeners.get(event)?.delete(cb) },
    });
    const jsx = (type, props) => ({ type, props });
    const module = new vm.SourceTextModule(toggleCode, { context });
    await module.link(specifier => {
        const dependency = specifier === 'react' ? {
            useState: initial => { const index = hook++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], value => { states[index] = value; }]; },
            useLayoutEffect: (callback, deps) => { const index = hook++; const previous = effects[index]; if (!previous || deps.some((value, position) => value !== previous.deps[position])) { previous?.cleanup?.(); effects[index] = { deps, cleanup: callback() }; } },
        } : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : { Moon: () => null, Sun: () => null };
        return new vm.SyntheticModule(Object.keys(dependency), function () { for (const [key, value] of Object.entries(dependency)) this.setExport(key, value); }, { context });
    });
    await module.evaluate();
    const render = () => { hook = 0; return module.namespace.ThemeToggle({ scope }); };
    render();
    return { document, tabStorage, button: render, switchScope: next => { scope = next; render(); }, storage: key => listeners.get('storage')?.forEach(cb => cb({ key })), system: dark => { media.matches = dark; systemListeners.forEach(cb => cb()); } };
}

test('admin and student toggles persist independently and ignore other-role storage events', async () => {
    const saved = new Map([['yachay-theme', 'dark']]);
    const admin = await themeTab(saved, 'admin'), student = await themeTab(saved, 'student');
    assert.equal(admin.document.documentElement.dataset.theme, 'light');
    assert.equal(student.document.documentElement.dataset.theme, 'light');
    admin.button().props.onClick(); student.storage('yachay-theme:admin');
    assert.equal(saved.get('yachay-theme:admin'), 'dark');
    assert.equal(student.document.documentElement.dataset.theme, 'light');
    student.button().props.onClick(); admin.storage('yachay-theme:student');
    student.button().props.onClick(); admin.storage('yachay-theme:student');
    assert.equal(saved.get('yachay-theme:student'), 'light');
    assert.equal(admin.document.documentElement.dataset.theme, 'dark');
    assert.equal(saved.get('yachay-theme'), 'dark');
    assert.equal(admin.tabStorage.get('yachay-theme-scope'), 'admin');
    assert.equal(student.tabStorage.get('yachay-theme-scope'), 'student');
    assert.equal(admin.button().props['aria-pressed'], true);
    assert.equal((await themeTab(saved, 'admin')).document.documentElement.dataset.theme, 'dark');
    assert.equal((await themeTab(saved, 'student')).document.documentElement.dataset.theme, 'light');
});

test('same-role tabs synchronize while route and account role changes reload the correct preference', async () => {
    const saved = new Map([['yachay-theme:admin', 'dark'], ['yachay-theme:student', 'light'], ['yachay-theme', 'light']]);
    const first = await themeTab(saved, 'admin'), second = await themeTab(saved, 'admin');
    first.button().props.onClick(); second.storage('yachay-theme:admin');
    assert.equal(second.document.documentElement.dataset.theme, 'light');
    first.button().props.onClick(); first.switchScope('student');
    assert.equal(first.document.documentElement.dataset.theme, 'light');
    first.switchScope('admin');
    assert.equal(first.document.documentElement.dataset.theme, 'dark');
    first.switchScope('public');
    assert.equal(first.document.documentElement.dataset.theme, 'light');
    first.storage('yachay-theme:admin');
    assert.equal(first.document.documentElement.dataset.theme, 'light');
});

test('system preference is per role until chosen, and blocked storage keeps toggles usable', async () => {
    const saved = new Map();
    const admin = await themeTab(saved, 'admin', true), student = await themeTab(saved, 'student', true);
    admin.button().props.onClick();
    admin.system(false); student.system(false);
    admin.system(true); student.system(true);
    assert.equal(admin.document.documentElement.dataset.theme, 'light');
    assert.equal(student.document.documentElement.dataset.theme, 'dark');
    const blocked = await themeTab(saved, 'admin', false, true);
    blocked.button().props.onClick();
    assert.equal(blocked.document.documentElement.dataset.theme, 'dark');
});
