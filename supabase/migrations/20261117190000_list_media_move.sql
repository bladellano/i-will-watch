-- Mover obra para outra lista: o cliente passa a poder trocar list_id do próprio vínculo.
-- A RLS list_media_update_own já exige que a lista de origem e a de destino pertençam ao usuário.
-- Os triggers de timeline não são afetados: notes_publish dispara só em "update of notes" e
-- watching_publish só age quando o status muda para ASSISTINDO.
grant update (list_id) on public.list_media to authenticated;
