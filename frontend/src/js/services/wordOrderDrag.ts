import type { DragEvent } from 'react';

const format = 'application/x-yachay-word-order';

export function wordOrderDrag(scope: string, tokens: readonly string[], order: readonly string[], disabled: boolean, change: (order: string[]) => void) {
    const available = (index: number) => index >= 0 && index < tokens.length
        && tokens.slice(0, index + 1).filter(token => token === tokens[index]).length > order.filter(token => token === tokens[index]).length;
    const firstEmpty = () => { const index = order.findIndex(token => !token); return index < 0 ? order.length : index; };
    const save = (next: string[]) => { while (next.length && !next[next.length - 1]) next.pop(); change(next); };
    const place = (index: number, position: number) => {
        if (disabled || !available(index) || position < 0 || position >= tokens.length) return;
        const next = Array.from({length: Math.max(order.length, position + 1)}, (_, slot) => order[slot] ?? '');
        next[position] = tokens[index];
        save(next);
    };
    return {
        add(index: number) { place(index, firstEmpty()); },
        remove(position: number) {
            if (disabled || !order[position]) return;
            const next = [...order];
            next[position] = '';
            save(next);
        },
        placed(position: number) {
            return {
                draggable: !disabled && Boolean(order[position]),
                onDragStart(event: DragEvent<HTMLElement>) {
                    if (disabled || !order[position] || event.currentTarget?.closest?.('fieldset:disabled')) { event.preventDefault(); return; }
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData(format, JSON.stringify({scope, position}));
                },
            };
        },
        source(index: number) {
            return {
                draggable: !disabled && available(index),
                onDragStart(event: DragEvent<HTMLElement>) {
                    if (disabled || !available(index) || event.currentTarget?.closest?.('fieldset:disabled')) { event.preventDefault(); return; }
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData(format, JSON.stringify({ scope, index }));
                },
            };
        },
        target(position?: number) {
            return {
                onDragOver(event: DragEvent<HTMLElement>) {
                    if (!disabled && !event.currentTarget?.closest?.('fieldset:disabled') && Array.from(event.dataTransfer.types).includes(format)) {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                    }
                },
                onDrop(event: DragEvent<HTMLElement>) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (disabled || event.currentTarget?.closest?.('fieldset:disabled')) return;
                    try {
                        const value: unknown = JSON.parse(event.dataTransfer.getData(format));
                        const destination = position ?? firstEmpty();
                        if (!value || typeof value !== 'object' || !('scope' in value) || value.scope !== scope
                            || !Number.isInteger(destination) || destination < 0 || destination >= tokens.length) return;
                        if ('position' in value && typeof value.position === 'number' && Number.isInteger(value.position) && order[value.position]) {
                            const next = Array.from({length: Math.max(order.length, destination + 1)}, (_, slot) => order[slot] ?? '');
                            [next[destination], next[value.position]] = [next[value.position], next[destination]];
                            save(next);
                        } else if ('index' in value && typeof value.index === 'number' && Number.isInteger(value.index)) {
                            place(value.index, destination);
                        }
                    } catch {
                        // Ignore unrelated or malformed drag data without changing the answer.
                    }
                },
            };
        },
    };
}
