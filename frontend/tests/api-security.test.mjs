import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

const source = stripTypeScriptTypes(await readFile(new URL('../src/js/services/api.ts', import.meta.url), 'utf8'), { mode: 'transform' });

async function client(status = 200) {
    const requests = [], invalidations = [], events = [], notifications = [];
    const context = vm.createContext({ document: { cookie: 'XSRF-TOKEN=csrf' }, FormData, Event,
        window: { dispatchEvent: event => events.push(event.type) }, crypto: { randomUUID: () => 'revision' },
        localStorage: { setItem: (...args) => notifications.push(args) },
        fetch: async (url, options) => { requests.push({ url, options }); return { status, ok: status < 400, json: async () => ({ message: 'Respuesta' }) }; } });
    const api = new vm.SourceTextModule(source, { context, initializeImportMeta: meta => { meta.env = {}; } });
    await api.link(specifier => {
        const dependency = specifier === './queryClient'
            ? { queryClient: { invalidateQueries: async (...args) => invalidations.push(args) } }
            : { tabSessionToken: async () => 'a'.repeat(64) };
        return new vm.SyntheticModule(Object.keys(dependency), function () {
            for (const [key, value] of Object.entries(dependency)) this.setExport(key, value);
        }, { context });
    });
    await api.evaluate();
    return { api: api.namespace, requests, invalidations, events, notifications };
}

test('private requests send the tab credential and bypass browser caches', async () => {
    const browser = await client();
    await browser.api.apiGet('/auth/me');
    const request = browser.requests[0].options;
    assert.equal(request.headers['X-Tab-Session'], 'a'.repeat(64));
    assert.equal(request.credentials, 'include');
    assert.equal(request.cache, 'no-store');
});

test('avatar upload keeps multipart encoding and the authenticated request headers', async () => {
    const browser = await client();
    const data = new FormData(); data.append('image', new Blob(['image'], { type: 'image/png' }), 'foto.png');
    await browser.api.apiPost('/auth/avatar', data);
    const request = browser.requests[0].options;
    assert.equal(request.body, data);
    assert.equal(request.headers['Content-Type'], undefined);
    assert.equal(request.headers['X-XSRF-TOKEN'], 'csrf');
    assert.equal(request.headers['X-Tab-Session'], 'a'.repeat(64));
});

test('an expired session signals immediate removal of the private UI', async () => {
    const browser = await client(401);
    await assert.rejects(browser.api.apiGet('/auth/me'), error => error.status === 401);
    assert.deepEqual(browser.events, ['yachay:session-expired']);
});

test('publishing refreshes active catalog queries and notifies other tabs', async () => {
    const browser = await client();
    await browser.api.apiPatch('/admin/units/1', { published: true });
    assert.equal(browser.requests[0].options.headers['X-XSRF-TOKEN'], 'csrf');
    const [filter] = browser.invalidations[0];
    assert.equal(filter.refetchType, 'active');
    assert.equal(filter.predicate({ queryKey: ['api', '/modules/1/units?page=1'] }), true);
    assert.equal(filter.predicate({ queryKey: ['api', '/modules/1/contents?page=1'] }), true);
    assert.equal(filter.predicate({ queryKey: ['api', '/levels'] }), true);
    assert.equal(filter.predicate({ queryKey: ['api', '/learning-navigation'] }), true);
    assert.equal(filter.predicate({ queryKey: ['api', '/admin/overview'] }), true);
    assert.deepEqual(browser.notifications, [['yachay:catalog-changed', 'revision']]);
});

test('publishing an opinion refreshes the public stories and the student opinion form', async () => {
    const browser = await client();
    await browser.api.apiPost('/testimonials', { body: 'Mi experiencia aprendiendo Kichwa.' });
    const [filter] = browser.invalidations[0];
    assert.equal(filter.refetchType, 'active');
    assert.equal(filter.predicate({ queryKey: ['api', '/testimonials'] }), true);
    assert.equal(filter.predicate({ queryKey: ['api', '/testimonials/eligibility'] }), true);
    assert.equal(filter.predicate({ queryKey: ['api', '/testimonials?language=qu'] }), true);
    assert.equal(filter.predicate({ queryKey: ['api', '/testimonials/eligibility?language=qu'] }), true);
    assert.equal(filter.predicate({ queryKey: ['api', '/levels'] }), false);
});

test('graded attempts refresh the shared student XP and admin report queries', async () => {
    for (const path of ['/exercises/1/answer', '/evaluations/2/submit']) {
        const browser = await client();
        await browser.api.apiPost(path, {});
        const [deferred] = browser.invalidations[0];
        assert.equal(deferred.refetchType, 'none');
        assert.equal(deferred.predicate({ queryKey: ['api', '/units/1/guided'] }), true);
        const [filter] = browser.invalidations[1];
        assert.equal(filter.predicate({ queryKey: ['api', '/units/1/guided'] }), false);
        assert.equal(filter.predicate({ queryKey: ['api', '/mastery'] }), true);
        assert.equal(filter.predicate({ queryKey: ['api', '/admin/learning-results/7'] }), true);
        assert.equal(filter.predicate({ queryKey: ['api', '/progress'] }), true);
    }
});
