-- Torre de Controle: executar uma vez, em projeto Supabase confirmado.
begin;

create table public.torre_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  theme text not null default 'light' check (theme in ('light','dark')),
  timezone text not null default 'America/Sao_Paulo',
  updated_at timestamptz not null default now()
);
create table public.torre_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 180),
  description text not null default '',
  reference_url text check (reference_url is null or reference_url ~* '^https?://[^[:space:]]+$'),
  area text not null check (area in ('personal','professional')),
  duration_minutes integer not null default 30 check (duration_minutes between 5 and 480 and duration_minutes % 5 = 0),
  due_date date,
  status text not null default 'todo' check (status in ('todo','waiting','completed')),
  waiting_for text,
  follow_up_date date,
  source text not null default 'torre' check (source in ('torre','google_tasks')),
  google_list_id text,
  google_task_id text,
  google_completion_pending boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id,id),
  check (status <> 'waiting' or (length(btrim(waiting_for)) > 0 and waiting_for is not null and follow_up_date is not null)),
  check ((status = 'completed') = (completed_at is not null)),
  check ((source = 'torre' and google_list_id is null and google_task_id is null) or
         (source = 'google_tasks' and length(btrim(google_list_id)) > 0 and google_list_id is not null and length(btrim(google_task_id)) > 0 and google_task_id is not null))
);
create unique index torre_google_task_unique on public.torre_tasks(user_id,google_list_id,google_task_id) where source = 'google_tasks';
create index torre_tasks_status_due on public.torre_tasks(user_id,status,due_date);
create index torre_tasks_follow_up on public.torre_tasks(user_id,follow_up_date) where status = 'waiting';

create table public.torre_work_hours (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  enabled boolean not null default false,
  start_time time not null default '09:00',
  end_time time not null default '18:00',
  updated_at timestamptz not null default now(),
  primary key (user_id,weekday),
  check (start_time < end_time)
);
create table public.torre_scheduled_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id uuid not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id,task_id) references public.torre_tasks(user_id,id) on delete cascade,
  unique (task_id),
  check (end_at > start_at)
);
create index torre_schedule_time on public.torre_scheduled_blocks(user_id,start_at,end_at);
create table public.torre_busy_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  source text not null default 'manual' check (source in ('manual','google_calendar')),
  calendar_id text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);
create unique index torre_busy_external on public.torre_busy_blocks(user_id,calendar_id,external_id) where external_id is not null;
create index torre_busy_time on public.torre_busy_blocks(user_id,start_at,end_at);
comment on table public.torre_busy_blocks is 'Somente disponibilidade. Não armazenar título, descrição, participantes ou conteúdo de reuniões.';

create table public.torre_integration_accounts (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google_tasks','google_calendar')),
  status text not null default 'disconnected' check (status in ('disconnected','connected','error')),
  last_synced_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id,provider)
);
comment on table public.torre_integration_accounts is 'Metadados apenas. Tokens OAuth devem ficar no Vault/backend, nunca nesta tabela pública.';

create function public.torre_touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create function public.torre_task_state() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'completed' then
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;
  if tg_op = 'INSERT' then
    new.google_completion_pending := new.source = 'google_tasks' and new.status = 'completed';
  elsif new.status is distinct from old.status then
    new.google_completion_pending := new.source = 'google_tasks' and new.status = 'completed';
  end if;
  return new;
end;
$$;
create trigger torre_task_state before insert or update on public.torre_tasks for each row execute function public.torre_task_state();

create function public.torre_clear_reservation() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status <> 'todo' or new.area is distinct from old.area or new.duration_minutes is distinct from old.duration_minutes then
    delete from public.torre_scheduled_blocks where user_id = new.user_id and task_id = new.id;
  end if;
  return new;
end;
$$;
create trigger torre_clear_reservation after update on public.torre_tasks for each row execute function public.torre_clear_reservation();

-- Serializa reservas por usuário, inclusive contra inserção de ocupado.
create function public.torre_validate_block() returns trigger
language plpgsql set search_path = '' as $$
declare
  task_row public.torre_tasks;
  hours_row public.torre_work_hours;
  tz text;
  local_start timestamp;
  local_end timestamp;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text,0));
  if exists (select 1 from public.torre_scheduled_blocks b where b.user_id = new.user_id
      and (tg_table_name <> 'torre_scheduled_blocks' or b.id <> new.id)
      and b.start_at < new.end_at and b.end_at > new.start_at) then
    raise exception 'Horário conflita com tarefa reservada' using errcode = '23514';
  end if;
  if tg_table_name = 'torre_scheduled_blocks' then
    if exists (select 1 from public.torre_busy_blocks b where b.user_id = new.user_id and b.start_at < new.end_at and b.end_at > new.start_at) then
      raise exception 'Horário ocupado' using errcode = '23514';
    end if;
    select * into task_row from public.torre_tasks where user_id = new.user_id and id = new.task_id for update;
    if not found or task_row.status <> 'todo' then raise exception 'Tarefa deve estar em A fazer' using errcode = '23514'; end if;
    if new.end_at - new.start_at <> pg_catalog.make_interval(mins => task_row.duration_minutes) then
      raise exception 'Reserva deve corresponder à duração da tarefa' using errcode = '23514';
    end if;
    select timezone into tz from public.torre_preferences where user_id = new.user_id;
    tz := coalesce(tz,'America/Sao_Paulo');
    local_start := new.start_at at time zone tz;
    local_end := new.end_at at time zone tz;
    if new.start_at < now() or local_start::date <> local_end::date or local_start::time < time '07:00' or local_end::time > time '22:00' then
      raise exception 'Reserva fora do período permitido' using errcode = '23514';
    end if;
    select * into hours_row from public.torre_work_hours where user_id = new.user_id and weekday = extract(dow from local_start)::integer;
    if task_row.area = 'professional' and (hours_row.enabled is distinct from true or local_start::time < hours_row.start_time or local_end::time > hours_row.end_time) then
      raise exception 'Fora da jornada profissional' using errcode = '23514';
    elsif task_row.area = 'personal' and hours_row.enabled = true and local_start::time < hours_row.end_time and local_end::time > hours_row.start_time then
      raise exception 'Tarefa pessoal dentro da jornada profissional' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger torre_validate_schedule before insert or update on public.torre_scheduled_blocks for each row execute function public.torre_validate_block();
create trigger torre_validate_busy before insert or update on public.torre_busy_blocks for each row execute function public.torre_validate_block();

-- Eliminar reservas vencidas não conclui tarefas: elas voltam às pendências.
create function public.torre_release_expired_blocks() returns integer
language plpgsql set search_path = '' as $$
declare released integer;
begin
  delete from public.torre_scheduled_blocks where user_id = (select auth.uid()) and end_at < now();
  get diagnostics released = row_count;
  return released;
end;
$$;

do $$
declare tbl text;
begin
  foreach tbl in array array['torre_preferences','torre_tasks','torre_work_hours','torre_scheduled_blocks','torre_busy_blocks','torre_integration_accounts'] loop
    execute format('alter table public.%I enable row level security',tbl);
    execute format('revoke all on table public.%I from anon, authenticated',tbl);
    if tbl = 'torre_integration_accounts' then
      execute format('grant select on table public.%I to authenticated',tbl);
    else
      execute format('grant select,insert,update,delete on table public.%I to authenticated',tbl);
    end if;
    execute format('grant all on table public.%I to service_role',tbl);
    execute format('create policy owner_select on public.%I for select to authenticated using ((select auth.uid()) = user_id)',tbl);
    if tbl <> 'torre_integration_accounts' then
      execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',tbl);
      execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',tbl);
      execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',tbl);
    end if;
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.torre_touch_updated_at()',tbl);
  end loop;
end;
$$;
revoke all on function public.torre_touch_updated_at(),public.torre_task_state(),public.torre_clear_reservation(),public.torre_validate_block(),public.torre_release_expired_blocks() from public,anon,authenticated;
grant execute on function public.torre_release_expired_blocks() to authenticated;

commit;
