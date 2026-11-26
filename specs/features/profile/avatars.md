# Avatares do perfil

A pessoa escolhe um dos 16 ícones da galeria em Conta e privacidade, visualiza
a opção e confirma em “Salvar avatar”. A seleção só é persistida ao salvar.
O avatar aparece no cabeçalho móvel e no perfil da barra lateral; o cabeçalho
móvel também dá acesso à conta. A logo do produto e os ícones de instalação
permanecem independentes do avatar pessoal.

## Contrato

- `PATCH /auth/me/avatar`, com `{ "avatar_id": "cat" }`, altera somente o usuário
  da sessão autenticada e retorna o perfil atualizado.
- Exige a proteção CSRF habitual; não aceita identificador de outro usuário,
  arquivos, URLs ou valores fora do catálogo.
- A migração adiciona `users.avatar_id` com padrão `person` para contas atuais
  e novas. A escolha integra login, leitura de perfil e exportação de dados.
- A alteração de avatar não exige senha: é uma preferência visual. Alterações
  de nome, e-mail e senha conservam seus controles próprios.
- A interface permite teclado (setas, Home, End), informa seleção e estado de
  salvamento e mantém a opção disponível para nova tentativa quando houver erro.
- Os desenhos são componentes da dependência Lucide já usada no projeto, com
  cores do tema. Não há upload, serviço externo nem armazenamento de imagens.

## Validação

Testar persistência após login, isolamento entre usuários, rejeição de opções
inválidas e campos extras, acesso não autenticado, prévia sem salvamento
automático, seleção por teclado e recuperação de erro. O ambiente de CI aplica
a migração no PostgreSQL de teste antes de executar a suíte.
