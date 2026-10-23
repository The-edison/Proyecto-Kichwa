import { useLayoutEffect, useRef, useState } from 'react';
import type { ExerciseAnswer, ExerciseFeedback } from '../types';

type Connection = { id: string; x1: number; y1: number; x2: number; y2: number };
const emptyPairs: NonNullable<ExerciseAnswer['pares']> = [];

export function measureConnections(pairs: NonNullable<ExerciseAnswer['pares']>, board: HTMLElement, origins: Map<string, HTMLElement>, destinations: Map<string, HTMLElement>): Connection[] {
    const bounds = board.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return [];
    const scaleX = board.offsetWidth / bounds.width;
    const scaleY = board.offsetHeight / bounds.height;
    return pairs.flatMap(pair => {
        const origin = origins.get(pair.origen)?.getBoundingClientRect();
        const destination = destinations.get(pair.destino)?.getBoundingClientRect();
        return origin && destination ? [{ id: pair.origen,
            x1: (origin.right - bounds.left) * scaleX - board.clientLeft,
            y1: (origin.top + origin.height / 2 - bounds.top) * scaleY - board.clientTop,
            x2: (destination.left - bounds.left) * scaleX - board.clientLeft,
            y2: (destination.top + destination.height / 2 - bounds.top) * scaleY - board.clientTop }] : [];
    });
}

export function MatchingLines({ pairs = emptyPairs, feedback, locked = [] }: { pairs?: ExerciseAnswer['pares']; feedback?: Partial<ExerciseFeedback>; locked?: string[] }) {
    const svg = useRef<SVGSVGElement>(null);
    const [lines, setLines] = useState<Connection[]>([]);
    useLayoutEffect(() => {
        const board = svg.current?.closest<HTMLElement>('[data-matching-board]');
        if (!board) return;
        let active = true;
        const measure = () => {
            if (!active) return;
            const origins = new Map([...board.querySelectorAll<HTMLElement>('[data-matching-origin]')].map(node => [node.dataset.matchingOrigin!, node]));
            const destinations = new Map([...board.querySelectorAll<HTMLElement>('[data-matching-destination]')].map(node => [node.dataset.matchingDestination!, node]));
            setLines(measureConnections(pairs, board, origins, destinations));
        };
        measure();
        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
        observer?.observe(board);
        board.querySelectorAll<HTMLElement>('[data-matching-origin], [data-matching-destination]').forEach(node => observer?.observe(node));
        window.addEventListener('resize', measure);
        const animatedPage = board.closest('.exercise-page-turn');
        animatedPage?.addEventListener('animationend', measure);
        void document.fonts?.ready.then(measure);
        return () => { active = false; observer?.disconnect(); window.removeEventListener('resize', measure); animatedPage?.removeEventListener('animationend', measure); };
    }, [pairs]);
    return <svg ref={svg} className="exercise-matching-lines" aria-hidden="true">{lines.map(line => {
        const middle = (line.x1 + line.x2) / 2;
        return <path key={line.id} data-connection-origin={line.id} data-answer-correct={feedback?.item_results?.[line.id] ?? (locked.includes(line.id) ? true : feedback?.is_correct)} d={`M${line.x1},${line.y1} C${middle},${line.y1} ${middle},${line.y2} ${line.x2},${line.y2}`}/>;
    })}</svg>;
}
