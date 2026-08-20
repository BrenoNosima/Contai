# Breno Finance

O Breno Finance é uma aplicação de finanças pessoais criada para reunir, em um só lugar, a rotina financeira do dia a dia. Ela permite acompanhar receitas e despesas, organizar contas recorrentes, definir metas e consultar relatórios sem depender de planilhas espalhadas.

Além das telas tradicionais, o projeto conta com um assistente integrado à Groq. Com ele, é possível registrar e consultar informações usando frases como “gastei 45 reais no mercado hoje” ou “quais contas ainda estão pendentes este mês?”.

> O projeto foi pensado para uso pessoal e, neste momento, não possui autenticação nem separação de dados por usuário.

## O que é possível fazer

- visualizar receitas, despesas, saldo e distribuição de gastos no dashboard;
- cadastrar e filtrar transações, inclusive lançamentos recorrentes;
- acompanhar contas pagas e pendentes pelo calendário;
- organizar gastos fixos mensais;
- criar metas financeiras e acompanhar o progresso;
- consultar relatórios por período e categoria;
- registrar e buscar informações em linguagem natural pelo assistente.

## Tecnologias

O frontend foi desenvolvido com React 19, TypeScript, Vite, TanStack Query, Tailwind CSS e Recharts. A API utiliza Python, FastAPI, SQLAlchemy, PostgreSQL e Alembic. A parte de linguagem natural é construída com LangChain e modelos servidos pela Groq.

## Executando o projeto

### Pré-requisitos

Antes de começar, tenha instalado:

- Python 3.11 ou superior;
- Node.js 20 ou superior;
- Docker com Docker Compose;
- uma chave de API da Groq para utilizar o assistente.

### 1. Backend

Entre na pasta do backend e crie o arquivo de ambiente:

```powershell
cd backend
Copy-Item .env.example .env
```

No Linux ou macOS, substitua o último comando por `cp .env.example .env`.

Abra o arquivo `.env` e preencha `GROQ_API_KEY`. As demais configurações já estão preparadas para o ambiente local.

Inicie o PostgreSQL:

```bash
docker compose up -d
```

Em seguida, crie o ambiente virtual e instale as dependências:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

No Linux ou macOS, ative o ambiente com `source .venv/bin/activate`.

Por fim, aplique as migrações e inicie a API:

```bash
python -m alembic upgrade head
python -m uvicorn app.main:app --reload
```

A API estará disponível em [http://localhost:8000](http://localhost:8000), e a documentação interativa em [http://localhost:8000/docs](http://localhost:8000/docs).

### 2. Frontend

Em outro terminal, a partir da raiz do projeto, execute:

```bash
cd frontend
npm ci
npm run dev
```

A interface estará disponível em [http://localhost:3000](http://localhost:3000). Durante o desenvolvimento, o Vite encaminha automaticamente as chamadas de `/api` para o backend local.

Para apontar a interface para uma API em outro endereço, copie `frontend/.env.example` para `frontend/.env.local` e defina a variável `VITE_API_URL`.

## Configuração

As principais variáveis do backend ficam em `backend/.env`:

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | Endereço de conexão com o PostgreSQL |
| `GROQ_API_KEY` | Chave usada pelo assistente e pela extração de texto |
| `GROQ_MODEL` | Modelo utilizado na Groq; por padrão, `openai/gpt-oss-20b` |
| `CORS_ORIGINS` | Endereços autorizados a acessar a API, separados por vírgula |
| `AI_TIMEOUT_SECONDS` | Tempo máximo de uma chamada ao provedor de IA (1 a 120 segundos) |
| `AI_MAX_RETRIES` | Número de novas tentativas do cliente de IA (0 a 5) |

No frontend, `VITE_API_URL` define o endereço público da API. Ela pode permanecer vazia no desenvolvimento local.

Nunca envie arquivos `.env` ou chaves de API para o repositório.

Como a aplicação ainda não possui autenticação, mantenha a API acessível apenas
em uma rede confiável. O Docker Compose publica o PostgreSQL somente em
`127.0.0.1`; para exposição pública, adicione autenticação antes de publicar a API.

## Estrutura do projeto

```text
.
├── backend/
│   ├── alembic/          migrações do banco de dados
│   ├── app/
│   │   ├── agents/       integração com o modelo de linguagem
│   │   ├── api/routes/   endpoints da API
│   │   ├── models/       modelos do SQLAlchemy
│   │   ├── repositories/ acesso e consultas ao banco
│   │   ├── schemas/      validação dos dados
│   │   ├── services/     regras de negócio
│   │   └── tools/        operações usadas pelo assistente
│   └── tests/            testes automatizados
└── frontend/
    └── src/
        ├── components/   componentes compartilhados
        ├── lib/          cliente HTTP, hooks, tipos e utilitários
        └── pages/        páginas da aplicação
```

As rotas do backend delegam as regras de negócio aos serviços, que acessam os dados por meio dos repositórios. Alterações no banco devem ser registradas como migrações do Alembic.

## Comandos úteis

### Backend

```bash
pip install -r requirements-dev.txt
python -m pytest -q
python -m alembic upgrade head
```

### Frontend

```bash
npm run dev       # ambiente de desenvolvimento
npm run check     # verificação do TypeScript
npm run build     # build de produção
npm run preview   # visualização local do build
```

Os valores realizados do dashboard e dos relatórios consideram apenas transações marcadas como pagas. Chamadas reais ao modelo da Groq dependem de uma chave válida e não fazem parte da suíte automática de testes.
