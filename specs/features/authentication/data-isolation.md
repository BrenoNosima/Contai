---
id: SPEC-AUTH-001
title: Isolamento de dados financeiros por usuário
status: implemented
owners: []
last_updated: 2026-09-01
---

# Isolamento de dados financeiros por usuário

## Contexto

Transações, metas, despesas fixas, relatórios e ações são privados. Conhecer um
ID de outro usuário não pode conceder acesso ao recurso.

## Objetivo

Assegurar que operações autenticadas leiam ou alterem exclusivamente dados do
usuário atual.

## Fora de escopo

- Compartilhamento familiar de contas.
- Perfis administrativos com acesso global.
- Exportação pública de relatórios.

## Requisitos

- **REQ-001:** Rotas financeiras devem exigir autenticação válida.
- **REQ-002:** Criações devem associar automaticamente o usuário autenticado.
- **REQ-003:** Listagens, totais e relatórios devem filtrar pelo usuário atual.
- **REQ-004:** Busca, edição e exclusão por ID não devem alcançar recurso alheio.
- **REQ-005:** Tools devem usar o mesmo contexto da requisição autenticada.
- **REQ-006:** O contexto deve ser removido ao final, inclusive em caso de erro.
- **REQ-007:** Respostas não devem facilitar a enumeração de dados privados.

## Cenários

### Listagem isolada

**Dado** que os usuários A e B possuem transações  
**Quando** A listar transações  
**Então** somente transações de A devem ser retornadas.

### Acesso por ID de outro usuário

**Dado** que uma transação pertence a B  
**Quando** A tentar consultar, editar ou excluir seu ID  
**Então** a operação deve ser negada sem alterar o recurso.

### Contexto da assistente

**Dado** um chat autenticado como A  
**Quando** a assistente consultar ou propor uma operação  
**Então** tools e ações devem permanecer vinculadas a A e o contexto deve ser
limpo ao finalizar a chamada.

## Segurança e privacidade

O filtro de proprietário deve ser aplicado no backend. IDs ou payloads enviados
pelo frontend nunca são prova de propriedade.

## Critérios de aceitação

- **AC-001:** Não autenticados são rejeitados nas rotas protegidas.
- **AC-002:** Autenticados observam somente seus próprios dados.
- **AC-003:** Operações por ID não atravessam a fronteira de propriedade.
- **AC-004:** O contexto da IA não vaza entre requisições ou usuários.

## Plano técnico atual

- Frontend: envia credenciais e trata respostas de autenticação.
- Backend: autenticação e escopo de sessão aplicam o usuário.
- Banco: entidades financeiras possuem `user_id`.
- Assistente: `user_context` delimita tools e ações durante cada chamada.

## Verificação

| Critério | Evidência |
| --- | --- |
| AC-001–AC-004 | `backend/tests/test_authentication.py` e `backend/tests/test_security_controls.py`. |

## Histórico

| Data | Alteração |
| --- | --- |
| 2026-09-01 | Especificação inicial consolidada. |
