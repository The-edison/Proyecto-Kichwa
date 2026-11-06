import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {transformWithOxc} from 'vite';
const {code}=await transformWithOxc(await readFile(new URL('../src/js/components/VerbalPractice.tsx',import.meta.url),'utf8'),'VerbalPractice.tsx');
const jsx=(type,props)=>({type,props});
function nodes(tree){return Array.isArray(tree)?tree.flatMap(nodes):tree?.props?[tree,...nodes(tree.props.children)]:[];}
async function practice(activity,elements,config={}){
    let selected='',answer={},feedback,busy=false;
    const context=vm.createContext({});
    const module=new vm.SourceTextModule(code,{context});
    await module.link(specifier=>{
        const values=specifier==='react'?{useState:initial=>[selected||initial,value=>{selected=value;}]}:specifier==='react/jsx-runtime'?{jsx,jsxs:jsx,Fragment:'fragment'}:specifier==='lucide-react'?{RotateCcw:'RotateCcw'}:specifier.endsWith('/MorphemePractice')?{MorphemePractice:'MorphemePractice'}:specifier.endsWith('/VerbalIllustration')?{VerbalIllustration:'VerbalIllustration'}:specifier.endsWith('/MatchingLines')?{MatchingLines:'MatchingLines'}:{};
        return new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v);},{context});
    });
    await module.evaluate();
    return {render:()=>module.namespace.VerbalPractice({exercise:{id:3,config:{verbal_practice:activity,...config},elements},answer,feedback,busy,onChange:value=>{answer=value;}}),answer:()=>JSON.parse(JSON.stringify(answer)),lock:()=>{feedback={is_correct:true};},tiles:props=>module.namespace.VerbalWordTiles(props)};
}

test('word blocks support clicking, removing, resetting and scoped drag and drop',async()=>{
    const view=await practice(2,[]);
    let value='';
    const render=()=>view.tiles({item:{id:'build',texto:'mikukuni',opciones:['ni','miku','ku']},value,disabled:false,onChange:next=>{value=next;}});
    const bank=()=>nodes(render()).find(node=>node.props.className==='verbal-tile-bank');
    for(const word of ['miku','ku','ni'])nodes(bank()).find(node=>node.type==='button'&&node.props.children===word).props.onClick();
    assert.equal(value,'miku ku ni');
    assert.ok(nodes(bank()).filter(node=>node.type==='button').every(node=>node.props.disabled));
    nodes(render()).find(node=>node.props['aria-label']==='Quitar ku').props.onClick();
    assert.equal(value,'miku ni');
    nodes(render()).find(node=>node.props['aria-label']==='Reiniciar mikukuni').props.onClick();
    const drop=()=>nodes(render()).find(node=>node.props.className==='verbal-tile-slots');
    drop().props.onDrop({preventDefault(){},dataTransfer:{getData:()=> 'different:miku'}});
    assert.equal(value,'');
    for(const word of ['miku','ku','ni'])drop().props.onDrop({preventDefault(){},dataTransfer:{getData:()=>`build:${word}`}});
    assert.equal(value,'miku ku ni');
    assert.ok(nodes(render()).some(node=>node.type==='strong'&&node.props.children==='mikukuni'));
    const locked=view.tiles({item:{id:'build',texto:'mikukuni',opciones:['ni','miku','ku']},value,disabled:true,onChange:()=>{throw Error('Locked');}});
    assert.ok(nodes(locked).filter(node=>node.type==='button').every(node=>node.props.disabled));
});

test('activity 2 shows four independent segmentation exercises and no word-building tasks',async()=>{
    const elements=[['miku-parts','mikukuni',['ni','ku','miku']],['wasi-parts','wasiku',['ku','wasi']],['wawa-parts','wawaku',['ku','wawa']],['mashi-parts','mashiku',['ku','mashi']]].map(([id,texto,opciones])=>({id,texto,opciones}));
    const page=await practice(2,elements);
    const tasks=()=>nodes(page.render()).filter(node=>typeof node.type==='function'&&node.props.item);
    assert.equal(tasks().length,4);
    assert.ok(tasks().every(node=>node.props.separate===true));
    assert.deepEqual(tasks().map(node=>node.props.item.id),elements.map(item=>item.id));
    for(const task of tasks()){
        const value=task.props.item.id==='miku-parts'?'miku ku ni':task.props.item.texto.slice(0,-2)+' ku';
        tasks().find(node=>node.props.item.id===task.props.item.id).props.onChange(value);
    }
    assert.deepEqual(page.answer(),{textos:{'miku-parts':'miku ku ni','wasi-parts':'wasi ku','wawa-parts':'wawa ku','mashi-parts':'mashi ku'}});
    assert.equal(nodes(page.render()).filter(node=>node.type==='h2').length,4);
});

test('sentence and morpheme choices save independent answers and lock after grading',async()=>{
    for(const activity of [5,7]){
        const elements=activity===5?[{id:'shamu',texto:'Mañana, _____ todos.',opciones:['Shamuy','Shamuychi']},{id:'hapi',texto:'Todos, _____ al gato.',opciones:['Hapichi','Hapina']}]:[{id:'warmi',texto:'Warmiku',opciones:['ku','chi','naya','pay']},{id:'killka',texto:'Killkanayan',opciones:['ku','chi','naya','pay']}];
        const page=await practice(activity,elements);
        const inputs=()=>nodes(page.render()).filter(node=>node.type==='input');
        const expected=activity===5?['Shamuychi','Hapichi']:['ku','naya'];
        for(let i=0;i<elements.length;i++)inputs().find(node=>node.props.name===`verbal-3-${elements[i].id}`&&node.props.value===expected[i]).props.onChange();
        assert.deepEqual(page.answer(),{textos:Object.fromEntries(elements.map((item,i)=>[item.id,expected[i]]))});
        page.lock();
        assert.ok(nodes(page.render()).filter(node=>node.type==='fieldset').every(node=>node.props.disabled));
    }
});

test('sentence cards display Kichwa first, Spanish underneath and keep the selected answer for grading',async()=>{
    const page=await practice(5,[{id:'shamu',texto:'Kaya tukuykuna _____.',opciones:['Shamuy','Shamuychi']}],{verbal_sentence_meanings:{shamu:'Mañana vengan todos.'}});
    let paragraphs=nodes(page.render()).filter(node=>node.type==='p');
    assert.equal(paragraphs[0].props.lang,'qu');
    assert.equal(paragraphs[0].props.children[0],'Kaya tukuykuna ');
    assert.equal(paragraphs[1].props.lang,'es');
    assert.equal(paragraphs[1].props.children,'Mañana vengan todos.');
    nodes(page.render()).find(node=>node.type==='input'&&node.props.value==='Shamuychi').props.onChange();
    assert.deepEqual(page.answer(),{textos:{shamu:'Shamuychi'}});
    paragraphs=nodes(page.render()).filter(node=>node.type==='p');
    assert.equal(nodes(paragraphs[0]).find(node=>node.type==='strong').props.children,'shamuychi');
});

test('integrative matching prevents duplicate destinations and keeps segments and the final answer',async()=>{
    const elements=[{id:'segments',texto:'mikukuni',opciones:['ku','ni','miku']},...['chi','naya','pay'].map(id=>({id,texto:'-'+id,opciones:['cortesia','causa','deseo']})),{id:'ku-function',texto:'¿Qué expresa -ku?',opciones:['causa','curso','deseo']}];
    const page=await practice(8,elements);
    const origin=id=>nodes(page.render()).find(node=>node.props['data-matching-origin']===id);
    const destination=id=>nodes(page.render()).find(node=>node.props['data-matching-destination']===id);
    origin('chi').props.onClick();destination('causa').props.onClick();
    origin('naya').props.onClick();destination('causa').props.onClick();
    assert.equal(page.answer().textos.chi,'');
    assert.equal(page.answer().textos.naya,'causa');
    for(const[id,value]of [['chi','causa'],['naya','deseo'],['pay','cortesia']]){origin(id).props.onClick();destination(value).props.onClick();}
    nodes(page.render()).find(node=>typeof node.type==='function'&&node.props.item?.id==='segments').props.onChange('miku ku ni');
    nodes(page.render()).find(node=>node.type==='input'&&node.props.value==='curso').props.onChange();
    assert.deepEqual(page.answer(),{textos:{chi:'causa',naya:'deseo',pay:'cortesia',segments:'miku ku ni','ku-function':'curso'}});
});
