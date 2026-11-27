# Fluxo de trabalho do StockLab v1.5

## Branches

| Branch | Papel | Quem mexe |
|---|---|---|
| `master` | **Versão estável.** Hoje guarda o StockLab v1.4 original, intacto. Só recebe a v1.5 quando a entrega for aprovada | Só por PR de `develop`, após aprovação |
| `develop` | **Integração.** Reúne as melhorias já testadas e aprovadas | Só por PR das branches de trabalho |
| `fix/<issue>-<resumo>` ou `feat/<issue>-<resumo>` | **Branch de trabalho**, uma por cartão/issue. Ex.: `fix/1-saida-reduz-saldo` | Quem é responsável pelo cartão |

## Regra de ouro: uma demanda por vez

Cada cartão do Trello vira uma **issue** no GitHub e segue o mesmo ciclo, **um de cada vez**:

1. **Criar a branch** a partir de `develop` atualizada, com o número da issue no nome.
2. **Construir** a mudança em commits pequenos (Conventional Commits: `fix:`, `feat:`, `docs:`, `test:`, `chore:`), sempre citando a issue.
3. **Testar**: testes automatizados (`npm test`) e o roteiro manual do cartão em `docs/testes-v1.5.md`.
4. **Validar**: todos os critérios de aceite da issue e a Definition of Done conferidos.
5. **Abrir o PR para `develop`** somente depois de todas as validações. O PR usa o modelo de 5 linhas (cartão e responsável, antes, o que mudou, por quê, como foi conferido).
6. **Aprovação** do PR por quem revisa; só então o cartão vai para *Concluído* e se começa o próximo.

Nenhuma branch de trabalho nasce antes de a anterior ser aprovada e integrada em `develop`, para evitar conflito no `app.js`.

## Trello × GitHub

| Trello | GitHub |
|---|---|
| Planejado | Issue aberta, sem branch |
| Em andamento | Branch criada, PR ainda não aberto |
| Concluído | PR aprovado e integrado em `develop` |

## Ordem planejada

1. #1 Saída de estoque reduz o saldo
2. #2 Valor em estoque
3. #3 Edição salva o preço
4. #4 Exclusão com confirmação
5. #5 Movimentação por id (depende da #1)

Detalhes de escopo, estimativas e riscos: `docs/plano-v1.5.md` e `docs/entrega-v1.5.md`.
