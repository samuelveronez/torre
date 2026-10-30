begin;
insert into auth.users(id) values ('aaf30100-0000-4000-8000-000000000001'),('aaf30100-0000-4000-8000-000000000002');
insert into public.torre_tasks(id,user_id,title,area) values
 ('bbf30100-0000-4000-8000-000000000001','aaf30100-0000-4000-8000-000000000001','Tema A','professional'),
 ('bbf30100-0000-4000-8000-000000000002','aaf30100-0000-4000-8000-000000000001','Acao A','professional'),
 ('bbf30100-0000-4000-8000-000000000003','aaf30100-0000-4000-8000-000000000001','Sem etiqueta','professional'),
 ('bbf30100-0000-4000-8000-000000000011','aaf30100-0000-4000-8000-000000000002','Tema B','professional');
insert into public.torre_labels(id,user_id,name) values
 ('ccf30100-0000-4000-8000-000000000001','aaf30100-0000-4000-8000-000000000001','Radar'),
 ('ccf30100-0000-4000-8000-000000000002','aaf30100-0000-4000-8000-000000000002',' radar ');
insert into public.torre_task_labels(user_id,task_id,label_id) values
 ('aaf30100-0000-4000-8000-000000000001','bbf30100-0000-4000-8000-000000000001','ccf30100-0000-4000-8000-000000000001'),
 ('aaf30100-0000-4000-8000-000000000002','bbf30100-0000-4000-8000-000000000011','ccf30100-0000-4000-8000-000000000002');

-- Predicado único: só tarefa ativa com a etiqueta Radar, sem depender de torre_radar.
do $$
begin
 if (select count(*) from public.torre_radar_themes)<>2 then raise exception 'Radar predicate count failed'; end if;
 if exists(select 1 from public.torre_radar_themes where task_id in ('bbf30100-0000-4000-8000-000000000002','bbf30100-0000-4000-8000-000000000003')) then raise exception 'Radar predicate included a plain task'; end if;
 update public.torre_tasks set archived_at=now() where id='bbf30100-0000-4000-8000-000000000011';
 if exists(select 1 from public.torre_radar_themes where task_id='bbf30100-0000-4000-8000-000000000011') then raise exception 'Archived theme still in predicate'; end if;
 update public.torre_tasks set archived_at=null where id='bbf30100-0000-4000-8000-000000000011';
end $$;

insert into public.torre_radar(task_id,user_id) values
 ('bbf30100-0000-4000-8000-000000000001','aaf30100-0000-4000-8000-000000000001'),
 ('bbf30100-0000-4000-8000-000000000011','aaf30100-0000-4000-8000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub','aaf30100-0000-4000-8000-000000000001',true);
do $$
declare changed integer;
begin
 -- Padrões e leitura isolada
 if not exists(select 1 from public.torre_radar where task_id='bbf30100-0000-4000-8000-000000000001' and temperature='observar' and review_interval_days=15 and notes='') then raise exception 'Radar defaults failed'; end if;
 if (select count(*) from public.torre_radar)<>1 then raise exception 'Radar read isolation failed'; end if;
 -- Notas persistem e mudar temperatura/periodicidade as preserva (CA02, CA03)
 update public.torre_radar set notes='contexto' where task_id='bbf30100-0000-4000-8000-000000000001';
 update public.torre_radar set temperature='critico',review_interval_days=7 where task_id='bbf30100-0000-4000-8000-000000000001';
 if not exists(select 1 from public.torre_radar where task_id='bbf30100-0000-4000-8000-000000000001' and notes='contexto') then raise exception 'Radar notes lost'; end if;
 -- Outro usuário: nem altera nem cria
 update public.torre_radar set notes='invadido' where task_id='bbf30100-0000-4000-8000-000000000011';
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Radar update isolation failed'; end if;
 begin
  insert into public.torre_radar(task_id,user_id) values('bbf30100-0000-4000-8000-000000000011','aaf30100-0000-4000-8000-000000000002');
  raise exception 'Radar insert for another user accepted';
 exception when insufficient_privilege or unique_violation then null;
 end;
 -- Valores inválidos
 begin update public.torre_radar set temperature='quente' where task_id='bbf30100-0000-4000-8000-000000000001'; raise exception 'Invalid temperature accepted';
 exception when check_violation then null; end;
 begin update public.torre_radar set review_interval_days=10 where task_id='bbf30100-0000-4000-8000-000000000001'; raise exception 'Invalid interval accepted';
 exception when check_violation then null; end;
 -- Ação vinculada: mesmo usuário, nunca a si própria (CA10)
 update public.torre_tasks set radar_task_id='bbf30100-0000-4000-8000-000000000001' where id='bbf30100-0000-4000-8000-000000000002';
 begin update public.torre_tasks set radar_task_id=id where id='bbf30100-0000-4000-8000-000000000002'; raise exception 'Self link accepted';
 exception when check_violation then null; end;
 begin update public.torre_tasks set radar_task_id='bbf30100-0000-4000-8000-000000000011' where id='bbf30100-0000-4000-8000-000000000002'; raise exception 'Cross-user link accepted';
 exception when foreign_key_violation then null; end;
 begin update public.torre_tasks set radar_task_id='bbf30100-0000-4000-8000-000000000003' where id='bbf30100-0000-4000-8000-000000000002'; raise exception 'Link to task without radar row accepted';
 exception when foreign_key_violation then null; end;
end $$;

-- torre_save_task cria a ação já ligada ao tema, sem herdar etiqueta, e a edição não troca o vínculo.
do $$
begin
 perform public.torre_save_task('bbf30100-0000-4000-8000-000000000020',jsonb_build_object('title','Nova acao','radar_task_id','bbf30100-0000-4000-8000-000000000001'));
 if not exists(select 1 from public.torre_tasks where id='bbf30100-0000-4000-8000-000000000020' and radar_task_id='bbf30100-0000-4000-8000-000000000001') then raise exception 'Linked action not created'; end if;
 if exists(select 1 from public.torre_radar_themes where task_id='bbf30100-0000-4000-8000-000000000020') then raise exception 'Linked action became a theme'; end if;
 perform public.torre_save_task('bbf30100-0000-4000-8000-000000000020',jsonb_build_object('title','Editada','radar_task_id',null));
 if not exists(select 1 from public.torre_tasks where id='bbf30100-0000-4000-8000-000000000020' and title='Editada' and radar_task_id='bbf30100-0000-4000-8000-000000000001') then raise exception 'Edit changed the radar link'; end if;
end $$;

-- Encerrar tema (arquivar) preserva torre_radar e as ações vinculadas (RN14).
do $$
begin
 update public.torre_tasks set archived_at=now() where id='bbf30100-0000-4000-8000-000000000001';
 if not exists(select 1 from public.torre_radar where task_id='bbf30100-0000-4000-8000-000000000001' and notes='contexto') then raise exception 'Archive lost radar row'; end if;
 if not exists(select 1 from public.torre_tasks where id='bbf30100-0000-4000-8000-000000000002' and radar_task_id='bbf30100-0000-4000-8000-000000000001') then raise exception 'Archive lost linked action'; end if;
end $$;
reset role;
rollback;
