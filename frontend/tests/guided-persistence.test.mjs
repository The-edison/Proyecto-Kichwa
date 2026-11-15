import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/services/guidedAttempt.ts', import.meta.url), 'utf8'), 'guidedAttempt.ts');
const key = 'yachay:guided-attempt:v1:3:4';
const storage = data => ({ getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) });
async function load(persistent, session = new Map()) {
    const module = new vm.SourceTextModule(code, { context: vm.createContext({ window: { localStorage: storage(persistent), sessionStorage: storage(session) } }) });
    await module.link(() => { throw Error('Unexpected dependency'); });
    await module.evaluate();
    return module.namespace;
}

test('a new browser session restores the exact unfinished attempt without an expiration', async () => {
    const persistent = new Map();
    const first = await load(persistent);
    const draft = { ...first.emptyGuidedAttempt('unchanged-catalog'), step: 5, lessonPage: 2, answers: { 11: { orden: ['', 'word-2', 'word-0'] } }, feedback: { 10: { is_correct: true, response_id: 23, xp_earned: 10 } }, submissions: { 10: 'submission-uuid' }, practiceAttemptId: 'attempt-uuid', xpEarned: 10 };
    first.writeGuidedAttempt(key, draft);
    const nextSession = await load(persistent);
    assert.equal(JSON.stringify(nextSession.readGuidedAttempt(key)), JSON.stringify(draft));
    assert.equal(nextSession.readGuidedAttempt('yachay:guided-attempt:v1:8:4').step, 0);
    assert.equal(nextSession.readGuidedAttempt('yachay:guided-attempt:v1:3:9').step, 0);
});

test('existing session drafts migrate to persistent storage and survive closing the session', async () => {
    const persistent = new Map();
    const first = await load(persistent);
    const draft = { ...first.emptyGuidedAttempt('catalog'), step: 2 };
    const legacySession = new Map([[key, JSON.stringify(draft)]]);
    const legacy = await load(persistent, legacySession);
    assert.equal(legacy.readGuidedAttempt(key).step, 2);
    assert.ok(persistent.has(key));
    assert.equal((await load(persistent)).readGuidedAttempt(key).step, 2);
});

test('invalid persistent data falls back to a valid existing session', async () => {
    const persistent = new Map([[key, '{invalid']]);
    const first = await load(new Map());
    const session = new Map([[key, JSON.stringify({ ...first.emptyGuidedAttempt(), step: 1 })]]);
    assert.equal((await load(persistent, session)).readGuidedAttempt(key).step, 1);
});
