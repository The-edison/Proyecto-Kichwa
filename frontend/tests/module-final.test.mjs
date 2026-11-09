import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const source = (await transformWithOxc(await readFile(new URL('../src/js/pages/Student/ModuleFinalEvaluation.tsx', import.meta.url), 'utf8'), 'ModuleFinalEvaluation.tsx')).code;
const jsx = (type, props) => ({type, props});
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : tree?.props ? [tree, ...nodes(tree.props.children)] : [];
const text = tree => Array.isArray(tree) ? tree.map(text).join('') : tree?.props ? text(tree.props.children) : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : '';
const questions = Array.from({length:15}, (_,i) => ({id:100+i, prompt:`Situación ${i+1}`, elements:['a','b','c','d'].map(id=>({id,texto:id.toUpperCase()})), config:{max_selections:i===2 ? 2 : 1,title:`Unidad ${Math.floor(i/3)+1}`}}));
const evaluation = {id:9, module_id:8, title:'Prueba final', type:'modulo', module_final:{unlocked:true,question_count:15,pass_percentage:80}, history:[]};
async function screen(overrides={}) {
    const states=[], effects=[], timers=new Map(), requests=[];
    let cursor=0, timerId=0, failSubmit=false, failSave=false, holdStart;
    const context=vm.createContext({window:{setTimeout(fn){timers.set(++timerId,fn);return timerId},clearTimeout(id){timers.delete(id)}}});
    const dependencies={
        react:{useState(initial){const i=cursor++; if(!(i in states))states[i]=initial;return[states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value}]},useRef(initial){const i=cursor++;return states[i]??={current:initial}},useEffect(fn,deps){const i=cursor++;const old=states[i];if(!old || deps.some((dep,j)=>dep!==old.deps[j])){old?.cleanup?.();states[i]={deps};effects.push(()=>states[i].cleanup=fn())}}},
        'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},
        'lucide-react':Object.fromEntries(['Award','ArrowLeft','ArrowRight','CheckCircle2','Circle','ClipboardCheck','Save'].map(name=>[name,name])),
        navigation:{Head:'Head',Link:'Link'}, AppLayout:{AppLayout:'AppLayout'},ModuleFinalCard:{ModuleFinalCard:'ModuleFinalCard'},
        'module-final.css':{},
        api:{ApiError:class extends Error{},async apiGet(path){requests.push({method:'GET',path});return {attempt_id:77,state:'en_curso',questions,answers:{100:{seleccion:['b']}}}},async apiPatch(path,payload){requests.push({method:'PATCH',path,payload});if(failSave)throw Error('offline');return {saved:true}},async apiPost(path,payload){requests.push({method:'POST',path,payload});if(path.endsWith('/attempts')){if(holdStart)await holdStart;return {attempt_id:77,questions,answers:{}}}if(failSubmit)throw Error('offline');return {passed:true,score:80,correct_count:12,total_questions:15,xp_earned:170,xp_total:300,results:questions.map((q,i)=>({question_id:q.id,is_correct:i<12,feedback:i<12?'Bien. Explicación.':'Repasa esta idea.'}))}}},
    };
    const module=new vm.SourceTextModule(source,{context});
    await module.link(specifier=>{const key=dependencies[specifier]?specifier:specifier.split('/').at(-1);const dep=dependencies[key];assert.ok(dep,`Missing ${specifier}`);return new vm.SyntheticModule(Object.keys(dep),function(){for(const [key,value]of Object.entries(dep))this.setExport(key,value)},{context})});await module.evaluate();
    const data={...evaluation,...overrides};
    return {requests,complete:module.namespace.finalAnswerComplete,render(){cursor=0;const tree=module.namespace.default({evaluation:data});effects.splice(0).forEach(fn=>fn());return tree},failSubmit(value){failSubmit=value},failSave(value){failSave=value},holdStart(value){holdStart=value},async timers(){const callbacks=[...timers.values()];timers.clear();callbacks.forEach(fn=>fn());await new Promise(resolve=>setImmediate(resolve))}};
}
const button=(view,label)=>{const node=nodes(view.render()).find(node=>node.type==='button' && text(node)===label);assert.ok(node,`Button ${label}`);return {...node,props:{...node.props,async onClick(){await node.props.onClick();await new Promise(resolve=>setImmediate(resolve))}}}};
const choose=(view,index)=>nodes(view.render()).filter(node=>node.type==='input')[index].props.onChange();
async function answerAll(view){for(let i=0;i<15;i++){choose(view,0);if(i===2)choose(view,1);await button(view,i===14?'Revisar respuestas':'Siguiente').props.onClick()}}

test('locked evaluations show prerequisites and cannot start a request',async()=>{
    const view=await screen({module_final:{unlocked:false},history:[{id:77,number:1,state:'en_curso'}]});
    assert.ok(nodes(view.render()).some(node=>node.type==='ModuleFinalCard'));
    assert.equal(nodes(view.render()).some(node=>node.type==='button' && text(node)==='Iniciar o continuar prueba'),false);
    assert.equal(button(view,'Continuar').props.disabled,true);assert.equal(view.requests.length,0);
});
test('navigation preserves answers, exact multi selection rejects extras and answers autosave',async()=>{
    const view=await screen();await button(view,'Iniciar o continuar prueba').props.onClick();choose(view,1);
    await button(view,'Siguiente').props.onClick();choose(view,2);await button(view,'Anterior').props.onClick();
    assert.equal(nodes(view.render()).filter(node=>node.type==='input')[1].props.checked,true);
    await button(view,'Siguiente').props.onClick();await button(view,'Siguiente').props.onClick();choose(view,0);choose(view,1);choose(view,2);
    assert.deepEqual(nodes(view.render()).filter(node=>node.type==='input').map(node=>node.props.checked),[true,true,false,false]);
    assert.equal(view.complete(questions[2],{seleccion:['a']}),false);assert.equal(view.complete(questions[2],{seleccion:['a','b']}),true);
    await view.timers();const save=view.requests.filter(item=>item.method==='PATCH').at(-1);assert.equal(save.payload.answers[100].seleccion[0],'b');assert.equal(save.payload.answers[102].seleccion.length,2);
    assert.ok(text(view.render()).includes('Respuestas guardadas'));
});
test('review prevents incomplete submission and fifteen answers get server results and numbered explanations',async()=>{
    const view=await screen({level_id:3,history:[{id:76,number:1,state:'finalizado',result:{score:60}}]});await button(view,'Iniciar o continuar prueba').props.onClick();await button(view,'Revisar todo').props.onClick();assert.equal(button(view,'Finalizar y calificar').props.disabled,true);
    nodes(view.render()).find(node=>node.props['aria-label']==='Pregunta 1, pendiente').props.onClick();await answerAll(view);
    assert.equal(button(view,'Finalizar y calificar').props.disabled,false);assert.equal(text(view.render()).includes('Explicación.'),false);
    await button(view,'Finalizar y calificar').props.onClick();const submit=view.requests.find(item=>item.path.endsWith('/submit'));
    assert.equal(submit.payload.answers.length,15);assert.equal(submit.payload.answers[2].answer.seleccion.length,2);
    assert.ok(text(view.render()).includes('¡Prueba aprobada!'));assert.ok(text(view.render()).includes('80%'));assert.ok(text(view.render()).includes('13. Por repasar'));assert.ok(text(view.render()).includes('Repasa esta idea.'));assert.equal(text(view.render()).includes('Pregunta #112'),false);
    const actions=nodes(view.render()).filter(node=>node.type==='button'||node.type==='Link');
    assert.deepEqual(actions.map(text),['Reintentar','Finalizar']);
    assert.equal(actions[1].props.href,'/aprender/nivel/3');
    assert.equal(text(view.render()).includes('Tus intentos'),false);
    await button(view,'Reintentar').props.onClick();
    assert.equal(view.requests.filter(item=>item.path.endsWith('/attempts')).length,2);
    assert.equal(nodes(view.render()).filter(node=>node.type==='input'&&node.props.checked).length,0);
});
test('resuming restores drafts and save errors preserve answers for retry',async()=>{
    const view=await screen({history:[{id:77,number:1,state:'en_curso'}]});await button(view,'Continuar').props.onClick();assert.equal(nodes(view.render()).filter(node=>node.type==='input')[1].props.checked,true);
    choose(view,2);view.failSave(true);await button(view,'Guardar respuestas').props.onClick();assert.ok(nodes(view.render()).some(node=>node.props.role==='alert'));assert.equal(nodes(view.render()).filter(node=>node.type==='input')[2].props.checked,true);
    view.failSave(false);await button(view,'Guardar respuestas').props.onClick();assert.ok(text(view.render()).includes('Respuestas guardadas'));
});
test('network failure keeps the full exam ready for a safe submission retry',async()=>{
    const view=await screen();await button(view,'Iniciar o continuar prueba').props.onClick();await answerAll(view);view.failSubmit(true);await button(view,'Finalizar y calificar').props.onClick();assert.equal(button(view,'Finalizar y calificar').props.disabled,false);assert.ok(text(view.render()).includes('Tus respuestas siguen'));
    view.failSubmit(false);await button(view,'Finalizar y calificar').props.onClick();assert.ok(text(view.render()).includes('¡Prueba aprobada!'));
});
test('double clicking start only creates one request',async()=>{
    const view=await screen();let release;view.holdStart(new Promise(resolve=>release=resolve));const start=button(view,'Iniciar o continuar prueba').props.onClick;const one=start();const two=start();await new Promise(resolve=>setImmediate(resolve));assert.equal(view.requests.length,1);release();await Promise.all([one,two]);
});
