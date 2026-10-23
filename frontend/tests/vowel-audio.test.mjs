import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/components/VowelAudioButtons.tsx', import.meta.url), 'utf8'), 'VowelAudioButtons.tsx');
const { code: hookCode } = await transformWithOxc(await readFile(new URL('../src/js/hooks/useLessonAudio.ts', import.meta.url), 'utf8'), 'useLessonAudio.ts');
const { code: consonantCode } = await transformWithOxc(await readFile(new URL('../src/js/components/ConsonantAudioButton.tsx', import.meta.url), 'utf8'), 'ConsonantAudioButton.tsx');
const { code: missingCode } = await transformWithOxc(await readFile(new URL('../src/js/components/MissingVowelExercise.tsx', import.meta.url), 'utf8'), 'MissingVowelExercise.tsx');
const { code: greetingsCode } = await transformWithOxc(await readFile(new URL('../src/js/components/GreetingsIntroduction.tsx', import.meta.url), 'utf8'), 'GreetingsIntroduction.tsx');
const { code: audioMatchingCode } = await transformWithOxc(await readFile(new URL('../src/js/components/AudioMatchingExercise.tsx', import.meta.url), 'utf8'), 'AudioMatchingExercise.tsx');
const { code: sentencesCode } = await transformWithOxc(await readFile(new URL('../src/js/components/ListeningGreetingsExercise.tsx', import.meta.url), 'utf8'), 'ListeningGreetingsExercise.tsx');
const { code: expressionsCode } = await transformWithOxc(await readFile(new URL('../src/js/components/ConversationMatchingExercise.tsx', import.meta.url), 'utf8'), 'ConversationMatchingExercise.tsx');
const { code: scenesCode } = await transformWithOxc(await readFile(new URL('../src/js/components/SceneChoicePanel.tsx', import.meta.url), 'utf8'), 'SceneChoicePanel.tsx');
const jsx = (type, props) => ({ type, props });
function nodes(tree) { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!tree?.props) return []; return [tree, ...nodes(tree.props.children)]; }

async function screen(base = '/') {
    const states = [], audios = [];
    let cursor = 0, cleanup;
    let missingAnswer = {};
    let sentenceAnswer = {};
    class Audio {
        constructor(src) { this.src = src; this.paused = false; this.promise = new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; }); audios.push(this); }
        play() { this.playCalls = (this.playCalls ?? 0) + 1; return this.promise; }
        pause() { this.paused = true; }
    }
    const context = vm.createContext({ Audio });
    const link = specifier => {
        if (specifier.endsWith('/useLessonAudio')) return hook;
        if (specifier.endsWith('/ExerciseCard')) return new vm.SyntheticModule(['mediaUrl', 'feedbackMessage'], function(){this.setExport('mediaUrl',path=>'/api/media/'+path);this.setExport('feedbackMessage',value=>value)}, {context});
        const dependency = specifier.endsWith('/MatchingLines') ? { MatchingLines: 'MatchingLines' } : specifier === 'react' ? {
            useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = value; }]; },
            useRef(initial) { const index = cursor++; return states[index] ??= { current: initial }; },
            useEffect(effect) { const index = cursor++; if (!(index in states)) { states[index] = true; cleanup = effect(); } },
        } : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' }
            : specifier.endsWith('/LessonOverview') ? { LessonOverview: 'LessonOverview', LessonNote: 'LessonNote' }
            : specifier.endsWith('/LessonCardGrid') ? { LessonCardGrid: 'LessonCardGrid' }
            : { Volume2: 'Volume2', RotateCcw: 'RotateCcw', CheckCircle2: 'CheckCircle2', Sun: 'Sun', Sunset: 'Sunset', MoonStar: 'MoonStar' };
        return new vm.SyntheticModule(Object.keys(dependency), function () { for (const [name, value] of Object.entries(dependency)) this.setExport(name, value); }, { context });
    };
    const hook = new vm.SourceTextModule(hookCode, { context, initializeImportMeta(meta) { meta.env = { BASE_URL: base }; } });
    const module = new vm.SourceTextModule(code, { context });
    const consonants = new vm.SourceTextModule(consonantCode, { context });
    const missing = new vm.SourceTextModule(missingCode, { context });
    const greetings = new vm.SourceTextModule(greetingsCode, { context });
    const audioMatching = new vm.SourceTextModule(audioMatchingCode, { context });
    const sentences = new vm.SourceTextModule(sentencesCode, { context });
    const expressions = new vm.SourceTextModule(expressionsCode, { context });
    const scenes = new vm.SourceTextModule(scenesCode, { context });
    for (const item of [hook, module, consonants, missing, greetings, audioMatching, sentences, expressions, scenes]) { await item.link(link); await item.evaluate(); }
    let playback;
    const view = {
        audios,
        scenes(props) { cursor = 0; return scenes.namespace.SceneChoicePanel(props); },
        render() { cursor = 0; playback = hook.namespace.useLessonAudio(); return module.namespace.VowelAudioButtons({ playback }); },
        consonantButton() { view.render(); return consonants.namespace.ConsonantAudioButton({ playback }); },
        consonantStatus() { view.render(); return playback.state.clip === 'consonantes' ? playback.state.message : ''; },
        click(vowel) { nodes(view.render()).find(node => node.props['aria-label'] === `Escuchar la vocal ${vowel}`).props.onClick(); },
        status() { return nodes(view.render()).find(node => node.props.role === 'status').props.children; },
        missing(disabled = false) { cursor = 0; return missing.namespace.MissingVowelExercise({ exercise: { id: 16, elements: [{ id: 'audio1', texto: 'sh_nku' }, { id: 'audio2', texto: 'p_rina' }, { id: 'audio3', texto: 'll_ma' }] }, answer: missingAnswer, disabled, onChange(value) { missingAnswer = value; } }); },
        missingAnswer() { return missingAnswer; },
        greetings() { cursor = 0; return greetings.namespace.GreetingsIntroduction(); },
        sentences(disabled = false) { cursor = 0; return sentences.namespace.ListeningGreetingsExercise({
            exercise: { id: 25, elements: ['alli-puncha-churi', 'alli-chishi-kusa', 'alli-tuta-tayta'].map((id,index) => ({ id, texto: `Alli _____, ${['churi','kusa','tayta'][index]}.`, opciones: ['puncha','chishi','tuta','kaya'] })) },
            answer: sentenceAnswer, disabled, onChange(value) { sentenceAnswer = value; },
        }); },
        sentenceAnswer() { return sentenceAnswer; },
        expressions(group, words, disabled=false) { cursor=0;return expressions.namespace.ConversationMatchingExercise({
            group,exercise:{elements:[...words.map((texto,i)=>({id:`${group}-${i}`,texto,grupo:'origen'})),...words.map((_,i)=>({id:`es-${group}-${i}`,texto:`Meaning ${i}`,grupo:'destino'}))]},
            answer:{},selectedOrigin:'',disabled,onSelectOrigin(){throw Error('Playback changed a selection')},onPair(){},
        }); },
        questionChoices(disabled = false) { cursor = 0; return sentences.namespace.ListeningGreetingsExercise({
            exercise: { id:26, config:{listening_questions:true}, elements:['imatak','pitak-kan','imamanta'].map(id=>({id,texto:id,imagen:`questions/${id}.webp`,opciones:['¿Qué es?','¿Quién es?','¿Por qué?']})) },
            answer:sentenceAnswer, disabled, onChange(value){sentenceAnswer=value},
        }); },
        audioMatching(props = {}) { cursor = 0; return audioMatching.namespace.AudioMatchingExercise({
            exercise: { elements: [
                ...['imatak', 'pitak-kan', 'imamanta'].map(id => ({ id, grupo: 'origen', texto: id })),
                ...['¿Por qué?', '¿Qué es?', '¿Quién es?'].map((texto, id) => ({ id: String(id), grupo: 'destino', texto })),
            ] }, answer: {}, selectedOrigin: '', disabled: false, onSelectOrigin() {}, onPair() {}, ...props,
        }); },
        clickGreeting(word) { nodes(view.greetings()).find(node => node.props['aria-label'] === `Escuchar ${word}`).props.onClick(); },
        unmount() { cleanup(); },
    };
    view.render();
    return view;
}

test('farewell and courtesy words play all nine unit recordings without selecting pairs, even after grading', async () => {
    const view=await screen('/kichwa/');
    for(const [group,folder,phrases] of [
        ['d','despedidas',[['Kipakaman','kipakaman'],['Kayakaman','kayakaman'],['Shukti punchakama','shukti-punchakama'],['Ashtak kaman','ashtak-kaman'],['Chisikaman','chisikaman']]],
        ['c','cortesia',[['Alli shamushka','alli-shamushka'],['Yupaychani','yupaychani'],['Kishpichiway','kishpichiway'],['Tiyaripay','tiyaripay']]],
    ]) {
        const words=phrases.map(([word])=>word);
        const tree=view.expressions(group,words);
        assert.equal(nodes(tree).filter(node=>node.props['aria-label']?.startsWith('Escuchar ')).length,words.length);
        for(const [word,file] of phrases){
            nodes(view.expressions(group,words)).find(node=>node.props['aria-label']===`Escuchar ${word}`).props.onClick();
            assert.equal(view.audios.at(-1).src,`/kichwa/audios/unidad-2/${folder}/${file}.mp3`);
            if(view.audios.length>1)assert.equal(view.audios.at(-2).paused,true);
        }
        const locked=nodes(view.expressions(group,words,true));
        assert.ok(locked.filter(node=>node.type==='button'&&!node.props['aria-label']?.startsWith('Escuchar ')).every(node=>node.props.disabled));
        locked.find(node=>node.props['aria-label']===`Escuchar ${words[0]}`).props.onClick();
    }
    view.audios.at(-1).reject(Error('Missing file'));await Promise.resolve();
    assert.ok(nodes(view.expressions('c',['Alli shamushka','Yupaychani','Kishpichiway','Tiyaripay'])).some(node=>node.props.role==='status'&&String(node.props.children).includes('No se pudo reproducir')));
    view.unmount();assert.equal(view.audios.at(-1).paused,true);
});

test('question cards show an image, its audio and three independent Spanish options', async () => {
    const view = await screen('/kichwa/');
    const cards = nodes(view.questionChoices()).filter(node=>node.type==='article');
    assert.equal(cards.length,3);
    assert.equal(nodes(view.questionChoices()).filter(node=>node.type==='input').length,9);
    for (const [index,id] of ['imatak','pitak-kan','imamanta'].entries()) {
        const cardNodes=nodes(cards[index]);
        const image=cardNodes.find(node=>node.type==='img');
        assert.equal(image.props.src,`/api/media/questions/${id}.webp`);
        const audio=cardNodes.find(node=>node.props['aria-label']===`Escuchar la pregunta ${index+1}`);
        assert.ok(cardNodes.indexOf(image)<cardNodes.indexOf(audio));
        assert.ok(cardNodes.indexOf(audio)<cardNodes.findIndex(node=>node.type==='input'));
        audio.props.onClick();
        assert.equal(view.audios.at(-1).src,`/kichwa/audios/unidad-2/preguntas-respuestas/${id}.mp3`);
        nodes(view.questionChoices()).find(node=>node.type==='input'&&node.props.name.endsWith(id)&&node.props.value==='¿Qué es?').props.onChange();
    }
    assert.equal(Object.keys(view.sentenceAnswer().textos).length,3);
    assert.ok(Object.values(view.sentenceAnswer().textos).every(value=>value==='¿Qué es?'));
    assert.ok(nodes(view.questionChoices(true)).filter(node=>node.type==='fieldset').every(node=>node.props.disabled));
});

test('three listening sentences use separate recordings, preserve all choices and lock checked answers', async () => {
    const view = await screen('/kichwa/');
    assert.equal(nodes(view.sentences()).filter(node => node.type === 'article').length, 3);
    assert.equal(nodes(view.sentences()).filter(node => node.type === 'input').length, 12);
    assert.equal(view.audios.length, 0);
    for (const [index,file] of ['alli-puncha-churi','alli-chishi-kusa','alli-tuta-tayta'].entries()) {
        nodes(view.sentences()).find(node => node.props['aria-label'] === `Escuchar la oración ${index + 1}`).props.onClick();
        assert.equal(view.audios.at(-1).src, `/kichwa/audios/unidad-2/completar-saludos/${file}.mp3`);
        const option = nodes(view.sentences()).find(node => node.type === 'input' && node.props.name.endsWith(file) && node.props.value === ['puncha','chishi','tuta'][index]);
        option.props.onChange();
    }
    assert.deepEqual(JSON.parse(JSON.stringify(view.sentenceAnswer())), { textos: { 'alli-puncha-churi': 'puncha', 'alli-chishi-kusa': 'chishi', 'alli-tuta-tayta': 'tuta' } });
    nodes(view.sentences()).find(node => node.props['aria-label'] === 'Repetir la oración 3').props.onClick();
    assert.equal(view.audios.at(-2).paused, true);
    const disabled = view.sentences(true);
    assert.ok(nodes(disabled).filter(node => node.type === 'fieldset').every(node => node.props.disabled));
    nodes(disabled).find(node => node.type === 'input' && node.props.value === 'kaya').props.onChange();
    assert.equal(view.sentenceAnswer().textos['alli-puncha-churi'], 'puncha');
    view.audios.at(-1).reject(Error('Missing recording')); await Promise.resolve();
    const message = nodes(view.sentences()).find(node => node.props.role === 'status').props.children;
    assert.match(message, /No se pudo reproducir la oración 3/);
    assert.doesNotMatch(message, /tuta|tayta/);
});

test('question audios use the unit folder, select on playback and repeat without changing pairs', async () => {
    const view = await screen('/kichwa/');
    const selections = [];
    const props = { onSelectOrigin: id => selections.push(id) };
    assert.equal(view.audios.length, 0);
    for (const [index, file] of ['imatak', 'pitak-kan', 'imamanta'].entries()) {
        nodes(view.audioMatching(props)).find(node => node.props['aria-label'] === `Escuchar y seleccionar el audio ${index + 1}`).props.onClick();
        assert.equal(view.audios.at(-1).src, `/kichwa/audios/unidad-2/preguntas-respuestas/${file}.mp3`);
        assert.equal(selections.at(-1), file);
        const count = selections.length;
        nodes(view.audioMatching(props)).find(node => node.props['aria-label'] === `Repetir el audio ${index + 1}`).props.onClick();
        assert.equal(selections.length, count);
        assert.equal(view.audios.at(-2).paused, true);
    }
    const count = selections.length;
    nodes(view.audioMatching({ ...props, disabled: true })).find(node => node.props['aria-label'] === 'Escuchar y seleccionar el audio 1').props.onClick();
    assert.equal(selections.length, count);
    assert.ok(nodes(view.audioMatching({ disabled: true })).filter(node => node.props.className?.startsWith('guided-audio-meaning')).every(node => node.props.disabled));
    view.unmount();
    assert.equal(view.audios.at(-1).paused, true);
});

test('a missing question recording reports an error without revealing the answer and can be retried', async () => {
    const view = await screen();
    const play = () => nodes(view.audioMatching()).find(node => node.props['aria-label'] === 'Escuchar y seleccionar el audio 2').props.onClick();
    play(); view.audios[0].reject(Error('Missing file')); await Promise.resolve();
    const status = nodes(view.audioMatching()).find(node => node.props.role === 'status');
    assert.match(status.props.children, /No se pudo reproducir el audio 2/);
    assert.doesNotMatch(status.props.children, /pitak|quién/i);
    play(); view.audios[1].onplaying();
    assert.match(nodes(view.audioMatching()).find(node => node.props.role === 'status').props.children, /Reproduciendo audio 2/);
});

test('all eleven greeting expressions play their own MP3 on click with the corrected farewell spellings', async () => {
    const view = await screen('/kichwa/');
    assert.equal(nodes(view.greetings()).filter(node => node.type === 'button').length, 11);
    assert.equal(view.audios.length, 0);
    const phrases = [
        ['Alli puncha', 'alli-puncha'], ['Alli chishi', 'alli-chishi'], ['Alli tuta', 'alli-tuta'],
        ['Imanalla kanki', 'imanalla-kanki'], ['Allilla kani.', 'allilla-kani'],
        ['Maymanta kanki', 'maymanta-kanki'], ['Maypitak llankanki', 'maypitak-llankanki'],
        ['Kayakaman', 'kayakaman'], ['Kipakaman', 'kipakaman'], ['Yupaychani', 'yupaychani'], ['Kishpichiway', 'kishpichiway'],
    ];
    for (const [word, file] of phrases) {
        view.clickGreeting(word);
        assert.equal(view.audios.at(-1).src, `/kichwa/audios/saludos/${file}.mp3`);
        assert.equal(view.audios.at(-1).playCalls, 1);
        if (view.audios.length > 1) assert.equal(view.audios.at(-2).paused, true);
    }
    assert.ok(!nodes(view.greetings()).some(node => /Tupananchikkama|Escuchar Kayakama$/.test(node.props['aria-label'] ?? '')));
    view.unmount();
    assert.equal(view.audios.at(-1).paused, true);
});

test('greeting audio failures are shown beside the selected group and can be retried without overlapping playback', async () => {
    const view = await screen();
    view.clickGreeting('Kipakaman');
    view.audios[0].reject(Error('Missing file'));
    await Promise.resolve();
    const errors = nodes(view.greetings()).filter(node => node.props.role === 'status' && node.props.className.includes('is-error'));
    assert.equal(errors.length, 1);
    assert.match(errors[0].props.children, /No se pudo reproducir el audio de «Kipakaman»/);
    view.clickGreeting('Kipakaman');
    view.audios[1].onplaying();
    assert.ok(nodes(view.greetings()).some(node => node.props.className?.includes('is-active')));
    view.audios[1].onended();
    assert.ok(!nodes(view.greetings()).some(node => node.props.className?.includes('is-active')));
});

test('three accessible native buttons load the correct MP3 only on click and respect the base URL', async () => {
    const view = await screen('/kichwa/');
    assert.equal(view.audios.length, 0);
    const buttons = nodes(view.render()).filter(node => node.type === 'button');
    assert.equal(buttons.length, 3);
    assert.ok(buttons.every(button => button.props.type === 'button'));
    for (const vowel of ['a', 'i', 'u']) {
        view.click(vowel);
        assert.equal(view.audios.at(-1).src, `/kichwa/audios/vocales/${vowel}.mp3`);
        assert.equal(view.audios.at(-1).playCalls, 1);
    }
});

test('switching or repeating a vowel stops the previous audio and starts a fresh recording', async () => {
    const view = await screen();
    view.click('a');
    view.audios[0].onplaying();
    assert.match(view.status(), /Reproduciendo la vocal a/);
    view.click('i');
    assert.equal(view.audios[0].paused, true);
    assert.equal(view.audios[0].onended, null);
    view.click('i');
    assert.equal(view.audios[1].paused, true);
    assert.notEqual(view.audios[1], view.audios[2]);
    view.audios[2].onplaying();
    view.audios[2].onended();
    assert.equal(view.status(), '');
    assert.equal(nodes(view.render()).some(node => node.props.className === 'is-active'), false);
});

test('a missing file or rejected playback shows a recoverable message without an unhandled rejection', async () => {
    const view = await screen();
    view.click('u');
    view.audios[0].reject(new Error('Unsupported or missing audio'));
    await Promise.resolve();
    assert.match(view.status(), /No se pudo reproducir el audio de «u»/);
    view.click('u');
    assert.doesNotMatch(view.status(), /No se pudo/);
    view.audios[1].onerror();
    assert.match(view.status(), /No se pudo reproducir/);
    view.click('a');
    view.audios[2].onplaying();
    assert.match(view.status(), /Reproduciendo la vocal a/);
});

test('late failures from an interrupted sound cannot replace the current status', async () => {
    const view = await screen();
    view.click('a');
    const staleEnded = view.audios[0].onended;
    const stalePlaying = view.audios[0].onplaying;
    view.click('i');
    view.audios[1].onplaying();
    view.audios[0].reject(new Error('Interrupted'));
    staleEnded();
    stalePlaying();
    await Promise.resolve();
    assert.match(view.status(), /Reproduciendo la vocal i/);
});

test('leaving the lesson stops playback and ignores pending failures', async () => {
    const view = await screen();
    view.click('a');
    view.unmount();
    assert.equal(view.audios[0].paused, true);
    assert.equal(view.audios[0].onplaying, null);
    view.audios[0].reject(new Error('Interrupted on unmount'));
    await Promise.resolve();
    assert.doesNotMatch(view.status(), /No se pudo/);
});

test('one consonant button plays the full recording and shares playback with vowels', async () => {
    const view = await screen('/kichwa/');
    assert.equal(view.consonantButton().props['aria-label'], 'Escuchar todas las consonantes');
    assert.equal(view.consonantButton().props.type, 'button');
    view.click('a');
    view.consonantButton().props.onClick();
    assert.equal(view.audios[0].paused, true);
    assert.equal(view.audios[1].src, '/kichwa/audios/consonantes/consonantes.mp3');
    assert.match(view.consonantStatus(), /Cargando las consonantes/);
    assert.equal(view.status(), '');
    view.audios[1].onplaying();
    assert.match(view.consonantStatus(), /Reproduciendo las consonantes/);
    assert.match(view.consonantButton().props.className, /is-active/);
    view.click('i');
    assert.equal(view.audios[1].paused, true);
    assert.equal(view.consonantStatus(), '');
    assert.doesNotMatch(view.consonantButton().props.className, /is-active/);
});

test('consonant playback can restart, finish, recover from errors and stop on leaving', async () => {
    const view = await screen();
    view.consonantButton().props.onClick();
    const stalePlaying = view.audios[0].onplaying;
    view.consonantButton().props.onClick();
    assert.equal(view.audios[0].paused, true);
    view.audios[0].reject(new Error('Interrupted'));
    stalePlaying();
    await Promise.resolve();
    assert.match(view.consonantStatus(), /Cargando las consonantes/);
    view.audios[1].reject(new Error('Missing file'));
    await Promise.resolve();
    assert.match(view.consonantStatus(), /No se pudo reproducir el audio de las consonantes/);
    assert.doesNotMatch(view.consonantButton().props.className, /is-active/);
    view.consonantButton().props.onClick();
    view.audios[2].onplaying();
    view.audios[2].onended();
    assert.equal(view.consonantStatus(), '');
    view.consonantButton().props.onClick();
    view.unmount();
    assert.equal(view.audios[3].paused, true);
    assert.equal(view.audios[3].onplaying, null);
});

test('listening rows map each audio and repeat button to the right recording without overlap', async () => {
    const view = await screen('/kichwa/');
    for (const [index, word] of ['shunku', 'purina', 'llama'].entries()) {
        nodes(view.missing()).find(node => node.props['aria-label'] === `Escuchar el audio ${index + 1}`).props.onClick();
        assert.equal(view.audios.at(-1).src, `/kichwa/audios/vocal-que-falta/${word}.mp3`);
        if (index > 0) assert.equal(view.audios.at(-2).paused, true);
        nodes(view.missing()).find(node => node.props['aria-label'] === `Repetir el audio ${index + 1}`).props.onClick();
        assert.equal(view.audios.at(-2).paused, true);
        assert.equal(view.audios.at(-1).src, `/kichwa/audios/vocal-que-falta/${word}.mp3`);
    }
    view.audios.at(-1).reject(new Error('Missing file'));
    await Promise.resolve();
    assert.match(nodes(view.missing()).find(node => node.props.role === 'status').props.children, /No se pudo reproducir el audio 3/);
    view.unmount();
});

test('listening inputs save one Kichwa vowel per word, normalize uppercase and lock successful answers', async () => {
    const view = await screen();
    const inputs = () => nodes(view.missing()).filter(node => node.type === 'input');
    assert.equal(inputs().length, 3);
    assert.ok(inputs().every(node => node.props.maxLength === 1));
    inputs()[0].props.onChange({ target: { value: 'U' } });
    inputs()[1].props.onChange({ target: { value: 'e' } });
    inputs()[2].props.onChange({ target: { value: 'A' } });
    assert.equal(view.missingAnswer().textos.audio1, 'u');
    assert.equal(view.missingAnswer().textos.audio2, '');
    assert.equal(view.missingAnswer().textos.audio3, 'a');
    const locked = nodes(view.missing(true)).filter(node => node.type === 'input');
    assert.ok(locked.every(node => node.props.disabled));
    locked[0].props.onChange({ target: { value: 'a' } });
    assert.equal(view.missingAnswer().textos.audio1, 'u');
    assert.ok(nodes(view.missing(true)).filter(node => node.type === 'button').every(node => !node.props.disabled));
});

test('scene choices keep audio separate from selection and lock only correct cards', async () => {
    const view = await screen('/kichwa/');
    const changes = [];
    const exercises = [0,1,2].map(i => ({id:101+i,config:{scene_choice:true,conversation_group:'q',context_text:`Spanish ${i}`,prompt_image:`scene-${i}.webp`},elements:[0,1,2].map(n=>({id:`q-${n}`,texto:`Question ${n}`}))}));
    const props = {exercises,answers:{101:{seleccion:['q-0']}},feedback:{101:{is_correct:true,feedback:'Correct'},102:{is_correct:false,feedback:'Try again'}},busy:false,onChange:(...args)=>changes.push(args)};
    const all = nodes(view.scenes(props));
    assert.equal(all.filter(n=>n.type==='article').length,3);
    assert.deepEqual(all.filter(n=>n.type==='figcaption').map(n=>n.props.children),['Spanish 0','Spanish 1','Spanish 2']);
    const radios = all.filter(n=>n.type==='input');
    assert.equal(radios.length,9);
    assert.ok(radios.slice(0,3).every(n=>n.props.disabled));
    assert.ok(radios.slice(3).every(n=>!n.props.disabled));
    const speakers = all.filter(n=>n.type==='button');
    assert.equal(speakers.length,9);
    assert.ok(speakers.every(n=>!n.props.disabled));
    speakers[0].props.onClick();
    assert.equal(changes.length,0);
    assert.equal(view.audios.at(-1).src,'/kichwa/audios/unidad-2/escenas/preguntas/imanalla-kanki.mp3');
    view.audios.at(-1).resolve();
    radios[3].props.onChange();
    assert.equal(changes[0][0].id,102);
    assert.deepEqual(JSON.parse(JSON.stringify(changes[0][1])),{seleccion:['q-0']});
    view.unmount();
    assert.ok(view.audios.at(-1).paused);
});

test('farewell scene cards retain the existing audio folder and support two-card panels', async () => {
    const view=await screen('/kichwa/');
    const props={exercises:[3,4].map(i=>({id:201+i,config:{conversation_group:'d',context_text:'Farewell '+i,prompt_image:'farewell-'+i+'.webp'},elements:[{id:'d-'+i,texto:'Farewell '+i}]})),answers:{},feedback:{},busy:false,onChange(){throw Error('Audio changed an answer')}};
    const tree=view.scenes(props);
    assert.ok(tree.props.className.includes('is-pair'));
    assert.equal(nodes(tree).filter(n=>n.type==='article').length,2);
    for(const [i,path]of['ashtak-kaman','chisikaman'].entries()){
        nodes(view.scenes(props)).filter(n=>n.type==='button')[i].props.onClick();
        assert.equal(view.audios.at(-1).src,`/kichwa/audios/unidad-2/despedidas/${path}.mp3`);
        view.audios.at(-1).resolve();
    }
    view.unmount();
});
