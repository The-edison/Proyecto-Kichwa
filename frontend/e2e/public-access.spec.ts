import { test, expect } from '@playwright/test';

const baseUrl = process.env.YACHAY_E2E_URL || 'http://127.0.0.1:5173';

test('a visitor sees featured opinions without a session', async ({ page }) => {
    await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname;
        const body = path.endsWith('/config') ? { google: { enabled: true } }
            : path.endsWith('/comentarios/destacados') ? [{ id: 1, name: 'Ana P.', body: 'Excelente plataforma para aprender Kichwa con mi familia.', language: 'es' }] : [];
        return route.fulfill({ json: body });
    });
    await page.goto(baseUrl);
    const stories = page.locator('#historias');
    await expect(stories.getByText('Excelente plataforma para aprender Kichwa con mi familia.', { exact: false })).toBeVisible();
    await expect(stories.getByRole('heading', { name: 'Ana P.', exact: true })).toBeVisible();
    await expect(stories.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();
    await expect(stories.locator('textarea')).toHaveCount(0);
    await expect(stories.getByRole('alert')).toHaveCount(0);
});

test('a configuration connection error can be retried and does not report Google as unconfigured', async ({ page }) => {
    let connected = false;
    await page.route('**/api/config', route => route.fulfill(connected
        ? { json: { google: { enabled: true } } }
        : { status: 503, json: { message: 'Servidor temporalmente no disponible.' } }));
    await page.goto(`${baseUrl}/iniciar-sesion`);
    await expect(page.getByRole('alert')).toContainText('No se pudo consultar Google');
    await expect(page.getByText('Google no está disponible. Usa tu correo.')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Continuar con Google', exact: true })).toBeDisabled();
    connected = true;
    await page.getByRole('button', { name: 'Volver a comprobar Google' }).click();
    await expect(page.getByRole('button', { name: 'Continuar con Google', exact: true })).toBeEnabled();
    await expect(page.getByRole('alert')).toHaveCount(0);
});
