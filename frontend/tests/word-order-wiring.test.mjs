import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { transformWithOxc } from 'vite';
import { wordOrderDrag, dragEvent } from './word-order-drag-helper.mjs';

const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : tree?.props ? [tree, ...nodes(tree.props.children)] : [];
for (const [component, configKey, targetClass, byId] of [
    ['AnimalsPracticePanel', 'animal_activity', 'animals-practice-slots', false],
    ['BodyPracticePanel', 'body_activity', 'body-order-slots', false],
    ['ColorsPracticePanel', 'color_activity', 'colors-order-slots', false],
    ['PronounsPracticePanel', 'pronouns_activity', 'pronouns-order-answer', false],
    ['InteractiveSentencePractice', 'interactive_activity', 'interactive-sentence-answer', true],
    ['ExerciseCard', 'presentation', null, true],
]) {
    test(`${component} connects its draggable word bank to its answer box`, async () => {
        const { code } = await transformWithOxc(await readFile(new URL(`../src/js/components/${component}.tsx`, import.meta.url), 'utf8'), component + '.tsx');
        const context = vm.createContext({});
        const module = new vm.SourceTextModule(code, { context });
        const jsx = (type, props) => ({ type, props });
        await module.link(specifier => {
            const values = specifier.endsWith('/wordOrderDrag') ? {wordOrderDrag}
                : specifier === 'react/jsx-runtime' ? {jsx, jsxs: jsx, Fragment: 'fragment'}
                : specifier === 'react' ? {useState: initial => [initial, () => {}], useRef: initial => ({current: initial})}
                : specifier === 'lucide-react' ? Object.fromEntries(['CheckCircle2', 'RotateCcw', 'Volume2', 'Paintbrush', 'CalendarDays', 'Hash'].map(name => [name, name]))
                : specifier.endsWith('/useLessonAudio') ? {useLessonAudio: () => ({state: {phase: 'idle'}, play() {}})}
                : specifier.endsWith('/ExerciseCard') ? {mediaUrl: path => path, feedbackMessage: text => text}
                : specifier.endsWith('/ColorObjectVisual') ? {ColorObjectVisual: 'ColorObjectVisual', practiceColors: {}}
                : specifier.endsWith('/api') ? {apiPost() {}, apiBaseUrl: '', ApiError: Error}
                : specifier.endsWith('/useAnswerSound') ? {useAnswerSound: () => () => {}}
                : specifier.endsWith('.css') ? {}
                : Object.fromEntries(['LearningCompanion', 'SuccessConfetti', 'MatchingLines'].map(name => [name, name]));
            return new vm.SyntheticModule(Object.keys(values), function () { for (const [key, value] of Object.entries(values)) this.setExport(key, value); }, {context});
        });
        await module.evaluate();
        let answer;
        const elements = byId ? [{id:'w0',texto:'Ñuka'}, {id:'w1',texto:'mikuni'}] : [{id:'row',texto:'Yo como',opciones:['Ñuka','mikuni']}];
        const exercise = {id:9,type:byId?'ordenar':'completar',elements,config:{[configKey]:byId?'tiles':'order',animal_group:'domestic',body_panel:4,color_panel:5},zones:[]};
        const tree = module.namespace[component === 'ExerciseCard' ? 'ExerciseInteraction' : component]({exercise,exercises:[exercise],answer:{},answers:{},feedback:{},disabled:false,busy:false,start:1,lesson:'numbers',name:'sample',onChange:(...args) => {answer = args.at(-1);}});
        const source = nodes(tree).find(node => node.type === 'button' && node.props.draggable && node.props.children === 'Ñuka');
        assert.ok(source);
        const target = nodes(tree).find(node => targetClass ? node.props.className === targetClass : node.props['aria-label'] === 'Espacios de la palabra');
        assert.ok(target);
        const event = dragEvent();
        source.props.onDragStart(event);
        const lastSlot = nodes(target).filter(node => typeof node.props.onDrop === 'function').at(-1);
        lastSlot.props.onDrop(event);
        assert.deepEqual(JSON.parse(JSON.stringify(answer)), byId ? {orden:['','w0']} : {textos:{row:' Ñuka'}});
    });
}
