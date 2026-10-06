begin;
create table public.torre_agent_runs (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 message text not null check(length(message) between 1 and 4000),
 mode text not null check(mode in ('analyze','execute')),
 state text not null default 'processing' check(state in ('processing','ready','answered','applied','undone','error')),
 token uuid not null, lease_until timestamptz not null default now()+interval '150 seconds',
 response text not null default '', model text, error text, operations jsonb not null default '[]',
 audit jsonb not null default '[]', created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '30 minutes'
);
create index torre_agent_history on public.torre_agent_runs(user_id,created_at desc);
alter table public.torre_agent_runs enable row level security;
revoke all on public.torre_agent_runs from public,anon,authenticated;
grant select on public.torre_agent_runs to authenticated;
grant all on public.torre_agent_runs to service_role;
create policy owner_read on public.torre_agent_runs for select to authenticated using((select auth.uid())=user_id);

create function public.torre_agent_summary(p_user uuid) returns jsonb language sql set search_path='' as $$
 select jsonb_build_object(
  'active',count(*) filter(where archived_at is null and status<>'completed'),
  'todo',count(*) filter(where archived_at is null and status='todo'),
  'waiting',count(*) filter(where archived_at is null and status='waiting'),
  'completed',count(*) filter(where archived_at is null and status='completed'),
  'archived',count(*) filter(where archived_at is not null),
  'overdue',count(*) filter(where archived_at is null and status<>'completed' and due_date<(now() at time zone 'America/Sao_Paulo')::date),
  'due_today',count(*) filter(where archived_at is null and status<>'completed' and due_date=(now() at time zone 'America/Sao_Paulo')::date),
  'without_due',count(*) filter(where archived_at is null and status<>'completed' and due_date is null),
  'estimated_active_minutes',coalesce(sum(duration_minutes) filter(where archived_at is null and status<>'completed'),0)
 ) from public.torre_tasks where user_id=p_user;
$$;
revoke all on function public.torre_agent_summary(uuid) from public,anon,authenticated;
grant execute on function public.torre_agent_summary(uuid) to service_role;

create function public.torre_agent_claim(p_user uuid,p_id uuid,p_message text,p_mode text,p_token uuid)
returns jsonb language plpgsql set search_path='' as $$
declare r public.torre_agent_runs;
begin
 perform pg_advisory_xact_lock(hashtextextended('torre-agent:'||p_user::text,0));
 select * into r from public.torre_agent_runs where id=p_id for update;
 if found then
  if r.user_id<>p_user or r.message<>p_message or r.mode<>p_mode then raise exception 'Pedido inválido'; end if;
  if r.state not in ('processing','error') then return to_jsonb(r); end if;
  if r.state='processing' and r.lease_until>now() then raise exception 'Pedido em processamento. Aguarde antes de tentar novamente.'; end if;
 else
  if exists(select 1 from public.torre_agent_runs where user_id=p_user and state='processing' and lease_until>now()) then raise exception 'Aguarde o pedido anterior'; end if;
  if (select count(*) from public.torre_agent_runs where user_id=p_user and created_at>now()-interval '1 minute')>=6 then raise exception 'Muitos pedidos. Aguarde um minuto.'; end if;
  insert into public.torre_agent_runs(id,user_id,message,mode,token) values(p_id,p_user,p_message,p_mode,p_token);
 end if;
 update public.torre_agent_runs set token=p_token,state='processing',error=null,lease_until=now()+interval '150 seconds' where id=p_id returning * into r;
 return to_jsonb(r);
end $$;

-- Full row comparison protects proposals and undo against concurrent edits.
create function public.torre_agent_snapshot(p_user uuid,p_entity text,p_id uuid)
returns jsonb language plpgsql set search_path='' as $$
declare value jsonb;
begin
 if p_entity='task' then
  select to_jsonb(t)||jsonb_build_object('label_ids',coalesce((select jsonb_agg(label_id order by label_id) from public.torre_task_labels where user_id=p_user and task_id=t.id),'[]'::jsonb))
  into value from public.torre_tasks t where user_id=p_user and id=p_id for update;
 elsif p_entity='label' then
  select to_jsonb(l) into value from public.torre_labels l where user_id=p_user and id=p_id for update;
 else raise exception 'Recurso inválido'; end if;
 return value;
end $$;

create function public.torre_agent_write(p_user uuid,p_entity text,p_id uuid,p_patch jsonb,p_create boolean)
returns void language plpgsql set search_path='' as $$
declare t public.torre_tasks; l public.torre_labels; x uuid; labels jsonb; k text;
begin
 if jsonb_typeof(p_patch)<>'object' or p_patch='{}'::jsonb then raise exception 'Alteração vazia ou inválida'; end if;
 if p_entity='task' then
  for k in select jsonb_object_keys(p_patch) loop
   if k not in ('title','description','reference_url','area','duration_minutes','due_date','status','waiting_for','follow_up_date','priority','archived_at','label_ids') then raise exception 'Campo não permitido: %',k; end if;
  end loop;
  if p_create then
   t:=jsonb_populate_record(null::public.torre_tasks,jsonb_build_object('id',p_id,'user_id',p_user,'description','','area','personal','duration_minutes',30,'status','todo','source','torre','google_completion_pending',false,'priority','none')||p_patch);
   insert into public.torre_tasks(id,user_id,title,description,reference_url,area,duration_minutes,due_date,status,waiting_for,follow_up_date,priority,archived_at)
   values(p_id,p_user,t.title,t.description,t.reference_url,t.area,t.duration_minutes,t.due_date,t.status,t.waiting_for,t.follow_up_date,t.priority,t.archived_at);
  else
   select * into t from public.torre_tasks where id=p_id and user_id=p_user for update;
   if not found then raise exception 'Tarefa indisponível'; end if;
   if t.source='google_tasks' and (p_patch ?| array['title','description','due_date'] or (t.status='completed' and p_patch ? 'status' and p_patch->>'status'<>'completed')) then raise exception 'Edite título, notas, prazo e reabertura desta tarefa no Google Tasks'; end if;
   t:=jsonb_populate_record(t,p_patch);
   update public.torre_tasks set title=t.title,description=t.description,reference_url=t.reference_url,area=t.area,duration_minutes=t.duration_minutes,due_date=t.due_date,status=t.status,waiting_for=t.waiting_for,follow_up_date=t.follow_up_date,priority=t.priority,archived_at=t.archived_at where id=p_id and user_id=p_user;
   if t.source='google_tasks' and t.status='completed' then
    insert into public.torre_sync_jobs(user_id,task_id) values(p_user,p_id) on conflict(task_id) do nothing;
    update public.torre_tasks set google_completion_pending=true where id=p_id and user_id=p_user;
   end if;
  end if;
  if p_patch ? 'label_ids' then
   labels:=p_patch->'label_ids';
   if jsonb_typeof(labels)<>'array' or jsonb_array_length(labels)>50 then raise exception 'Labels inválidas'; end if;
   for x in select value::uuid from jsonb_array_elements_text(labels) loop
    perform 1 from public.torre_labels where id=x and user_id=p_user and not archived for share;
    if not found then raise exception 'Label indisponível'; end if;
   end loop;
   delete from public.torre_task_labels where task_id=p_id and user_id=p_user;
   insert into public.torre_task_labels(user_id,task_id,label_id) select distinct p_user,p_id,value::uuid from jsonb_array_elements_text(labels);
  end if;
 elsif p_entity='label' then
  for k in select jsonb_object_keys(p_patch) loop
   if k not in ('name','description','color','archived') then raise exception 'Campo de label não permitido'; end if;
  end loop;
  if p_create then
   l:=jsonb_populate_record(null::public.torre_labels,jsonb_build_object('description','','color','#2563eb','archived',false)||p_patch);
   insert into public.torre_labels(id,user_id,name,description,color,archived) values(p_id,p_user,l.name,l.description,l.color,l.archived);
  else
   select * into l from public.torre_labels where id=p_id and user_id=p_user for update;
   if not found then raise exception 'Label indisponível'; end if;
   l:=jsonb_populate_record(l,p_patch);
   update public.torre_labels set name=l.name,description=l.description,color=l.color,archived=l.archived where id=p_id and user_id=p_user;
  end if;
 else raise exception 'Recurso inválido'; end if;
end $$;

create function public.torre_agent_apply(p_user uuid,p_run uuid,p_undo boolean default false)
returns jsonb language plpgsql set search_path='' as $$
declare r public.torre_agent_runs; op jsonb; before_value jsonb; after_value jsonb; changes jsonb:='[]'; patch jsonb; entity text; target uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('torre-agent:'||p_user::text,0));
 select * into r from public.torre_agent_runs where id=p_run and user_id=p_user for update;
 if not found then raise exception 'Pedido indisponível'; end if;
 if (not p_undo and r.state='applied') or (p_undo and r.state='undone') then return to_jsonb(r); end if;
 if p_undo then
  if r.state<>'applied' then raise exception 'Pedido não pode ser desfeito'; end if;
  for op in select value from jsonb_array_elements(r.audit) with ordinality a(value,n) order by n desc loop
   entity:=op->>'entity';target:=(op->>'id')::uuid;
   after_value:=public.torre_agent_snapshot(p_user,entity,target);
   if after_value is distinct from op->'after' then raise exception 'O registro mudou depois desta ação. Revise antes de desfazer.'; end if;
   before_value:=nullif(op->'before','null'::jsonb);
   if before_value is null then
    if entity='task' then patch:=jsonb_build_object('archived_at',now(),'label_ids','[]'::jsonb);
    else
     if exists(select 1 from public.torre_task_labels where user_id=p_user and label_id=target) then raise exception 'A label já tem vínculos. Remova-os antes de desfazer sua criação.'; end if;
     patch:=jsonb_build_object('archived',true);
    end if;
   else
    -- Only restore fields changed by this action; generated and integration fields stay server-owned.
    patch:='{}';
    for entity in select jsonb_object_keys(op->'patch') loop patch:=patch||jsonb_build_object(entity,before_value->entity); end loop;
    entity:=op->>'entity';
   end if;
   perform public.torre_agent_write(p_user,entity,target,patch,false);
  end loop;
  update public.torre_agent_runs set state='undone' where id=p_run returning * into r;
 else
  if r.mode<>'execute' or r.state<>'ready' or r.expires_at<now() then raise exception 'Proposta expirada ou indisponível. Envie um novo pedido.'; end if;
  if jsonb_typeof(r.operations)<>'array' or jsonb_array_length(r.operations) not between 1 and 50 then raise exception 'Operações inválidas'; end if;
  for op in select value from jsonb_array_elements(r.operations) loop
   entity:=op->>'entity';target:=(op->>'id')::uuid;patch:=op->'patch';
   before_value:=public.torre_agent_snapshot(p_user,entity,target);
   if before_value is distinct from nullif(op->'before','null'::jsonb) then raise exception 'O registro mudou. Envie novamente para reavaliar.'; end if;
   perform public.torre_agent_write(p_user,entity,target,patch,before_value is null);
   after_value:=public.torre_agent_snapshot(p_user,entity,target);
   changes:=changes||jsonb_build_array(jsonb_build_object('entity',entity,'id',target,'before',before_value,'after',after_value,'patch',patch));
  end loop;
  update public.torre_agent_runs set state='applied',audit=changes where id=p_run returning * into r;
 end if;
 return to_jsonb(r);
end $$;

revoke all on function public.torre_agent_claim(uuid,uuid,text,text,uuid),public.torre_agent_snapshot(uuid,text,uuid),public.torre_agent_write(uuid,text,uuid,jsonb,boolean),public.torre_agent_apply(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.torre_agent_claim(uuid,uuid,text,text,uuid),public.torre_agent_snapshot(uuid,text,uuid),public.torre_agent_write(uuid,text,uuid,jsonb,boolean),public.torre_agent_apply(uuid,uuid,boolean) to service_role;
commit;
