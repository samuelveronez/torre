begin;
alter table public.torre_captures add column triage_token uuid, add column triage_until timestamptz;
create function public.torre_claim_triage(p_user uuid,p_capture uuid,p_token uuid) returns jsonb language plpgsql set search_path='' as $$
declare c public.torre_captures; task uuid;
begin
 select * into c from public.torre_captures where id=p_capture and user_id=p_user for update;
 if not found then raise exception 'Captura não encontrada'; end if;
 select id into task from public.torre_tasks where capture_id=c.id and archived_at is null;
 if task is not null then return jsonb_build_object('taskId',task); end if;
 if c.triage_until>now() then raise exception 'Esta captura já está sendo classificada. Aguarde e tente novamente.'; end if;
 if nullif(btrim(c.body),'') is null then raise exception 'Capturas somente de arquivos devem ser organizadas manualmente.'; end if;
 if exists(select 1 from public.torre_attachments where capture_id=c.id and state<>'uploaded') then raise exception 'Conclua os uploads antes da triagem'; end if;
 update public.torre_captures set triage_token=p_token,triage_until=now()+interval '90 seconds',error=null where id=c.id;
 return jsonb_build_object('text',c.body);
end $$;
create function public.torre_finish_triage(p_user uuid,p_capture uuid,p_token uuid,p_text text,p_result jsonb,p_audit jsonb) returns uuid language plpgsql set search_path='' as $$
declare c public.torre_captures; task uuid; labels uuid[]; chosen_area text;
begin
 select * into c from public.torre_captures where id=p_capture and user_id=p_user for update;
 if not found then raise exception 'Captura não encontrada'; end if;
 select id into task from public.torre_tasks where capture_id=c.id and archived_at is null;
 if task is not null then return task; end if;
 if c.triage_token is distinct from p_token or c.triage_until<=now() or c.body is distinct from p_text then raise exception 'A captura mudou. Tente classificar novamente.'; end if;
 if exists(select 1 from public.torre_attachments where capture_id=c.id and state<>'uploaded') then raise exception 'Conclua os uploads antes da triagem'; end if;
 select coalesce(array_agg(x::uuid),'{}'::uuid[]) into labels from jsonb_array_elements_text(p_result->'labelIds') x;
 if exists(select 1 from unnest(labels) x where not exists(select 1 from public.torre_labels where id=x and user_id=p_user and not archived)) then raise exception 'Labels alteradas. Classifique novamente.'; end if;
 chosen_area:=coalesce(p_result->>'area','personal');
 if chosen_area not in ('personal','professional') or nullif(btrim(p_result->>'title'),'') is null then raise exception 'Classificação inválida'; end if;
 insert into public.torre_tasks(user_id,capture_id,title,description,area,duration_minutes) values(p_user,c.id,left(p_result->>'title',180),c.body,chosen_area,30) returning id into task;
 insert into public.torre_task_labels(user_id,task_id,label_id) select p_user,task,x from (select distinct unnest(labels) x) z;
 insert into public.torre_triage_history(user_id,capture_id,task_id,method,result) values(p_user,c.id,task,'ai',jsonb_build_object('classification',p_result,'audit',p_audit));
 update public.torre_captures set state='processed',error=null,triage_token=null,triage_until=null where id=c.id;
 return task;
end $$;
revoke all on function public.torre_claim_triage(uuid,uuid,uuid),public.torre_finish_triage(uuid,uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.torre_claim_triage(uuid,uuid,uuid),public.torre_finish_triage(uuid,uuid,uuid,text,jsonb,jsonb) to service_role;
commit;
