import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {transformWithOxc} from 'vite';
const paths=['components/ColorsPracticePanel.tsx','components/ColorObjectVisual.tsx','hooks/useLessonAudio.ts','components/ExerciseCard.tsx'];
const sources=await Promise.all(paths.map(async path=>(await transformWithOxc(await readFile(new URL('../src/js/'+path,import.meta.url),'utf8'),path)).code));
const jsx=(type,props)=>({type,props});
const nodes=tree=>Array.isArray(tree)?tree.flatMap(nodes):tree?.props?[tree,...nodes(tree.props.children)]:[];
const text=tree=>Array.isArray(tree)?tree.map(text).join(''):tree?.props?text(tree.props.children):typeof tree==='string'||typeof tree==='number'?String(tree):'';
const row=(id,texto,opciones=[])=>({id,texto,opciones});
const exercise=(id,activity,elements,panel=1)=>({id,type:'completar',prompt:'Practica',elements,zones:[],config:{title:activity,color_activity:activity,color_panel:panel}});
async function screen(exercises){
    let cursor=0,answers={},feedback={},busy=false;const states=[],audios=[],cleanups=[];
    class Audio{constructor(src){this.src=src;this.promise=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject});audios.push(this)}play(){return this.promise}pause(){this.paused=true}}
    const context=vm.createContext({Audio});
    const dependencies={MatchingLines:{MatchingLines:'MatchingLines'},react:{useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return[states[i],next=>states[i]=typeof next==='function'?next(states[i]):next]},useRef(initial){const i=cursor++;return states[i]??={current:initial}},useEffect(effect){const i=cursor++;if(!(i in states)){states[i]=true;cleanups.push(effect())}}},'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},'lucide-react':Object.fromEntries(['CheckCircle2','Paintbrush','RotateCcw','Volume2'].map(name=>[name,name])),api:{apiBaseUrl:'',apiPost(){},ApiError:class extends Error{}},LearningCompanion:{LearningCompanion:'LearningCompanion'},SuccessConfetti:{SuccessConfetti:'SuccessConfetti'},useAnswerSound:{useAnswerSound:()=>()=>{}},'colors-practice.css':{}};
    const modules=sources.map(source=>new vm.SourceTextModule(source,{context,initializeImportMeta(meta){meta.env={BASE_URL:'/campus/'}}})),cache=new Map();
    function link(specifier){if(specifier.endsWith('/ColorObjectVisual'))return modules[1];if(specifier.endsWith('/useLessonAudio'))return modules[2];if(specifier.endsWith('/ExerciseCard'))return modules[3];const key=dependencies[specifier]?specifier:specifier.split('/').at(-1),dep=dependencies[key];assert.ok(dep,specifier);if(!cache.has(key))cache.set(key,new vm.SyntheticModule(Object.keys(dep),function(){for(const[key,value]of Object.entries(dep))this.setExport(key,value)},{context}));return cache.get(key)}
    await modules[0].link(link);await modules[0].evaluate();await modules[3].link(link);await modules[3].evaluate();
    return{audios,render(){cursor=0;return modules[0].namespace.ColorsPracticePanel({exercises,answers,feedback,busy,onChange(exercise,answer){answers={...answers,[exercise.id]:answer};feedback={...feedback,[exercise.id]:undefined}}})},answers:()=>JSON.parse(JSON.stringify(answers)),complete:id=>modules[3].namespace.answerComplete(exercises.find(e=>e.id===id),answers[id]??{}),grade(id,items){feedback[id]={response_id:id,is_correct:Object.values(items).every(Boolean),item_results:items,feedback:'Registrado'}},busy(value){busy=value},unmount(){cleanups.forEach(cleanup=>cleanup?.())}};
}
function find(view,label){const node=nodes(view.render()).find(node=>node.props['aria-label']===label);assert.ok(node,label);return node}
function button(view,label){const node=nodes(view.render()).find(node=>node.type==='button'&&text(node)===label);assert.ok(node,label);return node}

test('a chosen sample paints only its object and completed painting stays locked beside listening',async()=>{
    const colors=['puka','killu','ankas'];
    const view=await screen([exercise(1,'apply',['c-cup','c-notebook','c-bag'].map((id,i)=>row(id,['Puka','Killu','Ankas'][i],colors))),exercise(2,'listen',[row('c-audio-1','Audio 1',['kishpu','ankas','waylla'])])]);
    assert.equal(view.complete(1),false);find(view,'Rojo').props.onClick();find(view,'Pintar objeto 1 del ejercicio 1 con rojo').props.onClick();
    assert.equal(view.answers()[1].textos['c-cup'],'puka');assert.equal(view.answers()[1].textos['c-notebook'],undefined);
    find(view,'Amarillo').props.onClick();find(view,'Pintar objeto 2 del ejercicio 1 con amarillo').props.onClick();
    const palette=find(view,'Paleta del ejercicio 1');nodes(palette).find(node=>node.type==='button'&&node.props['aria-label']==='Azul').props.onClick();find(view,'Pintar objeto 3 del ejercicio 1 con azul').props.onClick();assert.equal(view.complete(1),true);
    view.grade(1,{'c-cup':true,'c-notebook':true,'c-bag':true});assert.equal(find(view,'Pintar objeto 1 del ejercicio 1 con azul').props.disabled,true);
    const listening=find(view,'Muestras para el audio 1');nodes(listening).find(node=>node.props['aria-label']==='Verde').props.onClick();assert.equal(view.answers()[2].textos['c-audio-1'],'waylla');assert.equal(view.answers()[1].textos['c-cup'],'puka');
});

test('three color audios reuse word recordings without exposing the answer in playback status',async()=>{
    const view=await screen([exercise(1,'listen',[row('c-audio-1','Audio 1',['kishpu','ankas','waylla']),row('c-audio-2','Audio 2',['maywa','waminsi','killu']),row('c-audio-3','Audio 3',['yana','suku','paku'])])]);
    for(const[i,name]of ['waylla','waminsi','paku'].entries()){find(view,`Escuchar audio ${i+1} del ejercicio 3`).props.onClick();assert.equal(view.audios.at(-1).src,`/campus/audios/modulo-2/unidad-1/colores/${name}.mp3`);if(i)assert.equal(view.audios.at(-2).paused,true);assert.ok(!text(view.render()).includes(name))}
    view.audios.at(-1).reject(Error('missing'));await new Promise(resolve=>setImmediate(resolve));assert.ok(text(view.render()).includes('No se pudo reproducir'));
    find(view,'Escuchar audio 3 del ejercicio 3').props.onClick();view.unmount();assert.equal(view.audios.at(-1).paused,true);
});

test('six sentence audios use five new recordings and reuse the black cat example',async()=>{
    const ids=['c-hat','c-cat','c-pants','c-shawl','c-necklace','c-shoes'];
    const view=await screen([exercise(1,'interpret',ids.map(id=>row(id,'Oración',['yurak','yana','puka','killu','ankas'])),3)]);
    const paths=['oraciones/mi-sombrero-es-blanco','ejemplos/mi-gato-es-negro','oraciones/su-pantalon-es-negro','oraciones/su-reboso-es-rojo','oraciones/su-collar-es-amarillo','oraciones/sus-zapatos-son-azules'];
    for(let i=0;i<6;i++){find(view,`Escuchar audio ${i+1} del ejercicio 5`).props.onClick();assert.equal(view.audios.at(-1).src,`/campus/audios/modulo-2/unidad-1/${paths[i]}.mp3`)}
    assert.equal(nodes(view.render()).filter(node=>node.type?.name==='ColorObjectVisual').length,6);
});

test('meanings and missing color forms keep independent answers and per-row correction',async()=>{
    const view=await screen([exercise(1,'meaning',[row('c-shawl','Paypak llikllaka pukami kan',['Su reboso es rojo','Su collar es amarillo'])],4),exercise(2,'complete',[row('c-hat','Ñuka muchikuka _____ kan'),row('c-pants','Paypak waraka _____ kan'),row('c-shawl','Paypak llikllaka _____ kan')],4)]);
    find(view,'Significado de la oración 1 del ejercicio 6').props.onChange({target:{value:'Su reboso es rojo'}});
    for(const[i,value]of ['yurakmi','yanami',' '].entries())find(view,`Color que falta en la oración ${i+1}`).props.onChange({target:{value}});
    assert.equal(view.complete(1),true);assert.equal(view.complete(2),false);find(view,'Color que falta en la oración 3').props.onChange({target:{value:'puka'}});
    view.grade(2,{'c-hat':true,'c-pants':true,'c-shawl':false});assert.ok(text(view.render()).includes('Revisa esta respuesta'));
    view.grade(1,{'c-shawl':true});assert.equal(find(view,'Significado de la oración 1 del ejercicio 6').props.disabled,true);assert.equal(find(view,'Color que falta en la oración 3').props.disabled,false);
});

test('word ordering requires every tile, removes words and resets only the selected sentence',async()=>{
    const view=await screen([exercise(1,'order',[row('c-cat','Mi gato es negro',['kan','misika','Ñuka','yanami']),row('c-necklace','Su collar es amarillo',['Paypak','wallkaka','killumi','kan'])],5)]);
    for(const word of ['Ñuka','misika','yanami'])button(view,word).props.onClick();assert.equal(view.complete(1),false);button(view,'kan').props.onClick();
    for(const word of ['Paypak','wallkaka','killumi'])button(view,word).props.onClick();const banks=nodes(view.render()).filter(node=>node.props.className==='colors-order-bank');nodes(banks[1]).find(node=>node.type==='button'&&text(node)==='kan').props.onClick();assert.equal(view.complete(1),true);
    find(view,'Quitar yanami de la oración 1').props.onClick();assert.equal(view.complete(1),false);find(view,'Reiniciar oración 1').props.onClick();assert.equal(view.answers()[1].textos['c-cat'],'');assert.equal(view.answers()[1].textos['c-necklace'],'Paypak wallkaka killumi kan');
});
