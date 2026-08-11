# Breno Finance AI Backend

Arquitetura FastAPI + SQLAlchemy + LangChain + SQLite.

Sistema financeiro pessoal com um agente de IA capaz de registrar
transações a partir de texto livre e consultar/atualizar o banco de
dados em tempo real através de tools.

## Stack

- **FastAPI** — API REST
- **SQLAlchemy** — ORM
- **SQLite** — banco de dados
- **LangChain** + **LangGraph** — orquestração do agente e das tools
- **Groq** (`llama-3.3-70b-versatile`) — LLM usado pelo agente e pela extração de texto
- **Pydantic** — validação de schemas
- **React** (futuro) — frontend

## Funcionalidades

- Controle de receitas e despesas (CRUD completo)
- Gastos fixos recorrentes (com dia de vencimento e ativação/desativação)
- Metas financeiras (com progresso e cálculo do valor restante)
- Dashboard com saldo, gastos por categoria e transações recentes
- Registro automático de transações a partir de texto livre (ex:
  "gastei 45 reais no Uber") via LLM
- Agente de chat com **tool-calling**: conversa em linguagem natural e
  executa ações reais no banco (criar transação, consultar saldo, criar
  meta, adicionar progresso, cadastrar gasto fixo, gerar resumo, etc.)

## Estrutura do projeto

```
app/
├── main.py                     # instancia o FastAPI e registra as rotas
├── core/
│   ├── config.py                # variáveis de ambiente (GROQ_API_KEY)
│   ├── database.py              # engine, SessionLocal, Base
│   └── dependencies.py          # get_db (dependency injection)
├── models/                      # modelos SQLAlchemy
│   ├── transaction.py
│   ├── goal.py
│   └── fixed_expense.py
├── schemas/                     # schemas Pydantic (request/response)
│   ├── transaction.py
│   ├── goal.py
│   ├── fixed_expense.py
│   ├── chat.py
│   └── natural_language.py
├── repositories/                # acesso direto ao banco (queries)
│   ├── transaction_repository.py
│   ├── goal_repository.py
│   └── fixed_expense_repository.py
├── services/                    # regras de negócio, usados pelas rotas e pelas tools
│   ├── transaction_service.py
│   ├── goal_service.py
│   ├── fixed_expense_service.py
│   └── dashboard_service.py
├── agents/
│   ├── extractor_agent.py       # extrai type/categoria/valor/prioridade de um texto
│   └── financial_agent.py       # agente de chat com tool-calling (LangGraph)
├── tools/
│   └── finance_tools.py         # tools do agente, conectadas ao banco via services
├── prompts/
│   └── extraction_prompt.py     # prompt usado pelo extractor_agent
└── api/routes/
    ├── transactions.py
    ├── goals.py
    ├── fixed_expenses.py
    ├── dashboard.py
    └── chat.py
```

## Configuração

Crie um arquivo `.env` na raiz do projeto:

```bash
GROQ_API_KEY=sua_chave_aqui
```

A chave é obtida em https://console.groq.com.

## Executar

```bash
pip install -r requirements.txt

python -m uvicorn app.main:app --reload
```

A documentação interativa fica disponível em `http://localhost:8000/docs`.

## Endpoints

### Transações — `/transactions`
| Método | Rota | Descrição |
|---|---|---|
| POST | `/transactions/` | Cria uma transação manualmente |
| GET | `/transactions/` | Lista todas as transações |
| GET | `/transactions/{id}` | Busca uma transação por id |
| PUT | `/transactions/{id}` | Atualiza uma transação |
| DELETE | `/transactions/{id}` | Remove uma transação |
| POST | `/transactions/text` | Extrai uma transação de texto livre (LLM) e já salva no banco |

### Metas — `/goals`
| Método | Rota | Descrição |
|---|---|---|
| POST | `/goals/` | Cria uma meta |
| GET | `/goals/` | Lista todas as metas |
| GET | `/goals/{id}` | Busca uma meta por id |
| PUT | `/goals/{id}` | Atualiza uma meta |
| DELETE | `/goals/{id}` | Remove uma meta |
| POST | `/goals/{id}/progress` | Adiciona valor ao progresso da meta |

### Gastos fixos — `/fixed-expenses`
| Método | Rota | Descrição |
|---|---|---|
| POST | `/fixed-expenses/` | Cadastra um gasto fixo |
| GET | `/fixed-expenses/` | Lista todos os gastos fixos |
| GET | `/fixed-expenses/active` | Lista apenas os ativos |
| PUT | `/fixed-expenses/{id}` | Atualiza um gasto fixo |
| DELETE | `/fixed-expenses/{id}` | Remove um gasto fixo |

### Dashboard — `/dashboard`
| Método | Rota | Descrição |
|---|---|---|
| GET | `/dashboard/` | Resumo geral: saldo, gastos por categoria, transações recentes |
| GET | `/dashboard/top-category` | Categoria com maior gasto |
| GET | `/dashboard/insights` | Insight textual gerado a partir dos dados |

### Chat — `/chat`
| Método | Rota | Descrição |
|---|---|---|
| POST | `/chat/` | Conversa com o agente financeiro (tool-calling sobre o banco) |

## Agente financeiro

O `FinancialAgent` (`app/agents/financial_agent.py`) usa o modelo da Groq
com acesso às tools de `app/tools/finance_tools.py`. Cada tool abre sua
própria sessão de banco e reaproveita os `services` já existentes, então
qualquer ação feita pelo agente (criar transação, consultar saldo, criar
meta, etc.) fica imediatamente refletida nas rotas REST e vice-versa —
tudo lê e escreve no mesmo `finance.db`.

Exemplo de conversa:

```
POST /chat/
{ "message": "gastei 45 reais no Uber hoje" }
```

O agente identifica a intenção, chama a tool `create_transaction` com os
dados extraídos e responde confirmando o que foi salvo.
