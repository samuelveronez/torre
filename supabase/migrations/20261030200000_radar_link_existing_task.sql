-- Radar: vincular tarefa já existente a um tema (PRD_RADAR_ATENCAO.md v1.5, RF12/RF13/RN15). Aditiva.
-- torre_save_task só grava radar_task_id ao criar a tarefa; esta função altera apenas esse vínculo.
-- Publicar esta migration antes do site que a usa.
begin;

create function public.torre_link_task_to_radar(p_task uuid,p_theme uuid default null)
returns void language plpgsql set search_path='' as $$
declare owner uuid:=(select auth.uid()); t public.torre_tasks;
begin
 if owner is null then raise exception 'Entre na Torre'; end if;
 select * into t from public.torre_tasks where id=p_task and user_id=owner and archived_at is null for update;
 if not found then raise exception 'Tarefa indisponível'; end if;
 if p_theme is null then
  update public.torre_tasks set radar_task_id=null where id=p_task and user_id=owner;
  return;
 end if;
 if p_task=p_theme then raise exception 'Um tema não pode ser vinculado a si mesmo'; end if;
 if exists(select 1 from public.torre_radar_themes where task_id=p_task and user_id=owner) then raise exception 'Um tema do Radar não pode ser ação de outro tema'; end if;
 if t.status='completed' then raise exception 'Tarefa concluída não pode ser vinculada'; end if;
 if not exists(select 1 from public.torre_radar_themes th join public.torre_radar r on r.task_id=th.task_id and r.user_id=th.user_id where th.task_id=p_theme and th.user_id=owner) then
  raise exception 'Tema do Radar indisponível';
 end if;
 update public.torre_tasks set radar_task_id=p_theme where id=p_task and user_id=owner;
end $$;
revoke all on function public.torre_link_task_to_radar(uuid,uuid) from public,anon;
grant execute on function public.torre_link_task_to_radar(uuid,uuid) to authenticated;

commit;
