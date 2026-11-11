# Revisão de custos e chamadas externas

## Onde há chamadas a serviços pagos ou limitados

| Chamada | Onde | Quando | Custo |
|---|---|---|---|
| TMDB `/search/multi` | `search-tmdb` | Ao clicar em Buscar (por página) | Gratuito (token próprio, limites generosos) |
| TMDB `/movie/{id}` ou `/tv/{id}` | `add-media` | Ao confirmar a inclusão de uma obra | Gratuito |
| TMDB `/search/movie` e `/search/tv` | `identify-media` | Após a IA responder (até 6 candidatos) | Gratuito |
| OpenAI Responses | `identify-media` | **Somente** após clicar em "Identificar" e confirmar o aviso de custo | **Pago** |
| Supabase | Todo o app | Uso normal | Plano gratuito (veja limites abaixo) |

Nenhuma outra chamada externa existe no código (verificado por busca de `fetch`/`invoke`).

## Controles de custo da IA

- Só roda por clique explícito, com aviso de custo (cancelar não envia nada).
- Teto de **10 identificações por usuário a cada 24 h** (janela móvel), contado em `ai_usage_log`.
- Reserva atômica da captura: duplo clique ou duas abas não geram duas chamadas.
- `reasoning.effort: low`, `max_output_tokens: 3000`, `store: false`, timeout de 90 s.
- Imagens limitadas a 5 MB (JPEG/PNG/WebP) e apagadas ao concluir ou descartar a captura.
- `ai_usage_log` não é acessível pelo cliente (RLS e sem permissões); só a função (service role) escreve.

## Consultas SQL (SQL Editor do Supabase)

```sql
-- Chamadas de IA por dia e por usuário (últimos 30 dias)
select date_trunc('day', created_at) as dia, user_id, count(*) as chamadas,
       sum(input_tokens) as tokens_entrada, sum(output_tokens) as tokens_saida
from ai_usage_log
where created_at > now() - interval '30 days'
group by 1, 2
order by 1 desc, chamadas desc;

-- Total e média diária de tokens (para estimar o custo com o preço do modelo atual)
select count(*) as chamadas,
       sum(input_tokens) as tokens_entrada,
       sum(output_tokens) as tokens_saida,
       round(count(*)::numeric / greatest(1, extract(day from now() - min(created_at))), 2) as chamadas_por_dia
from ai_usage_log;

-- Quem está perto do teto agora (>= 8 nas últimas 24 h)
select user_id, count(*) as ultimas_24h
from ai_usage_log
where created_at > now() - interval '24 hours'
group by user_id
having count(*) >= 8;

-- Capturas por status e capturas paradas há mais de 7 dias
select status, count(*) from capture_requests group by status;
select id, status, created_at from capture_requests
where status <> 'completed' and created_at < now() - interval '7 days';

-- Armazenamento usado por imagens de captura
select count(*) as arquivos, pg_size_pretty(sum((metadata->>'size')::bigint)) as total
from storage.objects where bucket_id = 'captures';
```

Custo estimado = `tokens_entrada × preço de entrada + tokens_saida × preço de saída`, usando a tabela de preços atual do modelo configurado (`OPENAI_MODEL`) na página de preços da OpenAI.

## Limites do plano gratuito do Supabase a acompanhar

Banco (500 MB), Storage (1 GB), usuários ativos mensais e invocações de Edge Functions. Acompanhe em **Project Settings → Usage**. O projeto gratuito pode ser pausado após inatividade prolongada.

## Recomendações

- Configure um limite de gasto mensal no painel da OpenAI.
- Revise as consultas acima de tempos em tempos; se houver mais usuários, considere reduzir o teto diário.

## Ponto de atenção encontrado na revisão (não alterado)

O registro em `ai_usage_log` só é gravado quando a OpenAI responde com sucesso. Se a chamada falhar (erro HTTP ou timeout de 90 s), a captura vai para "failed" e pode ser tentada de novo **sem consumir o teto diário**. Erros HTTP normalmente não são cobrados, mas um timeout pode ser. O risco é pequeno (exige cliques repetidos do próprio usuário), mas uma melhoria possível é registrar também as tentativas que falharam, com tokens nulos.
