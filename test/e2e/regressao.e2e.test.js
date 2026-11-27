'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const h = require('./helpers');

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

test('R1 navegação pelas quatro abas', () =>
  comApp(async ({ page }) => {
    const titulos = {
      inicio: 'Visão geral do estoque',
      produtos: 'Catálogo de produtos',
      movimentacoes: 'Entradas e saídas',
      sobre: 'Conheça o StockLab',
    };
    for (const [aba, titulo] of Object.entries(titulos)) {
      await page.click(`.nav-link[data-tab="${aba}"]`);
      assert.equal(await h.texto(page, '#page-title'), titulo);
    }
  }));

test('R2 cadastro de produto', () =>
  comApp(async ({ page }) => {
    await page.click('#add-btn');
    await page.fill('#input-name', 'Produto Teste');
    await page.fill('#input-sku', 'TST-001');
    await page.fill('#input-price', '10');
    await page.fill('#input-stock', '10');
    await page.click('#product-form button[type="submit"]');
    assert.equal(await h.texto(page, '#metric-products'), '9');
    assert.equal(await h.texto(page, '#metric-units'), '71');
    assert.equal(await h.texto(page, '#toast'), 'Produto cadastrado.');
  }));

test('R3 busca e filtro de categoria', () =>
  comApp(async ({ page }) => {
    await page.click('.nav-link[data-tab="produtos"]');
    await page.fill('#search-input', 'ACE');
    assert.equal(
      await h.texto(page, '#table-summary'),
      'Exibindo 3 de 8 produto(s)',
    );
    await page.fill('#search-input', '');
    await page.selectOption('#category-filter', 'Escritório');
    assert.equal(
      await h.texto(page, '#table-summary'),
      'Exibindo 2 de 8 produto(s)',
    );
  }));

test('R4 exportação CSV respeita o filtro', () =>
  comApp(async ({ page }) => {
    await page.click('.nav-link[data-tab="produtos"]');
    await page.fill('#search-input', 'ACE');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#export-btn'),
    ]);
    assert.equal(download.suggestedFilename(), 'stocklab-produtos.csv');
    const conteudo = fs.readFileSync(await download.path(), 'utf8');
    assert.equal(conteudo.startsWith('﻿'), true, 'BOM no início');
    const linhas = conteudo.replace('﻿', '').split('\r\n');
    assert.equal(linhas.length, 4);
    for (const linha of linhas.slice(1)) assert.match(linha, /ACE-/);
  }));

test('R5 restaurar dados da demonstração', () =>
  comApp(async ({ page }) => {
    await h.registrarMovimentacao(page, {
      produtoId: 2,
      tipo: 'saida',
      quantidade: 2,
    });
    assert.equal(await h.saldoDe(page, 'Mouse sem fio Pro'), '1');
    page.once('dialog', (d) => d.accept());
    await page.click('#reset-btn');
    assert.equal(await h.texto(page, '#metric-products'), '8');
    assert.equal(await h.texto(page, '#metric-units'), '61');
    assert.equal(await h.linhasHistorico(page), 3);
    assert.equal(await h.saldoDe(page, 'Mouse sem fio Pro'), '3');
    assert.equal(
      await h.texto(page, '#toast'),
      'Dados da demonstração restaurados.',
    );
  }));

test('R6 (parcial) diálogo de movimentação cabe em 390x844', () =>
  comApp(
    async ({ page }) => {
      await h.abrirDialogoMovimentacao(page);
      const caixa = await page.locator('#movement-dialog').boundingBox();
      assert.ok(caixa.x >= 0, `x=${caixa.x}`);
      assert.ok(
        caixa.x + caixa.width <= 390,
        `direita=${caixa.x + caixa.width}`,
      );
      const largura = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      assert.ok(largura <= 390, `scrollWidth=${largura}`);
    },
    { viewport: { width: 390, height: 844 } },
  ));
