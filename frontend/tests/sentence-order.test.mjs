import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {transformWithOxc} from 'vite';
const {code}=await transformWithOxc(await readFile(new URL('../src/js/components/SentenceOrderPanel.tsx',import.meta.url),'utf8'),'SentenceOrderPanel.tsx');
const jsx=(type,props)=>({type,props});
function nodes(tree){if(Array.isArray(tree))return tree.flatMap(nodes);return tree?.props?[tree,...nodes(tree.props.children)]:[];}
async function screen(){
 const context=vm.createContext({});const module=new vm.SourceTextModule(code,{context});
 await module.link(specifier=>{const values=specifier.includes('jsx-runtime')?{jsx,jsxs:jsx}:specifier.includes('ExerciseCard')?{mediaUrl:p=>'/api/media/'+p,feedbackMessage:s=>s}:{CheckCircle2:'CheckCircle2',RotateCcw:'RotateCcw'};return new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v)},{context})});await module.evaluate();
 const exercises=[1,2].map(id=>({id,elements:[{id:'c',texto:'mamita'},{id:'a',texto:'Kishpichiway'},{id:'b',texto:'pacha'}],config:{context_text:'Perdón madre tierra',context_meaning:'Oración '+id,prompt_image:'order.webp'}}));
 const answers={},feedback={};let busy=false;
 return{answers,feedback,exercises,busy(value){busy=value},render(){return module.namespace.SentenceOrderPanel({exercises,answers,feedback,busy,onChange(e,a){answers[e.id]=a;delete feedback[e.id]}})}};
}
test('word tiles build independent sentences, can be removed and reset, and lock only successful answers',async()=>{
 const view=await screen();const cards=()=>nodes(view.render()).filter(n=>n.type==='article');
 const word=(card,text)=>nodes(cards()[card]).find(n=>n.type==='button'&&n.props.children===text&&!n.props['aria-label']);
 word(0,'Kishpichiway').props.onClick();word(0,'pacha').props.onClick();
 assert.deepEqual(Array.from(view.answers[1].orden),['a','b']);assert.equal(view.answers[2],undefined);
 const remove=nodes(cards()[0]).find(n=>n.props['aria-label']==='Quitar Kishpichiway, posición 1');remove.props.onClick();
 assert.deepEqual(Array.from(view.answers[1].orden),['b']);
 nodes(cards()[0]).find(n=>n.props['aria-label']==='Reiniciar Oración 1').props.onClick();assert.equal(view.answers[1].orden.length,0);
 for(const text of ['Kishpichiway','pacha','mamita'])word(0,text).props.onClick();
 view.feedback[1]={is_correct:true,feedback:'Correct'};view.feedback[2]={is_correct:false,feedback:'Try again'};
 assert.equal(nodes(cards()[0]).find(n=>n.type==='fieldset').props.disabled,true);
 assert.equal(nodes(cards()[1]).find(n=>n.type==='fieldset').props.disabled,false);
 const saved=JSON.stringify(view.answers[1]);nodes(cards()[0]).find(n=>n.props['aria-label']==='Reiniciar Oración 1').props.onClick();assert.equal(JSON.stringify(view.answers[1]),saved);
 assert.equal(nodes(view.render()).find(n=>n.type==='progress').props.value,1);
 assert.equal(nodes(view.render()).filter(n=>n.type==='img').length,2);
 view.busy(true);assert.ok(nodes(view.render()).filter(n=>n.type==='fieldset').every(n=>n.props.disabled));
});
