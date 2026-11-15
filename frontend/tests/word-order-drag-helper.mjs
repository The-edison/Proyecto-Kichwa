import { readFile } from 'node:fs/promises';
import { transformWithOxc } from 'vite';

const { code } = await transformWithOxc(await readFile(new URL('../src/js/services/wordOrderDrag.ts', import.meta.url), 'utf8'), 'wordOrderDrag.ts');
export const { wordOrderDrag } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));

export function dragEvent() {
    const data = new Map();
    return {
        prevented: false, stopped: false,
        preventDefault() { this.prevented = true; },
        stopPropagation() { this.stopped = true; },
        dataTransfer: { get types() { return [...data.keys()]; }, setData: (type, value) => data.set(type, value), getData: type => data.get(type) ?? '' },
    };
}
