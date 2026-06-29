# Decisões abertas do proprietário

Estas decisões não bloqueiam `F0-02`, mas têm prazo de decisão. Registrar a escolha em ADR ou documento indicado, não apenas em conversa.

| Quando | Decisão | Recomendação atual |
|---|---|---|
| Antes de F1 | Nome comercial, tom e fidelidade histórica | Manter WWIIRun como codinome; fantasia inspirada no período, sem copiar modelos/marcas exatamente. |
| Antes de F1 | Controles touch e autofire | Movimento relativo + autofire opcional; validar com protótipo. |
| F0-06 | Aparelhos físicos de referência | Decidido: ThinkPad T430u/Windows, iPhone 17, iPad 10ª geração, Galaxy Tab S9 e desktop i5-9600KF com NVIDIA GeForce RTX 2060 SUPER confirmada. ADR-0007 aceita os trios existentes com 119 janelas/595 s; não haverá recoleta para F0. |
| Antes de F2 | Três armas: simultâneas, alternáveis ou slots | Slots alternáveis com cooldown individual; especial pode ter munição/energia. |
| Antes de F3 | Efeito exato de chuva/neve | Efeito moderado, explícito e acessível; evitar penalidade puramente visual. |
| Antes de F4 | Décimo locale | Hindi e `es-ES` foram confirmados; escolher mais um idioma para cumprir o requisito de 10. |
| Antes de F4-06 | Nomes/perks/preços das 20 aeronaves | Aprovar arquétipos antes de produzir arte final. |
| Antes de F5 | Múltiplos jogadores por instalação e autenticação | Uma identidade Supabase por perfil, com troca explícita e recuperação futura. |
| Antes de F5 | Nome público único ou apenas ID único | ID único; display name pode repetir com public tag/sufixo. |
| Antes de F5 release | Privacidade, idade mínima e moderação | Coleta mínima, avatar de catálogo, export/delete e filtro de nomes. |
| Antes de F6 | Compra de moedas afeta Endless | Permitir apenas fora do ranking competitivo ou criar categoria claramente separada. |
| Antes de F6 | Provedor/entitlement de expansões | Fazer spike; sem webhook seguro, lançar packs gratuitos + doações. |
| Antes de assets finais | Política de símbolos históricos e IA | Evitar símbolos sensíveis no core; guardar provenance/licença de cada asset. |
| Antes de release | Licença do código e conteúdo | Escolher licença open source do código e licenças separadas de assets. |

## Decisões já tomadas por arquitetura

Não precisam ser revisitadas sem nova evidência/ADR: Phaser separado do core; desafio com tick fixo/PRNG próprio; hitbox separada de imagem; expansões somente cosméticas; loadout normalizado no ranking Daily/Weekly; offline-first.
