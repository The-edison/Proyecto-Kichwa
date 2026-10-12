import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/components/ExerciseCard.tsx', import.meta.url), 'utf8'), 'ExerciseCard.tsx');
async function interaction(exercise, initial = {}, checkPair, initialLockedPairs = []) {
    let cursor = 0, answer = initial;
    const states = [];
    const context = vm.createContext({});
    const jsx = (type, props) => ({ type, props });
    const module = new vm.SourceTextModule(code, { context });
    await module.link(specifier => {
        const dependency = specifier === 'react' ? {
            useState: value => { const index = cursor++; if (!(index in states)) states[index] = value; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
            useRef: value => ({ current: value }),
        } : specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'fragment' }
            : { apiPost: () => {}, apiBaseUrl: '', ApiError: class extends Error {} };
        return new vm.SyntheticModule(Object.keys(dependency), function () { for (const [key, value] of Object.entries(dependency)) this.setExport(key, value); }, { context });
    });
    await module.evaluate();
    return { render: () => { cursor = 0; return module.namespace.ExerciseInteraction({ exercise, answer, onChange: value => { answer = value; }, name: 'test', onCheckPair: checkPair, initialLockedPairs }); }, answer: () => JSON.parse(JSON.stringify(answer)), complete: () => module.namespace.answerComplete(exercise, answer) };
}
function nodes(tree) { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!tree?.props) return []; return [tree, ...nodes(tree.props.children)]; }
const button = (view, text) => nodes(view.render()).find(node => node.type === 'button' && node.props.children === text);

test('ordering supports repeated letters, removing a selected letter and resetting', async () => {
    const view = await interaction({ type: 'ordenar', elements: [{ id: 's1', texto: 's' }, { id: 'i', texto: 'i' }, { id: 's2', texto: 's' }, { id: 'a', texto: 'a' }], zones: [] });
    for (const letter of ['s', 'i', 's', 'a']) nodes(view.render()).find(n => n.type === 'button' && !n.props.disabled && !n.props['aria-label'] && n.props.children === letter).props.onClick();
    assert.equal(view.complete(), true);
    nodes(view.render()).find(n => n.props['aria-label'] === 'Quitar letra 2').props.onClick();
    assert.equal(view.complete(), false);
    button(view, 'Reiniciar secuencia').props.onClick();
    assert.deepEqual(view.answer(), { orden: [] });
});

test('single selection replaces the previous option and multiple selection enforces its limit', async () => {
    const exercise = { type: 'seleccion_multiple', elements: [{ id: 'a', texto: 'A' }, { id: 'i', texto: 'I' }, { id: 'u', texto: 'U' }], zones: [], config: { max_selections: 1 } };
    const single = await interaction(exercise);
    nodes(single.render()).filter(n => n.type === 'input')[0].props.onChange({ target: { checked: true } });
    nodes(single.render()).filter(n => n.type === 'input')[1].props.onChange({ target: { checked: true } });
    assert.deepEqual(single.answer(), { seleccion: ['i'] });
    const multiple = await interaction({ ...exercise, config: { max_selections: 2 } }, { seleccion: ['a', 'i'] });
    assert.equal(nodes(multiple.render()).filter(n => n.type === 'input')[2].props.disabled, true);
});

test('pairs allow retry after an incorrect answer and lock a server-confirmed correct pair', async () => {
    let correct = false;
    const view = await interaction({ type: 'relacionar', elements: [{ id: 'k', texto: 'Sisa', grupo: 'origen' }, { id: 'e', texto: 'Flor', grupo: 'destino' }], zones: [] }, {}, async () => correct);
    const choose = () => nodes(view.render()).find(n => n.type === 'select').props.onChange({ target: { value: 'e' } });
    choose(); await new Promise(resolve => setImmediate(resolve)); assert.deepEqual(view.answer(), {});
    correct = true; choose(); await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(view.answer(), { pares: [{ origen: 'k', destino: 'e' }] });
    assert.equal(nodes(view.render()).find(n => n.type === 'select').props.disabled, true);
});

test('restored server-confirmed pairs remain locked after resuming', async () => {
    const view = await interaction({type:'relacionar',elements:[{id:'k',texto:'Sisa',grupo:'origen'},{id:'e',texto:'Flor',grupo:'destino'}],zones:[]}, {pares:[{origen:'k',destino:'e'}]}, async()=>true, ['k']);
    assert.equal(nodes(view.render()).find(n=>n.type==='select').props.disabled,true);
    assert.equal(view.complete(),true);
});

test('vowel buttons enforce three selections and allow deselecting', async () => {
    const view=await interaction({type:'seleccion_multiple',elements:['A','E','I','O','U','K'].map((texto,index)=>({id:'e'+index,texto})),zones:[],config:{presentation:'buttons',max_selections:3,exact_selections:true}});
    for(const text of ['A','I','U']) button(view,text).props.onClick();
    assert.equal(view.complete(),true);assert.equal(button(view,'E').props.disabled,true);
    button(view,'I').props.onClick();assert.equal(view.complete(),false);assert.equal(button(view,'E').props.disabled,false);
});
test('letter choices save the chosen character and visual options hide descriptions', async () => {
    const letter=await interaction({type:'completar',elements:[{id:'word',texto:'WA_I',opciones:['S','M','N']}],zones:[],config:{presentation:'letter'}});
    button(letter,'S').props.onClick();assert.deepEqual(letter.answer(),{textos:{word:'S'}});assert.equal(letter.complete(),true);
    const visual=await interaction({type:'seleccion_multiple',elements:[{id:'v1',texto:'Flor',imagen:'kichwa/imagenes/a.webp'},{id:'v2',texto:'Casa',imagen:'kichwa/imagenes/b.webp'}],zones:[],config:{presentation:'visual',max_selections:1}});
    const images=nodes(visual.render()).filter(n=>n.type==='img');assert.equal(images[0].props.alt,'Tarjeta visual 1');
    assert.equal(nodes(visual.render()).some(n=>n.props.children==='Flor'),false);
    images[0].props.onError();assert.equal(nodes(visual.render()).find(n=>n.props['aria-label']==='Tarjeta visual 1').props.disabled,true);
});
test('tiles support moving selected letters and undoing the last one', async () => {
    const view=await interaction({type:'ordenar',elements:[{id:'a',texto:'A'},{id:'s2',texto:'S'},{id:'s1',texto:'S'},{id:'i',texto:'I'}],zones:[],config:{presentation:'tiles'}},{orden:['a','s2','i','s1']});
    nodes(view.render()).find(n=>n.props['aria-label']==='Mover ficha 2 a la izquierda').props.onClick();assert.deepEqual(view.answer().orden,['s2','a','i','s1']);
    button(view,'Borrar última').props.onClick();assert.deepEqual(view.answer().orden,['s2','a','i']);assert.equal(view.complete(),false);
});
