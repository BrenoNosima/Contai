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

Nesta segunda etapa, disponibilizar um `AnalystAgent` especializado que selecione
essas capacidades, receba os resultados determinísticos e os explique sem
alterar dados ou refazer cálculos financeiros.

Na etapa de integração, o `FinancialAgent` passa a atuar gradualmente como o
orquestrador do Contaí e recebe uma única capacidade `analyze_finances`. As tools
analíticas permanecem privadas do `AnalystAgent`.

## Fora de escopo

- Criar endpoint HTTP específico para análise.
- Criar `PlanningAgent` ou `TransactionAgent`.
- Alterar regras de negócio das tools analíticas existentes.
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
- **REQ-014:** O `AnalystAgent` deve receber `get_period_summary`,
  `compare_periods`, `compare_category_periods`, `get_top_expenses`, `get_balance`,
  `get_expenses_by_category`, `get_monthly_report` e `get_category_breakdown`.
- **REQ-015:** O agent não pode receber tools de criação, edição, exclusão,
  mudança de status, metas, despesas fixas ou recorrências.
- **REQ-016:** Perguntas dependentes de dados devem usar a tool mais específica;
  uma comparação não deve ser reconstruída com consultas redundantes.
- **REQ-017:** A LLM deve somente interpretar somas, diferenças, percentuais e
  rankings já calculados. `percentage_change=null` significa que a base zero
  impede uma comparação percentual válida, nunca uma variação infinita.
- **REQ-018:** O agent deve aplicar `validate_prompt`, `redact_sensitive_input`,
  `sensitive_redaction_scope`, `restore_sensitive_data` e
  `sanitize_model_output`, reutilizando os guardrails atuais.
- **REQ-019:** Histórico é contexto efêmero fornecido pelo chamador, deve ser
  validado e redigido, e não deve ser persistido pelo agent.
- **REQ-020:** Solicitações de escrita devem ser recusadas e encaminhadas ao
  assistente principal, sem chamada de tool.
- **REQ-021:** O `FinancialAgent` deve receber somente `analyze_finances` como
  fronteira do domínio analítico; não pode receber diretamente as quatro tools
  privadas do `AnalystAgent`.
- **REQ-022:** `analyze_finances` expõe à LLM somente `question`. Histórico é
  obtido do `ToolRuntime`; identidade e sessão de banco não são argumentos.
- **REQ-023:** A delegação síncrona deve preservar o `ContextVar` autenticado
  configurado por `/chat`, sem copiar identidade para prompts.
- **REQ-024:** Somente mensagens reais de usuário/assistente, sem mensagens de
  system, tool calls ou metadata, podem compor o histórico do especialista.
- **REQ-025:** O `AnalystAgent` não recebe `analyze_finances` nem referência ao
  `FinancialAgent`. Uma guarda de reentrada deve bloquear delegação cíclica.
- **REQ-026:** Falha do especialista deve produzir erro controlado, sem stack,
  metadata ou números de fallback; o orquestrador não pode calcular a resposta.
- **REQ-027:** O `FinancialAgent` deve manter somente tools operacionais,
  consultas necessárias para operações e `analyze_finances`.
- **REQ-028:** `get_balance`, `get_expenses_by_category`, `get_monthly_report` e
  `get_category_breakdown` devem pertencer exclusivamente ao `AnalystAgent`.
- **REQ-029:** `get_dashboard_summary` não deve ser tool de agent: seu conteúdo
  duplica saldo e transações recentes, que já possuem capacidades próprias. O
  endpoint de dashboard permanece inalterado.
- **REQ-030:** `search_transactions`, `list_recent_transactions`, `list_goals` e
  `list_fixed_expenses` permanecem no orquestrador como consultas operacionais,
  não como capacidades de análise.

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

### Seleção de capacidade analítica

- “Quanto gastei/recebi e qual foi meu saldo no período?” usa `get_period_summary`.
- “Compare agosto e setembro” usa `compare_periods`.
- “Minha Alimentação aumentou?” usa `compare_category_periods`.
- “Quais foram meus maiores gastos?” usa `get_top_expenses`.
- Um complemento como “E Alimentação?” deve usar o histórico recebido para
  preservar os períodos mencionados anteriormente.

### Solicitação de escrita

**Dado** um pedido para criar ou alterar um lançamento
**Quando** o `AnalystAgent` responder
**Então** não deve chamar nenhuma tool e deve informar que a operação pertence
ao assistente principal.

### Delegação pelo orquestrador

- “Quanto gastei em agosto?”, “Compare agosto e setembro”, “Minha Alimentação
  aumentou?” e “Quais foram meus maiores gastos?” usam `analyze_finances` uma vez.
- “Liste minhas últimas transações” continua em `list_recent_transactions` ou
  `search_transactions`.
- “Gastei R$ 50 no mercado”, mudança de status, metas, despesas fixas e
  recorrências continuam nas tools transacionais existentes.
- O `FinancialAgent` não deve chamar `analyze_finances` novamente para uma
  pergunta já respondida pelo especialista.
- Saldo, agregações por categoria, relatórios mensais e detalhamento mensal por
  categoria também devem atravessar `analyze_finances`.

### Follow-up delegado

**Dado** o histórico real “Compare agosto com setembro”
**Quando** o usuário perguntar “E Alimentação?”
**Então** `analyze_finances` deve obter o histórico do runtime, sem argumento
controlado pela LLM, e encaminhá-lo ao `AnalystAgent`.

### Falha na análise

**Dado** que provider ou tool do especialista falhou
**Quando** a delegação retornar ao orquestrador
**Então** deve informar indisponibilidade temporária e proibir estimativa ou
cálculo manual de substituição.

### Interpretação responsável

- O agent deve usar “Com base nos dados registrados” ou formulação equivalente.
- `due_date` representa a competência/vencimento usada pelo sistema; o agent não
  deve afirmar que o dinheiro entrou ou saiu exatamente nessa data.
- Correlação não deve ser apresentada como causalidade.
- Orientações financeiras não devem ser apresentadas como certeza.

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
- Mensagens atuais e históricas passam pela validação contra prompt injection e
  pela redação antes do envio ao provider.
- O agent não recebe `user_id`; quando futuramente for chamado por uma rota, ela
  deve configurar o mesmo `ContextVar` autenticado usado pelo chat atual.
- Na integração com `/chat`, esse `ContextVar` já permanece ativo durante toda a
  chamada síncrona `FinancialAgent → analyze_finances → AnalystAgent → tool`.
- O parâmetro `ToolRuntime` é injetado pelo LangChain 1.3.x e não integra o schema
  de argumentos visível à LLM.

## Critérios de aceitação

- **AC-001:** Resumos calculam receitas, despesas, saldo e contagem apenas de `paid`.
- **AC-002:** Períodos vazios retornam zeros e intervalos invertidos são rejeitados.
- **AC-003:** Comparações cobrem aumento, redução, igualdade e bases zero sem divisão por zero.
- **AC-004:** Categorias são exatas e retornam zero quando válidas mas sem movimentação.
- **AC-005:** Maiores despesas respeitam tipo, status, período, ordenação e limite 1–20.
- **AC-006:** Todas as capacidades preservam isolamento entre usuários.
- **AC-007:** Tools são somente leitura, serializáveis e aplicam redação de dados.
- **AC-008:** A suíte existente continua passando sem migration.
- **AC-009:** O `AnalystAgent` possui exatamente oito tools, todas READ e sem
  argumento `user_id`, e nenhuma tool WRITE fica acessível.
- **AC-010:** O prompt orienta seleção específica, sem matemática manual,
  diferencia métricas e trata percentual nulo corretamente.
- **AC-011:** O agent aceita histórico efêmero, rejeita prompt injection, redige
  dados sensíveis e sanitiza a resposta do provider.
- **AC-012:** Falhas de argumentos/tool recebem uma única nova tentativa e falhas
  inesperadas do provider são propagadas ao chamador.
- **AC-013:** O `FinancialAgent` possui exatamente onze tools: seis operações,
  quatro consultas operacionais e uma delegação, sem tool analítica direta.
- **AC-014:** O schema de `analyze_finances` contém somente `question`; histórico,
  identidade e runtime não podem ser fornecidos pela LLM.
- **AC-015:** Histórico real, guardrails, contexto autenticado e isolamento são
  preservados através da delegação.
- **AC-016:** Delegação cíclica é estruturalmente impossível e protegida contra
  reentrada; falhas não produzem valores financeiros inventados.
- **AC-017:** As cinco tools removidas do `FinancialAgent` não aparecem em seu
  registry; quatro ficam privadas do Analyst e `get_dashboard_summary` não fica
  disponível a nenhum agent.

## Plano técnico

- Frontend: não se aplica nesta etapa.
- Backend: ampliar `ReportService`, `TransactionRepository` e criar `analytics_tools.py`.
- Banco/migração: nenhuma; usar índices existentes em `due_date` e `status`.
- Assistente/IA: criar `AnalystAgent` e prompt próprios, sem registrar as novas
  tools diretamente no `FinancialAgent`; registrar somente `analyze_finances`.

## Verificação

| Critério | Evidência automatizada ou manual |
| --- | --- |
| AC-001–AC-007 | `backend/tests/test_financial_analytics.py` |
| AC-008 | `pytest -q` e `git diff --check` |
| AC-009–AC-012 | `backend/tests/test_analyst_agent.py` |
| AC-013–AC-017 | `backend/tests/test_analyst_delegation.py` |

## Histórico

| Data | Alteração |
| --- | --- |
| 2026-09-04 | Especificação criada para a base determinística do futuro AnalystAgent. |
| 2026-09-04 | Definido o contrato READ-ONLY, guardrails e seleção de tools do AnalystAgent. |
| 2026-09-04 | Definida a delegação única do FinancialAgent para o AnalystAgent. |
| 2026-09-04 | Separadas tools operacionais do orquestrador e tools analíticas do especialista. |
