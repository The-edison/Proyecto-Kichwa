import { useEffect, type AnchorHTMLAttributes } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { prefetchLearningData, preloadLearningCode } from './services/learningNavigation';
export function Link({ href, onMouseEnter, onFocus, onTouchStart, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
    return <RouterLink to={href} {...props}
        onMouseEnter={event => { onMouseEnter?.(event); if (!event.defaultPrevented) preloadLearningCode(href); }}
        onFocus={event => { onFocus?.(event); if (!event.defaultPrevented) preloadLearningCode(href); }}
        onTouchStart={event => { onTouchStart?.(event); if (!event.defaultPrevented) preloadLearningCode(href); }}
        onClick={event => {
            onClick?.(event);
            if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
                && (!props.target || props.target === '_self') && props.download === undefined) prefetchLearningData(href);
        }} />;
}
export function Head({ title }: { title: string }) {
    useEffect(() => { document.title = `${title} · Yachay`; }, [title]);
    return null;
}
export function ScrollRestoration() {
    const location = useLocation();
    useEffect(() => {
        if (location.hash) requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView());
        else window.scrollTo({ top: 0, behavior: 'instant' });
    }, [location.pathname, location.hash]);
    return null;
}
