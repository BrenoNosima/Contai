# Especificações do Contaí

Esta pasta é a fonte de verdade para o comportamento esperado do produto. Uma
especificação descreve **o que** deve acontecer e como comprovar o resultado;
o código descreve **como** esse comportamento é implementado.

## Fluxo de desenvolvimento

1. Criar ou atualizar uma especificação antes de alterar o comportamento.
2. Confirmar regras, exemplos, casos-limite e itens fora de escopo.
3. Registrar no plano técnico as camadas afetadas.
4. Derivar testes dos critérios de aceitação.
5. Implementar a menor mudança que satisfaça a especificação.
6. Executar as validações indicadas e revisar divergências entre spec e código.
7. Referenciar a especificação no commit ou pull request.

Correções estritamente internas, sem mudança observável, podem usar uma spec
curta. Mudanças de regra financeira, autenticação, persistência ou IA sempre
devem atualizar uma especificação.

## Estrutura

```text
specs/
├── features/       comportamento funcional por domínio
├── decisions/      decisões arquiteturais (ADRs)
└── templates/      modelos para novas especificações
```

## Estado das especificações

- `draft`: ainda está em discussão;
- `accepted`: aprovada para implementação;
- `implemented`: implementada e coberta pelas validações indicadas;
- `deprecated`: mantida apenas como histórico.

## Convenções

- IDs usam `SPEC-<DOMÍNIO>-<NÚMERO>`.
- Requisitos usam `REQ-<NÚMERO>` e critérios usam `AC-<NÚMERO>`.
- Use linguagem observável e verificável: “deve retornar 404”, não “tratar bem”.
- Separe comportamento atual, mudança proposta e itens fora de escopo.
- Cada critério deve apontar para um teste ou verificação manual justificada.

## Especificações iniciais

- [Posição atual e saldo](features/dashboard/current-position.md)
- [Receitas e despesas recorrentes](features/transactions/recurring-transactions.md)
- [Ações da assistente com confirmação](features/assistant/confirmed-actions.md)
- [Isolamento de dados financeiros](features/authentication/data-isolation.md)

Para iniciar uma funcionalidade, copie
[o template de feature](templates/feature-spec.md).
