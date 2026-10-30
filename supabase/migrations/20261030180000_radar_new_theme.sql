-- Radar: criação atômica de tema (PRD_RADAR_ATENCAO.md v1.4, RF11/RN12/CA11). Aditiva.
-- Cria a tarefa-tema, a etiqueta Radar, o registro torre_radar e as pessoas numa única transação:
-- se qualquer parte falhar, nada é criado. O tema nasce sem due_date, prioridade ou duração própria.
begin;

create function public.torre_create_radar_theme(p_task uuid,p_fields jsonb,p_radar jsonb,p_people jsonb default '[]'::jsonb)
returns void language plpgsql set search_path='' as $$
declare owner uuid:=(select auth.uid()); label uuid;
begin
 if owner is null then raise exception 'Entre na Torre'; end if;
 if length(btrim(coalesce(p_fields->>'title',''))) not between 1 and 180 then raise exception 'Informe um título'; end if;
 if coalesce(p_fields->>'area','') not in ('personal','professional') then raise exception 'Área inválida'; end if;

 select l.id into label from public.torre_labels l
 where l.user_id=owner and not l.archived and lower(btrim(l.name))='radar' limit 1;
 if label is null then
  if exists(select 1 from public.torre_labels where user_id=owner and lower(btrim(name))='radar') then
   raise exception 'A etiqueta Radar está arquivada; reative-a em Configurações';
  end if;
  insert into public.torre_labels(user_id,name) values(owner,'Radar') returning id into label;
 end if;

 insert into public.torre_tasks(id,user_id,title,description,area,status,priority,due_date)
 values(p_task,owner,btrim(p_fields->>'title'),coalesce(p_fields->>'description',''),p_fields->>'area','todo','none',null);
 insert into public.torre_task_labels(user_id,task_id,label_id) values(owner,p_task,label);
 insert into public.torre_radar(task_id,user_id,temperature,review_interval_days,next_review_date,notes)
 values(
  p_task,owner,
  coalesce(p_radar->>'temperature','observar'),
  coalesce((p_radar->>'review_interval_days')::integer,15),
  coalesce((p_radar->>'next_review_date')::date,(now() at time zone 'America/Sao_Paulo')::date+coalesce((p_radar->>'review_interval_days')::integer,15)),
  coalesce(p_radar->>'notes','')
 );
 if jsonb_typeof(p_people)='array' and jsonb_array_length(p_people)>0 then
  perform public.torre_set_task_people(p_task,p_people);
 end if;
end $$;
revoke all on function public.torre_create_radar_theme(uuid,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.torre_create_radar_theme(uuid,jsonb,jsonb,jsonb) to authenticated;

commit;
