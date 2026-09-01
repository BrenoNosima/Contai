---
id: SPEC-NAVIGATION-001
title: Rodapé do menu lateral desktop
status: implemented
owners: []
last_updated: 2026-09-01
---

# Rodapé do menu lateral desktop

## Objetivo

Manter o rodapé do menu lateral enxuto, exibindo somente a identificação da
conta conectada e a ação de sair.

## Requisitos

- **REQ-001:** O rodapé do menu lateral deve exibir nome e e-mail do usuário.
- **REQ-002:** O card deve manter uma ação acessível para sair da conta.
- **REQ-003:** O rodapé não deve exibir chamada adicional para novo lançamento.
- **REQ-004:** O texto promocional sobre agenda não deve ser exibido.
- **REQ-005:** Os links do menu principal devem permanecer inalterados.

## Critérios de aceitação

- **AC-001:** Abaixo dos itens do menu existe somente o card da conta.
- **AC-002:** O botão de logout mantém nome acessível `Sair da conta`.
- **AC-003:** `Novo lançamento` e o texto promocional não aparecem no sidebar.

## Plano técnico

- Frontend: remover os dois blocos adicionais de `AppShell` e o import não usado.
- Backend, banco e assistente: não se aplica.

## Verificação

| Critério | Evidência |
| --- | --- |
| AC-001–AC-003 | Build do frontend e revisão de `frontend/src/components/app-shell.tsx`. |

## Histórico

| Data | Alteração |
| --- | --- |
| 2026-09-01 | Rodapé simplificado para manter somente o card da conta. |
