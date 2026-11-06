import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/components/EvaluationResultSummary.tsx', import.meta.url), 'utf8'), 'EvaluationResultSummary.tsx');
const jsx = (type, props) => ({ type, props });
const text = tree => Array.isArray(tree) ? tree.map(text).join('') : tree?.props ? text(tree.props.children) : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : '';
const context = vm.createContext({});
const module = new vm.SourceTextModule(code, { context });
await module.link(specifier => { const dep = specifier === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : {}; return new vm.SyntheticModule(Object.keys(dep), function () { for (const [key, value] of Object.entries(dep)) this.setExport(key, value); }, { context }); });
await module.evaluate();
const render = props => module.namespace.EvaluationResultSummary(props);

test('a passing result clearly states the grade, correct answers and pass threshold', () => {
    const tree = render({ result: { passed: true, score: 80, correct_count: 16, total_questions: 20 } });
    assert.equal(tree.props.role, 'status');
    const content = text(tree);
    assert.ok(content.includes('¡Prueba aprobada!'));
    assert.ok(content.includes('80 / 100'));
    assert.ok(content.includes('16 de 20 respuestas correctas'));
    assert.ok(content.includes('80% (16 aciertos)'));
});

test('a failed result says it was not approved and shows the actual grade', () => {
    const content = text(render({ result: { passed: false, score: 75, correct_count: 15, total_questions: 20 } }));
    assert.ok(content.includes('Prueba no aprobada'));
    assert.ok(content.includes('75 / 100'));
    assert.ok(content.includes('15 de 20 respuestas correctas'));
    assert.ok(content.includes('volver a intentarlo'));
});

test('unit tests can show their required correct count instead of a percentage rule', () => {
    const content = text(render({ result: { score: 83.33, correct_count: 5, total_questions: 6 }, requiredCorrect: 5 }));
    assert.ok(content.includes('¡Prueba aprobada!'));
    assert.ok(content.includes('5 de 6 respuestas correctas'));
    assert.ok(content.includes('Se necesitan 5 aciertos'));
});

test('review separates the chosen answer, correct answer and explanation using option labels', () => {
    const tree = module.namespace.EvaluationAnswerReview({
        result: { results: [{ question_id: 7, is_correct: false, correct_answer: { seleccion: ['b', 'c'] }, feedback: 'Se necesitan las dos opciones.' }] },
        questions: [{ id: 7, prompt: 'Elige dos respuestas.', elements: [{ id: 'a', texto: 'Pasado' }, { id: 'b', texto: 'Presente' }, { id: 'c', texto: 'Futuro' }] }],
        answers: { 7: { seleccion: ['a'] } },
    });
    const content = text(tree);
    assert.ok(content.includes('Pregunta 1 de 1'));
    assert.ok(content.includes('Incorrecta'));
    assert.ok(content.includes('Tu respuesta: Pasado'));
    assert.ok(content.includes('Respuesta correcta: Presente · Futuro'));
    assert.ok(content.includes('ExplicaciónSe necesitan las dos opciones.'));
    assert.equal(content.includes('undefined'), false);
});

test('review formats accepted text alternatives, ordered items and matching pairs', () => {
    const questions = [1, 2, 3].map(id => ({ id, prompt: 'Pregunta', elements: [{ id: 'a', texto: 'Inicio' }, { id: 'b', texto: 'Final' }], zones: [{ id: 'z', texto: 'Destino' }] }));
    const result = { results: [
        { question_id: 1, is_correct: true, feedback: 'Bien.', correct_answer: { textos: { a: ['Ñuka', 'ñuka'] } } },
        { question_id: 2, is_correct: true, feedback: 'Bien.', correct_answer: { orden: ['a', 'b'] } },
        { question_id: 3, is_correct: false, feedback: 'Repasa.', correct_answer: { pares: [{ origen: 'a', destino: 'z' }] } },
    ] };
    const content = text(module.namespace.EvaluationAnswerReview({ result, questions, answers: {} }));
    assert.ok(content.includes('Inicio: Ñuka / ñuka'));
    assert.ok(content.includes('Inicio → Final'));
    assert.ok(content.includes('Inicio → Destino'));
    assert.ok(content.includes('Sin respuesta'));
});
