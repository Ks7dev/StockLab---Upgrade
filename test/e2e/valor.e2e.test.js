'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

const KEY = 'stocklab.demo.v14';
let browser;

before(async () => {
  browser = await h.iniciarNavegador();
});
after(async () => {
  await browser?.close();
});

async function comApp(fn, opts) {
  const app = await h.abrirApp(browser, opts);
  try {
    await fn(app);
    assert.equal(app.erros.length, 0, `pageerror: ${app.erros.join('; ')}`);
  } finally {
    await app.context.close();
  }
}

// toLocaleString usa NBSP entre "R$" e o número: normaliza para espaço comum.
const valor = async (page) =>
  (await h.texto(page, '#metric-value')).replace(/\s/g, ' ');
const legenda = (page) =>
  page
    .locator('.stat-card', { has: page.locator('#metric-value') })
    .locator('.stat-caption');
const irParaProdutos = (page) => page.click('.nav-link[data-tab="produtos"]');

test('EV1 carga (T2.1): valor, legenda e demais cards', () =>
  comApp(async ({ page }) => {
    assert.equal(await valor(page), 'R$ 25.072,00');
    assert.equal(
      (await legenda(page).textContent()).trim(),
      'Soma de preço × quantidade em estoque.',
    );
    const titulo = await page
      .locator('.stat-card', { has: page.locator('#metric-value') })
      .locator('.stat-heading')
      .textContent();
    assert.match(titulo, /Valor em estoque/);
    assert.equal(await h.texto(page, '#metric-products'), '8');
    assert.equal(await h.texto(page, '#metric-units'), '61');
    assert.equal(await h.texto(page, '#metric-alerts'), '4');
  }));

test('EV2 saída de 2 do Mouse (T2.2)', () =>
  comApp(async ({ page }) => {
    await h.registrarMovimentacao(page, {
      produtoId: 2,
      tipo: 'saida',
      quantidade: 2,
    });
    assert.equal(await valor(page), 'R$ 24.892,20');
    assert.equal(await h.texto(page, '#metric-units'), '59');
  }));

test('EV3 entrada de 12 da Caneta (T2.3)', () =>
  comApp(async ({ page }) => {
    await h.registrarMovimentacao(page, {
      produtoId: 6,
      tipo: 'entrada',
      quantidade: 12,
    });
    assert.equal(await valor(page), 'R$ 25.166,80');
    assert.equal(await h.texto(page, '#metric-units'), '73');
  }));

test('EV4 excluir todos os produtos (T2.4): R$ 0,00 sem sinal', () =>
  comApp(async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    await irParaProdutos(page);
    const botoes = page.locator('#product-table [data-remove]');
    let restantes = await botoes.count();
    assert.equal(restantes, 8);
    while (restantes > 0) {
      await botoes.first().click();
      restantes -= 1;
      await page.waitForFunction(
        (n) =>
          document.querySelectorAll('#product-table [data-remove]').length ===
          n,
        restantes,
      );
    }
    const v = await valor(page);
    assert.equal(v, 'R$ 0,00');
    assert.ok(!v.includes('-'), `sinal negativo: ${v}`);
    assert.equal(await h.texto(page, '#metric-products'), '0');
    assert.equal(await h.texto(page, '#metric-units'), '0');
  }));

test('EV5 persistência: valor se mantém após recarregar', () =>
  comApp(async ({ page }) => {
    await h.registrarMovimentacao(page, {
      produtoId: 2,
      tipo: 'saida',
      quantidade: 2,
    });
    await page.reload();
    assert.equal(await valor(page), 'R$ 24.892,20');
  }));

test('EV6 edição do estoque do Mouse de 3 para 5', () =>
  comApp(async ({ page }) => {
    await irParaProdutos(page);
    await page.click('[data-edit="2"]');
    await page.fill('#input-stock', '5');
    await page.click('#product-form button[type="submit"]');
    assert.equal(await valor(page), 'R$ 25.251,80');
  }));

test('EV7 exclusão do Notebook', () =>
  comApp(async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    await irParaProdutos(page);
    await page.click('[data-remove="1"]');
    assert.equal(await valor(page), 'R$ 4.772,70');
  }));

test('EV8 cadastro de produto de R$ 10 com 10 unidades', () =>
  comApp(async ({ page }) => {
    await page.click('#add-btn');
    await page.fill('#input-name', 'Produto Teste');
    await page.fill('#input-sku', 'TST-001');
    await page.fill('#input-price', '10');
    await page.fill('#input-stock', '10');
    await page.click('#product-form button[type="submit"]');
    assert.equal(await valor(page), 'R$ 25.172,00');
  }));

test('EV9 "Restaurar dados" volta ao valor inicial', () =>
  comApp(async ({ page }) => {
    await h.registrarMovimentacao(page, {
      produtoId: 2,
      tipo: 'saida',
      quantidade: 2,
    });
    assert.equal(await valor(page), 'R$ 24.892,20');
    page.once('dialog', (d) => d.accept());
    await page.click('#reset-btn');
    assert.equal(await valor(page), 'R$ 25.072,00');
  }));

test('EV10 duas abas: a outra aba atualiza o valor sem recarregar', async () => {
  const { context, page: abaA, erros } = await h.abrirApp(browser);
  try {
    const abaB = await context.newPage();
    const errosB = [];
    abaB.on('pageerror', (e) => errosB.push(e));
    await abaB.goto(h.URL_APP);

    await h.registrarMovimentacao(abaB, {
      produtoId: 2,
      tipo: 'saida',
      quantidade: 2,
    });
    await abaA.waitForFunction(() =>
      document.getElementById('metric-value').textContent.includes('24.892,20'),
    );
    assert.equal(await valor(abaA), 'R$ 24.892,20');
    assert.equal(erros.length + errosB.length, 0);
  } finally {
    await context.close();
  }
});

test('EV11 dados adulterados no localStorage não geram NaN nem negativo', () =>
  comApp(async ({ page }) => {
    await page.evaluate((key) => {
      const base = { category: 'Informática', stock: 3 };
      const produtos = [
        { id: 101, name: 'A', sku: 'A-1', price: '89.9', ...base },
        { id: 102, name: 'B', sku: 'B-1', price: 'abc', ...base },
        { id: 103, name: 'C', sku: 'C-1', price: null, ...base },
        { id: 104, name: 'D', sku: 'D-1', price: -5, ...base },
        { id: 105, name: 'E', sku: 'E-1', ...base },
        { id: 106, name: 'F', sku: 'F-1', price: 10, ...base },
        { id: 107, name: 'G', sku: 'G-1', price: 0.1, ...base },
      ];
      localStorage.setItem(
        key,
        JSON.stringify({ products: produtos, movements: [] }),
      );
    }, KEY);
    await page.reload();
    const v = await valor(page);
    assert.equal(v, 'R$ 30,30');
    assert.doesNotMatch(v, /NaN/);
    assert.doesNotMatch(v, /-R\$/);
  }));

test('EV12 celular (390 px): card visível e sem rolagem horizontal', () =>
  comApp(
    async ({ page }) => {
      await page.locator('#metric-value').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#metric-value').isVisible(), true);
      const largura = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      assert.ok(largura <= 390, `scrollWidth ${largura} > 390`);
    },
    { viewport: { width: 390, height: 844 } },
  ));
