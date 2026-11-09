import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {transformWithOxc} from 'vite';
const code=await Promise.all(['components/AnimalsPracticePanel.tsx','hooks/useLessonAudio.ts','components/ExerciseCard.tsx'].map(async path=>(await transformWithOxc(await readFile(new URL('../src/js/'+path,import.meta.url),'utf8'),path)).code));
const jsx=(type,props)=>({type,props});
const nodes=tree=>Array.isArray(tree)?tree.flatMap(nodes):tree?.props?[tree,...nodes(tree.props.children)]:[];
const text=tree=>Array.isArray(tree)?tree.map(text).join(''):tree?.props?text(tree.props.children):typeof tree==='string'||typeof tree==='number'?String(tree):'';
const row=(id,texto,opciones=[])=>({id,texto,opciones,imagen:'kichwa/imagenes/atlas.webp'});
async function screen(activity,group,elements){
    let cursor=0,answer={},feedback,busy=false;const states=[],cleanups=[],audios=[];
    class Audio{constructor(src){this.src=src;this.promise=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject});audios.push(this)}play(){return this.promise}pause(){this.paused=true}}
    const context=vm.createContext({Audio});
    const dependencies={MatchingLines:{MatchingLines:'MatchingLines'},react:{useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return[states[i],next=>states[i]=typeof next==='function'?next(states[i]):next]},useRef(initial){const i=cursor++;return states[i]??={current:initial}},useEffect(effect){const i=cursor++;if(!(i in states)){states[i]=true;cleanups.push(effect())}}},'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},'lucide-react':{CheckCircle2:'CheckCircle2',RotateCcw:'RotateCcw',Volume2:'Volume2'},api:{apiBaseUrl:'',apiPost(){},ApiError:class extends Error{}},LearningCompanion:{LearningCompanion:'LearningCompanion'},SuccessConfetti:{SuccessConfetti:'SuccessConfetti'},useAnswerSound:{useAnswerSound:()=>()=>{}},'animals-practice.css':{}};
    const modules=code.map(source=>new vm.SourceTextModule(source,{context,initializeImportMeta(meta){meta.env={BASE_URL:'/campus/'}}}));const cache=new Map();
    function link(specifier){if(specifier.endsWith('/useLessonAudio'))return modules[1];if(specifier.endsWith('/ExerciseCard'))return modules[2];const key=dependencies[specifier]?specifier:specifier.split('/').at(-1);const dep=dependencies[key];assert.ok(dep,specifier);if(!cache.has(key))cache.set(key,new vm.SyntheticModule(Object.keys(dep),function(){for(const [key,value]of Object.entries(dep))this.setExport(key,value)},{context}));return cache.get(key)}
    await modules[0].link(link);await modules[0].evaluate();
    const exercise={id:1,type:'completar',config:{animal_activity:activity,animal_group:group,title:activity},elements,zones:[]};
    return {audios,render(){cursor=0;return modules[0].namespace.AnimalsPracticePanel({exercise,answer,feedback,busy,onChange(next){answer=next;feedback=undefined}})},answer:()=>JSON.parse(JSON.stringify(answer)),complete:()=>modules[2].namespace.answerComplete(exercise,answer),grade(items){feedback={is_correct:Object.values(items).every(Boolean),item_results:items,feedback:'Registrado'}},busy(value){busy=value},scene(id){return modules[0].namespace.AnimalScene({id,image:elements[0].imagen,description:'Ilustración'})},unmount(){cleanups.forEach(cleanup=>cleanup?.())}};
}
function find(view,label){const item=nodes(view.render()).find(node=>node.props['aria-label']===label);assert.ok(item,label);return item}
function button(view,label){const item=nodes(view.render()).find(node=>node.type==='button'&&text(node)===label);assert.ok(item,label);return item}

test('six image choices stay independent, show per-row feedback and lock a successful panel',async()=>{
    const view=await screen('identify','domestic',['d-dog','d-cat','d-hen','d-sheep','d-cuy','d-cow'].map(id=>row(id,'Animal',['Allku','Misi'])));
    assert.equal(nodes(view.render()).filter(node=>node.type==='select').length,6);assert.equal(view.complete(),false);
    for(let i=1;i<=6;i++)find(view,'Identificar animal '+i).props.onChange({target:{value:i===2?'Misi':'Allku'}});
    assert.equal(view.complete(),true);assert.equal(view.answer().textos['d-cat'],'Misi');
    view.grade({'d-dog':false,'d-cat':true});assert.ok(text(view.render()).includes('Revisa esta respuesta'));assert.ok(text(view.render()).includes('Correcta'));
    view.grade(Object.fromEntries(['d-dog','d-cat','d-hen','d-sheep','d-cuy','d-cow'].map(id=>[id,true])));
    assert.equal(find(view,'Identificar animal 1').props.disabled,true);find(view,'Identificar animal 1').props.onChange({target:{value:'Misi'}});assert.equal(view.answer().textos['d-dog'],'Allku');
    assert.notEqual(view.scene('d-dog').props.style.backgroundPosition,view.scene('d-cat').props.style.backgroundPosition);
});
test('ordering supports adding and removing tiles, uses every word and resets only its row',async()=>{
    const view=await screen('order','domestic',[row('d-mama','Mi mamá tiene un perro',['charin','Ñuka','allkutami','mamaka','shuk']),row('d-boy','Yo compré',['Ñukami','rantirkani'])]);
    for(const word of ['Ñuka','mamaka','shuk','allkutami'])button(view,word).props.onClick();assert.equal(view.complete(),false);button(view,'charin').props.onClick();button(view,'Ñukami').props.onClick();button(view,'rantirkani').props.onClick();assert.equal(view.complete(),true);
    find(view,'Quitar shuk de la oración 1').props.onClick();assert.equal(view.complete(),false);assert.equal(view.answer().textos['d-boy'],'Ñukami rantirkani');
    find(view,'Reiniciar oración 1').props.onClick();assert.equal(view.answer().textos['d-mama'],'');assert.equal(view.answer().textos['d-boy'],'Ñukami rantirkani');
});
test('labels can be placed by touch or drag, moved without duplicates and ignore foreign labels',async()=>{
    const view=await screen('labels','wild',[row('w-beetle','Escarabajo',['Ullawanta','Katsu','Kushulli']),row('w-monkey','Mono',['Ullawanta','Katsu','Kushulli']),row('w-vulture','Gallinazo',['Ullawanta','Katsu','Kushulli'])]);
    button(view,'Katsu').props.onClick();find(view,'Etiqueta de Escarabajo: sin colocar').props.onClick();assert.equal(view.answer().textos['w-beetle'],'Katsu');
    find(view,'Etiqueta de Mono: sin colocar').props.onDrop({preventDefault(){},dataTransfer:{getData:()=> 'Katsu'}});assert.equal(view.answer().textos['w-beetle'],'');assert.equal(view.answer().textos['w-monkey'],'Katsu');
    find(view,'Etiqueta de Escarabajo: sin colocar').props.onDrop({preventDefault(){},dataTransfer:{getData:()=> 'Otra palabra'}});assert.equal(view.answer().textos['w-beetle'],'');
    find(view,'Etiqueta de Escarabajo: sin colocar').props.onDrop({preventDefault(){},dataTransfer:{getData:()=> 'Katsu'}});button(view,'Kushulli').props.onClick();find(view,'Etiqueta de Mono: sin colocar').props.onClick();button(view,'Ullawanta').props.onClick();find(view,'Etiqueta de Gallinazo: sin colocar').props.onClick();assert.equal(view.complete(),true);
    view.busy(true);find(view,'Etiqueta de Escarabajo: Katsu').props.onDrop({preventDefault(){},dataTransfer:{getData:()=> 'Ullawanta'}});assert.equal(view.answer().textos['w-beetle'],'Katsu');
});
test('four domestic listening audios reuse the lesson files, stop previous playback and recover from missing audio',async()=>{
    const view=await screen('listen','domestic',[1,2,3,4].map(i=>row('d-audio-'+i,'Audio '+i,['Cerdo','Conejo','Caballo','Burro'])));
    assert.equal(nodes(view.render()).filter(node=>node.type==='figure').length,4);
    for(const [i,name]of ['kuchi','kunu','apiw','chantasu'].entries()){find(view,'Escuchar audio '+(i+1)).props.onClick();assert.equal(view.audios.at(-1).src,`/campus/audios/modulo-2/unidad-1/animales/${name}.mp3`);if(i)assert.equal(view.audios.at(-2).paused,true)}
    view.audios.at(-1).reject(Error('missing'));await new Promise(resolve=>setImmediate(resolve));assert.ok(text(view.render()).includes('No se pudo reproducir'));assert.deepEqual(view.answer(),{});
    find(view,'Escuchar audio 4').props.onClick();view.unmount();assert.equal(view.audios.at(-1).paused,true);
});
test('one sentence panel combines three recordings, meanings and missing words with separate feedback',async()=>{
    const ids=['d-mama','d-boy','d-jose'];
    const view=await screen('understand-complete','domestic',[1,2,3].flatMap((i,index)=>[row('d-sentence-'+i,'Oración '+i,['Uno','Dos','Tres']),row(ids[index],'Ñuka _____ charin',['allkutami','misita','llamatami'])]));
    assert.equal(nodes(view.render()).filter(node=>node.type==='select').length,6);
    assert.ok(text(view.render()).includes('Actividad 3 de 4'));
    assert.equal(nodes(view.render()).filter(node=>node.type?.name==='AnimalScene').length,3);
    for(const [i,name]of ['mi-mama-tiene-un-perro','me-compre-un-hermoso-gato','jose-compro-una-oveja'].entries()){find(view,'Escuchar oración '+(i+1)).props.onClick();assert.equal(view.audios.at(-1).src,`/campus/audios/modulo-2/unidad-1/oraciones/${name}.mp3`);find(view,'Significado de la oración '+(i+1)).props.onChange({target:{value:['Uno','Dos','Tres'][i]}})}
    assert.equal(view.complete(),false);
    for(let i=0;i<3;i++)find(view,'Completar oración '+(i+1)).props.onChange({target:{value:['allkutami','misita','llamatami'][i]}});
    assert.equal(view.complete(),true);assert.equal(view.answer().textos['d-sentence-1'],'Uno');assert.equal(view.answer().textos['d-mama'],'allkutami');
    view.grade({'d-sentence-1':true,'d-mama':false,'d-sentence-2':false,'d-boy':true,'d-sentence-3':true,'d-jose':true});
    assert.equal(find(view,'Completar oración 1').props['aria-invalid'],true);assert.equal(find(view,'Significado de la oración 1').props['aria-invalid'],false);
    assert.equal(find(view,'Significado de la oración 2').props['aria-invalid'],true);assert.ok(text(view.render()).includes('Revisa la palabra que falta'));assert.ok(text(view.render()).includes('Revisa el significado'));
    view.grade(Object.fromEntries(Object.keys(view.answer().textos).map(id=>[id,true])));
    assert.equal(find(view,'Completar oración 1').props.disabled,true);assert.equal(find(view,'Significado de la oración 1').props.disabled,true);
});
test('wild listening and writing share the correct three word recordings and reject empty answers',async()=>{
    const view=await screen('write','wild',['w-frog','w-butterfly','w-hummingbird'].map(id=>row(id,'Animal')));
    for(const [i,name]of ['hampatu','pilpintu','kinti'].entries()){find(view,'Escuchar audio '+(i+1)).props.onClick();assert.equal(view.audios.at(-1).src,`/campus/audios/modulo-2/unidad-1/animales/${name}.mp3`);find(view,'Nombre en kichwa del animal '+(i+1)).props.onChange({target:{value:i===2?'  ':name}})}
    assert.equal(view.complete(),false);find(view,'Nombre en kichwa del animal 3').props.onChange({target:{value:'kinti'}});assert.equal(view.complete(),true);
    view.grade({'w-frog':true,'w-butterfly':true,'w-hummingbird':true});find(view,'Nombre en kichwa del animal 1').props.onChange({target:{value:'otro'}});assert.equal(view.answer().textos['w-frog'],'hampatu');
});
