# Relatório de Impacto à Proteção de Dados — versão inicial

## Escopo

Conta pessoal, dados financeiros, autenticação e assistente de IA. Dados financeiros não são automaticamente “dados pessoais sensíveis” do art. 5º, II, mas têm alto impacto econômico e podem revelar aspectos sensíveis por inferência.

## Necessidade e proporcionalidade

Nome/e-mail são necessários à conta; registros financeiros são fornecidos pelo titular para a função central. O envio à IA deve ser limitado à mensagem, ao contexto recente e aos resultados estritamente necessários. O assistente é opcional e o restante do produto deve continuar disponível sem ele.

## Riscos e salvaguardas

| Risco | Nível | Salvaguarda atual | Ação residual |
| --- | --- | --- | --- |
| Acesso entre contas | alto | escopo automático e testes | teste recorrente e auditoria administrativa |
| Tomada de conta | alto | cookies HttpOnly, CSRF, hash de senha, rate limit | MFA, recuperação segura, rate limit distribuído |
| Exposição ao provedor de IA | alto | redação parcial e aviso | ZDR, DPA, cláusulas ANPD, ampliar minimização |
| Retenção excessiva | médio | exclusão de conta e rotina de purge | agendamento e ciclo de backups |
| Falha no direito do titular | médio | correção, exportação e exclusão self-service | canal com protocolo e SLA |
| Incidente sem resposta | alto | controles preventivos | simulado anual e contatos operacionais |

## Decisão

Produção somente após completar identidade do controlador, contratos/transferência da Groq, ZDR, inventário de fornecedores e plano operacional de backups. Revisar este RIPD antes de nova finalidade, novo provedor, analytics ou tratamento em larga escala.
