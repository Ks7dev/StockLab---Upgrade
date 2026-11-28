'use strict';
// Achados da revisão de segurança do PR #6 (issue #1).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

const KEY = 'stocklab.demo.v14';
const SUCESSO = 'Movimentação registrada com sucesso.';
let browser;

before(async () => {
  browser = await h.iniciarNavegador();
});
after(async () => {
  await browser?.close();
});

async function preparaSaida(page, quantidade) {
  await h.abrirDialogoMovimentacao(page);
  await page.selectOption('#move-product', '2'); // Mouse sem fio Pro, saldo 3
  await page.selectOption('#move-type', 'saida');
  await page.fill('#move-quantity', String(quantidade));
}

const gravado = (page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);

test('S1 duas abas: a segunda saída (saldo já consumido pela outra aba) é recusada', async () => {
  const { context, page: abaA, erros } = await h.abrirApp(browser);
  try {
    const abaB = await context.newPage();
    const errosB = [];
    abaB.on('pageerror', (e) => errosB.push(e));
    await abaB.goto(h.URL_APP);

    await preparaSaida(abaA, 3);
    await preparaSaida(abaB, 3);

    await abaA.click('#movement-form button[type="submit"]');
    assert.equal(await h.texto(abaA, '#toast'), SUCESSO);

    await abaB.click('#movement-form button[type="submit"]');
    const erro = await h.texto(abaB, '#move-quantity-error');
    assert.equal(
      erro,
      'Saída de 3 un. maior que o saldo atual (0 un.) de Mouse sem fio Pro.',
    );
    assert.equal(await h.dialogoAberto(abaB), true);

    const dados = await gravado(abaA);
    assert.equal(dados.products.find((p) => p.id === 2).stock, 0);
    assert.equal(dados.movements.length, 4); // 3 de exemplo + 1 aceita
    assert.equal(erros.length + errosB.length, 0);
  } finally {
    await context.close();
  }
});

test('S2 estado defasado na própria aba: relê o armazenamento antes de decidir', async () => {
  const { context, page, erros } = await h.abrirApp(browser);
  try {
    await preparaSaida(page, 3);
    // Outro contexto zerou o saldo depois que esta aba carregou os dados.
    await page.evaluate((k) => {
      localStorage.setItem(
        k,
        JSON.stringify({
          products: [
            {
              id: 2,
              name: 'Mouse sem fio Pro',
              sku: 'ACE-202',
              category: 'Acessórios',
              price: 89.9,
              stock: 0,
            },
          ],
          movements: [],
        }),
      );
    }, KEY);
    await page.click('#movement-form button[type="submit"]');
    assert.match(
      await h.texto(page, '#move-quantity-error'),
      /maior que o saldo atual \(0 un\.\)/,
    );
    const dados = await gravado(page);
    assert.equal(dados.movements.length, 0);
    assert.equal(dados.products[0].stock, 0);
    assert.equal(erros.length, 0);
  } finally {
    await context.close();
  }
});

test('S3 entrada que estoura o maior inteiro seguro é recusada e nada é gravado', async () => {
  const { context, page, erros } = await h.abrirApp(browser);
  try {
    await h.registrarMovimentacao(page, {
      produtoId: 2,
      tipo: 'entrada',
      quantidade: '9007199254740991',
    });
    const erro = await h.texto(page, '#move-quantity-error');
    assert.match(
      erro,
      /^Entrada de 9007199254740991 un\. ultrapassa o saldo máximo permitido/,
    );
    assert.equal(await h.dialogoAberto(page), true);
    assert.equal(await gravado(page), null); // nada foi persistido
    assert.equal(erros.length, 0);
  } finally {
    await context.close();
  }
});

test('S4 regras.js não carregou: mostra aviso claro em vez de quebrar em silêncio', async () => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  try {
    const page = await context.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push(e));
    await page.route('**/regras.js', (rota) => rota.abort());
    await page.goto(h.URL_APP);
    const aviso = page.locator('.load-error[role="alert"]');
    await aviso.waitFor({ state: 'visible' });
    assert.match(await aviso.textContent(), /regras\.js/);
    assert.equal(erros.length, 0, `pageerror: ${erros.join('; ')}`);
  } finally {
    await context.close();
  }
});
