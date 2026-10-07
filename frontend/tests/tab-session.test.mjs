import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';

const source = stripTypeScriptTypes(await readFile(new URL('../src/js/services/tabSession.ts', import.meta.url), 'utf8'));

function browser() {
    const channels = new Set();
    return async function tab(initial = {}) {
        const storage = new Map(Object.entries(initial));
        const listeners = new Map();
        class Channel {
            constructor(name) { this.name = name; channels.add(this); }
            postMessage(data) { for (const peer of [...channels]) if (peer !== this && peer.name === this.name) peer.onmessage?.({ data }); }
            close() { channels.delete(this); }
        }
        const window = { BroadcastChannel: Channel, addEventListener(name, callback) { listeners.set(name, callback); } };
        const context = vm.createContext({ window, BroadcastChannel: Channel, crypto: webcrypto, TextEncoder,
            sessionStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
            setTimeout: callback => queueMicrotask(callback), Uint8Array });
        const module = new vm.SourceTextModule(source, { context });
        await module.link(() => { throw new Error('Unexpected dependency'); });
        await module.evaluate();
        return { api: module.namespace, storage, hide: () => listeners.get('pagehide')?.() };
    };
}

test('a pasted URL in a fresh tab does not inherit another tab credential', async () => {
    const open = browser();
    const original = await open();
    const token = await original.api.tabSessionToken(true);
    assert.match(token, /^[a-f0-9]{64}$/);
    assert.equal(await original.api.tabSessionToken(), token);
    const fresh = await open();
    assert.equal(await fresh.api.tabSessionToken(), null);
    assert.notEqual(await fresh.api.tabSessionToken(true), token);
});

test('a duplicated tab rejects the copied sessionStorage credential', async () => {
    const open = browser();
    const original = await open();
    const token = await original.api.tabSessionToken(true);
    const duplicate = await open(Object.fromEntries(original.storage));
    assert.equal(await duplicate.api.tabSessionToken(), null);
    assert.equal(await original.api.tabSessionToken(), token);
});

test('reloading a tab preserves its credential after the previous document leaves', async () => {
    const open = browser();
    const original = await open();
    const token = await original.api.tabSessionToken(true);
    original.hide();
    const reloaded = await open(Object.fromEntries(original.storage));
    assert.equal(await reloaded.api.tabSessionToken(), token);
});

test('logout removes the credential and the next login creates a different one', async () => {
    const tab = await browser()();
    const token = await tab.api.tabSessionToken(true);
    tab.api.clearTabSession();
    assert.equal(await tab.api.tabSessionToken(), null);
    assert.notEqual(await tab.api.tabSessionToken(true), token);
});
