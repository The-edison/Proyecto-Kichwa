import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, preview } from 'vite';
import { createCspPolicy, cspHeader } from '../csp-policy.mjs';

test('the candidate policy allows local resources and YouTube without allowing external scripts or eval', () => {
    const policy = createCspPolicy('<script src="/assets/app.js"></script>');
    const directives = Object.fromEntries(policy.split('; ').map(part => {
        const [name, ...sources] = part.split(' ');
        return [name, sources];
    }));
    assert.deepEqual(directives['script-src'], ["'self'"]);
    assert.deepEqual(directives['script-src-attr'], ["'none'"]);
    assert.deepEqual(directives['style-src-elem'], ["'self'"]);
    assert.deepEqual(directives['style-src-attr'], ["'unsafe-inline'"]);
    assert.deepEqual(directives['frame-src'], ['https://www.youtube-nocookie.com']);
    assert.deepEqual(directives['connect-src'], ["'self'"]);
    assert.deepEqual(directives['frame-ancestors'], ["'none'"]);
    assert.deepEqual(directives['base-uri'], ["'none'"]);
    assert.deepEqual(directives['form-action'], ["'self'"]);
    assert.ok(!policy.includes('unsafe-eval'));
    assert.ok(!policy.includes('*'));
});

test('a changed inline theme requires a different hash and external scripts do not receive hashes', () => {
    const first = createCspPolicy('<script>window.theme = "light";</script>');
    const changed = createCspPolicy('<script>window.theme = "dark";</script>');
    assert.notEqual(first, changed);
    assert.equal(createCspPolicy('<script src="/app.js">ignored</script>'), createCspPolicy(''));
    assert.equal(createCspPolicy('<script>window.theme = "light";\r\n</script>'), createCspPolicy('<script>window.theme = "light";\n</script>'));
    assert.equal(createCspPolicy('<script>window.theme = "light";\r</script>'), createCspPolicy('<script>window.theme = "light";\n</script>'));
});

test('built HTML, generated deployment policies and actual preview responses share the correct theme hash', async t => {
    const root = await mkdtemp(join(tmpdir(), 'yachay-csp-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const html = (await readFile(new URL('../index.html', import.meta.url), 'utf8'))
        .replace('/src/js/app.tsx', '/app.js');
    await writeFile(join(root, 'index.html'), html);
    await writeFile(join(root, 'app.js'), 'document.getElementById("root").textContent = "Yachay";');
    const configFile = fileURLToPath(new URL('../vite.config.js', import.meta.url));
    await build({ root, configFile, logLevel: 'silent', build: { minify: false } });
    const built = await readFile(join(root, 'dist/index.html'), 'utf8');
    const inline = [...built.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
        .find(match => !match[1].includes('src=') && match[2].includes('matchMedia'))[2];
    const hash = createHash('sha256').update(inline.replace(/\r\n?/g, '\n')).digest('base64');
    const productionPolicy = createCspPolicy(built);
    assert.ok(productionPolicy.includes(`'sha256-${hash}'`));
    assert.ok(!productionPolicy.includes('127.0.0.1'));
    const nginx = await readFile(join(root, 'dist/csp-report-only.nginx.conf'), 'utf8');
    const traefik = await readFile(join(root, 'dist/csp-report-only.traefik.yml'), 'utf8');
    assert.ok(nginx.includes(`add_header ${cspHeader} "${productionPolicy}" always;`));
    assert.ok(traefik.includes(`contentSecurityPolicyReportOnly: "${productionPolicy}"`));
    const server = await preview({ root, configFile, logLevel: 'silent', preview: { host: '127.0.0.1', port: 0, open: false } });
    t.after(() => server.httpServer.close());
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    for (const path of ['/', '/iniciar-sesion', '/aprender/unidad/1']) {
        const response = await fetch(origin + path, { headers: { Accept: 'text/html' } });
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type'), /text\/html/);
        assert.equal(response.headers.get('content-security-policy'), null);
        const policy = response.headers.get(cspHeader);
        assert.ok(policy.includes(`'sha256-${hash}'`));
        assert.ok(policy.includes("connect-src 'self' http://127.0.0.1:8000"));
        assert.equal(response.headers.get('x-frame-options'), 'DENY');
        assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
        assert.ok((await response.text()).includes(inline));
    }
});
