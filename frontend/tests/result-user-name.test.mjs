import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/components/ResultUserName.tsx', import.meta.url), 'utf8'), 'ResultUserName.tsx');

for (const [name, expected] of [
    ['Edgar Punina', 'Edgar Punina'],
    ['  María   José  Yánez  Ñacato  ', 'María Ñacato'],
    ['Ana', 'Ana'],
    ['', null],
    [undefined, null],
]) {
    test(`result name uses one given name and one surname: ${name ?? 'missing user'}`, async () => {
        const context = vm.createContext({});
        const module = new vm.SourceTextModule(code, { context });
        await module.link(specifier => {
            const exports = specifier === 'react/jsx-runtime' ? { jsx: (type, props) => ({ type, props }) }
                : { useAuth: () => ({ user: name === undefined ? null : { name } }) };
            return new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context });
        });
        await module.evaluate();
        const tree = module.namespace.ResultUserName();
        assert.equal(tree?.props.children ?? null, expected);
    });
}
