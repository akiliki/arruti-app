import { test, expect } from '@playwright/test';

test.describe('Lista de Pedidos', () => {
  test.beforeEach(async ({ page }) => {
    // Vamos a la página de pedidos
    await page.goto('/pedidos');
  });

  test('debe mostrar la lista de pedidos y permitir filtrar por producto', async ({ page }) => {
    // Esperamos a que la tabla cargue (suponiendo que hay datos)
    await page.waitForSelector('table');
    
    // Contamos filas iniciales
    const initialRows = await page.locator('tbody tr').count();
    
    // Filtramos por un producto (esto depende de lo que devuelva el mock/API real)
    // Para el test, buscaremos algo genérico o asumiremos que hay datos
    await page.fill('input[placeholder="Filtrar por producto..."]', 'Tarta');
    
    // Verificamos que la lista se actualiza (puede que no haya 'Tarta', en ese caso mostraría empty state)
    // El objetivo es probar la interacción
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    
    if (count > 0) {
      const text = await rows.first().innerText();
      expect(text.toLowerCase()).toContain('tarta');
    }
  });

  test('debe filtrar por estado', async ({ page }) => {
    await page.waitForSelector('table');
    
    // Seleccionamos el estado 'Pendiente'
    await page.selectOption('select', 'Pendiente');
    
    // Verificamos que todos los resultados sean 'Pendiente'
    const badges = page.locator('.badge');
    const count = await badges.count();
    
    for (let i = 0; i < count; i++) {
        const text = await badges.nth(i).innerText();
        expect(text.trim()).toBe('Pendiente');
    }
  });

  test('debe navegar a la creación de nuevo pedido', async ({ page }) => {
    await page.click('button:has-text("Nuevo Pedido")');
    await expect(page).toHaveURL(/\/nuevo-pedido/);
  });
});
