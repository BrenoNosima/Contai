# Registro de operações de tratamento — Contaí

Revisão: 2026-09-03. Responsável pela revisão: controlador/encarregado configurado no ambiente.

| Operação | Dados | Finalidade | Base sugerida a validar | Destinatários | Retenção |
| --- | --- | --- | --- | --- | --- |
| Cadastro e conta | nome, e-mail, hash da senha | criar e administrar conta | execução de contrato | hospedagem e banco | vida da conta |
| Autenticação | sessão, tokens em hash, datas de uso | acesso e prevenção a fraude | execução de contrato/legítimo interesse | hospedagem e banco | validade + 30 dias |
| Gestão financeira | descrições, valores, datas, categorias, metas | fornecer organização financeira | execução de contrato | hospedagem e banco | vida da conta |
| Assistente | mensagem, contexto e dados consultados | interpretar e responder pedidos | execução de contrato | Groq e suboperadores | conforme DPA/ZDR; ações locais: expiração + 30 dias |
| Lembrar e-mail | e-mail no dispositivo | conveniência solicitada | consentimento/ação afirmativa | somente dispositivo | até desmarcar/limpar navegador |
| Segurança | IP temporário no rate limiter e logs mínimos | prevenir abuso e investigar falhas | legítimo interesse/obrigação legal | hospedagem | memória da instância; logs conforme política do provedor |

## Pendências de validação humana

- Confirmar razão social, CNPJ/endereço quando aplicável e contato do controlador.
- Registrar o teste de balanceamento do legítimo interesse.
- Arquivar DPA da Groq, lista de suboperadores, evidência de ZDR e mecanismo de transferência internacional.
- Inventariar hospedagem, banco, e-mail, observabilidade, backups e todo fornecedor não representado no código.
- Aprovar prazos tributários, consumeristas e de defesa judicial com assessoria jurídica.
