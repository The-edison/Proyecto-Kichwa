import { useLayoutEffect, type RefObject } from 'react';
import '../../css/exercise-viewport.css';

export function fitExerciseScale(preferred: number, fits: (scale: number) => boolean): number {
    if (fits(preferred)) return preferred;
    let lower = 0.72;
    let upper = preferred;
    for (let iteration = 0; iteration < 9; iteration++) {
        const candidate = (lower + upper) / 2;
        if (fits(candidate)) lower = candidate;
        else upper = candidate;
    }
    return Math.floor(lower * 1000) / 1000;
}

export function useExerciseViewport(ref: RefObject<HTMLElement | null>, active: boolean, page: number) {
    useLayoutEffect(() => {
        const root = ref.current;
        const canvas = root?.querySelector<HTMLElement>(':scope > .guided-page-turn');
        if (!root || !canvas || !active) return;
        let frame = 0;
        let disposed = false;
        function clear() {
            delete root!.dataset.exerciseFit;
            canvas!.style.removeProperty('zoom');
            canvas!.style.removeProperty('width');
            canvas!.style.removeProperty('height');
            root!.style.removeProperty('overflow-y');
            root!.style.removeProperty('--exercise-room-height');
        }
        function layout() {
            frame = 0;
            if (disposed) return;
            if (window.innerWidth <= 900) { clear(); return; }
            // Measure the final desktop width, rather than the narrower reading layout.
            root!.dataset.exerciseFit = 'desktop';
            root!.style.overflowY = 'hidden';
            const style = getComputedStyle(root!);
            const width = root!.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
            const height = root!.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
            if (width < 1 || height < 1) return;
            root!.style.setProperty('--exercise-room-height', `${height}px`);
            function apply(scale: number) {
                canvas!.style.setProperty('zoom', String(scale));
                canvas!.style.width = `${width / scale}px`;
                canvas!.style.height = `${height / scale}px`;
            }
            function fits(scale: number) {
                apply(scale);
                // Layout dimensions stay stable while the entrance animation runs.
                return canvas!.scrollHeight <= height / scale + 2 && canvas!.scrollWidth <= width / scale + 2 && canvas!.offsetWidth <= width / scale + 2
                    && [...canvas!.querySelectorAll<HTMLElement>('fieldset,label,article,.morpheme-practice')].every(element => !element.getClientRects().length || element.scrollHeight <= element.clientHeight + 2);
            }
            const preferred = Math.min(1.4, Math.max(1, Math.min(width / 1000, height / 540)));
            let scale = fitExerciseScale(preferred, fits);
            let fitted = fits(scale);
            // Rounded zoom values can cross a text-wrapping boundary. Recheck the
            // actual final layout instead of leaving a barely overflowing panel.
            while (!fitted && scale > 0.72) {
                scale = Math.max(0.72, Math.round((scale - 0.02) * 1000) / 1000);
                fitted = fits(scale);
            }
            root!.style.overflowY = fitted ? 'hidden' : 'auto';
            if (!fitted) canvas!.style.height = 'auto';
        }
        function schedule() {
            if (!disposed && !frame) frame = requestAnimationFrame(layout);
        }
        const resize = new ResizeObserver(schedule);
        resize.observe(root);
        const mutation = new MutationObserver(schedule);
        mutation.observe(canvas, { childList: true, subtree: true, characterData: true });
        root.addEventListener('load', schedule, true);
        window.addEventListener('resize', schedule);
        void document.fonts.ready.then(schedule);
        layout();
        return () => {
            disposed = true;
            cancelAnimationFrame(frame);
            resize.disconnect(); mutation.disconnect();
            root.removeEventListener('load', schedule, true);
            window.removeEventListener('resize', schedule);
            clear();
        };
    }, [ref, active, page]);
}
