import { useEffect, type AnchorHTMLAttributes } from 'react';

export function Link({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
    return <a href={href} {...props} />;
}

export function Head({ title }: { title: string }) {
    useEffect(() => {
        document.title = `${title} · Yachay`;
    }, [title]);

    return null;
}
