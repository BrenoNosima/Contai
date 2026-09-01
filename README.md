# Contaí

A Contaí é uma aplicação de finanças pessoais criada para reunir, em um só lugar, a rotina financeira do dia a dia. Ela permite acompanhar receitas e despesas, organizar contas recorrentes, definir metas e consultar relatórios sem depender de planilhas espalhadas.

Além das telas tradicionais, o projeto conta com um assistente integrado à Groq. Com ele, é possível registrar e consultar informações usando frases como “gastei 45 reais no mercado hoje” ou “quais contas ainda estão pendentes este mês?”.

O acesso é protegido por autenticação JWT em cookie HttpOnly. Cada conta enxerga apenas suas próprias transações, metas, gastos fixos, relatórios e interações com o assistente.

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

Abra o arquivo `.env`, gere um valor longo e aleatório para `JWT_SECRET_KEY` e preencha `GROQ_API_KEY` se desejar utilizar o assistente. As demais configurações já estão preparadas para o ambiente local.

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
| `ENVIRONMENT` | Ambiente atual; em `production`, cookies seguros são ativados por padrão |
| `JWT_SECRET_KEY` | Segredo longo e aleatório usado para assinar os tokens JWT |
| `JWT_PREVIOUS_SECRET_KEY` | Chave JWT anterior, usada temporariamente durante rotação sem derrubar sessões |
| `JWT_NEXT_SECRET_KEY` | Próxima chave JWT, aceita antes da troca para permitir deploy gradual seguro |
| `JWT_EXPIRE_MINUTES` | Tempo de validade da sessão em minutos |
| `REFRESH_EXPIRE_DAYS` | Tempo máximo da sessão renovável em dias |
| `COOKIE_SECURE` | Força o envio do cookie somente por HTTPS |
| `ENFORCE_HTTPS` | Redireciona tráfego público HTTP para HTTPS; obrigatório em produção |

No frontend, `VITE_API_URL` define o endereço público da API. Ela pode permanecer vazia no desenvolvimento local.

Nunca envie arquivos `.env` ou chaves de API para o repositório.

## Publicação segura

A API exige autenticação em todas as rotas financeiras e restringe os dados pelo
usuário autenticado. O Docker Compose publica o PostgreSQL somente em
`127.0.0.1`, configuração adequada para desenvolvimento local.

Em produção, não publique a porta do PostgreSQL na internet. Use uma rede privada
entre a API e o banco, credenciais exclusivas e backups automáticos. Configure
também `ENVIRONMENT=production`, `COOKIE_SECURE=true`, HTTPS, uma
`JWT_SECRET_KEY` aleatória e `CORS_ORIGINS` com apenas o endereço real do
frontend. Execute `python -m alembic upgrade head` antes de iniciar a nova versão
da API.

Use sempre a URL interna do Render Postgres quando aplicação e banco estiverem
na mesma região. Em **Postgres > Networking**, desative o acesso externo ou
restrinja-o aos CIDRs administrativos indispensáveis. A aplicação adiciona
`sslmode=require` automaticamente à conexão PostgreSQL em produção e rejeita
configurações que permitam transporte sem TLS.

Segredos devem existir apenas nas variáveis protegidas do ambiente de produção,
nunca no repositório, imagem Docker ou banco. Para rotacionar a chave JWT durante
um deploy gradual, faça em duas etapas: primeiro mantenha `JWT_SECRET_KEY` atual e
publique a nova chave em `JWT_NEXT_SECRET_KEY`; depois do deploy, mova a nova chave
para `JWT_SECRET_KEY`, a antiga para `JWT_PREVIOUS_SECRET_KEY` e esvazie
`JWT_NEXT_SECRET_KEY`. Após o prazo máximo das sessões antigas, remova a chave
anterior. Esse fluxo permite que instâncias antigas e novas validem os tokens
durante toda a transição. Rotacione também
`GROQ_API_KEY` no Console da Groq e atualize a variável no Render.

As mensagens enviadas ao provedor de IA passam por remoção defensiva de e-mail,
CPF e sequências longas semelhantes a cartão. Valores, categorias, descrições e
dados retornados pelas tools ainda podem ser necessários para responder às
consultas financeiras. Ative **Zero Data Retention** em **Groq Console > Data
Controls** e mantenha desabilitados Batch e Fine-tuning para esta aplicação.
Informe os usuários, na política de privacidade, de que dados enviados ao
assistente são processados por um provedor de IA.

### Imagem de producao

O `Dockerfile` da raiz compila o React em um estagio Node e copia o resultado para
o container Python. O FastAPI serve a interface e a API na mesma origem, incluindo
o fallback para rotas do React Router. A inicializacao aplica as migracoes do
Alembic antes de subir o servidor.

Para validar a imagem localmente:

```bash
docker build -t contai .
docker run --rm -p 8000:8000 --env-file backend/.env contai
```

Abra `http://localhost:8000` e use `http://localhost:8000/health` para verificar a
saude do servico. Em uma plataforma de hospedagem, configure `PORT` apenas se ela
nao o fornecer automaticamente. Nao envie o arquivo usado em `--env-file` ao Git.

No deploy em origem unica, `VITE_API_URL` deve permanecer vazio durante o build.
Configure no servico, no minimo:

```env
ENVIRONMENT=production
DATABASE_URL=postgresql+psycopg://usuario:senha@host/banco?sslmode=require
JWT_SECRET_KEY=uma-chave-aleatoria-com-pelo-menos-32-caracteres
COOKIE_SECURE=true
ENFORCE_HTTPS=true
CORS_ORIGINS=
GROQ_API_KEY=sua-chave
```

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

## Desenvolvimento orientado por especificações

O projeto adota Spec-Driven Development para mudanças de comportamento. Antes
de implementar uma funcionalidade ou alterar uma regra de negócio, crie ou
atualize a especificação correspondente em [`specs/`](specs/README.md), defina
critérios de aceitação verificáveis e derive os testes desses critérios.

Use [`specs/templates/feature-spec.md`](specs/templates/feature-spec.md) como
ponto de partida. Mudanças financeiras, de autenticação, persistência ou IA
sempre devem manter sua especificação atualizada. O commit ou pull request deve
indicar a spec atendida quando aplicável.

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
