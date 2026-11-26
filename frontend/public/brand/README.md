# Logotipo da Contaí

Este diretório contém somente a variante otimizada publicada pelo frontend.

- Use PNG com fundo transparente e versão horizontal.
- Prefira largura mínima de 480 px para telas de alta densidade.
- Não estique, recorte, aplique sombra ou altere as cores.

O arquivo-fonte em alta resolução fica em `design-assets/brand/contai-logo.png`.
A interface usa `/brand/contai-logo-576.png`; regenere-a ao substituir o original.
Enquanto a variante não existir, a marca textual de reserva será exibida.

Os arquivos `apple-touch-icon.png`, `icon-192.png` e `icon-512.png` são variantes
quadradas com fundo opaco para instalação. Para regenerá-los sem redesenhar a
marca, execute `python frontend/scripts/build-icons.py` na raiz, com Pillow
instalado. O script preserva a proporção e todos os elementos visíveis da logo.
