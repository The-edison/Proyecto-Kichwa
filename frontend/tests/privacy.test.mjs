import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const sources = Object.fromEntries(await Promise.all(['layouts/PublicLayout.tsx', 'pages/PublicInfo.tsx'].map(async path => [path, (await transformWithOxc(await readFile(new URL('../src/js/' + path, import.meta.url), 'utf8'), path)).code])));
const jsx = (type, props) => ({ type, props });
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : tree?.props ? [tree, ...nodes(tree.props.children)] : [];
const text = tree => Array.isArray(tree) ? tree.map(text).join('') : tree?.props ? text(tree.props.children) : typeof tree === 'string' ? tree : '';

async function screen({ path = '/', topic = 'privacidad' } = {}) {
    const context = vm.createContext({});
    const cache = new Map();
    const stub = (name, data) => {
        if (!cache.has(name)) cache.set(name, new vm.SyntheticModule(Object.keys(data), function () { for (const [key, value] of Object.entries(data)) this.setExport(key, value); }, { context }));
        return cache.get(name);
    };
    async function compile(sourcePath) {
        const module = new vm.SourceTextModule(sources[sourcePath], { context });
        await module.link(specifier => {
            const dep = specifier === 'react' ? { useState: initial => [initial, () => {}], useEffect() {} }
                : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' }
                : specifier === 'lucide-react' ? Object.fromEntries(['Globe2', 'Menu', 'X'].map(name => [name, name]))
                : specifier === 'react-router-dom' ? { useLocation: () => ({ pathname: path, hash: '' }), useParams: () => ({ topic }) }
                : specifier.endsWith('/AuthContext') ? { useAuth: () => ({ user: null }) }
                : specifier.endsWith('/useApi') ? { useApi: () => ({ data: null }) }
                : Object.fromEntries(['Head', 'Link', 'Brand', 'ThemeToggle', 'PublicLayout', 'CookiesDisclosure'].map(name => [name, name]));
            return stub(specifier, dep);
        });
        await module.evaluate();
        return module.namespace;
    }
    const layout = await compile('layouts/PublicLayout.tsx'), info = await compile('pages/PublicInfo.tsx');
    return {
        footer() { const outer = layout.PublicLayout({ children: 'page' }); return outer.type(outer.props); },
        info: () => info.default(),
    };
}

test('the four informational footer links stay public on home, login and registration', async () => {
    for (const path of ['/', '/registro', '/iniciar-sesion']) {
        const view = await screen({ path });
        const footer = nodes(view.footer()).find(node => node.type === 'footer');
        assert.deepEqual(nodes(footer).filter(node => node.type === 'Link').map(node => node.props.href), ['/informacion/terminos', '/informacion/privacidad', '/informacion/privacidad#cookies', '/informacion/ayuda']);
        assert.doesNotMatch(text(footer), /Universidad Estatal/);
    }
});

test('existing informational pages keep their public route and use only the confirmed support contact', async () => {
    for (const topic of ['terminos', 'privacidad', 'ayuda', 'enfoque', 'accesibilidad', 'preguntas']) {
        const view = await screen({ topic });
        assert.ok(nodes(view.info()).some(node => node.props.href === 'mailto:kichwa.soporte@gmail.com'));
        assert.doesNotMatch(text(view.info()), /Edison|edison098|pendiente de completar|certificado de cumplimiento/i);
    }
});
