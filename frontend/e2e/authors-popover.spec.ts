import { test, expect } from '@playwright/test';

const baseUrl = process.env.YACHAY_E2E_URL || 'http://127.0.0.1:5173';

for (const theme of ['light', 'dark']) {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 600 }]) {
        test(`authors links and dismissal work in ${theme} at ${viewport.width}px`, async ({ page }, testInfo) => {
            await page.setViewportSize(viewport);
            const errors: string[] = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.addInitScript(value => { if (window === window.top) localStorage.setItem('yachay-theme', value); }, theme);
            await page.route('**/api/**', route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/config') ? { google: { enabled: false } } : [] }));
            await page.goto(`${baseUrl}${theme === 'dark' && viewport.width === 1440 ? '/' : '/iniciar-sesion'}`);
            const trigger = page.getByRole('button', { name: 'Autores de Yachay', exact: true });
            const panel = page.getByRole('dialog', { name: 'Nuestros autores' });
            await expect(panel).not.toBeVisible();
            await trigger.click();
            await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
            await expect(panel).toBeVisible();
            await expect(trigger).toHaveAttribute('aria-expanded', 'true');
            await expect(panel.getByRole('heading', { name: 'Edgar Punina' })).toBeVisible();
            await expect(panel.getByRole('heading', { name: 'Edison Aucatoma' })).toBeVisible();
            await expect(panel.getByText('Creado en la UEB · FACAGEI')).toBeVisible();
            await expect(panel.getByRole('heading', { name: 'Desarrolladores', exact: true })).toBeVisible();
            const direction = panel.getByRole('region', { name: 'Directora', exact: true });
            await expect(direction.getByText('Ing. Monica Bonilla', { exact: true })).toBeVisible();
            await expect(direction.getByRole('link')).toHaveCount(0);
            const githubLinks = panel.getByRole('link');
            await expect(githubLinks).toHaveCount(2);
            await expect(githubLinks.nth(0)).toHaveAttribute('href', 'https://github.com/EdgarPunina');
            await expect(githubLinks.nth(1)).toHaveAttribute('href', 'https://github.com/The-edison');
            for (const link of await githubLinks.all()) {
                await expect(link).toHaveAttribute('target', '_blank');
                await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
            }
            const box = (await panel.boundingBox())!;
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.y).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
            expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
            await expect(panel).not.toContainText(/versiones anteriores/i);
            await page.screenshot({ path: testInfo.outputPath('authors.png') });
            await page.keyboard.press('Escape');
            await expect(panel).not.toBeVisible();
            await expect(trigger).toHaveAttribute('aria-expanded', 'false');
            await trigger.click();
            await panel.getByRole('button', { name: 'Cerrar autores' }).click();
            await expect(panel).not.toBeVisible();
            await trigger.focus();
            await page.keyboard.press('Enter');
            await expect(panel).toBeVisible();
            await page.locator('.public-header .brand').click();
            await expect(panel).not.toBeVisible();
            expect(errors).toEqual([]);
        });
    }
}
