# ADR-001: Adoção de Spec-Driven Development

- Status: aceito
- Data: 2026-09-01

## Contexto

O Contaí reúne regras financeiras, autenticação, persistência, interface e um
assistente com capacidade de propor alterações. Testes isolados não registram,
por si só, a intenção completa do produto nem deixam explícito o comportamento
esperado antes da implementação.

## Decisão

Mudanças observáveis serão orientadas por especificações versionadas em
`specs/features`. Cada spec terá requisitos numerados, cenários, critérios de
aceitação, impacto técnico e evidências de verificação.

Novas funcionalidades e mudanças em regras financeiras, autenticação,
persistência ou IA devem criar ou atualizar uma spec antes da implementação.
Correções internas sem mudança observável podem usar documentação reduzida.

ADRs em `specs/decisions` registrarão decisões técnicas duradouras, alternativas
e consequências; não substituirão as especificações funcionais.

## Consequências

### Positivas

- Regras de negócio ficam explícitas e revisáveis.
- Testes podem ser derivados de critérios estáveis.
- Divergências entre produto, código e IA tornam-se visíveis mais cedo.
- Commits e revisões ganham contexto sobre intenção e escopo.

### Custos

- Mudanças de comportamento exigem manutenção documental.
- Specs antigas precisam ser atualizadas quando a regra muda.
- Critérios sem evidência impedem que uma spec seja marcada como implementada.

## Alternativas consideradas

- Manter somente testes: rejeitada porque não registra todo o contexto do
  produto nem decisões fora do caminho executável.
- Especificar retroativamente todo o sistema: rejeitada pelo custo inicial; a
  adoção será incremental, priorizando áreas críticas e código modificado.

## Revisão

Reavaliar o processo depois das primeiras cinco mudanças conduzidas por specs,
observando clareza, tempo de manutenção e defeitos evitados.
