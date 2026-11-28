/* StockLab v1.5 - regras de negócio puras (sem DOM), usadas pelo navegador e pelo Node. */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === 'object' && module && module.exports) {
    module.exports = api;
  } else {
    raiz.StockLabRegras = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Aplica uma movimentação de estoque sem alterar o produto recebido.
   * Ordem de validação: produto, tipo, quantidade, saldo.
   * @param {{name: string, stock: number}} produto Produto com saldo inteiro seguro >= 0.
   * @param {'entrada'|'saida'} tipo Tipo da operação (exato, sem trim).
   * @param {number} quantidade Número inteiro seguro maior que zero (string não é aceita).
   * @returns {{ok: true, estoque: number} | {ok: false, estoque: number|null, campo: string, erro: string}}
   *   Novo saldo em caso de sucesso; em caso de erro, o saldo atual (null se o produto for inválido).
   */
  function aplicarMovimentacao(produto, tipo, quantidade) {
    const produtoValido =
      produto !== null &&
      typeof produto === 'object' &&
      typeof produto.name === 'string' &&
      Number.isSafeInteger(produto.stock) &&
      produto.stock >= 0;
    if (!produtoValido) {
      return {
        ok: false,
        estoque: null,
        campo: 'produto',
        erro: 'Selecione um produto válido.',
      };
    }
    if (tipo !== 'entrada' && tipo !== 'saida') {
      return {
        ok: false,
        estoque: produto.stock,
        campo: 'tipo',
        erro: 'Tipo de operação inválido.',
      };
    }
    if (
      typeof quantidade !== 'number' ||
      !Number.isSafeInteger(quantidade) ||
      quantidade <= 0
    ) {
      return {
        ok: false,
        estoque: produto.stock,
        campo: 'quantidade',
        erro: 'Informe uma quantidade inteira maior que zero.',
      };
    }
    if (tipo === 'entrada') {
      const novoSaldo = produto.stock + quantidade;
      if (!Number.isSafeInteger(novoSaldo)) {
        return {
          ok: false,
          estoque: produto.stock,
          campo: 'quantidade',
          erro: `Entrada de ${quantidade} un. ultrapassa o saldo máximo permitido (${Number.MAX_SAFE_INTEGER} un.) de ${produto.name}.`,
        };
      }
      return { ok: true, estoque: novoSaldo };
    }
    if (quantidade > produto.stock) {
      return {
        ok: false,
        estoque: produto.stock,
        campo: 'quantidade',
        erro: `Saída de ${quantidade} un. maior que o saldo atual (${produto.stock} un.) de ${produto.name}.`,
      };
    }
    return { ok: true, estoque: produto.stock - quantidade };
  }

  /**
   * Valor do estoque: soma de preço × quantidade, calculada em centavos inteiros.
   * Itens inválidos (preço não finito/negativo, saldo não inteiro seguro/negativo,
   * tipos errados) são ignorados. Exato até Number.MAX_SAFE_INTEGER centavos.
   * Reutilizável no back-end Node (ex.: GET /api/resumo).
   * @param {Array<{price: number, stock: number}>} produtos
   * @returns {number} Valor em reais (>= 0, finito, no máximo 2 casas decimais).
   */
  function calcularValorEmEstoque(produtos) {
    if (!Array.isArray(produtos)) return 0;
    let centavos = 0;
    for (const produto of produtos) {
      if (produto === null || typeof produto !== 'object') continue;
      const { price, stock } = produto;
      if (!Number.isFinite(price) || price < 0) continue;
      if (!Number.isSafeInteger(stock) || stock < 0) continue;
      const precoEmCentavos = Math.round(price * 100);
      if (!Number.isSafeInteger(precoEmCentavos)) continue;
      centavos += precoEmCentavos * stock;
    }
    return centavos / 100;
  }

  return Object.freeze({ aplicarMovimentacao, calcularValorEmEstoque });
});
