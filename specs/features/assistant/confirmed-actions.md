---
id: SPEC-ASSISTANT-001
title: Ações da assistente com confirmação humana
status: draft
owners: []
last_updated: 2026-09-01
---

# Ações da assistente com confirmação humana

## Contexto

Uma solicitação em linguagem natural não deve alterar dados financeiros
imediatamente. Operações mutáveis são propostas para confirmação explícita.

## Objetivo

Garantir controle humano, rastreabilidade e execução única das ações sugeridas.

## Fora de escopo

- Aprovação automática baseada em valor.
- Execução em nome de outro usuário.
- Recuperação de propostas expiradas.

## Requisitos

- **REQ-001:** Tools mutáveis devem criar proposta, não executar diretamente.
- **REQ-002:** A resposta deve informar que a operação aguarda confirmação.
- **REQ-003:** Somente o proprietário pode confirmar ou rejeitar a ação.
- **REQ-004:** A confirmação executa exatamente a ação e o payload aprovados.
- **REQ-005:** Ação confirmada, rejeitada ou expirada não pode ser executada.
- **REQ-006:** Falha na execução não deve marcar a ação como confirmada.
- **REQ-007:** Consultas não devem criar propostas.

## Cenários

### Proposta de lançamento

**Dado** um pedido válido de nova receita ou despesa  
**Quando** a assistente usar a tool mutável  
**Então** deve retornar ação pendente sem persistir a transação.

### Confirmação

**Dado** uma proposta pendente e válida  
**Quando** seu proprietário confirmar  
**Então** a alteração ocorre uma vez e a ação fica confirmada.

### Repetição da confirmação

**Dado** uma proposta já confirmada  
**Quando** houver nova tentativa de confirmação  
**Então** nenhuma segunda alteração deve ocorrer.

## Segurança e privacidade

IDs e payloads são entradas não confiáveis. A autorização deve ser verificada no
servidor, independentemente do estado exibido no cliente.

## Critérios de aceitação

- **AC-001:** Pedido pelo chat não grava antes da confirmação.
- **AC-002:** Confirmação válida executa uma única vez.
- **AC-003:** Rejeição e expiração impedem execução.
- **AC-004:** Ações de outro usuário permanecem inacessíveis.

## Plano técnico atual

- Frontend: apresenta ações pendentes e controles de decisão.
- Backend: `AssistantActionService` mantém estado e despacha ações permitidas.
- Banco: ação persiste proprietário, payload, estado e expiração.
- Assistente: tools mutáveis criam propostas; o prompt proíbe autoaprovação.

## Lacunas conhecidas

- Ainda não há testes automatizados específicos cobrindo confirmação, rejeição,
  expiração, repetição e isolamento das ações.
- A atomicidade entre a alteração financeira e a mudança de estado da proposta
  precisa ser comprovada antes de esta spec passar para `implemented`.

## Verificação

| Critério | Evidência |
| --- | --- |
| AC-001–AC-004 | Pendente: adicionar testes de integração para o ciclo completo da ação. |

## Histórico

| Data | Alteração |
| --- | --- |
| 2026-09-01 | Especificação inicial consolidada. |
