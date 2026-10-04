begin;
create table public.torre_captures (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade,
 body text not null default '' check(length(body)<=50000), title text not null default '',
 state text not null default 'inbox' check(state in ('inbox','processed','error')), error text,
 created_at timestamptz not null default now(), unique(user_id,id)
);
alter table public.torre_tasks add column capture_id uuid, add column archived_at timestamptz,
 add column google_updated_at timestamptz, add column sync_error text;
alter table public.torre_tasks add constraint torre_capture_owner foreign key(user_id,capture_id) references public.torre_captures(user_id,id);
create unique index torre_capture_task on public.torre_tasks(capture_id) where capture_id is not null and archived_at is null;
create table public.torre_labels (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade,
 name text not null check(length(btrim(name)) between 1 and 60), description text not null default '',
 color text not null default '#2563eb' check(color ~ '^#[0-9a-fA-F]{6}$'), archived boolean not null default false,
 unique(user_id,id), unique(user_id,name)
);
create table public.torre_task_labels (
 user_id uuid not null default auth.uid(), task_id uuid not null, label_id uuid not null, primary key(task_id,label_id),
 foreign key(user_id,task_id) references public.torre_tasks(user_id,id) on delete cascade,
 foreign key(user_id,label_id) references public.torre_labels(user_id,id) on delete cascade
);
create table public.torre_attachments (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), capture_id uuid not null,
 name text not null check(length(name) between 1 and 255), size bigint not null check(size between 0 and 20971520),
 path text not null unique, state text not null default 'uploading' check(state in ('uploading','uploaded','error')), error text,
 created_at timestamptz not null default now(),
 foreign key(user_id,capture_id) references public.torre_captures(user_id,id) on delete cascade,
 check(path = user_id::text || '/' || capture_id::text || '/' || id::text)
);
create function public.torre_limit_attachments() returns trigger language plpgsql set search_path='' as $$
begin
 perform 1 from public.torre_captures where id=new.capture_id and user_id=new.user_id for update;
 if (select count(*) from public.torre_attachments where capture_id=new.capture_id)>=10 then raise exception 'Máximo de dez arquivos por captura'; end if;
 return new;
end $$;
create trigger torre_attachment_limit before insert on public.torre_attachments for each row execute function public.torre_limit_attachments();
create table public.torre_triage_history (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), capture_id uuid not null,
 task_id uuid, method text not null check(method in ('manual','ai','undo')), result jsonb not null default '{}', created_at timestamptz not null default now(),
 foreign key(user_id,capture_id) references public.torre_captures(user_id,id) on delete cascade,
 foreign key(user_id,task_id) references public.torre_tasks(user_id,id)
);
create table public.torre_google_lists (
 user_id uuid not null default auth.uid() references auth.users on delete cascade, id text not null, name text not null,
 selected boolean not null default false, area text not null default 'personal' check(area in ('personal','professional')), primary key(user_id,id)
);
create table public.torre_calendars (
 user_id uuid not null default auth.uid() references auth.users on delete cascade, id text not null, name text not null, access_role text not null,
 color text not null default '#64748b', selected boolean not null default false, blocks_time boolean not null default true,
 mode text not null default 'busy' check(mode in ('busy','details')), timezone text not null default 'America/Sao_Paulo', primary key(user_id,id)
);
create table public.torre_calendar_events (
 user_id uuid not null default auth.uid(), calendar_id text not null, id text not null, title text not null default 'Ocupado', location text,
 start_at timestamptz not null, end_at timestamptz not null, all_day boolean not null default false, blocks_time boolean not null default true,
 primary key(user_id,calendar_id,id), check(end_at>start_at), foreign key(user_id,calendar_id) references public.torre_calendars(user_id,id) on delete cascade
);
create table public.torre_sync_jobs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), task_id uuid not null unique,
 attempts integer not null default 0, next_attempt_at timestamptz not null default now(), error text,
 foreign key(user_id,task_id) references public.torre_tasks(user_id,id) on delete cascade
);
create table public.torre_google_status (
 user_id uuid primary key default auth.uid() references auth.users on delete cascade, email text,
 connected boolean not null default false, calendar_synced_at timestamptz, range_start timestamptz, range_end timestamptz,
 tasks_synced_at timestamptz, error text, notice text
);
create table public.torre_ai_settings (
 user_id uuid primary key default auth.uid() references auth.users on delete cascade, has_key boolean not null default false,
 provider text, model text, enabled boolean not null default false check(not enabled or (provider is not null and model is not null))
);
do $$ declare tbl text; begin
 foreach tbl in array array['torre_captures','torre_labels','torre_task_labels','torre_attachments','torre_triage_history','torre_google_lists','torre_calendars','torre_calendar_events','torre_sync_jobs','torre_google_status','torre_ai_settings'] loop
  execute format('alter table public.%I enable row level security',tbl);
  execute format('grant select on public.%I to authenticated',tbl);
  execute format('grant all on public.%I to service_role',tbl);
  execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid())=user_id)',tbl);
  if tbl in ('torre_captures','torre_labels','torre_task_labels','torre_attachments','torre_google_lists','torre_calendars','torre_triage_history') then
   execute format('grant insert,update,delete on public.%I to authenticated',tbl);
   execute format('create policy owner_write on public.%I for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',tbl);
  end if;
 end loop;
end $$;
insert into storage.buckets(id,name,public,file_size_limit) values('torre-attachments','torre-attachments',false,20971520);
create policy torre_files_read on storage.objects for select to authenticated using(bucket_id='torre-attachments' and exists(select 1 from public.torre_attachments a where a.path=name and a.user_id=(select auth.uid())));
create policy torre_files_insert on storage.objects for insert to authenticated with check(bucket_id='torre-attachments' and exists(select 1 from public.torre_attachments a where a.path=name and a.user_id=(select auth.uid()) and a.state in ('uploading','error')));
create function public.torre_convert_capture(p_capture uuid,p_title text default '',p_labels uuid[] default '{}',p_method text default 'manual') returns uuid
language plpgsql set search_path='' as $$
declare c public.torre_captures; task uuid; chosen text;
begin
 select * into c from public.torre_captures where id=p_capture and user_id=(select auth.uid()) for update;
 if not found then raise exception 'Captura não encontrada'; end if;
 select id into task from public.torre_tasks where capture_id=c.id and archived_at is null;
 if task is not null then return task; end if;
 if exists(select 1 from public.torre_attachments where capture_id=c.id and state<>'uploaded') then raise exception 'Conclua os uploads antes da triagem'; end if;
 if exists(select 1 from unnest(p_labels) x where not exists(select 1 from public.torre_labels where id=x and user_id=c.user_id and not archived)) then raise exception 'Label inválida'; end if;
 chosen:=coalesce(nullif(btrim(p_title),''),nullif(btrim(c.title),''),nullif(split_part(c.body,E'\n',1),''));
 if chosen is null then select regexp_replace(name,'\.[^.]+$','') into chosen from public.torre_attachments where capture_id=c.id order by created_at,id limit 1; end if;
 if nullif(btrim(chosen),'') is null then raise exception 'Digite um texto ou anexe um arquivo'; end if;
 insert into public.torre_tasks(user_id,capture_id,title,description,area) values(c.user_id,c.id,left(chosen,180),c.body,'personal') returning id into task;
 insert into public.torre_task_labels(user_id,task_id,label_id) select c.user_id,task,x from (select distinct unnest(p_labels) x) z;
 update public.torre_captures set state='processed',error=null where id=c.id;
 insert into public.torre_triage_history(user_id,capture_id,task_id,method,result) values(c.user_id,c.id,task,p_method,jsonb_build_object('labels',p_labels,'title',chosen));
 return task;
end $$;
create function public.torre_undo_capture(p_capture uuid) returns void language plpgsql set search_path='' as $$
declare c public.torre_captures; task uuid;
begin
 select * into c from public.torre_captures where id=p_capture and user_id=(select auth.uid()) for update;
 if not found then raise exception 'Captura não encontrada'; end if;
 select id into task from public.torre_tasks where capture_id=c.id and archived_at is null;
 delete from public.torre_scheduled_blocks where task_id=task;
 update public.torre_tasks set archived_at=now() where id=task;
 update public.torre_captures set state='inbox',error=null where id=c.id;
 insert into public.torre_triage_history(user_id,capture_id,task_id,method) values(c.user_id,c.id,task,'undo');
end $$;
create function public.torre_task_google_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user='authenticated' and old.source='google_tasks' then
  if (new.title,new.description,new.due_date,new.source,new.google_task_id,new.google_list_id) is distinct from (old.title,old.description,old.due_date,old.source,old.google_task_id,old.google_list_id) then raise exception 'Edite título, notas e data no Google Tasks'; end if;
  if old.status='completed' and new.status<>'completed' then raise exception 'Reabra esta tarefa no Google Tasks'; end if;
 end if;
 if new.archived_at is not null then delete from public.torre_scheduled_blocks where task_id=new.id; end if;
 return new;
end $$;
create trigger torre_google_guard before update on public.torre_tasks for each row execute function public.torre_task_google_guard();
create function public.torre_queue_completion() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.source='google_tasks' and new.status='completed' and old.status<>'completed' and auth.uid()=new.user_id then
  insert into public.torre_sync_jobs(user_id,task_id) values(new.user_id,new.id) on conflict(task_id) do nothing;
 end if;
 return new;
end $$;
create trigger torre_completion_queue after update on public.torre_tasks for each row execute function public.torre_queue_completion();
create schema if not exists torre_private;
revoke all on schema torre_private from public,anon,authenticated;
create table torre_private.oauth_states(state text primary key,user_id uuid not null references auth.users on delete cascade,expires_at timestamptz not null);
create table torre_private.secret_refs(user_id uuid not null references auth.users on delete cascade,kind text not null,secret_id uuid not null references vault.secrets on delete cascade,primary key(user_id,kind));
alter table torre_private.oauth_states enable row level security;
alter table torre_private.secret_refs enable row level security;
create function public.torre_secret(p_user uuid,p_kind text,p_value text default null,p_delete boolean default false) returns text
language plpgsql security definer set search_path='' as $$
declare sid uuid; result text;
begin
 select secret_id into sid from torre_private.secret_refs where user_id=p_user and kind=p_kind for update;
 if p_delete then delete from torre_private.secret_refs where user_id=p_user and kind=p_kind; delete from vault.secrets where id=sid; return null; end if;
 if p_value is not null then
  if sid is null then select vault.create_secret(p_value) into sid; insert into torre_private.secret_refs values(p_user,p_kind,sid);
  else perform vault.update_secret(sid,p_value); end if;
 end if;
 select decrypted_secret into result from vault.decrypted_secrets where id=sid; return result;
end $$;
create function public.torre_oauth_state(p_state text,p_user uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; begin
 delete from torre_private.oauth_states where expires_at<now();
 if p_user is not null then insert into torre_private.oauth_states values(p_state,p_user,now()+interval '10 minutes'); return p_user; end if;
 delete from torre_private.oauth_states where state=p_state and expires_at>now() returning user_id into result; return result;
end $$;
create function public.torre_apply_calendar(p_user uuid,p_start timestamptz,p_end timestamptz,p_events jsonb) returns integer language plpgsql set search_path='' as $$
declare released integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 delete from public.torre_scheduled_blocks b where b.user_id=p_user and exists(select 1 from jsonb_to_recordset(p_events) as e(start_at timestamptz,end_at timestamptz,blocks_time boolean) where e.blocks_time and e.start_at<b.end_at and e.end_at>b.start_at);
 get diagnostics released=row_count;
 delete from public.torre_busy_blocks where user_id=p_user and source='google_calendar' and start_at<p_end and end_at>p_start;
 delete from public.torre_calendar_events where user_id=p_user and start_at<p_end and end_at>p_start;
 insert into public.torre_calendar_events(user_id,calendar_id,id,title,location,start_at,end_at,all_day,blocks_time)
 select p_user,e.calendar_id,e.id,e.title,e.location,e.start_at,e.end_at,e.all_day,e.blocks_time from jsonb_to_recordset(p_events) e(calendar_id text,id text,title text,location text,start_at timestamptz,end_at timestamptz,all_day boolean,blocks_time boolean);
 insert into public.torre_busy_blocks(user_id,start_at,end_at,source,calendar_id,external_id)
 select user_id,start_at,end_at,'google_calendar',calendar_id,id from public.torre_calendar_events where user_id=p_user and start_at<p_end and end_at>p_start and blocks_time;
 update public.torre_google_status set calendar_synced_at=now(),range_start=p_start,range_end=p_end,error=null,notice=case when released>0 then released || ' reserva(s) liberada(s) por conflito com a agenda.' else null end where user_id=p_user;
 return released;
end $$;
-- Somente backend pode chamar os serviços privilegiados.
revoke all on function public.torre_secret(uuid,text,text,boolean),public.torre_oauth_state(text,uuid),public.torre_apply_calendar(uuid,timestamptz,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.torre_secret(uuid,text,text,boolean),public.torre_oauth_state(text,uuid),public.torre_apply_calendar(uuid,timestamptz,timestamptz,jsonb) to service_role;
revoke all on function public.torre_convert_capture(uuid,text,uuid[],text),public.torre_undo_capture(uuid),public.torre_limit_attachments(),public.torre_task_google_guard(),public.torre_queue_completion() from public,anon;
grant execute on function public.torre_convert_capture(uuid,text,uuid[],text),public.torre_undo_capture(uuid) to authenticated;
commit;
