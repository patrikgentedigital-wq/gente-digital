import { expect, test } from '@playwright/test';

function pageCount(pdf: Buffer): number {
  return (pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length;
}

test('relatório comum cabe em uma página e ignora o painel comprido', async ({ page }) => {
  await page.goto('/e2e/print-fixture/');
  await expect(page.getByRole('heading', { name: 'Pessoa Exemplo' })).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#root')).toBeHidden();
  const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  expect(pageCount(pdf)).toBe(1);
});

test('parecer longo pode usar mais de uma página', async ({ page }) => {
  await page.goto('/e2e/print-fixture/?long=1');
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  expect(pageCount(pdf)).toBeGreaterThan(1);
});
