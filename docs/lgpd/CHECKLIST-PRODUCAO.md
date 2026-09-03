# Checklist LGPD antes da produção

- [ ] Preencher `PRIVACY_CONTROLLER_NAME`, `PRIVACY_CONTACT_EMAIL` e `PRIVACY_COUNTRY` com dados reais.
- [ ] Revisar e aprovar a Política de Privacidade com assessoria jurídica.
- [ ] Aceitar/arquivar o DPA da Groq e mapear seus suboperadores.
- [ ] Definir e documentar mecanismo de transferência internacional compatível com a Resolução nº 19/2024.
- [ ] Ativar Zero Data Retention na organização Groq e guardar evidência datada.
- [ ] Inventariar hospedagem, banco, DNS, observabilidade, suporte e backups.
- [ ] Confirmar criptografia em repouso, rede privada e acesso administrativo com MFA.
- [ ] Definir ciclo de backups e prazo de expurgo após exclusão de conta.
- [ ] Agendar diariamente `python -m app.maintenance.retention --apply` e monitorar falhas.
- [ ] Preencher contatos do plano de incidentes e executar um simulado.
- [ ] Criar processo de protocolo e SLA para pedidos recebidos pelo canal de privacidade.
- [ ] Revisar bases legais e prazos do registro de tratamento.
- [ ] Revisar o RIPD e registrar aprovação do controlador.
