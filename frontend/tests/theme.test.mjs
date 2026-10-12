import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

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
    vm.runInNewContext(bootstrap, { document, localStorage: { getItem: () => { if (saved === 'throw') throw new Error('blocked'); return saved; } }, matchMedia: () => ({ matches: systemDark }) });
    assert.equal(document.documentElement.dataset.theme, expected);
});
