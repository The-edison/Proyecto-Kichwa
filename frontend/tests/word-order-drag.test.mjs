import test from 'node:test';
import assert from 'node:assert/strict';
import { wordOrderDrag, dragEvent } from './word-order-drag-helper.mjs';

test('drop uses fixed positions and supports repeated words without shifting neighboring slots', () => {
    const changes = [];
    const drag = wordOrderDrag('sentence:1', ['a', 'b', 'a'], ['b'], false, order => changes.push(order));
    const event = dragEvent();
    drag.source(0).onDragStart(event);
    drag.target(2).onDragOver(event);
    assert.equal(event.prevented, true);
    drag.target(2).onDrop(event);
    assert.deepEqual(changes, [['b', '', 'a']]);
    const updated = wordOrderDrag('sentence:1', ['a', 'b', 'a'], changes[0], false, order => changes.push(order));
    assert.equal(updated.source(0).draggable, false);
    assert.equal(updated.source(2).draggable, true);
    const second = dragEvent();
    updated.source(2).onDragStart(second);
    updated.target().onDrop(second);
    assert.deepEqual(changes[1], ['b', 'a', 'a']);
});

test('the final empty slot stays fixed, placed words move or swap, and removal leaves a hole', () => {
    let order = [];
    const make = () => wordOrderDrag('fixed', ['a','b','c','d','e','f'], order, false, next => { order = next; });
    const event = dragEvent();
    make().source(0).onDragStart(event);
    make().target(5).onDrop(event);
    assert.deepEqual(order, ['','','','','','a']);
    const placed = dragEvent();
    make().placed(5).onDragStart(placed);
    make().target(1).onDrop(placed);
    assert.deepEqual(order, ['','a']);
    const second = dragEvent();
    make().source(1).onDragStart(second);
    make().target(4).onDrop(second);
    assert.deepEqual(order, ['','a','','','b']);
    const swap = dragEvent();
    make().placed(1).onDragStart(swap);
    make().target(4).onDrop(swap);
    assert.deepEqual(order, ['','b','','','a']);
    make().remove(1);
    assert.deepEqual(order, ['','','','','a']);
    make().add(1);
    assert.deepEqual(order, ['b','','','','a']);
});

test('foreign rows, malformed data, consumed tokens and disabled exercises cannot alter the answer', () => {
    const changes = [];
    const event = dragEvent();
    wordOrderDrag('one', ['a'], [], false, next => changes.push(next)).source(0).onDragStart(event);
    for (const receiver of [wordOrderDrag('two', ['a'], [], false, next => changes.push(next)), wordOrderDrag('one', ['a'], [], true, next => changes.push(next)), wordOrderDrag('one', ['a'], ['a'], false, next => changes.push(next))]) receiver.target().onDrop(event);
    const target = wordOrderDrag('one', ['a'], [], false, next => changes.push(next)).target();
    for (const raw of ['', 'bad json', 'null', '{"scope":"one","index":999}', '{"scope":"one","index":-1}', '{"scope":"one","index":0.5}']) {
        const malformed = dragEvent();
        malformed.dataTransfer.setData('application/x-yachay-word-order', raw);
        target.onDrop(malformed);
    }
    assert.deepEqual(changes, []);
});
