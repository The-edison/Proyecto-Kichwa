import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {transformWithOxc} from 'vite';
const sources=await Promise.all(['components/BodyPracticePanel.tsx','hooks/useLessonAudio.ts','components/ExerciseCard.tsx'].map(async path=>(await transformWithOxc(await readFile(new URL('../src/js/'+path,import.meta.url),'utf8'),path)).code));
const jsx=(type,props)=>({type,props});
const nodes=tree=>Array.isArray(tree)?tree.flatMap(nodes):tree?.props?[tree,...nodes(tree.props.children)]:[];
const text=tree=>Array.isArray(tree)?tree.map(text).join(''):tree?.props?text(tree.props.children):typeof tree==='string'||typeof tree==='number'?String(tree):'';
const row=(id,texto,opciones=[])=>({id,texto,opciones,imagen:'kichwa/imagenes/cuerpo.webp'});
const exercise=(id,activity,elements,panel=1)=>({id,type:'completar',prompt:'Practica',elements,zones:[],config:{title:activity,body_activity:activity,body_panel:panel}});
async function screen(exercises){
    let cursor=0,answers={},feedback={},busy=false;const states=[],cleanups=[],audios=[];
    class Audio{constructor(src){this.src=src;this.promise=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject});audios.push(this)}play(){return this.promise}pause(){this.paused=true}}
    const context=vm.createContext({Audio});
    const dependencies={MatchingLines:{MatchingLines:'MatchingLines'},react:{useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return[states[i],next=>states[i]=typeof next==='function'?next(states[i]):next]},useRef(initial){const i=cursor++;return states[i]??={current:initial}},useEffect(effect){const i=cursor++;if(!(i in states)){states[i]=true;cleanups.push(effect())}}},'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},'lucide-react':{CheckCircle2:'CheckCircle2',RotateCcw:'RotateCcw',Volume2:'Volume2'},api:{apiBaseUrl:'',apiPost(){},ApiError:class extends Error{}},LearningCompanion:{LearningCompanion:'LearningCompanion'},SuccessConfetti:{SuccessConfetti:'SuccessConfetti'},useAnswerSound:{useAnswerSound:()=>()=>{}},'body-practice.css':{}};
    const modules=sources.map(source=>new vm.SourceTextModule(source,{context,initializeImportMeta(meta){meta.env={BASE_URL:'/campus/'}}})),cache=new Map();
    function link(specifier){if(specifier.endsWith('/useLessonAudio'))return modules[1];if(specifier.endsWith('/ExerciseCard'))return modules[2];const key=dependencies[specifier]?specifier:specifier.split('/').at(-1),dep=dependencies[key];assert.ok(dep,specifier);if(!cache.has(key))cache.set(key,new vm.SyntheticModule(Object.keys(dep),function(){for(const[key,value]of Object.entries(dep))this.setExport(key,value)},{context}));return cache.get(key)}
    await modules[0].link(link);await modules[0].evaluate();
    return{audios,render(){cursor=0;return modules[0].namespace.BodyPracticePanel({exercises,answers,feedback,busy,onChange(exercise,answer){answers={...answers,[exercise.id]:answer};feedback={...feedback,[exercise.id]:undefined}}})},answers:()=>JSON.parse(JSON.stringify(answers)),complete:id=>modules[2].namespace.answerComplete(exercises.find(e=>e.id===id),answers[id]??{}),grade(id,items){feedback[id]={response_id:id,is_correct:Object.values(items).every(Boolean),item_results:items,feedback:'Registrado'}},busy(value){busy=value},scene(id){return modules[0].namespace.BodyPracticeScene({image:'atlas.webp',id,description:'Parte del cuerpo'})},unmount(){cleanups.forEach(cleanup=>cleanup?.())}};
}
function find(view,label){const node=nodes(view.render()).find(node=>node.props['aria-label']===label);assert.ok(node,label);return node}
function button(view,label){const node=nodes(view.render()).find(node=>node.type==='button'&&text(node)===label);assert.ok(node,label);return node}

test('the ten map zones support touch and drag without duplicates, reject unknown labels and reset together',async()=>{
    const ids=['b-uma','b-kunka','b-rikra','b-maki','b-wiksa','b-kunkuri','b-chaki','b-washa','b-ruka','b-sillu'];
    const words=['Uma','Kunka','Rikra','Maki','Wiksa','Kunkuri','Chaki','Washa','Ruka','Sillu'];
    const view=await screen([exercise(1,'locate',ids.map(id=>row(id,'Zona',words)))]);
    assert.equal(nodes(view.render()).filter(node=>node.type==='button'&&node.props['aria-label']?.startsWith('Zona')).length,10);
    button(view,'Uma').props.onClick();find(view,'Zona 1 del ejercicio 1: sin etiqueta').props.onClick();assert.equal(view.answers()[1].textos['b-uma'],'Uma');
    find(view,'Zona 2 del ejercicio 1: sin etiqueta').props.onDrop({preventDefault(){},dataTransfer:{getData:()=> 'Uma'}});assert.equal(view.answers()[1].textos['b-uma'],'');assert.equal(view.answers()[1].textos['b-kunka'],'Uma');
    find(view,'Zona 1 del ejercicio 1: sin etiqueta').props.onDrop({preventDefault(){},dataTransfer:{getData:()=> 'Externo'}});assert.equal(view.answers()[1].textos['b-uma'],'');
    button(view,'Reiniciar etiquetas').props.onClick();assert.deepEqual(view.answers()[1].textos,{});
    for(let i=0;i<10;i++)find(view,`Zona ${i+1} del ejercicio 1: sin etiqueta`).props.onDrop({preventDefault(){},dataTransfer:{getData:()=> words[i]}});
    assert.equal(view.complete(1),true);view.grade(1,Object.fromEntries(ids.map(id=>[id,true])));assert.equal(find(view,'Zona 1 del ejercicio 1: Uma').props.disabled,true);
    find(view,'Zona 1 del ejercicio 1: Uma').props.onDrop({preventDefault(){},dataTransfer:{getData:()=> 'Maki'}});assert.equal(view.answers()[1].textos['b-uma'],'Uma');
});

test('detail labels and highlighted choices remain independent and only successful activities lock',async()=>{
    const ids=['b-nawi','b-rinri','b-shimi','b-kiru','b-hallu','b-chaki-washa'],words=['Ñawi','Rinri','Shimi','Kiru','Hallu','Chaki washa'];
    const view=await screen([exercise(1,'details',ids.map(id=>row(id,'Imagen',words)),2),exercise(2,'recognize',[row('b-kunkuri','Zona',['Washa','Kunkuri','Wiksa'])],2)]);
    for(let i=0;i<6;i++){button(view,words[i]).props.onClick();find(view,`Zona ${i+1} del ejercicio 2: sin etiqueta`).props.onClick()}
    assert.equal(view.complete(1),true);view.grade(1,Object.fromEntries(ids.map(id=>[id,true])));
    assert.equal(find(view,'Zona 1 del ejercicio 2: Ñawi').props.disabled,true);assert.equal(find(view,'Nombre de la zona 1').props.disabled,false);
    find(view,'Nombre de la zona 1').props.onChange({target:{value:'Washa'}});view.grade(2,{'b-kunkuri':false});assert.ok(text(view.render()).includes('Actividad 3: revisa'));
    assert.notEqual(view.scene('b-nawi').props.style.backgroundPosition,view.scene('b-rinri').props.style.backgroundPosition);
});

test('listening uses three existing word recordings, hides answers in status and handles missing audio',async()=>{
    const view=await screen([exercise(1,'listen',[1,2,3].map(i=>row('b-audio-'+i,'Audio '+i)),3)]);
    for(const[i,file]of ['rinri','maki','chaki-washa'].entries()){find(view,`Escuchar audio ${i+1} del ejercicio 4`).props.onClick();assert.equal(view.audios.at(-1).src,`/campus/audios/modulo-2/unidad-2/partes/${file}.mp3`);assert.ok(!text(view.render()).includes(file));if(i)assert.equal(view.audios.at(-2).paused,true)}
    view.audios.at(-1).reject(Error('missing'));await new Promise(resolve=>setImmediate(resolve));assert.ok(text(view.render()).includes('No se pudo reproducir'));
    for(const[i,value]of ['rinri','maki','   '].entries())find(view,`Palabra del audio ${i+1}`).props.onChange({target:{value}});
    assert.equal(view.complete(1),false);find(view,'Palabra del audio 3').props.onChange({target:{value:'chaki washa'}});assert.equal(view.complete(1),true);
    find(view,'Escuchar audio 3 del ejercicio 4').props.onClick();view.unmount();assert.equal(view.audios.at(-1).paused,true);
});

test('the four sentence audios use three new recordings and the existing foot example',async()=>{
    const ids=['head','belly','foot','throat'];
    const view=await screen([exercise(1,'understand',ids.map(id=>row('b-sentence-'+id,'Oración',['Uno','Dos','Tres','Cuatro'])),3)]);
    const paths=['oraciones/me-duele-la-cabeza','oraciones/mi-papa-tiene-mucha-barriga','ejemplos/me-duele-el-pie','oraciones/me-duele-la-garganta'];
    for(let i=0;i<4;i++){find(view,`Escuchar audio ${i+1} del ejercicio 5`).props.onClick();assert.equal(view.audios.at(-1).src,`/campus/audios/modulo-2/unidad-2/${paths[i]}.mp3`);find(view,`Significado de la oración ${i+1}`).props.onChange({target:{value:['Uno','Dos','Tres','Cuatro'][i]}})}
    assert.equal(view.complete(1),true);
});

test('ordering requires every word, supports removal and resets one sentence without changing its neighbor',async()=>{
    const view=await screen([exercise(1,'order',[row('b-sentence-head','Me duele la cabeza',['nanan','Ñukatami','umata']),row('b-sentence-belly','Mi papá tiene mucha barriga',['sapami','Ñuka','wiksa','yayaka'])],4)]);
    for(const word of ['Ñukatami','umata'])button(view,word).props.onClick();assert.equal(view.complete(1),false);button(view,'nanan').props.onClick();
    for(const word of ['Ñuka','yayaka','wiksa','sapami'])button(view,word).props.onClick();assert.equal(view.complete(1),true);
    find(view,'Quitar umata de la oración 1').props.onClick();assert.equal(view.complete(1),false);find(view,'Reiniciar oración 1').props.onClick();assert.equal(view.answers()[1].textos['b-sentence-head'],'');assert.equal(view.answers()[1].textos['b-sentence-belly'],'Ñuka yayaka wiksa sapami');
});
