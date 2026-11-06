import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {transformWithOxc} from 'vite';
const {code}=await transformWithOxc(await readFile(new URL('../src/js/hooks/useExerciseViewport.ts',import.meta.url),'utf8'),'useExerciseViewport.ts');
const context=vm.createContext({});
const module=new vm.SourceTextModule(code,{context});
await module.link(specifier=>{
    const values=specifier==='react'?{useLayoutEffect:()=>{}}:{};
    return new vm.SyntheticModule(Object.keys(values),function(){for(const[key,value]of Object.entries(values))this.setExport(key,value);},{context});
});
await module.evaluate();
const {fitExerciseScale}=module.namespace;
test('roomy exercises keep their larger preferred size',()=>{
    let calls=0;
    assert.equal(fitExerciseScale(1.4,scale=>{calls++;return scale<=1.4;}),1.4);
    assert.equal(calls,1);
});
test('a tighter viewport uses the largest size that fits without overflowing',()=>{
    let calls=0;
    const scale=fitExerciseScale(1.4,value=>{calls++;return value<=1.08;});
    assert.ok(scale<=1.08);
    assert.ok(scale>=1.077);
    assert.ok(calls<=10);
});
test('extremely small viewports retain the minimum size for the accessible overflow fallback',()=>{
    assert.equal(fitExerciseScale(1.2,()=>false),0.72);
});

test('the initial layout measures the expanded desktop width before any interaction', async()=>{
    let effect;
    let cleanup;
    const frames=[];
    const style=()=>({setProperty(name,value){this[name]=value;},removeProperty(name){delete this[name];}});
    const canvas={
        style:style(),
        get scrollHeight(){return parseFloat(this.style.height);},
        get scrollWidth(){return parseFloat(this.style.width);},
        get offsetWidth(){return parseFloat(this.style.width);},
        getBoundingClientRect(){throw Error('Entrance transforms must not affect the layout measurement');},
        querySelectorAll:()=>[],
    };
    const root={dataset:{},style:style(),clientHeight:800,
        get clientWidth(){return this.dataset.exerciseFit==='desktop'?1400:1060;},
        querySelector:()=>canvas,addEventListener(){},removeEventListener(){},
    };
    const observer=class{observe(){}disconnect(){}};
    const scope=vm.createContext({
        window:{innerWidth:1920,addEventListener(){},removeEventListener(){}},
        document:{fonts:{ready:Promise.resolve()}},
        getComputedStyle:()=>({paddingTop:'0',paddingBottom:'0',paddingLeft:'0',paddingRight:'0'}),
        ResizeObserver:observer,MutationObserver:observer,
        requestAnimationFrame:callback=>{frames.push(callback);return frames.length;},cancelAnimationFrame(){},
    });
    const hook=new vm.SourceTextModule(code,{context:scope});
    await hook.link(specifier=>{
        const values=specifier==='react'?{useLayoutEffect:callback=>{effect=callback;}}:{};
        return new vm.SyntheticModule(Object.keys(values),function(){for(const[key,value]of Object.entries(values))this.setExport(key,value);},{context:scope});
    });
    await hook.evaluate();
    hook.namespace.useExerciseViewport({current:root},true,2);
    cleanup=effect();
    assert.equal(canvas.style.zoom,'1.4');
    assert.ok(Math.abs(parseFloat(canvas.style.width)-1000)<0.001);
    assert.equal(root.style.overflowY,'hidden');
    await Promise.resolve();
    for(const callback of frames)callback();
    assert.equal(canvas.style.zoom,'1.4');
    assert.ok(Math.abs(parseFloat(canvas.style.width)-1000)<0.001);
    cleanup();
    assert.equal(root.dataset.exerciseFit,undefined);
    assert.equal(root.style['--exercise-room-height'],undefined);
});
