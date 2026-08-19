# Breno Finance — Frontend

Interface web do Breno Finance, construída com React, TypeScript e Vite. O
frontend reúne o resumo financeiro, calendário, lançamentos, metas, gastos
fixos, relatórios e o chat do assistente.

## Tecnologias

- React 19
- TypeScript
- Vite
- TanStack Query
- React Router
- Recharts
- Tailwind CSS

## Como executar

Instale as dependências e inicie o servidor de desenvolvimento:

```bash
npm ci
npm run dev
```

A aplicação ficará disponível em `http://localhost:3000`.

Por padrão, o Vite encaminha chamadas feitas para `/api` ao backend em
`http://localhost:8000`. Para usar outro endereço, copie o arquivo de exemplo:

```bash
cp .env.example .env.local
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Depois, defina `VITE_API_URL` no `.env.local`.

## Comandos

```bash
npm run dev      # desenvolvimento
npm run check    # verificação do TypeScript
npm run build    # build de produção
npm run preview  # visualização do build
```

## Estrutura

```text
src/
├── components/  componentes compartilhados
├── lib/         cliente HTTP, tipos, datas e hooks
├── pages/       páginas da aplicação
├── index.css    estilos globais
└── main.tsx     rotas e providers
```

## Backend

O frontend espera a API do Breno Finance. Para desenvolvimento local, inicie o
backend antes de abrir a aplicação. Em produção, configure `VITE_API_URL` com a
URL pública da API e inclua a origem do frontend em `CORS_ORIGINS` no backend.

Arquivos `.env`, dependências, builds e dados locais não devem ser enviados ao
Git; eles já estão cobertos pelo `.gitignore`.
