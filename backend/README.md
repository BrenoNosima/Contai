# Breno Finance — Backend

API de finanças pessoais feita com FastAPI, PostgreSQL e SQLAlchemy. Além do
CRUD tradicional, o projeto tem um assistente que consulta e registra dados por
meio de ferramentas do LangChain e do modelo `openai/gpt-oss-20b` na Groq.

O sistema foi pensado para uso pessoal. Ainda não há autenticação nem separação
de dados entre usuários.

## Tecnologias

- Python 3.11 ou mais recente
- FastAPI e Uvicorn
- SQLAlchemy e PostgreSQL
- Alembic
- Pydantic
- LangChain e Groq

## Como executar

1. Crie o arquivo de configuração:

```bash
cp .env.example .env
```

No Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Preencha `GROQ_API_KEY` no `.env`. Se o frontend estiver em outro endereço,
ajuste também `CORS_ORIGINS`.

2. Inicie o PostgreSQL:

```bash
docker compose up -d
```

3. Crie um ambiente virtual e instale as dependências:

```bash
python -m venv .venv
```

Linux/macOS:

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

4. Aplique as migrações e inicie a API:

```bash
python -m alembic upgrade head
python -m uvicorn app.main:app --reload
```

A API ficará disponível em `http://localhost:8000`. A documentação interativa
fica em `http://localhost:8000/docs`.

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Conexão do SQLAlchemy com o PostgreSQL |
| `GROQ_API_KEY` | Chave usada pelo assistente e pela extração de texto |
| `GROQ_MODEL` | Modelo da Groq; o padrão é `openai/gpt-oss-20b` |
| `CORS_ORIGINS` | Origens permitidas, separadas por vírgula |

O `.env` real não deve ser enviado ao Git. O arquivo `.env.example` contém
apenas valores de desenvolvimento.

## Organização do código

```text
app/
├── agents/          integração com o modelo de linguagem
├── api/routes/      endpoints FastAPI
├── core/            configuração e sessão do banco
├── models/          tabelas SQLAlchemy
├── prompts/         instruções de extração
├── repositories/    consultas ao banco
├── schemas/         validação de entrada e saída
├── services/        regras de negócio
└── tools/           operações disponíveis para o assistente

alembic/             migrações do banco
tests/               testes automatizados
docker-compose.yml   PostgreSQL para desenvolvimento
```

As rotas chamam os services, que concentram as regras de negócio. Os services
usam repositories para ler e gravar dados. O Alembic é o responsável por criar
e atualizar o schema do banco.

## Recursos disponíveis

### Transações — `/transactions`

- cadastro, edição e exclusão;
- filtros por tipo, categoria, status e período;
- atualização entre `paid` e `pending`;
- recorrência semanal ou mensal;
- criação a partir de texto livre.

### Metas — `/goals`

- cadastro, edição e exclusão;
- prazo e progresso acumulado;
- status calculado como `active`, `completed` ou `overdue`.

### Gastos fixos — `/fixed-expenses`

- cadastro, edição, listagem e exclusão de cobranças mensais.

### Dashboard e relatórios

- resumo de receitas, despesas e saldo;
- despesas por categoria;
- evolução e saldo mensal;
- detalhamento por categoria e período.

Somente transações pagas entram nos valores realizados do dashboard e dos
relatórios.

### Assistente — `/chat`

O assistente possui 15 ferramentas para consultar saldo e lançamentos, criar
transações, metas e gastos fixos, atualizar status e gerar relatórios. Cada
ferramenta abre sua própria sessão do banco. O histórico recente da conversa é
enviado junto com a mensagem para preservar contexto.

Exemplos:

```text
Gastei 45 reais no mercado hoje.
Quais contas estão pendentes este mês?
Marque a conta de internet como paga.
Mostre meus gastos por categoria em agosto.
```

## Testes

```bash
pip install -r requirements-dev.txt
python -m pytest -q
```

Os testes atuais cobrem validação financeira, relatórios, precisão das regras e
projeção de recorrências. As chamadas reais à Groq dependem de uma chave válida
e não fazem parte da suíte automática.
