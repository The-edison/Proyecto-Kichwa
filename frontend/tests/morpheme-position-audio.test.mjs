import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/components/MorphemePractice.tsx', import.meta.url), 'utf8'), 'MorphemePractice.tsx');
const jsx = (type, props) => ({ type, props });
function nodes(tree) { if (Array.isArray(tree)) return tree.flatMap(nodes); return tree?.props ? [tree, ...nodes(tree.props.children)] : []; }

async function practice(exercise) {
    let cursor = 0, answer = {}, feedback, busy = false;
    const states = [];
    const audio = { src: '', paused: true, currentTime: 0, playCalls: 0, failure: false,
        pause() { this.paused = true; },
        play() { this.playCalls++; this.paused = false; return this.failure ? Promise.reject(Error('Missing recording')) : Promise.resolve(); },
    };
    const context = vm.createContext({ document: { querySelectorAll: () => [audio] } });
    const module = new vm.SourceTextModule(code, { context, initializeImportMeta: meta => { meta.env = { BASE_URL: '/app/' }; } });
    await module.link(specifier => {
        const values = specifier === 'react' ? { useState: initial => { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; }, useRef: () => ({ current: audio }), useEffect: () => {} }
            : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' }
            : specifier === 'lucide-react' ? { Check: 'Check', Pause: 'Pause', Play: 'Play', Volume2: 'Volume2' }
            : specifier.endsWith('/MatchingLines') ? { MatchingLines: 'MatchingLines' }
            : specifier.endsWith('/VerbalIllustration') ? { VerbalIllustration: 'VerbalIllustration' }
            : specifier.endsWith('/TimeMorphemeIllustration') ? { TimeMorphemeIllustration: 'TimeMorphemeIllustration' }
            : specifier.endsWith('/MorphemeIllustration') ? { MorphemeIllustration: 'MorphemeIllustration' }
            : specifier.endsWith('/MorphemeOrdinalExercise') ? { MorphemeOrdinalExercise: 'MorphemeOrdinalExercise' }
            : specifier.endsWith('/morpheme-third-place.png') ? { default: 'morpheme-third-place.png' }
            : specifier.endsWith('/morpheme-family-listening.png') ? { default: 'morpheme-family-listening.png' } : {};
        return new vm.SyntheticModule(Object.keys(values), function () { for (const [key, value] of Object.entries(values)) this.setExport(key, value); }, { context });
    });
    await module.evaluate();
    function render() { cursor = 0; return module.namespace.MorphemePractice({ exercise, answer, feedback, busy, onChange: value => { answer = value; } }); }
    return { audio, render, panel: props => { cursor = 0; return module.namespace.MorphemeListeningPanel(props); }, answer: () => JSON.parse(JSON.stringify(answer)), lock: () => { feedback = { is_correct: true }; }, busy: value => { busy = value; } };
}

async function playPosition(position) {
    const exercise = { id: position ? 2 : 1, type: 'seleccion_multiple', elements: [{ id: 'o0', texto: 'Primero' }, { id: 'o1', texto: 'Tercero' }, { id: 'o2', texto: 'Noveno' }], config: { morpheme_practice: 6, ...(position ? { morpheme_position: position } : {}) } };
    const view = await practice(exercise);
    nodes(view.render()).find(node => node.type === 'button' && node.props.className === 'morpheme-play').props.onClick();
    return { audioSource: view.audio.src, tree: view.render() };
}

test('first and third places use their respective audio files and honor the application base path', async () => {
    assert.equal((await playPosition()).audioSource, '/app/audio/intermedio/modulo-2/unidad-1/shukniki.mp3');
    assert.equal((await playPosition('tercero')).audioSource, '/app/audio/intermedio/modulo-2/unidad-1/kimsaniki.mp3');
});

test('four verbal sentences have independent recordings, transcripts and associated illustrations', async () => {
    for(const [word,cell,sentence]of [['wawaku',5,'Ñuka churika shuk sumak wawaku kan.'],['warmiku',1,'Ñuka warmiku mishkitami yanun.'],['wasiku',2,'Ñuka wasiku tukuykunatami chaskin.'],['mashiku',3,'Ñuka mashiku shuk sumak musumi kan.']]){
        const view=await practice({id:3,type:'seleccion_multiple',config:{verbal_practice:3,morpheme_practice:2,verbal_listening:word,verbal_sentence:sentence},elements:[{id:'o0',texto:'Significado'}]});
        nodes(view.render()).find(node=>node.props.className==='morpheme-play').props.onClick();
        assert.equal(view.audio.src,`/app/audio/intermedio/modulo-2/unidad-3/${word}-oracion.mp3`);
        assert.equal(nodes(view.render()).find(node=>node.type==='VerbalIllustration').props.cell,cell);
        assert.equal(nodes(view.render()).find(node=>node.props.className==='verbal-listening-transcript').props.children,sentence);
    }
});

test('compact verbal panel switches the visible exercise without losing either selected answer', async () => {
    const view = await practice({id:1,type:'seleccion_multiple',elements:[],config:{}});
    let answers={};
    const exercises=[{id:11,config:{verbal_listening:'wasiku',verbal_panel:2}},{id:12,config:{verbal_listening:'mashiku',verbal_panel:2}}];
    const render=()=>view.panel({exercises,answers,feedback:{},busy:false,onChange:(exercise,answer)=>{answers={...answers,[exercise.id]:answer};}});
    const tabs=()=>nodes(render()).filter(node=>node.type==='button');
    const cards=()=>nodes(render()).filter(node=>node.type==='article');
    nodes(cards()[0]).find(node=>typeof node.type==='function').props.onChange({seleccion:['o2']});
    view.audio.paused=false;
    tabs()[1].props.onClick();
    assert.equal(view.audio.paused,true);
    assert.ok(cards()[1].props.className.includes('is-active'));
    nodes(cards()[1]).find(node=>typeof node.type==='function').props.onChange({seleccion:['o0']});
    tabs()[0].props.onClick();
    assert.ok(cards()[0].props.className.includes('is-active'));
    assert.deepEqual(answers,{11:{seleccion:['o2']},12:{seleccion:['o0']}});
});

test('verbal matching plays the tapped word, mixes destinations and uses its own images and recordings', async () => {
    for (const [activity,words] of [[1,['Wawaku','Warmiku','Wasiku','Mashiku']],[4,['Shamuychi','Apamuychi','Armachina','Hapichi']]]) {
        const view=await practice({id:activity,type:'relacionar',config:{verbal_practice:activity,morpheme_practice:1},elements:[...words.map((texto,i)=>({id:`k${i}`,texto,grupo:'origen'})),...words.map((_,i)=>({id:`d${i}`,texto:'Significado',grupo:'destino'}))]});
        for(let i=0;i<words.length;i++){
            nodes(view.render()).find(node=>node.props['data-matching-origin']===`k${i}`).props.onClick();
            assert.equal(view.audio.src,`/app/audio/intermedio/modulo-2/unidad-3/${words[i].toLowerCase()}.mp3`);
        }
        assert.deepEqual(nodes(view.render()).filter(node=>node.props['data-matching-destination']).map(node=>node.props['data-matching-destination']),['d2','d3','d0','d1']);
        assert.equal(nodes(view.render()).filter(node=>node.type==='VerbalIllustration').length,4);
    }
    for(const [activity,file,cell]of [[3,'wawaku-oracion.mp3',5],[6,'yachanayani.mp3',10]]){
        const view=await practice({id:activity,type:'seleccion_multiple',config:{verbal_practice:activity,morpheme_practice:2},elements:[{id:'o0',texto:'Respuesta'}]});
        nodes(view.render()).find(node=>node.props.className==='morpheme-play').props.onClick();
        assert.equal(view.audio.src,`/app/audio/intermedio/modulo-2/unidad-3/${file}`);
        assert.equal(nodes(view.render()).find(node=>node.type==='VerbalIllustration').props.cell,cell);
    }
});

test('time activities play their own unit recordings and display the matching scene', async () => {
    for (const [activity, file, cell] of [[3, 'alex-samarirka.mp3', 0], [6, 'nuka-llankasha.mp3', 5]]) {
        const view = await practice({ id: activity, type: 'seleccion_multiple', config: { time_practice: activity, morpheme_practice: 2 }, elements: [{ id: 'o0', texto: 'Significado' }] });
        nodes(view.render()).find(node => node.props.className === 'morpheme-play').props.onClick();
        assert.equal(view.audio.src, `/app/audio/intermedio/modulo-2/unidad-2/${file}`);
        assert.equal(nodes(view.render()).find(node => node.type === 'TimeMorphemeIllustration').props.cell, cell);
    }
    const view = await practice({ id: 2, type: 'relacionar', config: { time_practice: 2, morpheme_practice: 1 }, elements: [{ id: 'k0', texto: 'Samarirka', grupo: 'origen' }, { id: 'd0', texto: 'Descansó', grupo: 'destino' }] });
    nodes(view.render()).find(node => node.props['data-matching-origin'] === 'k0').props.onClick();
    assert.equal(view.audio.src, '/app/audio/intermedio/modulo-2/unidad-2/samarirka.mp3');
    assert.equal(nodes(view.render()).find(node => node.type === 'TimeMorphemeIllustration').props.cell, 0);
});

test('each past sentence has a separate full recording, scene and selected answer', async () => {
    for (const [word, file, cell] of [['alex', 'alex-samarirka-oracion.mp3', 0], ['edgar', 'edgar-wakarka-oracion.mp3', 1], ['kaled', 'kaled-chayarka-oracion.mp3', 2], ['pakarina', 'pakarina-chinkarirka-oracion.mp3', 3]]) {
        const view = await practice({ id: cell + 1, type: 'seleccion_multiple', config: { time_practice: 3, morpheme_practice: 2, time_listening: word }, elements: [{ id: 'o0', texto: 'Significado' }] });
        nodes(view.render()).find(node => node.props.className === 'morpheme-play').props.onClick();
        assert.equal(view.audio.src, `/app/audio/intermedio/modulo-2/unidad-2/${file}`);
        assert.equal(nodes(view.render()).find(node => node.type === 'TimeMorphemeIllustration').props.cell, cell);
        nodes(view.render()).find(node => node.type === 'input' && node.props.type === 'radio').props.onChange();
        assert.deepEqual(view.answer(), { seleccion: ['o0'] });
    }
});

test('four future sentences use separate recordings and the work, teaching, walking and sewing scenes', async () => {
    for (const [word, file, cell] of [['llanka', 'llankasha-oracion.mp3', 5], ['yachachi', 'yachachisha-oracion.mp3', 6], ['puri', 'purisha-oracion.mp3', 7], ['sira', 'sirasha-oracion.mp3', 8]]) {
        const view = await practice({ id: cell, type: 'seleccion_multiple', config: { time_practice: 6, morpheme_practice: 2, time_listening: word }, elements: [{ id: 'o0', texto: 'Significado' }] });
        nodes(view.render()).find(node => node.props.className === 'morpheme-play').props.onClick();
        assert.equal(view.audio.src, `/app/audio/intermedio/modulo-2/unidad-2/${file}`);
        assert.equal(nodes(view.render()).find(node => node.type === 'TimeMorphemeIllustration').props.cell, cell);
    }
});

test('each family sentence uses its own audio and illustration cell', async () => {
    for (const [word, left, top] of [['laushushi', '-100%', '-100%'], ['layaya', '0%', '0%'], ['lamama', '-100%', '0%'], ['lachuri', '0%', '-100%']]) {
        const view = await practice({ id: 8, type: 'seleccion_multiple', config: { morpheme_practice: 8, morpheme_family_listening: word }, elements: [{ id: 'o0', texto: 'Significado en español' }] });
        nodes(view.render()).find(node => node.props.className === 'morpheme-play').props.onClick();
        assert.equal(view.audio.src, `/app/audio/intermedio/modulo-2/unidad-1/${word}-oracion.mp3`);
        const illustration = nodes(view.render()).find(node => node.props.className?.includes('morpheme-family-listening-illustration'));
        const image = nodes(illustration).find(node => node.type === 'img');
        assert.equal(image.props.src, 'morpheme-family-listening.png');
        assert.equal(image.props.style.left, left);
        assert.equal(image.props.style.top, top);
        assert.equal(image.props.style.width, '200%');
        assert.equal(illustration.props.style.overflow, 'hidden');
    }
});

test('third place uses its bronze podium illustration while first place keeps the original scene', async () => {
    const first = nodes((await playPosition()).tree);
    const third = nodes((await playPosition('tercero')).tree);
    assert.equal(first.find(node => node.type === 'MorphemeIllustration').props.cell, 7);
    assert.equal(first.filter(node => node.type === 'figcaption').length, 1);
    const picture = third.find(node => node.type === 'img');
    assert.equal(picture.props.src, 'morpheme-third-place.png');
    assert.match(picture.props.alt, /número 3: tercer lugar/);
    assert.equal(third.filter(node => node.type === 'figcaption').length, 0);
});

test('clicking any family or occupation word selects it and starts its own recording exactly once', async () => {
    for (const [activity, words] of [[7, ['Layaya', 'Lamama', 'Lachuri', 'Laushushi']], [1, ['Wasikamak', 'Punkukamak', 'Llamakamak', 'Wakrakamak', 'Tantakamak']]]) {
        const exercise = { id: activity, type: 'relacionar', config: { morpheme_practice: activity }, elements: [...words.map((texto, index) => ({ id: `k${index}`, texto, grupo: 'origen' })), ...words.map((_, index) => ({ id: `d${index}`, texto: `Significado ${index}`, grupo: 'destino' }))] };
        const view = await practice(exercise);
        const origin = id => nodes(view.render()).find(node => node.props['data-matching-origin'] === id);
        for (const [index, word] of words.entries()) {
            origin(`k${index}`).props.onClick();
            assert.equal(view.audio.src, `/app/audio/intermedio/modulo-2/unidad-1/${word.toLowerCase()}.mp3`);
            assert.equal(view.audio.playCalls, index + 1);
            assert.equal(origin(`k${index}`).props['aria-pressed'], true);
        }
        const calls = view.audio.playCalls;
        nodes(view.render()).find(node => node.props['data-matching-destination'] === 'd0').props.onClick();
        assert.equal(view.audio.playCalls, calls);
        assert.deepEqual(view.answer().pares, [{ origen: `k${words.length - 1}`, destino: 'd0' }]);
        view.audio.currentTime = 0.8;
        origin(`k${words.length - 1}`).props.onClick();
        assert.equal(view.audio.currentTime, 0);
        assert.equal(view.audio.playCalls, calls + 1);
        assert.deepEqual(view.answer().pares, []);
        view.busy(true);
        origin('k0').props.onClick();
        assert.equal(view.audio.playCalls, calls + 1);
        view.busy(false); view.lock();
        origin('k0').props.onClick();
        assert.equal(view.audio.playCalls, calls + 1);
    }
});

test('an unavailable recording does not prevent matching and the speaker retries without changing the answer', async () => {
    const view = await practice({ id: 7, type: 'relacionar', config: { morpheme_practice: 7 }, elements: [{ id: 'k0', texto: 'Layaya', grupo: 'origen' }, { id: 'd0', texto: 'Padrastro', grupo: 'destino' }] });
    view.audio.failure = true;
    nodes(view.render()).find(node => node.props['data-matching-origin'] === 'k0').props.onClick();
    await Promise.resolve();
    assert.ok(nodes(view.render()).some(node => node.props.className === 'morpheme-audio-error'));
    nodes(view.render()).find(node => node.props['data-matching-destination'] === 'd0').props.onClick();
    const answer = view.answer();
    assert.deepEqual(answer.pares, [{ origen: 'k0', destino: 'd0' }]);
    view.audio.failure = false;
    nodes(view.render()).find(node => node.props['aria-label'] === 'Escuchar Layaya').props.onClick();
    assert.equal(view.audio.playCalls, 2);
    assert.deepEqual(view.answer(), answer);
    assert.equal(nodes(view.render()).some(node => node.props.className === 'morpheme-audio-error'), false);
});

test('four desire sentences use independent recordings, matching images and their full transcripts', async () => {
    for(const [word,cell,sentence] of [
        ['mikunayan',4,'Ñukatami mikunayan ishki kuyita'],
        ['millanayan',12,'Chay mikunata rikushpaka ashkatami millanayan.'],
        ['killkanayan',11,'Kunan punchami ashkata killkanayan.'],
        ['yachanayan',10,'Ñukataka kay shimita ashkatami yachanayan.']
    ]){
        const view=await practice({id:6,type:'seleccion_multiple',config:{verbal_practice:6,morpheme_practice:2,verbal_listening:word,verbal_sentence:sentence},elements:[{id:'o0',texto:'Significado'}]});
        nodes(view.render()).find(node=>node.props.className==='morpheme-play').props.onClick();
        assert.equal(view.audio.src,'/app/audio/intermedio/modulo-2/unidad-3/'+word+'-oracion.mp3');
        assert.equal(nodes(view.render()).find(node=>node.type==='VerbalIllustration').props.cell,cell);
        assert.equal(nodes(view.render()).find(node=>node.props.className==='verbal-listening-transcript').props.children,sentence);
        nodes(view.render()).find(node=>node.type==='input'&&node.props.type==='radio').props.onChange();
        assert.deepEqual(view.answer(),{seleccion:['o0']});
    }
});
