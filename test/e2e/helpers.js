'use strict';
const path = require('node:path');
const { execSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const URL_APP = pathToFileURL(path.resolve(__dirname, '../../index.html')).href;

// Playwright não é dependência do projeto: usa o local, se houver, ou o global.
function carregarPlaywright() {
  try {
    return require('playwright');
  } catch {}
  try {
    const raizGlobal = execSync('npm root -g').toString().trim();
    return require(path.join(raizGlobal, 'playwright'));
  } catch {}
  throw new Error(
    'Playwright não encontrado. Instale com: npm i -g playwright && npx playwright install chromium',
  );
}

// Tenta o Chromium padrão do Playwright; só se falhar usa o Chromium do
// ambiente (/opt/pw-browsers/chromium, sem sandbox).
async function iniciarNavegador() {
  const { chromium } = carregarPlaywright();
  try {
    return await chromium.launch();
  } catch {
    return await chromium.launch({
      executablePath: '/opt/pw-browsers/chromium',
      args: ['--no-sandbox'],
    });
  }
}

// Contexto novo = localStorage limpo = dados iniciais da demonstração.
async function abrirApp(browser, opts = {}) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    acceptDownloads: true,
    ...opts,
  });
  const page = await context.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e));
  await page.goto(URL_APP);
  return { context, page, erros };
}

async function abrirDialogoMovimentacao(page) {
  await page.click('.nav-link[data-tab="movimentacoes"]');
  await page.click('#move-btn');
}

async function registrarMovimentacao(page, { produtoId, tipo, quantidade }) {
  await abrirDialogoMovimentacao(page);
  await page.selectOption('#move-product', String(produtoId));
  await page.selectOption('#move-type', tipo);
  await page.fill('#move-quantity', String(quantidade));
  await page.click('#movement-form button[type="submit"]');
}

async function texto(page, seletor) {
  return (await page.locator(seletor).first().textContent()).trim();
}

function linhaDoProduto(page, nome) {
  return page.locator('#product-table tr', { hasText: nome }).first();
}

async function saldoDe(page, nome) {
  const celula = linhaDoProduto(page, nome).locator('td').nth(3);
  return (await celula.textContent()).trim();
}

async function situacaoDe(page, nome) {
  const selo = linhaDoProduto(page, nome).locator('.state-badge');
  return (await selo.textContent()).trim();
}

function linhasHistorico(page) {
  return page.locator('#movement-table tr').count();
}

function dialogoAberto(page) {
  return page.$eval('#movement-dialog', (el) => el.hasAttribute('open'));
}

module.exports = {
  URL_APP,
  carregarPlaywright,
  iniciarNavegador,
  abrirApp,
  abrirDialogoMovimentacao,
  registrarMovimentacao,
  texto,
  saldoDe,
  situacaoDe,
  linhasHistorico,
  dialogoAberto,
};
