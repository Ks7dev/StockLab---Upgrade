# StockLab v1.5 — Plano da primeira entrega

**Objetivo da versão (1 frase):** reduzir inconsistências e riscos operacionais na gestão do estoque, garantindo que saldo, valor em estoque, preço e histórico de movimentações estejam sempre corretos.

> Observação: a atividade pede 3 demandas na 1ª entrega. A equipe optou por planejar as 5 que estão em *Priorizado*; se o prazo apertar, o corte recomendado é descartar os cartões 4 e 5 (ver "Plano B").

## 1. Escopo

**Entra (5 demandas):**

| # | Demanda | Tipo | Prioridade | Responsável | Estimativa |
|---|---|---|---|---|---|
| 1 | Saída de estoque não reduz o saldo | Correção | Alta | Integrante 1 | 4 h |
| 2 | Corrigir cálculo do "Valor em estoque" | Correção | Alta | Integrante 2 | 2 h |
| 3 | Edição de produto não salva o preço | Correção | Alta | Integrante 3 | 3 h |
| 4 | Exclusão de produto sem confirmação | Correção | Alta | Integrante 4 | 3 h |
| 5 | Movimentação deve referenciar o produto pelo id | Correção / Migração | Alta | Integrante 2 | 6 h |

**Fica fora:** migração para Node.js e `data/dados.js`; função de estoque mínimo; reestruturação do CSS e acessibilidade; SKU único; busca sem acento/maiúsculas; melhorias do CSV; padronização de textos; login e perfis. Motivo: são mudanças de arquitetura ou dependem de respostas do cliente, e migrar antes de corrigir os cálculos levaria regras erradas para o novo back-end.

## 2. Sequência e dependências

```
Atividade A (fundação + cálculos)   →   Atividade B (dados e exclusão)   →   Atividade C (validação e entrega)
 formatar app.js                         #3 edição de preço                    testes de regressão
 #1 saída reduz saldo                    #4 exclusão com confirmação           LEIA-ME / notas da versão
 #2 valor em estoque (após #1)           #5 movimentação por id (após #1)      documento + demo de 3 min
```

- **#2 depende de #1** para ser validado com saídas reais.
- **#5 depende de #1**, porque ambos alteram `saveMovement`.
- **#3 e #4** são independentes e podem andar em paralelo.
- Ordem de merge: #1 → #2 → #3 → #4 → #5, uma branch por cartão.

| Atividade | Conteúdo | Responsáveis | Estimativa |
|---|---|---|---|
| A | Formatar `app.js` (Prettier, commit separado), #1, #2 | Int. 1 e Int. 2 | 8 h |
| B | #3, #4, #5 | Int. 3, Int. 4 e Int. 2 | 12 h |
| C | Testes de regressão, LEIA-ME, documento e apresentação | Int. 3 e Int. 4 | 7 h |

## 3. Detalhamento por demanda

### #1 Saída de estoque não reduz o saldo (Int. 1, 4 h)
- **Fato:** em `saveMovement`, só `entrada` altera `stock`; `saida` entra no histórico e o saldo não muda.
- **Impacto:** saldo maior que o real, alertas de estoque baixo não disparam, saídas acima do saldo nunca são bloqueadas.
- **Tarefas:** extrair `aplicarMovimentacao(produto, tipo, quantidade)`; subtrair em saída; bloquear saída maior que o saldo com mensagem específica; validar inteiro > 0.
- **Pronto quando:** saída de 2 un. do Mouse (saldo 3) deixa saldo 1; nova saída de 2 un. é bloqueada com mensagem; histórico e saldo batem.
- **Pendência ao cliente:** pode a saída deixar o saldo negativo? (padrão adotado: não).

### #2 Valor em estoque (Int. 2, 2 h)
- **Fato:** o card soma só `price` (R$ 4.382,10). Pelo cálculo preço × quantidade, os dados de exemplo dão R$ 25.072,00.
- **Tarefas:** criar `calcularValorEmEstoque(produtos)`; usar no card; ajustar a legenda se necessário.
- **Pronto quando:** com os dados de exemplo o card mostra R$ 25.072,00 e muda após entrada e saída.

### #3 Edição não salva o preço (Int. 3, 3 h)
- **Fato:** o bloco de edição atualiza nome, SKU, categoria e estoque, mas não o preço.
- **Tarefas:** gravar `price`; validar preço > 0; mostrar "Produto atualizado" só se o produto existir, senão "Produto não encontrado".
- **Pronto quando:** alterar o preço de R$ 89,90 para R$ 99,90 persiste após recarregar a página e reflete no card de valor e no CSV.

### #4 Exclusão sem confirmação (Int. 4, 3 h)
- **Fato:** "Excluir" apaga na hora, sem confirmação, e deixa movimentações órfãs.
- **Tarefas:** diálogo de confirmação com nome e SKU; aviso quando o produto tem movimentações; botão destrutivo.
- **Pronto quando:** cancelar não apaga nada; confirmar apaga e mostra aviso.
- **Pendência ao cliente:** excluir ou inativar produtos com histórico?

### #5 Movimentação por id (Int. 2, 6 h)
- **Fato:** a movimentação guarda o nome do produto; renomear ou excluir quebra o histórico e nomes repetidos se confundem.
- **Tarefas:** novo modelo com `produtoId`; função de migração que converte nome → id; nova chave de armazenamento `stocklab.demo.v15`; exibir "Produto removido" quando o id não existir.
- **Pronto quando:** renomear um produto atualiza o nome no histórico; os dados da v1.4 são migrados sem perda.

## 4. Riscos e prevenção

| Risco | Prevenção |
|---|---|
| **Principal:** dados já gravados no navegador (chave `stocklab.demo.v14`, saldos "inflados" e movimentações por nome) ficam inconsistentes após as correções | Migração explícita v14 → v15, aviso no LEIA-ME para usar "Restaurar dados", testar com dados antigos e novos |
| `app.js` minificado em poucas linhas gera conflito de merge entre 4 pessoas | Formatar com Prettier num commit separado antes de tudo; uma branch por cartão; merge em ordem |
| Cliente não responder as perguntas pendentes | Adotar o padrão mais seguro (bloquear saldo negativo; confirmar antes de excluir) e registrar como premissa |
| Cinco demandas não caberem no prazo | Plano B abaixo |

**Plano B:** se faltar tempo, #4 e #5 voltam para *Ideias/pendências* e a entrega fica com #1, #2 e #3.

## 5. Recursos
4 integrantes; Chrome/Edge com DevTools; VS Code; Git (uma branch por cartão); Trello; Prettier; LEIA-ME e dados de exemplo da v1.4 como massa de teste. Armazenamento: `localStorage` do navegador (sem banco, sem servidor).

## 6. Esforço por integrante

| Integrante | Atividades | Horas |
|---|---|---|
| Integrante 1 | Formatar `app.js` (2 h) + #1 (4 h) | 6 h |
| Integrante 2 | #2 (2 h) + #5 (6 h) | 8 h |
| Integrante 3 | #3 (3 h) + testes de regressão (3 h) | 6 h |
| Integrante 4 | #4 (3 h) + LEIA-ME, documento e demo (4 h) | 7 h |
| Todos | Planejamento, Trello e apresentação (2 h cada) | 8 h |
| **Total** | | **35 h** |

Premissa de custo (opcional): 35 h × R$ 40/h = R$ 1.400 (valor ilustrativo de hora de estágio/júnior).

## 7. Definition of Done (por cartão)
Mudança implementada • documentação atualizada (LEIA-ME/notas da versão) • demonstração validada pela equipe.
