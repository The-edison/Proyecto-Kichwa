import { test, expect } from '@playwright/test';

const baseUrl = process.env.YACHAY_E2E_URL || 'http://127.0.0.1:5173';

test('warm course navigation reuses recent data and publication still refreshes the catalog', async ({ page }, testInfo) => {
    test.setTimeout(60000);
    const requests: string[] = [];
    let title = 'Módulo 1 Conociendo el Kichwa';
    const unit = { id: 7, module_id: 4, level_id: 1, level_name: 'Básico', module_name: title,
        title: 'Unidad 1: Aprende Kichwa', description: 'Primeros pasos', sort_order: 1, percentage: 0,
        config: { learning_mode: 'guided', guided_lesson: 'writing' } };
    await page.addInitScript(() => {
        sessionStorage.setItem('yachay.tab-session', 'navigation-performance-test');
        localStorage.setItem('yachay-level-introduction:99:1', 'complete');
    });
    await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
        requests.push(path);
        await new Promise(resolve => setTimeout(resolve, 100));
        let body: unknown = [];
        if (path === '/auth/me') body = { id: 99, name: 'Estudiante', email: 'student@example.test', role: { code: 'student' } };
        if (path === '/config') body = { google: { enabled: false } };
        if (path === '/levels') body = [{ id: 1, name: 'Básico', code: 'basic', available: true }];
        if (path === '/learning-navigation') body = [{ id: 1, name: 'Básico', available: true,
            modules: [{ id: 4, title, units: [{ id: 7, title: unit.title }] }] }];
        if (path === '/mastery') body = { xp: 0, medals: [], completed_units: [], mastered_topics: [], lessons: [] };
        if (path === '/levels/1/modules') body = { data: [{ id: 4, level_id: 1, title, description: 'Aprende paso a paso.', sort_order: 1 }], total: 1, per_page: 20, last_page: 1 };
        if (path === '/levels/1/evaluations') body = { data: [], total: 0, last_page: 1 };
        if (path === '/modules/4') body = { id: 4, level_id: 1, level_name: 'Básico', title, description: 'Aprende paso a paso.', final_evaluation: null };
        if (path === '/modules/4/units') body = { data: [unit], total: 1, per_page: 20, last_page: 1 };
        if (path === '/units/7') body = unit;
        if (path === '/units/7/guided') body = { exercises: [], total: 0, completed_count: 0 };
        await route.fulfill({ json: body });
    });
    await page.goto(`${baseUrl}/aprender`);
    await expect.poll(() => page.locator('.course-card img').first().evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.locator('.course-card').click();
    await page.locator('.learning-module-card').click();
    await page.locator('.student-unit-action').click();
    await expect(page).toHaveURL(/\/aprender\/unidad\/7$/);
    await expect(page.getByRole('region', { name: 'Contenido de la unidad' })).toBeVisible();
    await expect.poll(() => requests.filter(path => path === '/units/7/guided').length).toBeGreaterThan(0);
    await expect(page.getByRole('region', { name: 'Contenido de la unidad' })).toHaveAttribute('aria-busy', 'false');
    const coldRequests = requests.length;
    const warmStart = performance.now();
    await page.getByRole('link', { name: 'Ver módulo', exact: true }).click();
    await expect(page.locator('.student-unit-action')).toBeVisible();
    await page.locator('.learning-breadcrumb').getByRole('link', { name: 'Básico', exact: true }).click();
    await page.locator('.learning-module-card').click();
    await page.locator('.student-unit-action').click();
    await expect(page.getByRole('region', { name: 'Contenido de la unidad' })).toBeVisible();
    // Allow a redundant mount-triggered request to arrive before counting.
    await page.waitForTimeout(200);
    const warmRequests = requests.slice(coldRequests);
    await testInfo.attach('navigation-metrics', { body: JSON.stringify({ coldRequests, warmRequests, warmMs: performance.now() - warmStart }), contentType: 'application/json' });
    expect(warmRequests).toEqual([]);
    title = 'Módulo actualizado';
    await page.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'yachay:catalog-changed', newValue: 'published' })));
    await page.getByRole('link', { name: 'Ver módulo', exact: true }).click();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
});
