const { test } = require('node:test');
const assert = require('node:assert/strict');
const regras = require('../../regras.js');

const { aplicarMovimentacao } = regras;

const mouse = (stock) => ({
  id: 2,
  name: 'Mouse sem fio Pro',
  sku: 'ACE-202',
  category: 'Acessórios',
  price: 89.9,
  stock,
});
const webcam = () => ({
  id: 8,
  name: 'Webcam Full HD',
  sku: 'INF-108',
  category: 'Informática',
  price: 249,
  stock: 0,
});

const erroQuantidade = (estoque) => ({
  ok: false,
  estoque,
  campo: 'quantidade',
  erro: 'Informe uma quantidade inteira maior que zero.',
});

test('U1 (T1.1): saída de 2 com saldo 3 resulta em saldo 1', () => {
  assert.deepStrictEqual(aplicarMovimentacao(mouse(3), 'saida', 2), {
    ok: true,
    estoque: 1,
  });
});

test('U2 (T1.2): entrada de 5 com saldo 1 resulta em saldo 6', () => {
  assert.deepStrictEqual(aplicarMovimentacao(mouse(1), 'entrada', 5), {
    ok: true,
    estoque: 6,
  });
});

test('U3 (T1.3): saída de 7 com saldo 6 é recusada com mensagem específica', () => {
  assert.deepStrictEqual(aplicarMovimentacao(mouse(6), 'saida', 7), {
    ok: false,
    estoque: 6,
    campo: 'quantidade',
    erro: 'Saída de 7 un. maior que o saldo atual (6 un.) de Mouse sem fio Pro.',
  });
});

test('U4 (T1.4): saída de 6 com saldo 6 é aceita e zera o saldo (limite)', () => {
  assert.deepStrictEqual(aplicarMovimentacao(mouse(6), 'saida', 6), {
    ok: true,
    estoque: 0,
  });
});

for (const [id, quantidade] of [
  ['U5', 0],
  ['U6', -1],
  ['U7', 1.5],
]) {
  for (const tipo of ['saida', 'entrada']) {
    test(`${id} (T1.5): ${tipo} com quantidade ${quantidade} é recusada`, () => {
      assert.deepStrictEqual(
        aplicarMovimentacao(mouse(3), tipo, quantidade),
        erroQuantidade(3),
      );
    });
  }
}

for (const quantidade of [NaN, Infinity, -Infinity]) {
  test(`U8: quantidade ${quantidade} é recusada`, () => {
    assert.deepStrictEqual(
      aplicarMovimentacao(mouse(3), 'entrada', quantidade),
      erroQuantidade(3),
    );
  });
}

for (const quantidade of ['2', '', null, undefined]) {
  test(`U9: quantidade não numérica (${JSON.stringify(quantidade)}) é recusada`, () => {
    assert.deepStrictEqual(
      aplicarMovimentacao(mouse(3), 'entrada', quantidade),
      erroQuantidade(3),
    );
  });
}

test('U10: quantidade inteira não segura (2 ** 53) é recusada', () => {
  assert.deepStrictEqual(
    aplicarMovimentacao(mouse(3), 'entrada', 2 ** 53),
    erroQuantidade(3),
  );
});

test('U11 (T1.6): entrada de 3 em produto sem estoque resulta em saldo 3', () => {
  assert.deepStrictEqual(aplicarMovimentacao(webcam(), 'entrada', 3), {
    ok: true,
    estoque: 3,
  });
});

test('U12: saída de 1 em produto sem estoque é recusada', () => {
  assert.deepStrictEqual(aplicarMovimentacao(webcam(), 'saida', 1), {
    ok: false,
    estoque: 0,
    campo: 'quantidade',
    erro: 'Saída de 1 un. maior que o saldo atual (0 un.) de Webcam Full HD.',
  });
});

for (const tipo of ['transferencia', '', 'Saida', 'SAIDA', undefined]) {
  test(`U13: tipo inválido (${JSON.stringify(tipo)}) é recusado`, () => {
    assert.deepStrictEqual(aplicarMovimentacao(mouse(3), tipo, 1), {
      ok: false,
      estoque: 3,
      campo: 'tipo',
      erro: 'Tipo de operação inválido.',
    });
  });
}

const produtosInvalidos = [
  ['null', null],
  ['undefined', undefined],
  ['{}', {}],
  ['stock negativo', { name: 'X', stock: -1 }],
  ['stock decimal', { name: 'X', stock: 1.5 }],
  ['stock string', { name: 'X', stock: '3' }],
  ['sem name', { stock: 3 }],
];
for (const [rotulo, produto] of produtosInvalidos) {
  test(`U14: produto inválido (${rotulo}) é recusado`, () => {
    assert.deepStrictEqual(aplicarMovimentacao(produto, 'saida', 1), {
      ok: false,
      estoque: null,
      campo: 'produto',
      erro: 'Selecione um produto válido.',
    });
  });
}

test('U15: produto inválido tem precedência sobre tipo e quantidade', () => {
  assert.deepStrictEqual(aplicarMovimentacao(null, 'x', 0), {
    ok: false,
    estoque: null,
    campo: 'produto',
    erro: 'Selecione um produto válido.',
  });
});

test('U16: tipo inválido tem precedência sobre quantidade', () => {
  assert.deepStrictEqual(aplicarMovimentacao(mouse(3), 'x', 0), {
    ok: false,
    estoque: 3,
    campo: 'tipo',
    erro: 'Tipo de operação inválido.',
  });
});

test('U17: não muta o produto (congelado) em nenhuma chamada', () => {
  const produto = Object.freeze(mouse(3));
  for (const [tipo, quantidade] of [
    ['saida', 2],
    ['entrada', 2],
    ['saida', 9],
  ]) {
    assert.doesNotThrow(() => aplicarMovimentacao(produto, tipo, quantidade));
    assert.deepStrictEqual(produto, mouse(3));
  }
});

test('U18: retorno de sucesso tem somente as chaves ok e estoque', () => {
  const r = aplicarMovimentacao(mouse(3), 'saida', 1);
  assert.deepStrictEqual(Object.keys(r), ['ok', 'estoque']);
});

test('U19: nome do produto entra cru na mensagem (sem escape)', () => {
  const r = aplicarMovimentacao({ name: '<b>X</b>', stock: 0 }, 'saida', 1);
  assert.equal(
    r.erro,
    'Saída de 1 un. maior que o saldo atual (0 un.) de <b>X</b>.',
  );
});

test('U20: API exporta somente aplicarMovimentacao e o objeto é congelado', () => {
  assert.equal(typeof regras.aplicarMovimentacao, 'function');
  assert.deepStrictEqual(Object.keys(regras), ['aplicarMovimentacao']);
  assert.ok(Object.isFrozen(regras));
});

test('U21 (revisão de segurança): entrada que ultrapassa o maior inteiro seguro é recusada', () => {
  const produto = mouse(Number.MAX_SAFE_INTEGER);
  const r = aplicarMovimentacao(produto, 'entrada', 1);
  assert.equal(r.ok, false);
  assert.equal(r.campo, 'quantidade');
  assert.equal(r.estoque, Number.MAX_SAFE_INTEGER);
  assert.equal(
    r.erro,
    `Entrada de 1 un. ultrapassa o saldo máximo permitido (${Number.MAX_SAFE_INTEGER} un.) de Mouse sem fio Pro.`,
  );
  assert.equal(produto.stock, Number.MAX_SAFE_INTEGER);
});

test('U22 (revisão de segurança): entrada que chega exatamente ao limite é aceita', () => {
  assert.deepStrictEqual(
    aplicarMovimentacao(mouse(Number.MAX_SAFE_INTEGER - 5), 'entrada', 5),
    { ok: true, estoque: Number.MAX_SAFE_INTEGER },
  );
});

test('U23 (revisão de segurança): duas entradas gigantes não corrompem o saldo', () => {
  const primeira = aplicarMovimentacao(
    mouse(0),
    'entrada',
    Number.MAX_SAFE_INTEGER,
  );
  assert.equal(primeira.ok, true);
  const segunda = aplicarMovimentacao(
    mouse(primeira.estoque),
    'entrada',
    Number.MAX_SAFE_INTEGER,
  );
  assert.equal(segunda.ok, false);
  assert.equal(segunda.estoque, Number.MAX_SAFE_INTEGER);
});

test('U24 (revisão de segurança): saldo acima do inteiro seguro (dado adulterado) é produto inválido', () => {
  assert.deepStrictEqual(aplicarMovimentacao(mouse(2 ** 60), 'saida', 1), {
    ok: false,
    estoque: null,
    campo: 'produto',
    erro: 'Selecione um produto válido.',
  });
});
