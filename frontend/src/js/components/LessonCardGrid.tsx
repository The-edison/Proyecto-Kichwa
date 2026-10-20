import { useLayoutEffect, useRef, type ReactNode } from 'react';

export function LessonCardGrid({ children, className = 'cometa-lesson-cards' }: { children: ReactNode; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const grid = ref.current;
        if (!grid || typeof ResizeObserver === 'undefined') return;
        const desktop = window.matchMedia('(min-width: 701px)');
        const cards = Array.from(grid.children) as HTMLElement[];
        let frame = 0;
        const pack = () => {
            const gap = parseFloat(getComputedStyle(grid).columnGap) || 20;
            const spans = cards.map(card => Math.ceil(card.getBoundingClientRect().height + gap));
            grid.classList.toggle('is-packed', desktop.matches);
            cards.forEach((card, index) => {
                const span = desktop.matches ? `span ${spans[index]}` : '';
                if (card.style.gridRowEnd !== span) card.style.gridRowEnd = span;
            });
        };
        const observer = new ResizeObserver(() => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(pack);
        });
        cards.forEach(card => observer.observe(card));
        desktop.addEventListener('change', pack);
        pack();
        return () => {
            observer.disconnect();
            cancelAnimationFrame(frame);
            desktop.removeEventListener('change', pack);
        };
    }, []);

    return <div ref={ref} className={`${className} lesson-card-grid`}>{children}</div>;
}
