begin;
-- Allow extraction, classification and waiting-detail requests to complete under the lease.
create or replace function public.torre_claim_triage(p_user uuid,p_capture uuid,p_token uuid) returns jsonb language plpgsql set search_path='' as $$
declare c public.torre_captures; ids uuid[];
begin
 select * into c from public.torre_captures where id=p_capture and user_id=p_user for update;
 if not found then raise exception 'Captura não encontrada'; end if;
 select array_agg(id order by capture_position) into ids from public.torre_tasks where capture_id=c.id and archived_at is null;
 if ids is not null then return jsonb_build_object('taskIds',ids,'taskId',ids[1]); end if;
 if c.triage_until>now() then raise exception 'Esta captura já está sendo processada'; end if;
 if nullif(btrim(c.body),'') is null or length(c.body)>20000 then raise exception 'Digite de 1 a 20 mil caracteres para usar IA'; end if;
 if exists(select 1 from public.torre_attachments where capture_id=c.id and state<>'uploaded') then raise exception 'Conclua os uploads antes da triagem'; end if;
 update public.torre_captures set triage_token=p_token,triage_until=now()+interval '180 seconds',error=null where id=c.id;
 return jsonb_build_object('text',c.body,'mode',c.mode);
end $$;

create or replace function public.torre_finish_triage_many(p_user uuid,p_capture uuid,p_token uuid,p_text text,p_results jsonb,p_audit jsonb) returns uuid[] language plpgsql set search_path='' as $$
declare c public.torre_captures; ids uuid[]; task uuid; labels uuid[]; r jsonb; ordinal bigint;
begin
 select * into c from public.torre_captures where id=p_capture and user_id=p_user for update;
 if not found then raise exception 'Captura não encontrada'; end if;
 select array_agg(id order by capture_position) into ids from public.torre_tasks where capture_id=c.id and archived_at is null;
 if ids is not null then return ids; end if;
 if c.triage_token is distinct from p_token or c.triage_until is null or c.triage_until<=now() or c.body is distinct from p_text then raise exception 'A captura mudou. Tente novamente'; end if;
 if exists(select 1 from public.torre_attachments where capture_id=c.id and state<>'uploaded') then raise exception 'Conclua os uploads antes da triagem'; end if;
 if jsonb_typeof(p_results) is distinct from 'array' then raise exception 'Lista inválida'; end if;
 if jsonb_array_length(p_results) not between 1 and 20 then raise exception 'De 1 a 20 tarefas por captura'; end if;
 ids:='{}';
 for r,ordinal in select value, ordinality from jsonb_array_elements(p_results) with ordinality loop
  if nullif(btrim(r->>'title'),'') is null or length(r->>'title')>180 or jsonb_typeof(r->'description') is distinct from 'string' or jsonb_typeof(r->'labelIds') is distinct from 'array' or coalesce(r->>'area','personal') not in ('personal','professional') then raise exception 'Tarefa inválida'; end if;
  if coalesce(r->>'situation','todo') not in ('todo','waiting') then raise exception 'Situação inválida'; end if;
  if r->>'situation'='waiting' and (jsonb_typeof(r->'waitingFor') is distinct from 'string' or nullif(btrim(r->>'waitingFor'),'') is null or length(r->>'waitingFor')>180 or jsonb_typeof(r->'followUpDate') is distinct from 'string' or coalesce(r->>'followUpDate','') !~ '^\d{4}-\d{2}-\d{2}$') then raise exception 'Espera sem responsável ou acompanhamento'; end if;
  select coalesce(array_agg(x::uuid),'{}'::uuid[]) into labels from jsonb_array_elements_text(r->'labelIds') x;
  if exists(select 1 from unnest(labels) x where not exists(select 1 from public.torre_labels where id=x and user_id=p_user and not archived)) then raise exception 'Labels alteradas. Tente novamente'; end if;
  insert into public.torre_tasks(user_id,capture_id,capture_position,title,description,area,duration_minutes,status,waiting_for,follow_up_date) values(p_user,c.id,ordinal-1,r->>'title',r->>'description',coalesce(r->>'area','personal'),30,coalesce(r->>'situation','todo'),case when r->>'situation'='waiting' then btrim(r->>'waitingFor') end,case when r->>'situation'='waiting' then (r->>'followUpDate')::date end) returning id into task;
  insert into public.torre_task_labels(user_id,task_id,label_id) select p_user,task,x from (select distinct unnest(labels) x) z;
  insert into public.torre_triage_history(user_id,capture_id,task_id,method,result) values(p_user,c.id,task,'ai',jsonb_build_object('classification',r,'audit',p_audit,'position',ordinal-1));
  ids:=array_append(ids,task);
 end loop;
 update public.torre_captures set state='processed',error=null,triage_token=null,triage_until=null where id=c.id;
 return ids;
end $$;
revoke all on function public.torre_finish_triage_many(uuid,uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.torre_finish_triage_many(uuid,uuid,uuid,text,jsonb,jsonb) to service_role;
commit;
