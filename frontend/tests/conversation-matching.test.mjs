import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const {code}=await transformWithOxc(await readFile(new URL('../src/js/components/ConversationMatchingExercise.tsx',import.meta.url),'utf8'),'ConversationMatchingExercise.tsx');
const jsx=(type,props)=>({type,props});
const context=vm.createContext({});
const module=new vm.SourceTextModule(code,{context});
await module.link(specifier=>{
const exports=specifier.endsWith('/useLessonAudio')?{useLessonAudio:()=>({state:{phase:'idle'},play(){}})}:specifier==='lucide-react'?{Volume2:'Volume2'}:{jsx,jsxs:jsx};
return new vm.SyntheticModule(Object.keys(exports),function(){for(const [key,value] of Object.entries(exports))this.setExport(key,value)},{context});
});
await module.evaluate();
const exercise={elements:['q','a'].flatMap(group=>[
    ...Array.from({length:6},(_,index)=>({id:`${group}-${index}`,texto:`Kichwa ${group} ${index}`,grupo:'origen'})),
    ...Array.from({length:6},(_,index)=>({id:`es-${group}-${index}`,texto:`Español ${group} ${index}`,grupo:'destino'})),
])};
function nodes(tree){if(Array.isArray(tree))return tree.flatMap(nodes);if(!tree?.props)return [];return [tree,...nodes(tree.props.children)]}
function render(props={}){return module.namespace.ConversationMatchingExercise({exercise,answer:{},selectedOrigin:'',disabled:false,onSelectOrigin(){},onPair(){},...props})}

test('conversation panels show only their six pairs in two columns',()=>{
    const tree=render();
    assert.equal(nodes(tree).filter(n=>n.props.className==='guided-matching-column').length,2);
    assert.equal(nodes(tree).filter(n=>n.type==='button').length,12);
    assert.equal(nodes(tree).some(n=>n.props['aria-label']==='Kichwa a 0'),false);
    const selected=[];
    const active=render({selectedOrigin:'q-0',onPair:id=>selected.push(id)});
    const q=nodes(active).find(n=>n.props['aria-label']==='Español q 0');
    const responsePanel=render({group:'a',selectedOrigin:'q-0'});
    const a=nodes(responsePanel).find(n=>n.props['aria-label']==='Español a 0');
    assert.equal(q.props.disabled,false);
    assert.equal(a.props.disabled,true);
    q.props.onClick();assert.deepEqual(selected,['es-q-0']);
});

test('both sides of a pair stay purple and checked blocks cannot change their answers',()=>{
    const calls=[];
    const props={answer:{pares:[{origen:'q-0',destino:'es-q-0'}]},onSelectOrigin:id=>calls.push(id),onPair:id=>calls.push(id)};
    const tree=render(props);
    for(const label of ['Kichwa q 0','Español q 0']){
        const button=nodes(tree).find(n=>n.props['aria-label']===label);
        assert.match(button.props.className,/is-paired/);
        assert.equal(button.props['aria-pressed'],true);
        button.props.onClick();
    }
    assert.deepEqual(calls,['q-0','es-q-0']);
    const locked=render({...props,disabled:true});
    assert.ok(nodes(locked).filter(n=>n.type==='fieldset').every(n=>n.props.disabled));
    nodes(locked).filter(n=>n.type==='button').forEach(n=>n.props.onClick());
    assert.equal(calls.length,2);
});
