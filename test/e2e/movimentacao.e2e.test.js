'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

const MOUSE = 'Mouse sem fio Pro';
const WEBCAM = 'Webcam Full HD';
const SUCESSO = 'Movimentação registrada com sucesso.';
let browser;

before(async () => {
  browser = await h.iniciarNavegador();
});
after(async () => {
  await browser?.close();
});

async function comApp(fn) {
  const app = await h.abrirApp(browser);
  try {
    await fn(app);
    assert.equal(app.erros.length, 0, `pageerror: ${app.erros.join('; ')}`);
  } finally {
    await app.context.close();
  }
}

test('E0 carga: regras carregadas e contadores iniciais', () =>
  comApp(async ({ page }) => {
    const tipo = await page.evaluate(
      () => typeof window.StockLabRegras.aplicarMovimentacao,
    );
    assert.equal(tipo, 'function');
    assert.equal(await h.texto(page, '#metric-units'), '61');
    assert.equal(await h.texto(page, '#metric-alerts'), '4');
  }));

test('E1 sequência T1.1 a T1.4 com persistência', () =>
  comApp(async ({ page }) => {
    // T1.1 saída de 2
    await h.registrarMovimentacao(page, {
      produtoId: 2,
      tipo: 'saida',
      quantidade: 2,
    });
    assert.equal(await h.saldoDe(page, MOUSE), '1');
    assert.equal(await h.texto(page, '#metric-units'), '59');
    assert.equal(await h.linhasHistorico(page), 4);
    const primeira = await h.texto(page, '#movement-table tr');
    assert.match(primeira, /Mouse sem fio Pro/);
    assert.match(primeira, /Saída/);
    assert.match(primeira, /2/);
    assert.equal(await h.texto(page, '#toast'), SUCESSO);
    assert.equal(await h.dialogoAberto(page), false);

    // T1.2 entrada de 5
    await h.registrarMovimentacao(page, {
      produtoId: 2,
      tipo: 'entrada',
      quantidade: 5,
    });
    assert.equal(await h.saldoDe(page, MOUSE), '6');
    assert.equal(await h.texto(page, '#metric-units'), '64');
    assert.equal(await h.texto(page, '#metric-alerts'), '3');
    assert.equal(await h.linhasHistorico(page), 5);

    // T1.3 saída acima do saldo (antes, espera o toast anterior sumir)
    await page.waitForSelector('#toast:not(.visible)', { state: 'attached' });
    await h.registrarMovimentacao(page, {
      produtoId: 2,
      tipo: 'saida',
      quantidade: 7,
    });
    assert.equal(await h.dialogoAberto(page), true);
    const erro = page.locator('#move-quantity-error');
    assert.equal(await erro.isVisible(), true);
    assert.match(
      await h.texto(page, '#move-quantity-error'),
      /Saída de 7 un\. maior que o saldo atual \(6 un\.\) de Mouse sem fio Pro/,
    );
    assert.equal(
      await page.locator('#move-quantity[aria-invalid="true"]').count(),
      1,
    );
    assert.equal(await h.saldoDe(page, MOUSE), '6');
    assert.equal(await h.texto(page, '#metric-units'), '64');
    assert.equal(await h.linhasHistorico(page), 5);
    assert.equal(await page.locator('#toast.visible').count(), 0);

    // corrige para 6: erro some
    await page.fill('#move-quantity', '6');
    assert.equal(await erro.isHidden(), true);
    assert.equal(
      await page.locator('#move-quantity[aria-invalid="true"]').count(),
      0,
    );
    await page.click('#movement-form button[type="submit"]');

    // T1.4 saída até zerar
    assert.equal(await h.dialogoAberto(page), false);
    assert.equal(await h.saldoDe(page, MOUSE), '0');
    assert.equal(await h.situacaoDe(page, MOUSE), 'Sem estoque');
    const itemAlerta = page.locator('#low-stock-list .item-row', {
      hasText: MOUSE,
    });
    assert.equal(await itemAlerta.count(), 1);
    assert.match(await itemAlerta.textContent(), /0 unidade\(s\)/);
    assert.equal(await h.texto(page, '#metric-alerts'), '4');
    assert.equal(await h.texto(page, '#metric-units'), '58');
    assert.equal(await h.linhasHistorico(page), 6);

    // persistência
    await page.reload();
    assert.equal(await h.saldoDe(page, MOUSE), '0');
    assert.equal(await h.texto(page, '#metric-units'), '58');
    assert.equal(await h.linhasHistorico(page), 6);
  }));

test('E2 T1.5 quantidades inválidas são recusadas com mensagem', () =>
  comApp(async ({ page }) => {
    const casos = [
      ['saida', '0'],
      ['saida', '-1'],
      ['saida', '1.5'],
      ['saida', ''],
      ['entrada', '0'],
    ];
    for (const [tipo, quantidade] of casos) {
      await h.registrarMovimentacao(page, {
        produtoId: 2,
        tipo,
        quantidade,
      });
      const rotulo = `${tipo} "${quantidade}"`;
      assert.equal(
        await h.texto(page, '#move-quantity-error'),
        'Informe uma quantidade inteira maior que zero.',
        rotulo,
      );
      assert.equal(await h.dialogoAberto(page), true, rotulo);
      assert.equal(await h.saldoDe(page, MOUSE), '3', rotulo);
      assert.equal(await h.texto(page, '#metric-units'), '61', rotulo);
      assert.equal(await h.linhasHistorico(page), 3, rotulo);
      await page.click('[data-close="movement-dialog"].ghost');
      assert.equal(await h.dialogoAberto(page), false, rotulo);
    }
  }));

test('E3 T1.6 entrada em produto sem estoque', () =>
  comApp(async ({ page }) => {
    await h.registrarMovimentacao(page, {
      produtoId: 8,
      tipo: 'entrada',
      quantidade: 3,
    });
    assert.equal(await h.saldoDe(page, WEBCAM), '3');
    assert.equal(await h.situacaoDe(page, WEBCAM), 'Estoque baixo');
    const item = page.locator('#low-stock-list .item-row', {
      hasText: WEBCAM,
    });
    assert.equal(await item.count(), 1);
    assert.match(await item.textContent(), /3 unidade\(s\)/);
    assert.equal(await h.texto(page, '#metric-units'), '64');
    assert.equal(await h.texto(page, '#metric-alerts'), '4');
  }));

test('E4 prévia de saldo ao vivo', () =>
  comApp(async ({ page }) => {
    await h.abrirDialogoMovimentacao(page);
    await page.selectOption('#move-product', '2');
    await page.selectOption('#move-type', 'saida');
    await page.fill('#move-quantity', '2');
    assert.equal(
      await h.texto(page, '#move-balance'),
      'Saldo atual: 3 un. · Após a saída: 1 un.',
    );
    await page.fill('#move-quantity', '7');
    assert.equal(await h.texto(page, '#move-balance'), 'Saldo atual: 3 un.');
    await page.selectOption('#move-type', 'entrada');
    await page.fill('#move-quantity', '2');
    assert.equal(
      await h.texto(page, '#move-balance'),
      'Saldo atual: 3 un. · Após a entrada: 5 un.',
    );
    await page.selectOption('#move-product', '8');
    await page.selectOption('#move-type', 'saida');
    await page.fill('#move-quantity', '1');
    assert.equal(await h.texto(page, '#move-balance'), 'Saldo atual: 0 un.');
  }));

test('E5 erro some ao fechar e reabrir o diálogo', () =>
  comApp(async ({ page }) => {
    await h.registrarMovimentacao(page, {
      produtoId: 2,
      tipo: 'saida',
      quantidade: 9,
    });
    assert.equal(await page.locator('#move-quantity-error').isVisible(), true);
    await page.click('[data-close="movement-dialog"].ghost');
    await page.click('#move-btn');
    assert.equal(await page.locator('#move-quantity-error').isHidden(), true);
    assert.equal(await page.inputValue('#move-quantity'), '1');
    assert.equal(await page.locator('#move-quantity[aria-invalid]').count(), 0);
  }));

test('E6 acessibilidade do campo Quantidade', () =>
  comApp(async ({ page }) => {
    assert.equal(
      await page.locator('#move-quantity-error[role="alert"]').count(),
      1,
    );
    assert.equal(await page.locator('label[for="move-quantity"]').count(), 1);
    const descrito = await page.getAttribute(
      '#move-quantity',
      'aria-describedby',
    );
    assert.match(descrito, /move-balance/);
    assert.match(descrito, /move-quantity-error/);
    assert.equal(
      await page.locator('#move-balance[aria-live="polite"]').count(),
      1,
    );
  }));
