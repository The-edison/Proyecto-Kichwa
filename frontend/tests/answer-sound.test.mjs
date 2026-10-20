import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/hooks/useAnswerSound.ts', import.meta.url), 'utf8'), 'useAnswerSound.ts');
async function player(base = '/') {
    const audios = [], refs = [];
    let cursor = 0, cleanup;
    class Audio {
        constructor(src) { this.src = src; this.paused = false; this.calls = []; audios.push(this); }
        pause() { this.paused = true; }
        play() { this.paused = false; return new Promise((resolve,reject) => this.calls.push({resolve,reject})); }
    }
    const context = vm.createContext({ Audio });
    const module = new vm.SourceTextModule(code, { context, initializeImportMeta(meta) { meta.env = { BASE_URL:base }; } });
    await module.link(() => new vm.SyntheticModule(['useRef','useEffect'], function() {
        this.setExport('useRef', value => refs[cursor++] ??= {current:value});
        this.setExport('useEffect', callback => { cleanup = callback(); });
    }, {context}));
    await module.evaluate();
    const play = module.namespace.useAnswerSound();
    return { play, audios, unmount() { cleanup(); } };
}

test('answer tones use the two MP3 files, cache them and stop the preceding tone', async () => {
    const view = await player('/kichwa/');
    assert.equal(view.audios.length,0);
    view.play(true);
    assert.equal(view.audios[0].src,'/kichwa/audios/respuestas/correcto.mp3');
    assert.equal(view.audios[0].volume,0.6);
    view.play(false);
    assert.equal(view.audios[0].paused,true);
    assert.equal(view.audios[1].src,'/kichwa/audios/respuestas/incorrecto.mp3');
    view.audios[0].currentTime=5;
    view.play(true);
    assert.equal(view.audios.length,2);
    assert.equal(view.audios[0].currentTime,0);
    assert.equal(view.audios[1].paused,true);
});

test('missing or blocked tones never throw and late failures do not stop a fresh playback', async () => {
    const view = await player();
    view.play(true); view.play(true);
    view.audios[0].calls[0].reject(Error('Playback blocked')); await Promise.resolve();
    assert.equal(view.audios[0].paused,false);
    view.audios[0].onerror();
    assert.equal(view.audios[0].paused,true);
    assert.doesNotThrow(() => view.play(false));
    view.audios[1].calls[0].reject(Error('Missing MP3')); await Promise.resolve();
    assert.equal(view.audios[1].paused,true);
});

test('leaving the exercise stops tones and ignores a delayed grading callback', async () => {
    const view = await player();
    view.play(true); view.unmount();
    assert.equal(view.audios[0].paused,true);
    view.play(false);
    assert.equal(view.audios.length,1);
});
