# Latência e confiabilidade do assistente

Consultas exatas e independentes de contexto sobre saldo atual e receitas,
despesas ou saldo realizado do mês atual/anterior recebem resposta determinística
pelos serviços existentes, sem chamadas ao modelo, quando não há histórico.
Perguntas com filtros, cenários futuros, instruções compostas e complementos de
conversa seguem pelo agente. O isolamento por usuário e a confirmação de escrita
continuam obrigatórios. Valores usam Decimal; períodos usam America/Sao_Paulo.

## Limites e falhas

- O supervisor e especialistas compartilham um orçamento por pergunta, com padrão
  de 45 segundos, seis chamadas ao modelo e um retry de erro transitório.
- O timeout de cada chamada ao provedor é o menor entre AI_TIMEOUT_SECONDS e o
  tempo restante. Retries internos do SDK ficam desativados. Erros de conexão e
  erros internos do provedor podem repetir apenas a chamada ao modelo, sem replay
  de ferramentas. Rate limits e argumentos inválidos não provocam retry automático.
- O prazo é cooperativo: verificado antes/depois de modelos e ferramentas. Não
  interrompe uma consulta SQL já em execução; o timeout HTTP limita espera de I/O
  do provedor, e não constitui um cancelamento forçado de toda a requisição.
- O frontend encerra a espera após 130 segundos, cobrindo também CSRF, renovação
  de sessão e leitura do corpo. Abortar a conexão não desfaz propostas já criadas.
- Orçamento excedido e timeout do provedor retornam HTTP 504; resposta vazia ou
  falha inesperada retorna HTTP 502. O texto não contém detalhes internos.
- O histórico enviado ao modelo fica limitado às últimas 20 mensagens inteiras
  e 16.000 caracteres. Toda entrada recebida é validada antes de reduzir contexto.

## Concorrência e observabilidade

A transação de autenticação é encerrada antes da espera pelo modelo. Ferramentas
continuam usando sessões curtas próprias; a consulta de propostas pendentes usa
novamente a sessão da requisição.

Logs ai_request, ai_model e ai_tool registram identificador de correlação,
durações, número de chamadas/retries e nome da ferramenta, sem mensagens, valores
financeiros ou credenciais. Falhas de especialistas registram o tipo do erro.

Validar em produção o commit publicado e comparar p50/p95, taxa de 502/504,
tempo de banco e chamadas por pergunta. Testes com modelos simulados verificam
contratos, mas não comprovam latência real. Streaming não foi introduzido nesta
mudança; exige preservar sanitização incremental e confirmação humana.

## Modelo bloqueado na Groq

Um teste real em 25/11/2026 com a credencial configurada retornou HTTP 403,
`model_permission_blocked_project`, para `openai/gpt-oss-20b`. A liberação deve
ocorrer no projeto que emitiu a chave, em
https://console.groq.com/settings/project/limits. As permissões da organização
também precisam permitir o modelo. Não substituir por um modelo aleatório nem
implementar fallback que contorne uma restrição administrativa. A API retorna
503 e registra `ai_provider_permission_denied` para esta classe de erro.

Esse resultado confirma a falha da credencial local, mas não confirma a chave,
permissões ou versão efetivamente usadas pelo site publicado. Após corrigir a
permissão e publicar, validar novamente o caminho completo de análise e proposta.
