import { useEffect, type AnchorHTMLAttributes } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
export function Link({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
    return <RouterLink to={href} {...props} />;
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
