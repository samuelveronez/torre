-- Google Tasks is an import source. Local fields and status belong to the Torre.
create or replace function public.torre_task_google_guard() returns trigger
language plpgsql set search_path='' as $$
begin
 if current_user='authenticated' and
    (new.source,new.google_task_id,new.google_list_id) is distinct from
    (old.source,old.google_task_id,old.google_list_id) then
  raise exception 'A origem da tarefa não pode ser alterada';
 end if;
 if new.archived_at is not null then delete from public.torre_scheduled_blocks where task_id=new.id; end if;
 return new;
end $$;

create or replace function public.torre_task_state() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.status='completed' then new.completed_at:=coalesce(new.completed_at,now());
 else new.completed_at:=null; end if;
 new.google_completion_pending:=false;
 return new;
end $$;

-- Keep compatibility with the installed trigger while preventing outbound jobs.
create or replace function public.torre_queue_completion() returns trigger
language plpgsql set search_path='' as $$
begin return new; end $$;

-- Retire delivery bookkeeping only; titles, status, due dates and reservations remain.
-- Historical outbound jobs are preserved; the worker no longer processes them.


create or replace function public.torre_agent_write(p_user uuid,p_entity text,p_id uuid,p_patch jsonb,p_create boolean)
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
   if exists(select 1 from public.torre_scheduled_blocks where task_id=p_id and user_id=p_user) and p_patch ?| array['area','duration_minutes','status'] and p_patch->>'status' is distinct from 'completed' then raise exception 'Use o editor para decidir sobre o horário reservado'; end if;
   t:=jsonb_populate_record(t,p_patch);
   update public.torre_tasks set title=t.title,description=t.description,reference_url=t.reference_url,area=t.area,duration_minutes=t.duration_minutes,due_date=t.due_date,status=t.status,waiting_for=t.waiting_for,follow_up_date=t.follow_up_date,priority=t.priority,archived_at=t.archived_at where id=p_id and user_id=p_user;

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
