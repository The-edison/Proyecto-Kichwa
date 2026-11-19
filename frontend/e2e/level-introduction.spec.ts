import { test, expect } from '@playwright/test';

const baseUrl = process.env.YACHAY_E2E_URL || 'http://127.0.0.1:5173';
const levels = [
    { id: 1, name: 'Básico', code: 'basic', available: true },
    { id: 2, name: 'Intermedio', code: 'intermediate', available: true },
];

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('yachay.tab-session', 'intro-design-test'));
    await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
        let body: unknown = [];
        if (path === '/auth/me') body = { id: 99, name: 'Estudiante', email: 'student@example.test', role: { code: 'student' } };
        if (path === '/config') body = { google: { enabled: false } };
        if (path === '/levels') body = levels;
        if (path === '/learning-navigation') body = levels.map(level => ({ ...level, modules: [] }));
        if (/^\/levels\/\d+\/modules$/.test(path)) body = {
            data: [{ id: 10, title: 'Módulo 1 Conociendo el Kichwa', description: 'Descubre las unidades de tu curso.', sort_order: 1 }],
            current_page: 1, last_page: 1, per_page: 10, total: 1,
        };
        if (/\/evaluations$/.test(path)) body = { data: [], current_page: 1, last_page: 1, total: 0 };
        await route.fulfill({ json: body });
    });
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    test(`glass introduction stays inside ${viewport.width}x${viewport.height} with the course behind it`, async ({ page }) => {
        await page.setViewportSize(viewport);
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${baseUrl}/aprender/nivel/1`);
        const dialog = page.getByRole('dialog', { name: 'Video de bienvenida' });
        await expect(dialog).toBeVisible();
        await expect(page.locator('.learning-module-card')).toBeVisible();
        const box = (await dialog.boundingBox())!;
        expect(box.x).toBeGreaterThan(0);
        expect(box.y).toBeGreaterThan(0);
        expect(box.x + box.width).toBeLessThan(viewport.width);
        expect(box.y + box.height).toBeLessThan(viewport.height);
        if (viewport.width === 1440) expect(box.width).toBeCloseTo(viewport.width * .75, 0);
        expect(await dialog.evaluate(element => element.matches(':modal'))).toBe(true);
        await page.keyboard.press('Escape');
        await expect(dialog).toBeVisible();
        await page.locator('.learning-module-card').evaluate(element => (element as HTMLElement).focus());
        expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
        await page.screenshot({ path: test.info().outputPath('introduction.png') });
        expect(await page.evaluate(() => localStorage.getItem('yachay-level-introduction:99:1'))).toBeNull();
        expect(errors).toEqual([]);
    });
}

test('playback can pause and resume, and completion reveals the course and persists per level', async ({ page }) => {
    await page.goto(`${baseUrl}/aprender/nivel/1`);
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Reproducir video' }).click();
    const video = dialog.locator('video');
    await expect(video).toHaveJSProperty('paused', false);
    await expect(video).toHaveJSProperty('controls', true);
    await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(.1);
    await video.evaluate(element => element.dispatchEvent(new Event('waiting')));
    await expect(dialog.getByRole('status')).toHaveText('Cargando video…');
    await video.evaluate(element => element.dispatchEvent(new Event('playing')));
    await expect(dialog.getByRole('status')).toHaveCount(0);
    await video.evaluate(element => (element as HTMLVideoElement).pause());
    await dialog.getByRole('button', { name: /Continuar video|Reproducir video/ }).click();
    await expect(video).toHaveJSProperty('paused', false);
    await video.evaluate(element => element.dispatchEvent(new Event('ended')));
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Conociendo el Kichwa/ })).toBeVisible();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    await page.reload();
    await expect(page.locator('.learning-module-card')).toBeVisible();
    await expect(dialog).toHaveCount(0);
    await page.goto(`${baseUrl}/aprender/nivel/2`);
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('video')).toHaveAttribute('src', /nivel-intermedio(?:-[\w-]+)?\.mp4(?:\?.*)?$/);
});

test('both videos support progressive byte requests and decode audio and video', async ({ page, request }) => {
    for (const id of [1, 2]) {
        await page.goto(`${baseUrl}/aprender/nivel/${id}`);
        const dialog = page.getByRole('dialog');
        await dialog.getByRole('button', { name: 'Reproducir video' }).click();
        const video = dialog.locator('video');
        const src = (await video.getAttribute('src'))!;
        const response = await request.get(new URL(src, baseUrl).href, { headers: { Range: 'bytes=0-1023' } });
        expect(response.status()).toBe(206);
        expect((await response.body()).length).toBe(1024);
        await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(.25);
        expect(await video.evaluate(element => {
            const media = element as HTMLVideoElement;
            return { width: media.videoWidth, height: media.videoHeight, error: media.error?.code ?? null };
        })).toMatchObject({ width: 1920, height: 1080, error: null });
    }
});

for (const level of levels) {
    test(`continuous playback reaches the real end of ${level.code} and unlocks its course`, async ({ page }, testInfo) => {
        test.setTimeout(60000);
        await page.goto(`${baseUrl}/aprender/nivel/${level.id}`);
        const dialog = page.getByRole('dialog');
        await dialog.getByRole('button', { name: 'Reproducir video' }).click();
        const metrics = await dialog.locator('video').evaluate(element => new Promise<{
            frames: number; dropped: number; waiting: number; elapsed: number; duration: number;
        }>((resolve, reject) => {
            const video = element as HTMLVideoElement;
            let waiting = 0;
            const start = performance.now();
            video.addEventListener('waiting', () => { if (video.currentTime > 1) waiting++; });
            video.addEventListener('error', () => reject(new Error('Media decoding failed')), { once: true });
            video.addEventListener('ended', () => {
                const quality = video.getVideoPlaybackQuality();
                resolve({ frames: quality.totalVideoFrames, dropped: quality.droppedVideoFrames,
                    waiting, elapsed: (performance.now() - start) / 1000, duration: video.duration });
            }, { once: true });
        }));
        await testInfo.attach('playback-metrics', { body: JSON.stringify(metrics), contentType: 'application/json' });
        expect(metrics.frames).toBeGreaterThan(0);
        expect(metrics.dropped / metrics.frames).toBeLessThan(.1);
        expect(metrics.elapsed).toBeLessThan(metrics.duration + 5);
        expect(metrics.waiting).toBe(0);
        await expect(dialog).toHaveCount(0);
        expect(await page.evaluate(id => localStorage.getItem(`yachay-level-introduction:99:${id}`), level.id)).toBe('complete');
    });
}
