# Revisão de segurança — issue #1 / PR #6

**Escopo:** código alterado pela correção da saída de estoque (`regras.js`, `app.js`, diálogo de movimentação).
**Método:** leitura do diff + testes adversariais em Chromium real (entradas hostis, `localStorage` adulterado, DOM adulterado, duplo envio, duas abas, `regras.js` bloqueado).
**Resultado:** nenhuma vulnerabilidade explorável (XSS, injeção, segredos). Três problemas de integridade/robustez, **todos corrigidos antes do merge**.

## Achados e correções

| # | Severidade | Achado | Correção | Teste que prova |
|---|---|---|---|---|
| 1 | Média | Duas abas abertas furavam o bloqueio de saída: cada aba decidia com o saldo em memória e gravava o conjunto inteiro (atualização perdida: 6 un. retiradas de saldo 3, 1 registro no histórico) | `saveMovement` relê o `localStorage` antes de decidir; o evento `storage` atualiza telas e a prévia de saldo das outras abas | e2e S1, S2 |
| 2 | Baixa | A entrada não tinha teto: duas entradas de 9007199254740991 deixavam o saldo em 18.014.398.509.481.988 (acima do maior inteiro seguro; conta inexata) | `aplicarMovimentacao` recusa entrada cujo novo saldo não seja inteiro seguro e trata saldo não seguro como produto inválido | unit U21–U24, e2e S3 |
| 3 | Baixa | Sem `regras.js`, `app.js` quebrava com `TypeError` e os botões paravam sem mensagem | `app.js` detecta a ausência e mostra aviso `role="alert"` explicando o que fazer | e2e S4 |

Os testes novos ficam **vermelhos sem a correção** (3 unitários e 4 e2e) e verdes com ela.

## O que passou sem alteração
- XSS armazenado (`<img onerror>`, `<script>`) em nome, SKU e observação: nenhuma execução em abas, diálogo, prévia de saldo ou mensagem de erro (tudo via `textContent`/`escape`).
- Quantidades hostis: `0.5`, `-1`, `0`, vazio, `Infinity`, `1e21`, `9007199254740993`, `abc`, `-0`, `5e-1` recusadas sem alterar saldo; `1e1` e `1.0` lidos como 10 e 1.
- `localStorage` adulterado (saldo texto, negativo, decimal, nulo): a operação é recusada.
- Tipo de operação ou produto adulterados no DOM: recusados. Duplo envio imediato: sem saída duplicada.
- API de `regras.js` congelada e sem sobrescrita em runtime.
- Sem dependências (nada a auditar) e sem segredos no histórico.

## Riscos remanescentes
- **Firefox e celular real** não foram testados (só há Chromium no ambiente de testes).
- Edições de produto (`saveProduct`/`removeProduct`) ainda gravam o conjunto inteiro como antes; o evento `storage` reduz a janela de dessincronização, e a sincronização completa será tratada nas issues #3, #4 e #5.
- Dados já gravados com validação fraca na carga (`localStorage` adulterado) continuam sendo exibidos; a validação de carga fica fora do escopo desta issue.
- A página não tem Content-Security-Policy (endurecimento recomendado; app estático e local).
