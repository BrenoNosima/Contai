---
id: SPEC-ASSISTANT-002
title: Análise financeira determinística
status: implemented
owners: []
last_updated: 2026-09-04
---

# Análise financeira determinística

## Contexto

Perguntas sobre totais, comparações, categorias e maiores gastos não devem ser
calculadas pela LLM. O backend precisa entregar resultados prontos, consistentes
com os relatórios atuais e isolados por usuário.

## Objetivo

Disponibilizar quatro capacidades somente de leitura — resumo de período,
comparação de períodos, comparação de uma categoria e maiores despesas — com
cálculos executados por repository e service antes de qualquer interpretação
em linguagem natural.

## Fora de escopo

- Criar ou registrar um `AnalystAgent`.
- Projeções, previsões, cenários ou fluxo de caixa futuro.
- Alterar lançamentos, metas, recorrências ou ações confirmáveis.
- Alterar `/transactions/text`, `ExtractorAgent` ou o dashboard.
- Criar endpoints HTTP para as capacidades analíticas.

## Requisitos

- **REQ-001:** As quatro capacidades devem seguir `Tool → Service → Repository → Database`.
- **REQ-002:** Somente transações com `status=paid` participam da análise histórica.
- **REQ-003:** Uma transação pertence a um período quando seu `due_date` está entre
  o início e o fim, inclusive. `settled_at` e `created_at` não definem o período.
- **REQ-004:** Todos os intervalos devem validar `start_date <= end_date`.
- **REQ-005:** Cálculos monetários devem usar `Decimal`, com precisão de centavos.
- **REQ-006:** A diferença deve ser calculada como `segundo período - primeiro período`.
- **REQ-007:** A variação percentual deve ser
  `(diferença / abs(valor do primeiro período)) * 100`.
- **REQ-008:** Quando o valor do primeiro período for zero, a variação percentual
  deve ser `null`, inclusive quando ambos os períodos forem zero.
- **REQ-009:** Comparações de categoria devem aceitar somente correspondência exata
  com uma categoria de `FINANCIAL_CATEGORIES`; a LLM não pode normalizar silenciosamente.
- **REQ-010:** Maiores gastos devem incluir somente despesas pagas, ordenadas por
  valor decrescente, com limite entre 1 e 20.
- **REQ-011:** Nenhuma capacidade deve aceitar `user_id`; o escopo deve vir de
  `db.info` ou do `ContextVar` autenticado e dos critérios SQLAlchemy existentes.
- **REQ-012:** As tools devem aplicar `redact_for_ai` ao resultado e não usar
  `AssistantActionService`, pois não modificam estado.
- **REQ-013:** Agregações, contagem, ordenação e limite devem acontecer no banco;
  a LLM não pode recalcular, ranquear ou executar SQL.

## Cenários

### Resumo de período

**Dado** um período com receitas, despesas e lançamentos pendentes  
**Quando** o resumo for calculado  
**Então** deve retornar receitas e despesas pagas, saldo e quantidade de
transações pagas, ignorando pendências.

### Comparação com aumento

**Dado** que o segundo período tem R$ 1.100,00 em despesas e o primeiro R$ 800,00  
**Quando** os períodos forem comparados  
**Então** a diferença de despesas deve ser R$ 300,00 e a variação 37,50%.

### Base percentual zero

**Dado** que uma métrica vale zero no primeiro período  
**Quando** ela for comparada com o segundo período  
**Então** a diferença monetária deve ser calculada e a variação percentual deve ser `null`.

### Categoria exata

**Dado** que existem despesas em `Alimentação`  
**Quando** a categoria `Alimentação` for comparada  
**Então** somente essa categoria deve ser agregada; variações de grafia não devem
ser corrigidas silenciosamente.

### Maiores gastos

**Dado** um período com receitas, despesas pendentes e despesas pagas  
**Quando** os maiores gastos forem consultados  
**Então** apenas despesas pagas devem ser retornadas, da maior para a menor,
respeitando o limite solicitado.

### Isolamento

**Dado** que dois usuários possuem transações no mesmo período  
**Quando** um deles consultar qualquer capacidade  
**Então** totais, comparações e rankings devem conter somente seus próprios dados.

## Casos-limite e falhas

- Período vazio retorna valores monetários zero, contagem zero e listas vazias.
- `start_date > end_date` gera `DomainValidationError` antes da consulta.
- Categoria válida sem movimentação retorna total zero.
- Categoria fora do catálogo gera `DomainValidationError`.
- `limit` fora de 1 a 20 gera `DomainValidationError`.
- Empates em maiores despesas usam `due_date` decrescente e depois `id` decrescente
  para manter ordenação determinística.

## Contratos e dados

`get_period_summary(start_date, end_date)` retorna período, `total_income`,
`total_expenses`, `balance` e `transaction_count`.

`compare_periods(first_start, first_end, second_start, second_end)` retorna os
dois resumos e diferenças monetárias e percentuais de receitas, despesas e saldo.

`compare_category_periods(category, ...)` retorna os totais da categoria nos
dois períodos, diferença e percentual.

`get_top_expenses(start_date, end_date, limit=5)` retorna `transaction_id`,
descrição, categoria, valor, `due_date` e status.

Services retornam `Decimal`. Na fronteira das tools, valores `Decimal` são
convertidos em strings decimais para manter precisão e produzir estruturas
serializáveis para tool calling.

## Segurança e privacidade

- As tools não recebem `user_id`.
- O filtro global `with_loader_criteria` permanece responsável pelo isolamento.
- As sessões abertas pelas tools obtêm o usuário do `ContextVar` autenticado.
- Resultados passam por `redact_for_ai` antes de serem entregues à LLM.
- Nenhuma consulta acessa repositories diretamente a partir de agent.

## Critérios de aceitação

- **AC-001:** Resumos calculam receitas, despesas, saldo e contagem apenas de `paid`.
- **AC-002:** Períodos vazios retornam zeros e intervalos invertidos são rejeitados.
- **AC-003:** Comparações cobrem aumento, redução, igualdade e bases zero sem divisão por zero.
- **AC-004:** Categorias são exatas e retornam zero quando válidas mas sem movimentação.
- **AC-005:** Maiores despesas respeitam tipo, status, período, ordenação e limite 1–20.
- **AC-006:** Todas as capacidades preservam isolamento entre usuários.
- **AC-007:** Tools são somente leitura, serializáveis e aplicam redação de dados.
- **AC-008:** A suíte existente continua passando sem migration.

## Plano técnico

- Frontend: não se aplica nesta etapa.
- Backend: ampliar `ReportService`, `TransactionRepository` e criar `analytics_tools.py`.
- Banco/migração: nenhuma; usar índices existentes em `due_date` e `status`.
- Assistente/IA: não registrar as novas tools no `FinancialAgent` nesta etapa.

## Verificação

| Critério | Evidência automatizada ou manual |
| --- | --- |
| AC-001–AC-007 | `backend/tests/test_financial_analytics.py` |
| AC-008 | `pytest -q` e `git diff --check` |

## Histórico

| Data | Alteração |
| --- | --- |
| 2026-09-04 | Especificação criada para a base determinística do futuro AnalystAgent. |
