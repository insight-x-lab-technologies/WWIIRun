# Backend, perfis e leaderboards

## Princípio

Supabase adiciona identidade, sincronização e competição; não é necessário para iniciar uma run offline. O cliente é não confiável.

## Identidade

- primeira entrada cria perfil local com UUID e nome validado;
- quando online, autenticação anônima do Supabase cria `auth.users.id` mundialmente único;
- nome exibido não é identificador e pode precisar de sufixo/moderação;
- múltiplos perfis locais exigem sessões online distintas ou um modelo de perfis-filhos; decidir antes de F5;
- avatar começa por catálogo local seguro, sem upload público no MVP.

## Modelo mínimo proposto

```text
profiles(user_id PK, display_name, avatar_id, created_at, updated_at)
player_progress(user_id PK, coins, max_endless_level, save_version, updated_at)
unlocks(user_id, item_id, unlocked_at, source)
achievements(user_id, achievement_id, earned_at, metadata)
challenge_manifests(id PK, mode, starts_at, ends_at, seed, ruleset, content, loadout)
score_submissions(id PK, user_id, mode, challenge_id?, score, distance, stats,
                  ruleset, content, replay_ref?, run_hash, verification, created_at)
leaderboard_entries(id PK/FK, rank fields/materialized data)
entitlements(user_id, product_id, provider, external_ref, status, created_at)
```

SQL/migrations serão fonte de verdade quando F5 começar. Todas as tabelas privadas usam RLS; usuários leem/escrevem apenas dados permitidos. Moedas, troféus de ranking, entitlements e scores verificados nunca são concedidos por update direto do cliente.

## APIs/Edge Functions

- `register-profile`: valida/modera nome e cria perfil idempotente;
- `get-challenge`: retorna manifesto atual;
- `submit-run`: autentica, limita taxa, valida manifesto/versão/replay e insere;
- `get-leaderboard`: pagina dados públicos mínimos;
- `finalize-daily`: congela ranking, concede troféus top 3 uma única vez;
- `redeem-purchase`: valida webhook/código do provedor antes de entitlement.

## Leaderboards

Partições lógicas: Endless all-time/seasonal, Daily por challenge ID e Weekly por challenge ID. Ordenação deve ter desempate explícito (score desc, distância desc, duração/tick asc quando aplicável, submissão válida mais antiga). Leaderboard local usa o mesmo comparador.

Top 3 diário só é concedido após fechamento do período e job idempotente, não pela posição momentânea. Alterações/moderação mantêm trilha de auditoria.

## Segurança e privacidade

- somente anon key no cliente; service-role apenas em ambiente seguro;
- RLS e testes de autorização para cada tabela/operação;
- nomes normalizados, tamanho limitado, filtro/denúncia futura;
- coletar o mínimo: sem data de nascimento/localização no MVP;
- rate limit, limites de payload/replay e retenção definida;
- política de privacidade e exclusão/exportação antes do lançamento social;
- secrets ficam no Supabase/GitHub Actions, nunca no repositório.

## Limite do plano gratuito

Arquitetura deve tolerar pausa/quota: fila local e mensagem clara. Não prometer disponibilidade contínua. Se validação completa de replay exceder Edge Functions, começar com validação por regras/checkpoints e evoluir sem tornar um serviço pago requisito de lançamento.
