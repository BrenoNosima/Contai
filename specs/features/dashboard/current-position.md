---
id: SPEC-DASHBOARD-001
title: Posição atual e saldo
status: implemented
owners: []
last_updated: 2026-09-01
---

# Posição atual e saldo

## Contexto

A página inicial resume a situação financeira realizada do usuário. O sinal do
saldo não pode ser removido durante a formatação, pois isso altera o significado.

## Objetivo

Apresentar receitas, despesas e saldo realizado com sinal, moeda e tom coerentes.

## Fora de escopo

- Projeção de lançamentos pendentes.
- Mudança na fórmula calculada pelo backend.
- Conversão para outras moedas.

## Requisitos

- **REQ-001:** O saldo deve corresponder a receitas pagas menos despesas pagas.
- **REQ-002:** Saldo negativo deve preservar o sinal `-` na interface.
- **REQ-003:** Saldo negativo deve usar o tom visual de despesa, sem depender
  apenas da cor para comunicar o estado.
- **REQ-004:** Saldo zero ou positivo não deve receber sinal negativo.
- **REQ-005:** Valores devem ser formatados em reais no locale `pt-BR`.

## Cenários

### Saldo positivo

**Dado** um saldo de `50`  
**Quando** a posição atual for exibida  
**Então** o valor deve ser `R$ 50,00`.

### Saldo negativo

**Dado** um saldo de `-50`  
**Quando** a posição atual for exibida  
**Então** o valor deve conter `-R$ 50,00` e usar o tom de despesa.

### Saldo zerado

**Dado** um saldo de `0`  
**Quando** a posição atual for exibida  
**Então** o valor deve ser `R$ 0,00`, sem sinal negativo.

## Critérios de aceitação

- **AC-001:** Valores positivos e zero mantêm formatação monetária sem `-`.
- **AC-002:** Valores negativos preservam o `-` visível antes da moeda.
- **AC-003:** A apresentação não modifica o valor recebido pela API.

## Plano técnico atual

- Frontend: `PositionCard` seleciona o tom e solicita sinal para saldo negativo;
  `Money` centraliza a formatação monetária.
- Backend: fornece `summary.balance`; nenhuma mudança exigida por esta spec.
- Banco/migração: não se aplica.
- Assistente/IA: não se aplica.

## Verificação

| Critério | Evidência |
| --- | --- |
| AC-001–AC-003 | Build e revisão de `frontend/src/pages/overview.tsx`. |

## Histórico

| Data | Alteração |
| --- | --- |
| 2026-09-01 | Especificação criada a partir do comportamento implementado. |
