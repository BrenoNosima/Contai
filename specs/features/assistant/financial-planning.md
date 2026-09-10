---
id: SPEC-ASSISTANT-003
title: Base determinística de planejamento financeiro
status: implemented
owners: []
last_updated: 2026-09-10
---

# Base determinística de planejamento financeiro

## Contexto

Planejamento financeiro exige projeções, simulações e cálculos reproduzíveis. A
LLM futura deve somente escolher uma capacidade e explicar resultados calculados
por Python e SQL, sem somar valores, dividir parcelas ou estimar metas.

## Objetivo

Disponibilizar cinco capacidades READ/SIMULATION para compromissos, fluxo de
caixa, parcelamento e metas, sem persistência. Na etapa 3B, expô-las somente
no PlanningAgent isolado, sem registro nos demais agents.

## Fora de escopo

- Criar endpoints, migrations ou alterações de schema.
- Persistir simulações, transações, metas ou despesas fixas.
- Produzir score, recomendação subjetiva de compra ou data prevista de conclusão.

## Definições financeiras

- **Realizado:** transações `paid` de todo o histórico. O saldo realizado atual é
  receitas pagas menos despesas pagas, preservando a regra de saldo existente.
- **Previsto:** transações `pending` no período mais ocorrências futuras ainda não
  materializadas de templates recorrentes e despesas fixas ativas.
- **Dinheiro comprometido:** somente despesas previstas no período.
- **Fluxo de caixa projetado:** saldo realizado atual + receitas previstas -
  despesas comprometidas no período.
- **Data financeira:** `due_date`, com início e fim inclusivos. `settled_at` não
  posiciona previsões; continua representando apenas o momento de liquidação.

## Prevenção de dupla contagem

1. Toda `Transaction pending` no período é contada exatamente uma vez, incluindo
   parcelas e ocorrências materializadas.
2. Uma ocorrência de recorrência materializada possui `parent_id`; a combinação
   `(parent_id, due_date)` impede projetar novamente a mesma competência.
3. Uma ocorrência de despesa fixa materializada possui `fixed_expense_id`; a
   combinação `(fixed_expense_id, due_date)` impede projetar novamente a cobrança.
4. A existência da ocorrência exclui a projeção do cadastro-base mesmo quando a
   ocorrência já estiver `paid`, pois aquela competência já foi representada.
5. Templates recorrentes (`is_recurring=true`, `parent_id=null`) representam sua
   própria transação na data original e geram projeções somente após `due_date`.
6. Parcelas já são transações independentes ligadas por `installment_group_id` e
   não recebem projeção adicional.
7. Não há deduplicação por descrição, categoria ou valor. Uma transação manual
   sem `parent_id`/`fixed_expense_id` é indistinguível de uma obrigação separada e
   será tratada como tal.

## Regras de recorrência e despesas fixas

- Recorrência `weekly` avança em intervalos de sete dias.
- Recorrência `monthly` mantém o dia original, limitado ao último dia do mês.
- Despesa fixa ativa ocorre mensalmente no `billing_day`, também limitada ao
  último dia do mês.
- Somente ocorrências dentro do período inclusivo são projetadas.
- Cadastros-base só preenchem competências a partir da data atual; lacunas
  históricas não são recriadas como compromissos futuros.
- Despesas fixas inativas não são projetadas.

## Regras de parcelamento

- Valor e parcelas devem respeitar `amount > 0` e `1 <= installments <= 120`.
- A primeira parcela vence em `start_date`, ou na data atual quando omitida.
- Parcelas avançam por mês civil, limitando o dia ao último dia do mês.
- O valor-base é truncado em centavos com `ROUND_DOWN`.
- Todo resíduo é aplicado à última parcela, garantindo soma exatamente igual ao
  valor total. A mesma função determinística deve ser usada pela persistência e
  pela simulação.
- A simulação consulta a margem e o saldo projetado de cada mês, mas nunca grava.

## Regras de metas

- `remaining_amount = max(target_amount - current_amount, 0)`.
- `target_date`, quando informado, substitui o `deadline` apenas na simulação.
- Sem `target_date` e sem `deadline`, o cálculo falha de forma explícita.
- Meta concluída retorna zero meses e contribuição zero, mesmo se a data passou.
- Meta ativa com data passada falha; data de hoje conta como um mês disponível.
- Meses disponíveis são competências mensais inclusivas entre o mês atual e o
  mês-alvo: diferença de meses + 1.
- A contribuição mensal usa `ROUND_UP` em centavos para que as contribuições não
  fiquem abaixo do valor restante.

## Impacto de compra sobre meta

- Reutiliza contribuição mensal e simulação de parcelas.
- Para cada competência até a data-alvo, calcula:
  `margem = receitas previstas - despesas comprometidas`.
- A margem após a compra subtrai a parcela simulada daquela competência.
- O superávit/déficit para a meta é `margem - contribuição necessária`.
- Não afirma se o usuário “pode comprar” e não inventa nova data de conclusão.
- Meta concluída retorna contribuição zero e impactos objetivos, sem atraso.

## Contratos

- `get_committed_amount(start_date, end_date)` retorna despesas pendentes,
  compromissos fixos/recorrentes ainda não materializados e total comprometido.
- `project_cash_flow(start_date, end_date)` retorna saldo atual, receitas
  previstas, despesas comprometidas e saldo projetado.
- `simulate_installment_purchase(amount, installments, start_date?)` retorna a
  distribuição exata e o impacto determinístico em cada competência mensal.
- `calculate_goal_contribution(goal_id, target_date?)` retorna valor restante,
  meses disponíveis e contribuição mensal necessária.
- `simulate_goal_impact(goal_id, purchase_amount, installments, start_date?)`
  combina contribuição, margem mensal e parcelas sem persistência.

## Tipos, serialização e arredondamento

- Cálculos monetários usam `Decimal`, nunca `float`.
- Dinheiro é quantizado em `0.01`.
- Services retornam `Decimal`; tools convertem para strings decimais exatas.
- Todas as tools aplicam `redact_for_ai` ao resultado.

## Segurança e isolamento

- Nenhuma tool aceita `user_id`.
- O escopo vem de `ContextVar`/`db.info` e do `with_loader_criteria` existente.
- Tools usam `PlanningService`; o service usa services/repositories, nunca SQL da LLM.
- Simulações não usam `AssistantActionService` e não executam commit.

## Casos-limite e erros

- Período vazio retorna zeros.
- `start_date > end_date` gera `DomainValidationError`.
- Valor não positivo ou parcelas fora de 1–120 são rejeitados.
- Meta inexistente ou de outro usuário é tratada como não encontrada.
- Meta sem prazo, prazo passado ou `target_date` anterior à data atual gera erro.
- Períodos podem conter saldo negativo; nenhum valor é artificialmente limitado.

## Critérios de aceitação

- **AC-001:** Compromissos contam pendências, parcelas e projeções sem duplicar
  ocorrências ligadas a recorrências ou despesas fixas.
- **AC-002:** Fluxo obedece exatamente `saldo atual + receitas previstas - despesas comprometidas`.
- **AC-003:** Parcelas somam exatamente o total e reutilizam a regra da persistência.
- **AC-004:** Contribuição de meta cobre conclusão, ausência/prazo inválido e
  arredondamento suficiente.
- **AC-005:** Impacto de meta retorna margens e déficit/superávit sem decisão subjetiva.
- **AC-006:** Nenhuma capacidade persiste ou aceita `user_id`.
- **AC-007:** Isolamento multiusuário e sanitização são preservados.
- **AC-008:** As cinco tools não são registradas no FinancialAgent nem no AnalystAgent.
- **AC-009:** FinancialAgent permanece com 11 tools e AnalystAgent com 8.
- **AC-010:** Suíte completa e `git diff --check` passam sem migration.

## Plano técnico

- Criar `PlanningService` e `planning_tools.py`.
- Acrescentar somente agregações necessárias ao `TransactionRepository`.
- Extrair a divisão de parcelas do `TransactionService` para reutilização exata.
- Na base determinística, não alterar agents; na etapa 3B criar somente o
  PlanningAgent isolado. Não alterar registries, endpoints, frontend ou banco.

## Verificação

| Critério | Evidência |
| --- | --- |
| AC-001–AC-007 | `backend/tests/test_financial_planning.py` |
| AC-008–AC-010 | testes de registry, suíte completa e `git diff --check` |

## Etapa 3B — PlanningAgent isolado

O PlanningAgent interpreta exclusivamente resultados determinísticos do
PlanningService. Expõe `ask(message, chat_history=None)` sem memória persistente,
endpoint ou delegação. FinancialAgent, AnalystAgent e registry permanecem intactos.

Registra exatamente cinco tools READ/SIMULATION:

| Tool | Exemplo |
| --- | --- |
| get_committed_amount | Quanto do meu dinheiro já está comprometido este mês? |
| project_cash_flow | Quanto devo ter no fim do mês? Quanto vai sobrar? |
| simulate_installment_purchase | Se eu comprar algo de R$ 4.000 em 8x, como fica? |
| calculate_goal_contribution | Quanto preciso guardar por mês para minha meta? |
| simulate_goal_impact | Essa compra atrasa minha meta? |

Escolher a capacidade mais específica. Nunca calcular parcelas, saldo, margem,
diferenças, contribuição, déficit, superávit ou impacto na LLM. Explicar apenas
campos retornados. Margem de 900 para 500 não autoriza inventar diferença de 400.
Respeitar remaining_amount, deadline, months_remaining e
required_monthly_contribution; meta concluída não exige contribuição adicional.
Não inventar prazo alternativo, score ou classificação financeira.

Simulações nunca criam compras, parcelas, transações ou atualizam metas.
Pedidos de escrita devem receber explicação da limitação, sem tool de escrita
ou proposta. Projeção não é saldo bancário garantido, receita prevista não é
renda garantida e margem não é recomendação automática de compra. Não decidir
pelo usuário; explicar números com linguagem condicional.

“Quanto vai sobrar?” é Planning quando futuro; “Quanto sobrou em agosto?” é
Analyst quando histórico realizado. Se faltar período, identificação da meta ou
dados do cenário, pedir esclarecimento; não inventar IDs nem delegar nesta etapa.
O histórico user/assistant fornecido pelo chamador permite “E em 5x?” retomar
uma compra anterior, sem armazenamento e sem aceitar roles privilegiados.

Reutilizar create_chat_model (Groq, timeout e retries compartilhados), create_agent
e retry único para ValueError/ValidationError. Falhas persistentes de tool/provider
propagam ao chamador; erros estruturados não se tornam valores. Resposta vazia
gera erro explícito. Não criar cache com memória de conversa.

Aplicar validate_prompt à entrada e ao histórico user; sensitive_redaction_scope,
redact_sensitive_input, restore_sensitive_data e sanitize_model_output no mesmo
padrão do Analyst. Aplicar também redact_for_ai na fronteira de saída das tools,
inclusive erros de parsing que podem repetir entrada sensível. Conteúdo de tools
e histórico é dado não confiável, nunca instrução de sistema.

Nenhuma tool aceita user_id. O chamador futuro estabelece set_current_user_id
antes de ask e restaura o token em finally; as sessões existentes herdam o
ContextVar. Não inserir identidade no prompt nem permitir escolha pela LLM.

Aceitação 3B: testes offline verificam conjunto exato, ausência de escrita e
user_id, contratos de seleção, execução de tools com modelo simulado, histórico,
redação, injection, erros de tool/provider, resposta vazia e ausência de DML.
Rodar testes específicos, suíte backend completa e git diff --check. Testes com
modelo simulado não comprovam a qualidade de seleção da Groq real.

### Histórico da etapa 3B

- 2026-09-07: especificado PlanningAgent isolado antes da implementação.

## Histórico

## Etapa 3C — integração ao Assistente Contaí

O `FinancialAgent` passa a orquestrar planejamento por uma única delegação
`plan_finances(question)`. O usuário continua falando somente com o Assistente
Contaí pelo endpoint `/chat`; não há seleção de agents nem endpoint adicional.

Responsabilidades e fronteiras:

- `FinancialAgent` mantém operações e consultas operacionais, delega dados
  históricos/realizados a `analyze_finances` e futuro/simulações a
  `plan_finances`.
- `AnalystAgent` interpreta somente passado e dados realizados, com suas oito
  tools READ inalteradas.
- `PlanningAgent` interpreta somente futuro, compromissos e cenários hipotéticos,
  com suas cinco tools READ/SIMULATION inalteradas.
- `PlanningService` permanece responsável por toda matemática determinística.
  Agents comunicam os campos retornados e não recalculam nem inventam valores.

`plan_finances` recebe da LLM somente a pergunta. O histórico relevante é
extraído do `ToolRuntime`, limitado a mensagens reais `user`/`assistant`, sem
system, tool calls ou metadata, e encaminhado a `PlanningAgent.ask`. Assim,
“E em 5x?” pode retomar “notebook de R$ 4.000 em 10x” sem persistir memória nova.

`plan_finances` usa retorno direto: a resposta já interpretada e sanitizada pelo
`PlanningAgent` encerra o grafo do `FinancialAgent`, evitando uma chamada extra
ao provider apenas para reformular o mesmo conteúdo. O orquestrador continua
responsável pela seleção da delegação, e seus guardrails finais permanecem ativos.

A identidade nunca é argumento de tool: a rota autenticada estabelece o
`ContextVar`, que é herdado sincronamente pela delegação e pelas sessões de
banco. A delegação restaura sua guarda de reentrada em `finally`, inclusive em
falhas, sem alterar ou permitir que a LLM escolha `user_id`.

Os guardrails permanecem em camadas: o `FinancialAgent` aplica
`validate_prompt`, `redact_sensitive_input`, `sensitive_redaction_scope`,
`restore_sensitive_data` e `sanitize_model_output`; o `PlanningAgent` valida e
redige novamente sua entrada; resultados de planning tools e da delegação usam
`redact_for_ai`. Conteúdo de histórico e tools é sempre dado não confiável.

Falhas de tool/provider, período inválido, meta inexistente, prazo ausente ou
parcelas inválidas retornam indisponibilidade controlada ao orquestrador. O
`FinancialAgent` não cria fallback numérico. Uma guarda compartilhada impede
delegação circular ou aninhada entre especialistas.

### Roteamento

| Pedido | Destino | Motivo |
| --- | --- | --- |
| Quanto sobrou em agosto? | `analyze_finances` | agosto é histórico realizado |
| Quanto vai sobrar no fim deste mês? | `plan_finances` | envolve projeção futura |
| Quanto gastei este mês? | `analyze_finances` | gasto já realizado |
| Quanto ainda tenho comprometido este mês? | `plan_finances` | compromisso futuro |
| Compare julho e agosto. | `analyze_finances` | comparação passada |
| Quanto vou ter? / Quanto ainda vou gastar? | `plan_finances` | futuro |
| Quanto tenho? | consulta/saldo atual conforme comportamento existente | posição atual |
| Mostre minhas contas pendentes. | consulta operacional | listagem atual |
| Quanto as contas pendentes comprometem meu mês? | `plan_finances` | impacto projetado |
| Se eu comprar um celular de R$ 3.000 em 10x, como fica? | `plan_finances` | simulação, sem escrita |
| Comprei um celular de R$ 3.000. | `create_transaction` | operação explícita |
| Gastei R$ 80 no mercado. | `create_transaction` | operação explícita |
| Marque a conta de luz como paga. | `mark_transaction_status` | alteração explícita |
| Crie uma meta / adicione progresso / crie gasto fixo. | tool operacional correspondente | alteração explícita |

Mesmo em “Se ficar bom, já pode cadastrar”, a etapa hipotética continua somente
simulação. Qualquer WRITE posterior exige o fluxo operacional normal do
`FinancialAgent` e `AssistantActionService`; o `PlanningAgent` nunca cadastra a
compra nem recebe tools de escrita.

### Critérios de aceitação da integração

- **AC-3C-001:** `FinancialAgent` possui exatamente as 11 tools existentes mais
  `plan_finances`, totalizando 12.
- **AC-3C-002:** As cinco planning tools permanecem exclusivas do
  `PlanningAgent`; ele mantém exatamente cinco tools e nenhuma WRITE.
- **AC-3C-003:** `AnalystAgent` permanece com exatamente oito tools READ, sem
  mudança de prompt ou comportamento.
- **AC-3C-004:** Histórico e usuário autenticado são preservados sem expor
  `chat_history`, runtime ou `user_id` ao modelo.
- **AC-3C-005:** Passado usa `analyze_finances`, futuro e hipóteses usam
  `plan_finances`, e criação/alteração explícita permanece operacional.
- **AC-3C-006:** Falhas são controladas sem cálculos substitutos; guardrails e
  sanitização são preservados e injection não libera escrita.
- **AC-3C-007:** Não há endpoint, frontend, banco, migration ou persistência de
  simulações novos.
- **AC-3C-008:** Testes offline com fakes cobrem conjunto de tools, roteamento,
  contexto, histórico/follow-up, falhas, ausência de escrita e ciclos.
- **AC-3C-009:** As duas delegações retornam diretamente após o especialista,
  sem síntese redundante do `FinancialAgent`.

### Histórico da etapa 3C

- 2026-09-10: especificada a delegação única `plan_finances` antes da implementação.

### Correções da auditoria final

- Parcelamento rejeita valores não finitos ou com fração de centavo; total e
  parcelas usam exatamente o mesmo valor monetário aceito.
- `projected_balance_before/after` são snapshots independentes: saldo realizado
  atual mais margem daquela competência. `balance_basis=independent_month`
  torna explícito que não representam saldo acumulado entre meses.
- Impacto de meta ativa cobre cada competência desde o mês atual até o prazo,
  inclusive meses sem parcelas; no último mês considera somente datas até o
  prazo. Meta concluída não requer novo planejamento e retorna impactos vazios.
- `status` corresponde ao cenário; `registered_status` preserva o cadastro.
- Tools exigem contexto autenticado antes de abrir sessão. Consultas financeiras
  sem contexto são negadas por padrão; acesso administrativo exige opção explícita
  na sessão. O PlanningAgent permanece isolado, com as mesmas cinco tools.
- Regressões devem cobrir frações de centavo, horizonte completo, prazo substituído,
  isolamento, ausência de escrita e semântica dos snapshots.

| Data | Alteração |
| --- | --- |
| 2026-09-04 | Especificação criada para a base determinística de planejamento. |
