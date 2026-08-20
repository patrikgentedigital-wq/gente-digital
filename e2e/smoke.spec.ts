import { expect, test } from '@playwright/test';

test.describe('smoke', () => {
  test('carrega a aplicação e mostra a tela de login sem erros de console', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    await page.goto('/');
    await expect(page.getByText('Gente Digital · Análise de Desempenho')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar como líder' })).toBeVisible();

    expect(consoleErrors.filter((message) => !message.includes('favicon'))).toEqual([]);
  });
});