# Operação e validação do Contaí

## Publicação

O build usa `backend/requirements.lock` com hashes e `frontend/package-lock.json`.
O workflow `Validate` executa testes, build, auditoria npm e migrações em um
PostgreSQL 16 descartável. O teste PostgreSQL só aceita um banco terminado em
`_test`; nunca aponte `POSTGRES_TEST_URL` para o banco publicado.

O container aplica migrações antes de iniciar. A nova migração adiciona uma tabela
de limites de requisições e dois índices; não remove nem converte dados existentes.
Em implantação com múltiplas instâncias, aplique migrações uma vez em uma etapa de
release antes de trocar o tráfego. Um rollback do código não exige remover esses
índices ou a tabela nova.

## Verificações

- `/health`: processo disponível, sem chamadas ao provedor.
- `/ready`: conexão com o banco. Usar como health check no painel da hospedagem.
- `/version`: commit informado por `RENDER_GIT_COMMIT`.
- Respostas trazem `X-Request-ID`, inclusive rejeições de segurança.
- Logs `ai_request`, `ai_model`, `ai_tool` e `ai_rate_limit` permitem correlacionar
  duração e limites sem gravar mensagens financeiras.
- O modelo atual continua sendo `openai/gpt-oss-20b`; sua permissão é administrada
  no projeto Groq. Limite do provedor retorna 429 com `Retry-After`, não 502.
- Há até três execuções de IA simultâneas por processo. O limite de requisições
  em produção usa contadores PostgreSQL compartilhados, com chave HMAC do IP e
  janela; não armazena o IP em texto. Confirmar a configuração de proxy/IP real
  da hospedagem antes de ampliar instâncias.

Consultas têm timeout de 10 s, espera por lock de 3 s, conexão e pool de 5 s.
O orçamento de IA é cooperativo; interromper a espera do navegador não desfaz
uma proposta já preparada. Escritas do chatbot continuam dependendo de confirmação.

## Retenção

Em produção, o processo inicia uma rotina de retenção fora do atendimento HTTP.
Executa na inicialização e a cada 24 horas; se falhar, registra o tipo do erro e
tenta novamente em uma hora. Exclui sessões e propostas expiradas há mais de 30
dias e contadores de requisição expirados há mais de um dia. Operações são
idempotentes. A rotina depende do processo estar ativo.

Auditoria manual, sem exclusão:

```sh
python -m app.maintenance.retention
```

Execução administrativa explícita:

```sh
python -m app.maintenance.retention --apply
```

## Backups e permissões externas

A rotina de retenção não substitui backup. Confirmar no painel do provedor do
banco: backup automático, prazo de retenção, criptografia, controle de acesso e
possibilidade de recuperação para um ponto no tempo. Validar uma restauração em
outro banco antes de considerar o processo comprovado. Não fazer restauração de
teste sobre produção e não versionar dumps ou credenciais.

Também precisam de evidência administrativa: configurações de retenção da Groq,
DPA e contatos de incidentes. A inspeção de código não comprova esses controles.
Recuperação de senha por e-mail depende de um serviço de envio configurado;
esta alteração disponibiliza a troca voluntária com a senha atual, não envia
tokens de recuperação nem mensagens a terceiros.

## Mudanças visíveis

- Calendário: botão “Atualizar recorrências”, com sucesso e falha explícitos;
  a consulta da tela não grava ocorrências.
- Lançamentos: páginas de 50 itens e botão para carregar mais; erro de resumo
  não é apresentado como zero.
- Conta: acesso à troca voluntária de senha.
- Chat: conversa preservada na sessão da aba por usuário, propostas pendentes
  recuperadas do servidor, limpeza do histórico ao sair.
- Instalação: manifesto e ícones quadrados opacos derivados da logo existente.
- Privacidade: conteúdo público continua acessível se a API estiver indisponível;
  não apresenta um contato fictício.

## Validação em produção

Usar conta temporária e valores fictícios. Verificar leitura, paginação,
parcelamento, meta, geração explícita de recorrências, análise, planejamento,
proposta sem execução automática, confirmação/rejeição e exportação. Excluir a
conta temporária ao concluir. Medir amostras de latência separadamente de um
teste de carga; uma resposta rápida não comprova p95 ou capacidade simultânea.
