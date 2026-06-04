# 🧪 Validação de Rastreamento — Jornada com Deus

## 1️⃣ Testar Meta Pixel

**Pixel ID:** `705462081984189`

1. Instala a extensão "Meta Pixel Helper" no Chrome
2. Abre https://jornada-com-deus.pages.dev/vendas.html
3. Procura o ícone roxo no canto superior direito
4. Se aparecer com ✓ azul = Pixel está funcionando
5. Clica no ícone pra ver eventos que dispararam:
   - PageView ✓
   - ViewContent ✓

## 2️⃣ Testar Clarity

1. Vai em https://clarity.microsoft.com
2. Loga com sua conta Microsoft
3. Abre seu projeto "Jornada com Deus"
4. Vai em "Sessions"
5. Atualiza a LP no navegador
6. Volta ao Clarity e atualiza
7. Deve aparecer uma sessão nova com sua atividade

## 3️⃣ Testar Cliques em CTA

1. Na LP, clica em qualquer botão "Começar"
2. No Meta Pixel Helper, deve aparecer evento:
   - InitiateCheckout ✓
   - Com valor 67.00 ✓
   - Com category do botão (navbar, hero, preços, etc) ✓

## 4️⃣ Testar UTMs

1. Abre a LP com UTMs na URL:
   https://jornada-com-deus.pages.dev/vendas.html?utm_source=facebook&utm_campaign=teste

2. Clica em "Começar"
3. Vai pra Kiwify
4. Na URL do Kiwify deve aparecer: ?utm_source=facebook&utm_campaign=teste
5. Se aparecer = UTMs estão sendo preservados ✓

## 5️⃣ Testar Compra (server-side)

1. Faz uma compra de teste no Kiwify
2. Vai em Meta Business → Gerenciador de Eventos
3. Clica no seu Pixel
4. Vai em "Test Events"
5. Atualiza a página
6. Deve aparecer um evento "Purchase" recente com:
   - Valor: 67.00
   - Moeda: BRL
   - Email do cliente ✓

Se tudo aparecer = rastreamento completo funcionando! ✓
