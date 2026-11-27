# StockLab — Plano de evolução da versão 1.5

**Unidade:** Projetos de Software · Técnico em Desenvolvimento de Sistemas (SENAI-SP)
**Cenário:** sistema fictício de controle de estoque, herdado de uma empresa anterior (versão 1.4)
**Equipe:** Integrante 1, Integrante 2, Integrante 3 e Integrante 4 *(substituir pelos nomes)*
**Quadro de backlog (Trello):** https://trello.com/b/t4hgfb1b/stocklab-upgrade
**Protótipo (Figma):** https://www.figma.com/design/BjoS4TYbN8XDma920m1Z2W/Sem-t%C3%ADtulo

---

## 1. Identificação e resumo do software

O **StockLab 1.4** é um sistema web de controle de estoque para uma loja. Roda direto no navegador (HTML, CSS e JavaScript puros), sem servidor, sem banco e sem login. Os dados ficam no `localStorage` (chave `stocklab.demo.v14`). A empresa que o desenvolveu encerrou o contrato; a equipe foi contratada para entender a solução e propor uma próxima versão **mais confiável e fácil de usar**.

**Problema de negócio:** o sistema mostra números que o usuário não pode confiar. A saída de mercadoria não baixa o saldo, o "Valor em estoque" está errado e a edição de preço não é gravada. Quem decide reposição e compra com base nesses números toma decisões erradas.

**Diagnóstico revisado (fato → impacto → dúvida):**

| Fato observado | Impacto | Dúvida / hipótese |
|---|---|---|
| A saída aparece no histórico, mas o saldo não muda (`app.js` L53) | O operador confia num saldo maior que o real | A regra de atualização está incompleta; uma saída pode deixar o saldo negativo? |
| "Valor em estoque" soma só os preços: R$ 4.382,10 em vez de R$ 25.072,00 (L38) | O gestor vê um valor ~6× menor que o real | O indicador deveria ser preço × quantidade? |
| Editar o preço mostra "Produto atualizado", mas o preço antigo permanece (L50) | Perda silenciosa de dado | — |
| "Excluir" apaga na hora, sem confirmação (L51) | Um clique errado perde o produto | Produto com histórico deve ser excluído ou inativado? |
| A movimentação guarda o *nome* do produto, não o id (L53) | Renomear ou excluir quebra o histórico | — |

---

## 2. Funcionalidades existentes (v1.4)

| # | Funcionalidade | O que está claro | O que gera dúvida |
|---|---|---|---|
| 1 | **Visão geral** com 4 indicadores, "Estoque em atenção" e "Últimas movimentações" | Mostra produtos cadastrados e unidades | "Valor em estoque" está errado; "nível recomendado" nunca é definido (o limite é um 5 fixo no código) |
| 2 | **Cadastro, edição e exclusão de produtos** (nome, SKU, categoria, preço, quantidade) | Formulário simples com validação básica | A edição não salva o preço; a exclusão não pede confirmação; SKU pode se repetir |
| 3 | **Registro de movimentações** (entrada/saída, quantidade, observação) | Entrada soma ao estoque | Saída não reduz o saldo; erro aparece como aviso genérico que some |
| 4 | **Busca e filtro por categoria** | Filtra por nome ou SKU | Diferencia maiúsculas e acentos ("mouse" não acha "Mouse") |
| 5 | **Exportar CSV e restaurar dados de exemplo** | Baixa a lista filtrada | Preço sai com ponto decimal; não fica claro que respeita os filtros |

**Situações que dificultam o trabalho de quem usa o sistema:** saldo que não confere com o histórico; indicador financeiro errado; produto apagado sem aviso; textos diferentes para o mesmo conceito ("alerta", "atenção", "estoque baixo"; "Quantidade", "Em estoque"); botões "Novo produto" e "Restaurar dados" aparecem também em telas onde não servem; textos cinza claros de 10–11 px difíceis de ler e sem indicação de foco no teclado.

---

## 3. Usuários e necessidades

| Perfil | Tarefas | Necessidades |
|---|---|---|
| **Operador de estoque** | Cadastra e edita produtos, registra entradas e saídas, consulta saldo | Saldo sempre correto; mensagens de erro claras; não apagar produto por engano |
| **Gestor da loja** | Acompanha os indicadores, decide reposição, exporta CSV | Valor em estoque confiável; saber quais itens repor e quanto (estoque mínimo); CSV que abre bem no Excel |
| **Equipe de manutenção** (interna) | Evolui o código | Código legível e separado em camadas; documentação; critérios de teste |

---

## 4. Demandas justificadas

O backlog completo tem **28 cartões** no Trello, todos com contexto, tipo, prioridade, proposta e responsável pela análise. Abaixo, as cinco da 1ª entrega e as demais mais relevantes.

### 4.1 Demandas da 1ª entrega (v1.5)

| # | Título | Contexto e impacto | Tipo | Prioridade e motivo | Proposta |
|---|---|---|---|---|---|
| 1 | Saída de estoque não reduz o saldo | Em `saveMovement` só a *entrada* altera o estoque. Afeta operador (saldo errado) e gestor (decisão de compra errada); alertas de estoque baixo não disparam | Correção | **Alta** — é a função central; gera divergência entre histórico e saldo; é pré-requisito do estoque mínimo | Subtrair na saída; bloquear saída maior que o saldo com mensagem específica; isolar a regra em `aplicarMovimentacao()` |
| 2 | Corrigir o cálculo do "Valor em estoque" | O card soma só `price` (R$ 4.382,10) em vez de `price × stock` (R$ 25.072,00). Gestor vê valor ~6× menor | Correção | **Alta** — indicador financeiro errado leva a decisão errada; correção pequena e de alto impacto | Criar `calcularValorEmEstoque(produtos)` = Σ preço × quantidade |
| 3 | Edição de produto não salva o preço | A edição ignora o campo preço e mostra "Produto atualizado" mesmo assim. Perda silenciosa de dado | Correção | **Alta** — o sistema confirma algo que não aconteceu e afeta o indicador do cartão 2 | Gravar o preço; validar preço > 0; avisar quando o produto não existe mais |
| 4 | Exclusão de produto sem confirmação | "Excluir" apaga na hora e deixa movimentações órfãs. Operador pode perder dados por engano | Correção | **Alta** — risco de perda de dados | Diálogo de confirmação com nome e SKU; aviso quando há movimentações |
| 5 | Movimentação deve referenciar o produto pelo id | O histórico guarda o nome; renomear ou excluir o produto o deixa órfão ou ambíguo | Correção | **Alta** — base do histórico e do consumo médio do estoque mínimo | Novo modelo com `produtoId`; migração nome → id; mostrar "Produto removido" |

### 4.2 Demais demandas (backlog)

| Título | Tipo | Prioridade | Motivo / pergunta ao cliente |
|---|---|---|---|
| Função para calcular o estoque mínimo do produto | Melhoria | Alta | Substitui o 5 fixo por `ceil(consumo médio diário × prazo de reposição + estoque de segurança)`; sem histórico usa o valor manual do produto. **Depende da demanda 1** |
| Decisão: dados em `data/dados.js` sem banco | Migração Node.js | Alta | Carregar na inicialização, gravar o arquivo inteiro a cada alteração (com backup); `.json` como alternativa |
| Estrutura do back-end em camadas (rotas, serviços, repositório) | Migração Node.js | Alta | Separar regra de negócio da leitura/gravação do arquivo |
| Endpoints REST da API | Migração Node.js | Alta | `GET/POST/PUT/DELETE /api/produtos`, `/api/movimentacoes`, `/api/resumo`, CSV |
| SKU duplicado e validações do cadastro | Correção | Alta | SKU deve ser único? Nome também? |
| Estrutura do CSS: seções, tokens e nomenclatura | Melhoria | Média | 60+ cores soltas, 4 variáveis sem uso, nomes misturando português e inglês |
| CSS: contraste, foco visível e status além da cor | Correção | Média | Vários textos abaixo de 4,5:1; sem foco no teclado; `outline:none` na busca |
| Busca ignorando maiúsculas e acentos | Correção | Média | Busca precisa achar "mouse" em "Mouse sem fio Pro" |
| CSV em formato brasileiro e protegido contra fórmulas | Correção | Média | Separador `;`, vírgula decimal; células iniciadas por `=`, `+`, `-`, `@` |
| Mensagens genéricas e aviso de erro sobrescrito | Correção | Média | Mensagem por campo; o erro de gravação some sob o aviso de sucesso |
| Editar a quantidade deve gerar movimentação de ajuste | Correção | Média | Hoje o estoque muda sem deixar rastro |
| Glossário, textos e botões por aba | Melhoria | Baixa | Padronizar "alerta/atenção/estoque baixo" |
| Avaliar login e permissões por perfil | Dúvida de requisito | Baixa | Quantas pessoas usam ao mesmo tempo? |

---

## 5. Backlog

**Link:** https://trello.com/b/t4hgfb1b/stocklab-upgrade — colunas *Ideias/pendências → Priorizado → Planejado → Em andamento → Concluído*.

| Coluna | Cartões | Conteúdo |
|---|---|---|
| Ideias/pendências | 18 | Demandas que ficaram para a próxima entrega |
| Priorizado | 0 | (as 5 demandas da v1.5 já foram planejadas) |
| Planejado | 9 | As 5 demandas da v1.5, plano da versão, perguntas ao cliente, testes e este documento |
| Em andamento | 0 | — |
| Concluído | 1 | Análise do sistema v1.4 |

Os cartões usam as etiquetas **Correção, Melhoria, Dúvida de requisito e Documentação** (tipo) e **Alta, Média e Baixa** (prioridade). *Captura do quadro:* anexar ao PDF final.

---

## 6. Proposta da versão 1.5

**Objetivo (uma frase):** reduzir inconsistências e riscos operacionais na gestão do estoque, garantindo que saldo, valor em estoque, preço e histórico de movimentações estejam sempre corretos.

**Escopo — entra:** as demandas 1 a 5 da seção 4.1, mais testes de regressão e atualização do LEIA-ME.

**Escopo — fica fora desta entrega:** migração para Node.js com `data/dados.js`; função de estoque mínimo; reestruturação do CSS e acessibilidade; SKU único; busca sem acento; melhorias do CSV; login multiusuário; aplicativo para celular; migração imediata para nuvem.
*Por que ficaram de fora:* migração e CSS são mudanças de arquitetura que levam várias entregas; migrar antes de corrigir os cálculos levaria regras erradas para o novo back-end. O estoque mínimo depende de saídas corretas (demanda 1) e de respostas do cliente. As demais não produzem números errados no painel.

### Atividades em sequência

| Ordem | Atividade | Conteúdo | Responsáveis | Estimativa |
|---|---|---|---|---|
| A | Fundação e cálculos | Formatar `app.js` (Prettier, commit separado); demandas 1 e 2 | Integrante 1 e 2 | 8 h |
| B | Dados e exclusão | Demandas 3, 4 e 5 (a 5 depende da 1) | Integrante 3, 4 e 2 | 12 h |
| C | Validação e entrega | Testes de regressão, LEIA-ME, documento e apresentação | Integrante 3 e 4 | 7 h |

**Dependências:** a demanda 2 e a 5 dependem da 1. As demandas 3 e 4 são independentes. Ordem de merge: 1 → 2 → 3 → 4 → 5, uma branch por cartão.

### Cronograma (sugerido, 3 semanas)

| Semana | Entrega |
|---|---|
| 1 | Pergunta ao cliente enviada; `app.js` formatado; demandas 1 e 2 integradas |
| 2 | Demandas 3, 4 e 5 integradas; migração de dados v14 → v15 testada |
| 3 | Testes de regressão (ver `docs/testes-v1.5.md`), LEIA-ME e apresentação |

### Recursos
4 integrantes; navegador Chrome/Edge com DevTools; VS Code; Git (uma branch por cartão); Trello; Figma; Prettier; dados de exemplo da v1.4 como massa de teste. Armazenamento: `localStorage` do navegador (sem banco, sem servidor). Para a próxima etapa: Node.js LTS + npm e arquivo `data/dados.js`.

### Riscos e prevenção

| Risco | Prevenção |
|---|---|
| **Principal:** dados já gravados no navegador (saldos "inflados", movimentações por nome) ficam inconsistentes depois das correções | Migração explícita v14 → v15 para a chave `stocklab.demo.v15`; testar com dados antigos e novos; avisar no LEIA-ME para usar "Restaurar dados" |
| `app.js` minificado em poucas linhas gera conflito de merge entre quatro pessoas | Formatar antes, em commit separado; uma branch por cartão; merge em ordem |
| Cliente não responder as perguntas | Adotar o padrão mais seguro (bloquear saldo negativo; confirmar antes de excluir) e registrar como premissa |
| Cinco demandas não caberem no prazo | **Plano B:** demandas 4 e 5 voltam para *Ideias/pendências*; a entrega fica com 1, 2 e 3 |

### Esforço por integrante

| Integrante | Atividades | Horas |
|---|---|---|
| Integrante 1 | Formatar `app.js` (2 h) + demanda 1 (4 h) | 6 h |
| Integrante 2 | Demanda 2 (2 h) + demanda 5 (6 h) | 8 h |
| Integrante 3 | Demanda 3 (3 h) + testes de regressão (3 h) | 6 h |
| Integrante 4 | Demanda 4 (3 h) + LEIA-ME, documento e apresentação (4 h) | 7 h |
| Todos | Planejamento, Trello e apresentação (2 h cada) | 8 h |
| **Total** | | **35 h** |

*Premissa de custo (opcional):* 35 h × R$ 40/h = **R$ 1.400** (valor ilustrativo de hora de estágio/júnior).

### Protótipo
Telas do que muda na interface, no Figma (link no topo): diálogo de confirmação de exclusão (demanda 4), registrar movimentação com saldo e erro (demanda 1), editar produto com validação de preço e produto não encontrado (demanda 3), card de valor corrigido e tabela com "Produto removido" (demandas 2 e 5).

### Definition of Done (por cartão)
Mudança implementada • documentação atualizada • demonstração validada pela equipe.

---

## 7. Perguntas pendentes ao cliente

*Registradas no cartão "Perguntas pendentes ao cliente" do Trello.*

**Bloqueiam a 1ª entrega**
1. Uma saída pode deixar o estoque negativo ou deve ser bloqueada? *(adotado: bloquear)*
2. Produto com movimentações pode ser excluído ou só inativado?
3. Editar a quantidade direto no produto deve ser permitido ou só via movimentação/ajuste?
4. O que significa "nível recomendado" exibido no sistema?

**Para a função de estoque mínimo**
5. Qual o prazo de reposição típico por fornecedor ou categoria?
6. Quantos dias de histórico usar para o consumo médio (30, 60 ou 90)?
7. O estoque de segurança é fixo ou percentual? Quanto?
8. O estoque mínimo pode ser informado manualmente por produto?

**Regras de cadastro e relatórios**
9. O SKU deve ser único? E o nome?
10. Podem ser cadastradas novas categorias além de Informática, Escritório e Acessórios?
11. O CSV deve respeitar os filtros da tela? Separador `;` e vírgula decimal (Excel pt-BR)?
12. Qual fuso horário usar nas datas?

**Para a migração futura**
13. Quantas pessoas usam ao mesmo tempo? Precisa de login e perfis (operador × gestor)?
14. O servidor Node.js rodará numa máquina da loja ou em hospedagem? Precisa de backup dos dados?

---

## Roteiro da apresentação (3 minutos)

| Tempo | Conteúdo |
|---|---|
| 0:00–0:30 | **Problema:** o sistema mostra números errados (saldo e valor em estoque) e o gestor decide com base neles |
| 0:30–1:30 | **Demandas e priorização:** as 5 correções, por que vêm primeiro (valor para o usuário, risco, esforço, dependências) e por que migração, CSS e estoque mínimo ficam para depois |
| 1:30–2:30 | **Plano:** 3 atividades em sequência, responsáveis, 35 h, risco principal (dados antigos no navegador) e o Plano B |
| 2:30–3:00 | **Próximos passos:** perguntas ao cliente, depois estoque mínimo, Node.js com dados em arquivo e CSS |

Mostrar o quadro Trello e, no Figma, o diálogo de confirmação de exclusão e a tela de movimentação com erro.

---

## Referências no repositório
- `docs/codigo/` — documentação do código v1.4 (referência do `app.js`, modelo de dados, interface, CSS, regras de negócio e casos de uso com diagramas)
- `docs/plano-v1.5.md` — plano detalhado
- `docs/testes-v1.5.md` — roteiro de testes de regressão
