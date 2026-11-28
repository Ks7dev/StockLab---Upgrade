# StockLab v1.5 — Roteiro de testes de regressão (1ª entrega)

**Objetivo:** confirmar que as 5 demandas da v1.5 funcionam e que o resto do sistema continua igual.
**Como executar:** abrir `index.html` no Chrome e no Firefox; usar "Restaurar dados" antes de cada bloco. Executar em largura de desktop e em largura de celular (DevTools, 390 px).
**Dados de partida (restaurados):** 8 produtos, 61 unidades, 4 produtos em alerta, 3 movimentações.

| Produto | SKU | Preço | Estoque |
|---|---|---|---|
| Notebook Slim 14 | INF-101 | 2899,90 | 7 |
| Mouse sem fio Pro | ACE-202 | 89,90 | 3 |
| Teclado compacto | ACE-203 | 159,90 | 12 |
| Caderno executivo A5 | ESC-104 | 27,50 | 4 |
| Monitor LED 24 | INF-105 | 829,00 | 2 |
| Caneta gel azul | ESC-106 | 7,90 | 28 |
| Hub USB-C | ACE-207 | 119,00 | 5 |
| Webcam Full HD | INF-108 | 249,00 | 0 |

## Demanda 1 — Saída reduz o saldo

| ID | Passos | Resultado esperado |
|---|---|---|
| T1.1 | Registrar **saída de 2** do Mouse (saldo 3) | Saldo do Mouse = **1**; histórico mostra a saída; "Unidades em estoque" cai de 61 para 59 |
| T1.2 | Registrar **entrada de 5** do Mouse (saldo 1) | Saldo = 6 |
| T1.3 | Registrar **saída de 7** do Mouse (saldo 6) | Bloqueada com mensagem "Saída de 7 un. maior que o saldo atual (6 un.) de Mouse sem fio Pro"; saldo continua 6; nada entra no histórico |
| T1.4 | Registrar **saída de 6** do Mouse (saldo 6) | Saldo = 0; situação vira "Sem estoque"; aparece em "Estoque em atenção" |
| T1.5 | Quantidade 0, negativa ou decimal | Recusada com mensagem; nada muda |
| T1.6 | Entrada em produto com saldo 0 (Webcam) de 3 | Saldo = 3; situação "Estoque baixo" |

## Demanda 2 — Valor em estoque

| ID | Passos | Resultado esperado |
|---|---|---|
| T2.1 | Abrir a Visão geral com dados restaurados | "Valor em estoque" = **R$ 25.072,00** |
| T2.2 | Registrar saída de 2 do Mouse (R$ 89,90) | Valor cai R$ 179,80 → R$ 24.892,20 |
| T2.3 | Registrar entrada de 12 da Caneta (R$ 7,90) | Valor sobe R$ 94,80 |
| T2.4 | Excluir todos os produtos | Valor = R$ 0,00 |

## Demanda 3 — Edição salva o preço

| ID | Passos | Resultado esperado |
|---|---|---|
| T3.1 | Editar o Mouse: preço 89,90 → 99,90 e salvar | Tabela mostra R$ 99,90; **continua** após recarregar a página |
| T3.2 | Conferir o card de valor após T3.1 | Valor reflete o novo preço |
| T3.3 | Exportar CSV após T3.1 | Linha do Mouse com o preço novo |
| T3.4 | Editar com preço 0 ou negativo | Erro no campo "Informe um preço maior que zero"; não salva |
| T3.5 | Abrir a edição em duas abas, excluir o produto numa e salvar na outra | "Produto não encontrado" — não mostra "Produto atualizado" |

## Demanda 4 — Exclusão com confirmação

| ID | Passos | Resultado esperado |
|---|---|---|
| T4.1 | Clicar "Excluir" na Webcam | Diálogo "Excluir Webcam Full HD (INF-108)?"; nada foi apagado ainda |
| T4.2 | Cancelar | Diálogo fecha; produto continua na lista |
| T4.3 | Confirmar | Produto some; aviso de sucesso |
| T4.4 | Excluir o Mouse (tem movimentações) | Diálogo mostra o aviso sobre movimentações |
| T4.5 | Teclado: abrir o diálogo, tab até o botão, Esc | Foco visível; Esc cancela |

## Demanda 5 — Movimentação por id

| ID | Passos | Resultado esperado |
|---|---|---|
| T5.1 | Renomear o Mouse para "Mouse Gamer" | Histórico mostra "Mouse Gamer" nas movimentações antigas |
| T5.2 | Excluir um produto com movimentações | Histórico mostra o chip "Produto removido" e o id |
| T5.3 | Cadastrar dois produtos com o mesmo nome e movimentar um | A movimentação aparece só no produto certo |
| T5.4 | **Migração:** colocar no `localStorage` a chave `stocklab.demo.v14` com dados antigos e abrir o sistema | Dados migrados para `stocklab.demo.v15`; movimentações apontam para o id correto; nenhum produto ou movimentação se perde |
| T5.5 | Dados corrompidos na chave nova | O sistema abre com os dados de exemplo, sem tela em branco |

## Regressão (o que não pode mudar)

| ID | O que conferir | Esperado |
|---|---|---|
| R1 | Navegar pelas 4 abas | Títulos e conteúdo corretos |
| R2 | Cadastrar produto novo válido | Aparece na lista; contadores sobem |
| R3 | Buscar por "ACE" e filtrar por categoria | Lista filtrada |
| R4 | Exportar CSV com filtro ativo | Arquivo com só os itens filtrados |
| R5 | "Restaurar dados" | Volta aos 8 produtos e 3 movimentações |
| R6 | Largura de celular (390 px) | Menu vira barra horizontal; tabelas rolam; diálogos cabem na tela |

## Registro de execução

| ID | Chrome | Firefox | Desktop | Celular | Responsável | Observações |
|---|---|---|---|---|---|---|
| T1.1 – T1.6 | ☐ | ☐ | ☐ | ☐ | Integrante 1 | Automatizado (Chromium headless): `npm run test:e2e`; Firefox e celular: manual pendente |
| T2.1 – T2.4 | ☐ | ☐ | ☐ | ☐ | Integrante 2 | |
| T3.1 – T3.5 | ☐ | ☐ | ☐ | ☐ | Integrante 3 | |
| T4.1 – T4.5 | ☐ | ☐ | ☐ | ☐ | Integrante 4 | |
| T5.1 – T5.5 | ☐ | ☐ | ☐ | ☐ | Integrante 2 | |
| R1 – R6 | ☐ | ☐ | ☐ | ☐ | Integrante 3 | |

**Critério de aceite:** todos os casos T1–T5 e R1–R6 passam nos dois navegadores. Qualquer falha vira um cartão em *Em andamento* antes da apresentação.

*Observação:* os resultados esperados vêm do plano e dos dados de exemplo; este roteiro **ainda não foi executado**, porque o código da v1.5 não foi alterado.
