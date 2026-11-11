import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const cspHeader = 'Content-Security-Policy-Report-Only';

export function createCspPolicy(html, apiOrigin = null) {
    const hashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
        .filter(match => !/\bsrc\s*=/i.test(match[1]) && match[2].trim())
        // HTML parsing normalizes CRLF/CR before the browser checks a script hash.
        .map(match => `'sha256-${createHash('sha256').update(match[2].replace(/\r\n?/g, '\n')).digest('base64')}'`);
    const connections = ["'self'"];
    if (apiOrigin) connections.push(new URL(apiOrigin).origin);

    return [
        "default-src 'self'",
        "base-uri 'none'",
        "object-src 'none'",
        `script-src 'self' ${[...new Set(hashes)].join(' ')}`.trim(),
        "script-src-attr 'none'",
        "style-src 'self'",
        "style-src-elem 'self'",
        "style-src-attr 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self'",
        "media-src 'self'",
        `connect-src ${connections.join(' ')}`,
        'frame-src https://www.youtube-nocookie.com',
        "frame-ancestors 'none'",
        "form-action 'self'",
        "worker-src 'none'",
    ].join('; ');
}

export function cspReportOnlyPlugin() {
    let config;
    return {
        name: 'yachay-csp-report-only',
        configResolved(resolved) { config = resolved; },
        async writeBundle(options) {
            const directory = resolve(config.root, options.dir ?? config.build.outDir);
            const policy = createCspPolicy(await readFile(resolve(directory, 'index.html'), 'utf8'));
            await writeFile(resolve(directory, 'csp-report-only.nginx.conf'),
                `# Generated from this build's index.html. Include in Yachay's HTML location only.\nadd_header ${cspHeader} "${policy}" always;\n`);
            await writeFile(resolve(directory, 'csp-report-only.traefik.yml'),
                `# Attach only to Yachay's existing router; preserve its other middlewares.\nhttp:\n  middlewares:\n    yachay-csp-report-only:\n      headers:\n        contentSecurityPolicyReportOnly: "${policy}"\n`);
        },
        async configurePreviewServer(server) {
            const html = await readFile(resolve(server.config.root, server.config.build.outDir, 'index.html'), 'utf8');
            const policy = createCspPolicy(html, server.config.env.VITE_API_URL || 'http://127.0.0.1:8000');
            server.middlewares.use((_request, response, next) => {
                response.setHeader(cspHeader, policy);
                next();
            });
        },
    };
}
