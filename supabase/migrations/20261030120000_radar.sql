-- Radar de Atenção (docs-internas/PRD_RADAR_ATENCAO.md). Aditiva; não altera due_date nem etiquetas.
-- Publicar esta migration antes de qualquer Edge Function que dependa dela.
begin;

create table public.torre_radar (
  task_id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  temperature text not null default 'observar' check (temperature in ('observar','atencao','critico')),
  review_interval_days integer not null default 15 check (review_interval_days in (7,15,30)),
  next_review_date date,
  last_reviewed_at timestamptz,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id,task_id),
  foreign key (user_id,task_id) references public.torre_tasks(user_id,id) on delete cascade
);
create index torre_radar_review on public.torre_radar(user_id,next_review_date);
alter table public.torre_radar enable row level security;
grant select,insert,update,delete on public.torre_radar to authenticated;
grant all on public.torre_radar to service_role;
create policy radar_owner on public.torre_radar to authenticated
  using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

-- Ações executáveis ligadas a um tema. A ação não herda a etiqueta Radar.
alter table public.torre_tasks
  add column radar_task_id uuid,
  add constraint torre_tasks_radar_not_self check (radar_task_id is null or radar_task_id <> id),
  add constraint torre_tasks_radar_parent foreign key (user_id,radar_task_id)
    references public.torre_radar(user_id,task_id) on delete set null (radar_task_id);
create index torre_tasks_radar_task on public.torre_tasks(user_id,radar_task_id) where radar_task_id is not null;

-- Predicado único (RN11): tema Radar = tarefa ativa com a etiqueta Radar.
-- Vale a etiqueta, não a existência de linha em torre_radar.
create view public.torre_radar_themes with (security_invoker=true) as
select t.id as task_id, t.user_id
from public.torre_tasks t
where t.archived_at is null
  and exists (
    select 1
    from public.torre_task_labels tl
    join public.torre_labels l on l.id = tl.label_id and l.user_id = tl.user_id
    where tl.task_id = t.id and tl.user_id = t.user_id
      and not l.archived
      and lower(btrim(l.name)) = 'radar'
  );
revoke all on public.torre_radar_themes from public,anon;
grant select on public.torre_radar_themes to authenticated,service_role;

-- Backfill idempotente: registro padrão para cada tema existente (RN08, RN12).
insert into public.torre_radar(task_id,user_id,next_review_date)
select r.task_id, r.user_id, ((now() at time zone 'America/Sao_Paulo')::date + 15)
from public.torre_radar_themes r
on conflict (task_id) do nothing;

-- torre_save_task igual à versão anterior, mas grava radar_task_id ao criar a tarefa (a edição não o altera).
create or replace function public.torre_save_task(p_task uuid,p_fields jsonb,p_at timestamptz default null,p_kind text default 'execution')
returns void language plpgsql set search_path='' as $$
declare owner uuid:=(select auth.uid()); t public.torre_tasks; existing boolean;
begin
 if owner is null then raise exception 'Entre na Torre'; end if;
 select * into t from public.torre_tasks where id=p_task and user_id=owner for update;
 existing:=found;
 if not existing then
  t:=jsonb_populate_record(null::public.torre_tasks,jsonb_build_object('area','personal','duration_minutes',30,'description','','status','todo','priority','none'));
 end if;
 t:=jsonb_populate_record(t,p_fields);
 if p_at is null then delete from public.torre_scheduled_blocks where user_id=owner and task_id=p_task; end if;
 if existing then
  update public.torre_tasks set title=t.title,description=t.description,reference_url=t.reference_url,area=t.area,duration_minutes=t.duration_minutes,due_date=t.due_date,status=t.status,waiting_for=t.waiting_for,follow_up_date=t.follow_up_date,priority=t.priority,focus_date=t.focus_date where id=p_task and user_id=owner;
 else
  insert into public.torre_tasks(id,user_id,title,description,reference_url,area,duration_minutes,due_date,status,waiting_for,follow_up_date,priority,focus_date,radar_task_id)
  values(p_task,owner,t.title,t.description,t.reference_url,t.area,t.duration_minutes,t.due_date,t.status,t.waiting_for,t.follow_up_date,t.priority,t.focus_date,t.radar_task_id);
 end if;
 if p_at is not null and t.status<>'completed' then
  -- Preserve unchanged existing blocks even after the displayed range is narrowed.
  if not exists(select 1 from public.torre_scheduled_blocks where user_id=owner and task_id=p_task and start_at=p_at and end_at=p_at+pg_catalog.make_interval(mins=>t.duration_minutes) and kind=p_kind) then
   delete from public.torre_scheduled_blocks where user_id=owner and task_id=p_task;
   insert into public.torre_scheduled_blocks(user_id,task_id,start_at,end_at,kind)
   values(owner,p_task,p_at,p_at+pg_catalog.make_interval(mins=>t.duration_minutes),p_kind);
  end if;
 end if;
end $$;
revoke all on function public.torre_save_task(uuid,jsonb,timestamptz,text) from public,anon;grant execute on function public.torre_save_task(uuid,jsonb,timestamptz,text) to authenticated;

commit;
