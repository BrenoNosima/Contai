# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Público geral que deseja organizar melhor as próprias finanças pessoais, incluindo pessoas que procuram uma alternativa mais simples a controles dispersos ou planilhas.

## Product Purpose

A Contaí reúne a rotina financeira pessoal em um só lugar. Permite acompanhar receitas, despesas e saldo; organizar lançamentos e contas recorrentes; controlar gastos fixos; definir metas; consultar relatórios; e usar linguagem natural para registrar ou consultar informações financeiras.

O produto tem sucesso quando a pessoa entende sua situação financeira atual e consegue manter o controle cotidiano com clareza e pouco esforço.

## Positioning

A Contaí combina a simplicidade de uma experiência voltada a substituir planilhas com um assistente financeiro integrado por linguagem natural. Consultas podem ser feitas em português cotidiano, enquanto ações que alteram dados financeiros permanecem sob confirmação explícita da pessoa.

## Operating Context

- Uso pessoal e recorrente para registrar e consultar movimentações financeiras.
- Dashboard para leitura rápida da posição atual, considerando valores realizados.
- Calendário e lançamentos recorrentes para acompanhar contas pagas e pendentes.
- Metas, gastos fixos e relatórios para planejamento e análise.
- Assistente conversacional para consultas e propostas de ações financeiras.

## Capabilities and Constraints

- Interface e conteúdo em português brasileiro.
- Valores financeiros expressos em reais, com locale `pt-BR`.
- Aplicação web responsiva com frontend React e API FastAPI.
- Autenticação por sessão protegida e isolamento dos dados por usuário.
- Ações mutáveis propostas pelo assistente exigem confirmação humana explícita.
- Mudanças de comportamento seguem as especificações mantidas em `specs/`.

## Brand Commitments

- Preservar o nome Contaí e o logotipo-fonte em `design-assets/brand/contai-logo.png`.
- Preservar português brasileiro e reais como idioma e moeda principais.
- Manter uma experiência simples e acessível para um público geral.

## Evidence on Hand

- Descrição funcional e arquitetura em `README.md`.
- Especificações de comportamento em `specs/`.
- Logotipo-fonte em `design-assets/brand/contai-logo.png`; variante otimizada publicada em `frontend/public/brand/contai-logo-576.png`.
- Interface implementada em `frontend/src/`.
- Documentação e controles operacionais de LGPD em `docs/lgpd/`.
- Não há depoimentos, clientes, benchmarks ou outras provas comerciais confirmadas; trabalhos futuros não devem inventá-los.

## Product Principles

1. Tornar a situação financeira atual compreensível rapidamente.
2. Reduzir o esforço necessário para manter as finanças organizadas.
3. Usar linguagem natural sem retirar o controle humano sobre alterações financeiras.
4. Preservar exatidão, privacidade e isolamento dos dados de cada pessoa.
5. Comunicar valores, estados e consequências de forma clara em português brasileiro.

## Accessibility & Inclusion

A experiência deve atender um público geral sem depender exclusivamente de cor para comunicar estados financeiros.
