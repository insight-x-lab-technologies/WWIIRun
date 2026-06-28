# UX, responsividade, acessibilidade e i18n

## Estratégia de layout

Menus são DOM responsivo; gameplay é canvas Phaser com overlays DOM mínimos. CSS usa safe-area insets, pointer coarse/fine, reduced motion e breakpoints por espaço disponível, não por modelo de aparelho.

Classes de layout testadas:

- celular portrait estreito (320–440 CSS px);
- celular landscape baixo;
- tablet portrait e landscape;
- desktop 16:9 e ultrawide controlado;
- PWA standalone e iframe itch.io.

No gameplay, controles não cobrem aeronave, ameaças críticas ou HUD. Botões touch têm alvo mínimo de 44×44 CSS px e zonas configuráveis. Mudança de orientação pausa com segurança, recalcula viewport e preserva estado.

## Home

Cabeçalho mostra avatar clicável, nome ativo, moedas, troféus e maior nível Endless. Ações primárias: Endless, Daily e Weekly. Secundárias: Hangar, Leaderboards, Loja, Expansões, Configurações. Apoio/compartilhamento ficam em seção não intrusiva. Em telas pequenas, usar navegação paginada/scroll, nunca reduzir tudo até ficar ilegível.

## Onboarding e perfis

Primeira abertura solicita nome, explica armazenamento/sincronização e oferece avatar. Validação ocorre localmente e no servidor ao conectar. Perfil mostra ID público seguro, estatísticas, troféus e ações de troca/criação. Não expor UUID de autenticação se um public ID separado for mais seguro/legível.

## HUD

- prioridade alta: vida/escudo, armas/cooldowns, ameaça/power-up;
- status: distância, moedas, nível, velocidade;
- diagnóstico: FPS e seed podem ser compactos/alternáveis, mas permanecem disponíveis conforme requisito;
- seed longa aparece abreviada com ação copiar/expandir;
- não depender só de cor; ícone + forma + texto quando necessário.

## Áudio e configurações

Sliders separados: master, música e SFX; toggles de música menu/gameplay; mute rápido. Persistir preferências por instalação/perfil conforme decisão. Botão toca feedback somente se SFX ativo. Trilhas fazem crossfade e suspendem no background.

Opções recomendadas: intensidade de partículas, flash reduzido, screen shake, vibração, tamanho/posição de touch controls, contraste e autofire. Quality tier automático pode ser sobrescrito.

## Idiomas

Locale padrão `en`. Confirmados: `en`, `es-ES`, `pt-BR`, `fr`, `it`, `de`, `ja`, `zh-CN` e `hi`. A repetição de espanhol no pedido original foi um engano, portanto há 9 idiomas distintos confirmados; o décimo locale continua aberto e deve ser escolhido antes de F4.

- ICU-style messages/pluralização; não concatenar frases;
- chaves semânticas e fallback para inglês;
- fontes com glifos CJK/Devanagari carregadas por subset/locale;
- pseudo-locale para expansão de texto e glyph audit;
- números/datas com `Intl`, mas seed/challenge key são canônicos;
- layouts suportam texto 30–50% maior; nenhuma string desenhada dentro de bitmap final.

## Compartilhamento

Web Share API quando disponível, fallback copiar URL/e-mail/WhatsApp. Instagram/TikTok web normalmente não oferecem share direto arbitrário: gerar card/resultado e instruir o usuário a compartilhar via share sheet; links não devem fingir integração inexistente. Nunca publicar automaticamente.

## Acessibilidade mínima

Navegação por teclado nos menus, foco visível, labels, contraste WCAG AA onde aplicável, semantic HTML, diálogo com focus trap/escape, redução de movimento/flash e alternativa a gestos complexos. Canvas oferece instruções/estado essencial em DOM acessível, mesmo que gameplay completo não seja screen-reader equivalente.
