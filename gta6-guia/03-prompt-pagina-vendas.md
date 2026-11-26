# Prompt — Página de vendas Vice Detonado

> Copie tudo abaixo da linha e cole no seu agente. A copy completa já vem no fim.

---

Você vai construir a **página de vendas do Vice Detonado**, um produto digital low ticket. Leia tudo antes de começar.

## 1. O produto (concepção)

- **O que é:** um app de bolso (PWA no celular) com o detonado completo do GTA VI: as 135 missões passo a passo com 556 imagens do jogo, a checklist dos 100% e os colecionáveis item por item (mais de 700 itens marcáveis), o que se perde em cada capítulo, busca instantânea e progresso salvo.
- **Para quem:** jogador brasileiro de 18 a 35 anos, jogando GTA VI no PS5 ou Xbox Series. Joga à noite e no fim de semana, quer zerar e fechar os 100% sem perder nada e não lê guia em inglês.
- **A dor que a página explora:** perder tempo no YouTube (vídeo de 40 minutos, intro, patrocinador, "se inscreva", conteúdo em inglês, 15 abas abertas, e no final não acha o que procurava). Também: perder missão que some pra sempre, ter o dinheiro zerado no fim do Capítulo 1, travar o 100% por um colecionável esquecido, 200 horas de platina no escuro.
- **A virada:** o problema não é o jogador, é a bagunça. A informação existe, mas está espalhada. Quem fecha rápido joga organizado.
- **Mecanismo:** celular do lado da TV. Chegou numa missão? Abre, vê o passo a passo com imagem e resolve. Pegou um colecionável? Toca e marca. O app mostra exatamente o que falta.
- **Oferta:**
  - Principal: **R$ 5,90**, pagamento único, acesso imediato. Compra por impulso: a página tem que levar ao botão rápido.
  - Order bumps no checkout (não na página): Rota do Dinheiro, Guia da Platina, Garagem & Arsenal.
  - Garantia de 7 dias.
- **Tom:** agressivo, direto, na língua de quem joga. Frases curtas. Bate forte na dor e entrega a solução logo em seguida.

## 2. A estrutura

Siga a copy do fim **exatamente**, bloco por bloco, na mesma ordem. Não invente blocos, não tire blocos e não reescreva o texto. Se algo não couber no layout, me avise em vez de mudar.

Blocos: 1. Topo · 2. Dor · 3. Virada · 4. Apresentação · 5. O que tem dentro · 6. Como funciona · 7. Comparação · 8. Para quem é · 10. Preço · 11. Garantia · 12. Perguntas frequentes · 13. Fechamento · Rodapé.

O **bloco 9 (order bumps) não vai na página**: é o texto do checkout. Deixe de fora.

## 3. Identidade visual (estética Vice City, sem marca oficial)

- **Clima:** neon dos anos 80 de Miami: pôr do sol, palmeiras, noite roxa, letreiro neon.
- **Cores:**
  - fundo `#0d0618`; cartões `#1c1033`; bordas `#3a2560`
  - texto `#f6eeff`; texto secundário `#b3a3d1`
  - rosa neon `#ff2e88`; ciano neon `#19e3ff`; dourado `#ffd24a`; laranja `#ffa34a`; verde de "feito" `#3df5a6`
  - gradiente principal: `linear-gradient(90deg, #ff2e88, #19e3ff)` em títulos de destaque e botões
  - gradiente do sol: `#ffd24a → #ff8a3c → #ff2e88 → #b31eff`
- **Fontes (Google Fonts):**
  - **Bungee** para títulos, preço e botões, em maiúsculas
  - **Inter** para o texto (400, 600, 800)
- **Elementos:**
  - sol com listras horizontais (máscara com faixas) atrás de palmeiras em silhueta, no topo
  - leve brilho neon (text-shadow rosa) nos títulos
  - cartões com borda fina, cantos 14–22px e uma barra lateral em gradiente
  - tabela de comparação com a coluna Vice Detonado destacada em verde
- **Botões (CTA):**
  - grandes, largura total no celular, gradiente rosa→ciano, texto escuro em Bungee
  - repita o CTA onde a copy indica
  - leve animação de pulso no botão do preço
- **É proibido:** logo do GTA ou da Rockstar, a fonte/estilo oficial do logo do GTA, capa, artes oficiais, os personagens Jason e Lucia como identidade, prints com a logo do jogo. "GTA VI" aparece só no texto, pra dizer de que jogo é o guia.

## 4. Imagens (mockups)

Por enquanto use **placeholders** com legenda clara, por exemplo `[MOCKUP: celular com o app aberto ao lado de uma TV com o jogo]`. Vou trocar depois.
Lugares: topo (celular + TV), "O que tem dentro" (uma tela do app por módulo) e "Como funciona" (3 telas pequenas).

## 5. Técnico

- **Stack:** use a do meu projeto (HTML puro ou Next.js). Se não tiver certeza, pergunte antes.
- **Pensada para o celular:** a maioria vem do anúncio no Instagram. Teste em 360px de largura, sem rolagem lateral.
- **Leve:** a página precisa abrir rápido no 4G. Imagens em WebP com `loading="lazy"` (menos a do topo), sem bibliotecas pesadas, fontes com `display=swap`.
- **Checkout:**
  - todos os botões levam para o mesmo link, numa constante única (`CHECKOUT_URL = '#checkout'`) que eu troco depois
  - os parâmetros da URL (UTMs, fbclid) passam junto pro link do checkout
- **Pixel:** deixe o ponto pronto para o Meta Pixel no `<head>`, comentado, e dispare `InitiateCheckout` no clique dos botões.
- **SEO básico:** título "Vice Detonado: o detonado completo do GTA VI", descrição curta, imagem de compartilhamento (placeholder).
- **Âncora de preço:** a copy tem um "De R$ 19,90". Deixe isso numa variável fácil de remover, porque só vou usar se o preço for real.
- **Depoimentos:** não invente nenhum. Se quiser reservar espaço, deixe vazio e comentado.
- **Rodapé:** o aviso de guia independente e não oficial é obrigatório, exatamente como está na copy.

## 6. Entrega

1. A página pronta e funcionando.
2. Uma conferência: cada bloco da copy presente e na ordem, nenhum texto alterado, CTAs apontando pro `CHECKOUT_URL`, sem rolagem lateral no celular.
3. A lista dos placeholders que eu preciso preencher: mockups, link do checkout, pixel, links do rodapé.

---

## COPY COMPLETA (use exatamente este texto)


## 1. Topo (primeira dobra)

**Pré-título:** PARA QUEM JÁ ESTÁ JOGANDO GTA VI (PS5 E XBOX)

# Para de perder sua noite no YouTube procurando o que fazer no GTA VI.

**Subtítulo:** Todas as 135 missões passo a passo com imagem, a checklist dos 100% e cada colecionável marcado no seu celular. Você joga, olha do lado, marca e segue. Sem vídeo de 40 minutos, sem 15 abas abertas, sem "se inscreva no canal".

**[MOCKUP: celular com o app aberto ao lado de uma TV com o jogo]**

**Botão:** QUERO O GUIA POR R$ 5,90

**Abaixo do botão:** Acesso imediato no celular · Funciona offline · PS5 e Xbox Series

---

## 2. A dor (agitação)

### Você conhece esse roteiro.

Você está jogando. Trava numa missão. Pausa.

Pega o celular. Abre o YouTube. Digita o nome da missão.

Clica no primeiro vídeo: **38 minutos.** Pula a vinheta. Pula o "antes de começar, deixa o like". Pula o patrocinador. Arrasta a barrinha procurando a parte que importa.

Não é esse. Volta. Abre outro. **Em inglês.** Abre um site. Pop-up. Anúncio. Mais anúncio. O mapa não carrega.

**25 minutos depois você ainda não achou.** O controle está largado no sofá. A vontade de jogar foi embora.

E o pior não é o tempo perdido. O pior é o que você **nem sabe que está perdendo**:

- ❌ A missão opcional que **some pra sempre** quando você avança o capítulo.
- ❌ O dinheiro que **o jogo zera no fim do Capítulo 1**, e você só descobre depois.
- ❌ A carta, a revista, a meditação que ficaram pra trás e **travaram o seu 100%**.
- ❌ As **200 horas** de platina feitas no escuro, sem saber o que ainda falta.

Você comprou o jogo mais esperado da década pra **jogar**, não pra virar pesquisador de fórum.

---

## 3. A virada

### O problema não é você. É a bagunça.

A informação existe. Só que ela está **espalhada em 50 sites, 300 vídeos e 3 idiomas.** Cada um com um pedaço. Nenhum com tudo. Nenhum que lembre o que **você** já fez.

Quem fecha o GTA VI rápido não joga melhor que você. **Joga organizado.**

---

## 4. Apresentação do produto

# Vice Detonado: o guia de bolso do GTA VI

Tudo o que você precisa pra zerar, fechar os 100% e platinar, **num app só, em português, no seu celular.**

Você deixa o celular do lado da TV. Chegou numa missão? Abre, vê o passo a passo com imagem e resolve. Pegou um colecionável? Toca e marca. O app lembra tudo e mostra **exatamente o que falta.**

**Botão:** QUERO O VICE 100% AGORA

---

## 5. O que tem dentro

### 🎯 135 missões passo a passo
Cada missão com objetivos, passo a passo e **556 imagens do jogo** mostrando onde ir e o que fazer. Dicas destacadas e aviso das missões que somem se você avançar.

### 💯 Checklist dos 100% + todos os colecionáveis
O checklist oficial dos 100% com o peso de cada item, e os colecionáveis **item por item**: meditações, os scans do WAiNK, livros, achados subaquáticos, tesouros do Kenton, saltos e mais. **Mais de 700 itens pra marcar.**

### 🎮 Começo & História
O que fazer na primeira hora, as configurações que mudam o jogo, como salvar sem perder nada e **o que você perde em cada capítulo se não fizer antes.**

### 🔎 Busca instantânea
Digitou "flamingo", "cofre" ou o nome da missão? Aparece na hora. **Sem vídeo, sem anúncio, sem espera.**

### 📲 Progresso salvo
Marca no celular e continua de onde parou. Trocou de aparelho? Seu progresso vai junto.

---

## 6. Como funciona

1. **Compra** por R$ 5,90 e recebe o acesso no e-mail na hora.
2. **Abre no celular** e coloca na tela inicial, como um app. Funciona até sem internet.
3. **Joga com ele do lado.** Consulta, marca e vê sua porcentagem subir.

---

## 7. Comparação

| | YouTube e sites | Vice Detonado |
|---|---|---|
| Tempo pra achar uma resposta | 10 a 30 minutos | Segundos |
| Idioma | Metade em inglês | Português |
| Anúncio e enrolação | Toda hora | Zero |
| Sabe o que você já fez | Não | Sim, marca tudo |
| Avisa o que é perdível | Às vezes, se você achar o vídeo certo | Em cada capítulo |
| Tudo num lugar só | Nunca | Sim |

---

## 8. Para quem é

**É pra você se:**
- ✅ Está jogando GTA VI no PS5 ou Xbox Series.
- ✅ Quer zerar sem travar e sem perder missão.
- ✅ Quer fechar os 100% ou platinar sem passar 200 horas no escuro.
- ✅ Tem pouco tempo pra jogar e não quer desperdiçar ele no YouTube.

**Não é pra você se:**
- ❌ Gosta de passar a noite assistindo vídeo em vez de jogar.

---

## 9. Order bumps (texto de cada um no checkout)

**💰 Rota do Dinheiro: R$ 5,90**
Os jeitos mais rápidos de fazer dinheiro, os cofres de banco que pagam até $205 mil, os códigos dos cofres e como **não perder sua grana na virada do Capítulo 1**. Pare de ficar duro em Leonida.

**🏆 Guia da Platina: R$ 5,90**
Os 55 troféus com o jeito exato de pegar cada um, o roteiro da platina em 3 etapas e todos os cheats (e quando **não** usar, porque eles travam seus troféus).

**🏎️ Garagem & Arsenal: R$ 5,90**
Os 15 melhores supercarros e onde achar, garagens de graça, o tanque, o caça, as 8 armas lendárias e os segredos escondidos no mapa.

---

## 10. Preço

### Quanto vale a sua noite de jogo?

Uma hora perdida no YouTube por dia, numa semana, dá **7 horas jogadas fora.** Numa platina de 200 horas, dá pra perder **dias inteiros** procurando coisa.

O Vice Detonado custa menos que um lanche:

**De R$ 19,90 por apenas**
# R$ 5,90
**pagamento único · acesso imediato · atualizações incluídas**

**Botão:** QUERO O VICE 100% POR R$ 5,90

> ⚠️ Use "De R$ 19,90" só se esse preço for real em algum momento. Se não, tire a âncora e deixe só o R$ 5,90.

---

## 11. Garantia

### Risco zero: 7 dias de garantia

Entra, usa, testa no jogo. Se em 7 dias achar que não valeu cada centavo, pede o reembolso e recebe **100% do valor de volta.** Sem pergunta, sem enrolação.

---

## 12. Perguntas frequentes

**Como recebo o acesso?**
Na hora, no e-mail da compra. É só entrar com o seu e-mail e a senha que vai junto.

**Preciso baixar alguma coisa?**
Não. Abre no navegador do celular e você pode colocar na tela inicial, como um app. Depois de aberto, funciona até sem internet.

**Serve pra PS5 e Xbox?**
Sim. O guia é do modo história, que é igual nos dois.

**Tem spoiler?**
O passo a passo das missões descreve o que acontece nelas. O checklist e os colecionáveis não têm spoiler da história.

**E se o jogo receber atualização?**
O guia é atualizado junto, sem custo a mais pra você.

**É pirataria ou mod?**
Não. É um guia. Você não instala nada no console e não arrisca sua conta.

**Posso usar no computador?**
Pode. Funciona em qualquer navegador.

---

## 13. Fechamento

### Você pode continuar pausando o jogo pra caçar vídeo.

Ou pode ter **tudo na palma da mão** e usar seu tempo pra fazer o que você comprou o jogo pra fazer: **jogar.**

**Botão:** QUERO ZERAR O GTA VI SEM PERDER TEMPO

---

## Rodapé (obrigatório)

Vice Detonado é um guia independente e não oficial, sem vínculo com a Rockstar Games ou a Take-Two Interactive. Grand Theft Auto e GTA são marcas registradas de seus respectivos donos, citadas apenas para identificar o jogo. Localizações podem ser aproximadas e o conteúdo pode mudar com atualizações do jogo.

[Termos de uso] · [Política de privacidade] · [Contato]
