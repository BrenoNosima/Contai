---
id: SPEC-TRANSACTIONS-001
title: Receitas e despesas recorrentes
status: implemented
owners: []
last_updated: 2026-09-01
---

# Receitas e despesas recorrentes

## Contexto

Uma data pontual não representa recorrência. A frequência deve ser explícita, e
receitas recorrentes não pertencem ao cadastro de despesas fixas.

## Objetivo

Distinguir lançamentos únicos, recorrentes e despesas fixas em entradas manuais
e em linguagem natural.

## Fora de escopo

- Frequências diferentes de semanal e mensal.
- Reajuste automático de valores recorrentes.
- Importação de folha de pagamento.

## Requisitos

- **REQ-001:** `hoje`, `ontem`, `amanhã` ou uma data específica devem alterar
  somente a data do lançamento.
- **REQ-002:** Sem frequência explícita, `is_recurring` deve ser `false` e
  `recurrence` deve ser `null`.
- **REQ-003:** `todo mês`, `mensalmente` ou `por mês` devem produzir `monthly`.
- **REQ-004:** `toda semana` ou `semanalmente` devem produzir `weekly`.
- **REQ-005:** `is_recurring=true` exige recorrência e vice-versa.
- **REQ-006:** Receita recorrente deve continuar como `type=income` e nunca ser
  cadastrada como despesa fixa.
- **REQ-007:** Novas ocorrências devem referenciar o modelo e não duplicar datas.

## Cenários

### Receita única informada à assistente

**Dado** “ganhei 50 reais no trabalho hoje”  
**Quando** a assistente preparar a proposta  
**Então** deve propor receita de 50 reais, para hoje, sem recorrência.

### Receita mensal informada à assistente

**Dado** “ganho 1500 reais todo mês”  
**Quando** a assistente preparar a proposta  
**Então** deve propor `type=income`, `is_recurring=true` e `monthly`.

### Combinação inválida

**Dado** `is_recurring=true` e `recurrence=null`  
**Quando** a entrada for validada  
**Então** ela deve ser rejeitada antes da persistência.

## Critérios de aceitação

- **AC-001:** Datas pontuais não ativam recorrência.
- **AC-002:** Frequências explícitas geram a recorrência correspondente.
- **AC-003:** Receitas recorrentes não acionam `create_fixed_expense`.
- **AC-004:** Projeções são idempotentes para modelo e data.

## Plano técnico atual

- Frontend: formulário expõe recorrência e calendário solicita projeções.
- Backend: schema valida a invariante e o serviço materializa ocorrências.
- Banco: unicidade impede duplicação por origem e data.
- Assistente: prompt e schema da tool distinguem data de frequência.

## Verificação

| Critério | Evidência |
| --- | --- |
| AC-001–AC-003 | `backend/tests/test_agents_and_openapi.py` |
| AC-004 | `backend/tests/test_reporting_and_recurrence.py` |
| Invariante | `backend/tests/test_finance_rules.py` |

## Histórico

| Data | Alteração |
| --- | --- |
| 2026-09-01 | Especificação inicial consolidada. |
