# Logotipo da Contaí

Este diretório contém somente a variante otimizada publicada pelo frontend.

- Use PNG com fundo transparente e versão horizontal.
- Prefira largura mínima de 480 px para telas de alta densidade.
- Não estique, recorte, aplique sombra ou altere as cores.

O arquivo-fonte em alta resolução fica em `design-assets/brand/contai-logo.png`.
A interface usa `/brand/contai-logo-576.png`; regenere-a ao substituir o original.
Enquanto a variante não existir, a marca textual de reserva será exibida.

Os arquivos `apple-touch-icon-symbol.png`, `icon-symbol-192.png` e
`icon-symbol-512.png` usam somente o símbolo, sem nome ou slogan, com fundo opaco.
O fonte está em `design-assets/brand/contai-symbol-icon.png`. Para regenerar os
tamanhos de instalação, execute `python frontend/scripts/build-icons.py` na raiz,
com Pillow instalado. A logo completa do site continua no arquivo original.
