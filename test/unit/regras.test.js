const { test } = require('node:test');
const assert = require('node:assert/strict');
const regras = require('../../regras.js');

const { aplicarMovimentacao, calcularValorEmEstoque } = regras;

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

test('U20: API exporta aplicarMovimentacao e calcularValorEmEstoque (nesta ordem) e o objeto é congelado', () => {
  assert.equal(typeof regras.aplicarMovimentacao, 'function');
  assert.equal(typeof regras.calcularValorEmEstoque, 'function');
  assert.deepStrictEqual(Object.keys(regras), [
    'aplicarMovimentacao',
    'calcularValorEmEstoque',
  ]);
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

// ---- calcularValorEmEstoque (issue #2) ----

const assertMonetario = (r) => {
  assert.equal(typeof r, 'number');
  assert.ok(Number.isFinite(r), `não finito: ${r}`);
  assert.ok(r >= 0 && !Object.is(r, -0), `negativo/-0: ${r}`);
  assert.equal(Number(r.toFixed(2)), r, `mais de 2 casas: ${r}`);
};

const exemplo = () => [
  { id: 1, name: 'Notebook Slim 14', price: 2899.9, stock: 7 },
  { id: 2, name: 'Mouse sem fio Pro', price: 89.9, stock: 3 },
  { id: 3, name: 'Teclado compacto', price: 159.9, stock: 12 },
  { id: 4, name: 'Caderno executivo A5', price: 27.5, stock: 4 },
  { id: 5, name: 'Monitor LED 24', price: 829, stock: 2 },
  { id: 6, name: 'Caneta gel azul', price: 7.9, stock: 28 },
  { id: 7, name: 'Hub USB-C', price: 119, stock: 5 },
  { id: 8, name: 'Webcam Full HD', price: 249, stock: 0 },
];
const valido = () => ({ price: 10, stock: 3 });

test('V1 (T2.1): dados de exemplo valem R$ 25.072,00 (preço × quantidade)', () => {
  const r = calcularValorEmEstoque(exemplo());
  assertMonetario(r);
  assert.equal(r, 25072);
});

test('V2 (T2.4): lista vazia vale 0 (e não -0)', () => {
  const r = calcularValorEmEstoque([]);
  assertMonetario(r);
  assert.equal(r, 0);
  assert.ok(Object.is(r, 0));
});

test('V3: entrada que não é array vale 0 e não lança', () => {
  const entradas = [
    undefined,
    null,
    {},
    'abc',
    42,
    { length: 1, 0: { price: 1, stock: 1 } },
  ];
  for (const e of entradas) {
    const r = calcularValorEmEstoque(e);
    assertMonetario(r);
    assert.equal(r, 0, `entrada: ${String(e)}`);
  }
});

test('V4: 0.1 + 0.2 vale 0.3 (sem erro de ponto flutuante)', () => {
  const r = calcularValorEmEstoque([
    { price: 0.1, stock: 1 },
    { price: 0.2, stock: 1 },
  ]);
  assertMonetario(r);
  assert.equal(r, 0.3);
});

test('V5: produtos que dariam erro em float valem o valor exato', () => {
  const casos = [
    [{ price: 89.9, stock: 3 }, 269.7],
    [{ price: 159.9, stock: 12 }, 1918.8],
    [{ price: 7.9, stock: 28 }, 221.2],
    [{ price: 7.9, stock: 12 }, 94.8],
  ];
  for (const [produto, esperado] of casos) {
    const r = calcularValorEmEstoque([produto]);
    assertMonetario(r);
    assert.equal(r, esperado, JSON.stringify(produto));
  }
});

test('V6 (T2.2/T2.3): o valor acompanha o saldo (saída e entrada)', () => {
  const comMouse1 = exemplo();
  comMouse1[1].stock = 1;
  const saida = calcularValorEmEstoque(comMouse1);
  assertMonetario(saida);
  assert.equal(saida, 24892.2);
  const comCaneta40 = exemplo();
  comCaneta40[5].stock = 40;
  const entrada = calcularValorEmEstoque(comCaneta40);
  assertMonetario(entrada);
  assert.equal(entrada, 25166.8);
});

test('V7: saldo zero ou preço zero contribuem 0 (nunca -0)', () => {
  const listas = [
    [{ price: 249, stock: 0 }],
    [{ price: 0, stock: 5 }],
    [{ price: -0, stock: 5 }],
  ];
  for (const lista of listas) {
    const r = calcularValorEmEstoque(lista);
    assertMonetario(r);
    assert.equal(r, 0);
    assert.ok(Object.is(r, 0));
  }
});

test('V8: preço inválido é ignorado e não afeta os demais itens', () => {
  const invalidos = [
    NaN,
    Infinity,
    -Infinity,
    -0.01,
    -10,
    '89.9',
    '',
    null,
    undefined,
    true,
    {},
    [],
  ];
  for (const p of invalidos) {
    const r = calcularValorEmEstoque([{ price: p, stock: 2 }, valido()]);
    assertMonetario(r);
    assert.equal(r, 30, `price: ${String(p)}`);
  }
});

test('V9: saldo inválido é ignorado e não afeta os demais itens', () => {
  const invalidos = [-1, 1.5, NaN, Infinity, '3', null, undefined, 2 ** 53];
  for (const s of invalidos) {
    const r = calcularValorEmEstoque([{ price: 10, stock: s }, valido()]);
    assertMonetario(r);
    assert.equal(r, 30, `stock: ${String(s)}`);
  }
});

test('V10: itens que não são objeto e posições vazias são ignorados', () => {
  const r = calcularValorEmEstoque([null, undefined, 42, 'x', [], valido()]);
  assertMonetario(r);
  assert.equal(r, 30);
  const esparso = [];
  esparso[1] = valido();
  const r2 = calcularValorEmEstoque(esparso);
  assertMonetario(r2);
  assert.equal(r2, 30);
});

test('V11: preço absurdo (centavos fora do inteiro seguro) é ignorado', () => {
  const r = calcularValorEmEstoque([{ price: 1e300, stock: 1 }, valido()]);
  assertMonetario(r);
  assert.equal(r, 30);
});

test('V12: exato no limite de Number.MAX_SAFE_INTEGER centavos', () => {
  const r = calcularValorEmEstoque([
    { price: 0.01, stock: Number.MAX_SAFE_INTEGER },
  ]);
  assertMonetario(r);
  assert.equal(r, 90071992547409.91);
});

test('V13: acima do limite seguro o resultado é finito e positivo (aproximado)', () => {
  const r = calcularValorEmEstoque([
    { price: 2899.9, stock: Number.MAX_SAFE_INTEGER },
    { price: 2899.9, stock: Number.MAX_SAFE_INTEGER },
  ]);
  assert.ok(Number.isFinite(r) && r > 0);
});

test('V14: listas grandes não acumulam erro de ponto flutuante', () => {
  const a = calcularValorEmEstoque(
    Array.from({ length: 10000 }, () => ({ price: 0.1, stock: 3 })),
  );
  assertMonetario(a);
  assert.equal(a, 3000);
  const b = calcularValorEmEstoque(
    Array.from({ length: 100000 }, () => ({ price: 89.9, stock: 3 })),
  );
  assertMonetario(b);
  assert.equal(b, 26970000);
});

test('V15: preço com 3 casas (fora do domínio) é arredondado em centavos', () => {
  const r = calcularValorEmEstoque([{ price: 0.125, stock: 4 }]);
  assertMonetario(r);
  assert.equal(r, 0.52);
});

test('V16: não muta a entrada (congelada) e é determinística', () => {
  const entrada = exemplo();
  entrada.forEach((p) => Object.freeze(p));
  Object.freeze(entrada);
  const copia = structuredClone(entrada);
  let r1;
  let r2;
  assert.doesNotThrow(() => {
    r1 = calcularValorEmEstoque(entrada);
    r2 = calcularValorEmEstoque(entrada);
  });
  assertMonetario(r1);
  assert.equal(r1, 25072);
  assert.equal(r2, r1);
  assert.deepStrictEqual(entrada, copia);
});
