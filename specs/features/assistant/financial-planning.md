---
id: SPEC-ASSISTANT-003
title: Base determinística de planejamento financeiro
status: implemented
owners: []
last_updated: 2026-09-04
---

# Base determinística de planejamento financeiro

## Contexto

Planejamento financeiro exige projeções, simulações e cálculos reproduzíveis. A
LLM futura deve somente escolher uma capacidade e explicar resultados calculados
por Python e SQL, sem somar valores, dividir parcelas ou estimar metas.

## Objetivo

Disponibilizar cinco capacidades READ/SIMULATION para compromissos, fluxo de
caixa, parcelamento e metas, sem persistência e sem registro em agents.

## Fora de escopo

- Criar `PlanningAgent` ou integrá-lo ao `FinancialAgent`.
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
- Não alterar agents, registries, endpoints, frontend ou banco.

## Verificação

| Critério | Evidência |
| --- | --- |
| AC-001–AC-007 | `backend/tests/test_financial_planning.py` |
| AC-008–AC-010 | testes de registry, suíte completa e `git diff --check` |

## Histórico

| Data | Alteração |
| --- | --- |
| 2026-09-04 | Especificação criada para a base determinística de planejamento. |
