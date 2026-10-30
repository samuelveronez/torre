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
-- "Novo tema": cria tarefa, etiqueta, registro e pessoas de uma vez, sem prazo (RF11, CA11).
do $$
begin
 perform public.torre_create_radar_theme('bbf30100-0000-4000-8000-000000000030',
  jsonb_build_object('title','  Tema novo ','description','Contexto','area','personal'),
  jsonb_build_object('temperature','atencao','review_interval_days',7,'next_review_date','2026-12-01','notes','Notas'),
  jsonb_build_array(jsonb_build_object('name','Marina','personId',null,'role','involved')));
 if not exists(select 1 from public.torre_tasks where id='bbf30100-0000-4000-8000-000000000030' and title='Tema novo' and description='Contexto' and area='personal' and due_date is null and status='todo') then raise exception 'New theme task wrong'; end if;
 if not exists(select 1 from public.torre_radar where task_id='bbf30100-0000-4000-8000-000000000030' and temperature='atencao' and review_interval_days=7 and next_review_date='2026-12-01' and notes='Notas') then raise exception 'New theme radar row wrong'; end if;
 if not exists(select 1 from public.torre_radar_themes where task_id='bbf30100-0000-4000-8000-000000000030') then raise exception 'New theme not in predicate'; end if;
 if (select count(*) from public.torre_labels where lower(btrim(name))='radar')<>1 then raise exception 'Radar label duplicated'; end if;
 if not exists(select 1 from public.torre_task_people where task_id='bbf30100-0000-4000-8000-000000000030' and name='Marina') then raise exception 'New theme person missing'; end if;
 -- Padrões: observar, 15 dias, próxima revisão = hoje + 15
 perform public.torre_create_radar_theme('bbf30100-0000-4000-8000-000000000031',jsonb_build_object('title','Padrao','area','professional'),'{}'::jsonb);
 if not exists(select 1 from public.torre_radar where task_id='bbf30100-0000-4000-8000-000000000031' and temperature='observar' and review_interval_days=15 and next_review_date=(now() at time zone 'America/Sao_Paulo')::date+15) then raise exception 'New theme defaults wrong'; end if;
 -- Falha em qualquer parte desfaz tudo (nada de tarefa etiquetada sem registro)
 begin
  perform public.torre_create_radar_theme('bbf30100-0000-4000-8000-000000000032',jsonb_build_object('title','Invalido','area','personal'),jsonb_build_object('temperature','quente'),'[]'::jsonb);
  raise exception 'Invalid temperature accepted';
 exception when check_violation then null; end;
 begin
  perform public.torre_create_radar_theme('bbf30100-0000-4000-8000-000000000033',jsonb_build_object('title','Pessoa ruim','area','personal'),'{}'::jsonb,jsonb_build_array(jsonb_build_object('name','','role','involved')));
  raise exception 'Invalid person accepted';
 exception when others then if sqlerrm='Invalid person accepted' then raise; end if; end;
 begin
  perform public.torre_create_radar_theme('bbf30100-0000-4000-8000-000000000034',jsonb_build_object('title','   ','area','personal'),'{}'::jsonb);
  raise exception 'Blank title accepted';
 exception when others then if sqlerrm='Blank title accepted' then raise; end if; end;
 if exists(select 1 from public.torre_tasks where id in ('bbf30100-0000-4000-8000-000000000032','bbf30100-0000-4000-8000-000000000033','bbf30100-0000-4000-8000-000000000034')) then raise exception 'Failed create left a task behind'; end if;
 if exists(select 1 from public.torre_radar where task_id in ('bbf30100-0000-4000-8000-000000000032','bbf30100-0000-4000-8000-000000000033')) then raise exception 'Failed create left a radar row behind'; end if;
end $$;

-- Vincular tarefa existente: muda só radar_task_id e respeita as regras do RN15.
do $$
declare before_row public.torre_tasks; after_row public.torre_tasks;
begin
 perform public.torre_save_task('bbf30100-0000-4000-8000-000000000041',jsonb_build_object('title','Ja feita','status','completed','completed_at',now()));
 select * into before_row from public.torre_tasks where id='bbf30100-0000-4000-8000-000000000003';
 perform public.torre_link_task_to_radar('bbf30100-0000-4000-8000-000000000003','bbf30100-0000-4000-8000-000000000030');
 select * into after_row from public.torre_tasks where id='bbf30100-0000-4000-8000-000000000003';
 if after_row.radar_task_id is distinct from 'bbf30100-0000-4000-8000-000000000030'::uuid then raise exception 'Link not saved'; end if;
 if (after_row.title,after_row.due_date,after_row.priority,after_row.status,after_row.area,after_row.description) is distinct from (before_row.title,before_row.due_date,before_row.priority,before_row.status,before_row.area,before_row.description) then raise exception 'Link changed other task fields'; end if;
 if exists(select 1 from public.torre_radar_themes where task_id='bbf30100-0000-4000-8000-000000000003') then raise exception 'Linked task became a theme'; end if;
 if exists(select 1 from public.torre_task_labels where task_id='bbf30100-0000-4000-8000-000000000003') then raise exception 'Linked task inherited a label'; end if;
 -- Mover para outro tema
 perform public.torre_link_task_to_radar('bbf30100-0000-4000-8000-000000000003','bbf30100-0000-4000-8000-000000000031');
 if (select radar_task_id from public.torre_tasks where id='bbf30100-0000-4000-8000-000000000003')<>'bbf30100-0000-4000-8000-000000000031' then raise exception 'Link not moved'; end if;
 -- Recusas
 begin perform public.torre_link_task_to_radar('bbf30100-0000-4000-8000-000000000030','bbf30100-0000-4000-8000-000000000030'); raise exception 'Self link accepted';
 exception when others then if sqlerrm='Self link accepted' then raise; end if; end;
 begin perform public.torre_link_task_to_radar('bbf30100-0000-4000-8000-000000000031','bbf30100-0000-4000-8000-000000000030'); raise exception 'Theme as action accepted';
 exception when others then if sqlerrm='Theme as action accepted' then raise; end if; end;
 begin perform public.torre_link_task_to_radar('bbf30100-0000-4000-8000-000000000041','bbf30100-0000-4000-8000-000000000030'); raise exception 'Completed task accepted';
 exception when others then if sqlerrm='Completed task accepted' then raise; end if; end;
 begin perform public.torre_link_task_to_radar('bbf30100-0000-4000-8000-000000000003','bbf30100-0000-4000-8000-000000000011'); raise exception 'Other user theme accepted';
 exception when others then if sqlerrm='Other user theme accepted' then raise; end if; end;
 begin perform public.torre_link_task_to_radar('bbf30100-0000-4000-8000-000000000003','bbf30100-0000-4000-8000-000000000001'); raise exception 'Archived theme accepted';
 exception when others then if sqlerrm='Archived theme accepted' then raise; end if; end;
 begin perform public.torre_link_task_to_radar('bbf30100-0000-4000-8000-000000000011','bbf30100-0000-4000-8000-000000000030'); raise exception 'Other user task accepted';
 exception when others then if sqlerrm='Other user task accepted' then raise; end if; end;
 if (select radar_task_id from public.torre_tasks where id='bbf30100-0000-4000-8000-000000000003')<>'bbf30100-0000-4000-8000-000000000031' then raise exception 'Rejected link changed data'; end if;
 -- Desvincular preserva a tarefa
 perform public.torre_link_task_to_radar('bbf30100-0000-4000-8000-000000000003',null);
 if not exists(select 1 from public.torre_tasks where id='bbf30100-0000-4000-8000-000000000003' and radar_task_id is null and archived_at is null) then raise exception 'Unlink failed'; end if;
end $$;

-- Usuário sem etiqueta Radar: a função cria a dele, sem tocar na de outro usuário.
reset role;
insert into auth.users(id) values ('aaf30100-0000-4000-8000-000000000003');
set local role authenticated;
select set_config('request.jwt.claim.sub','aaf30100-0000-4000-8000-000000000003',true);
do $$
begin
 perform public.torre_create_radar_theme('bbf30100-0000-4000-8000-000000000040',jsonb_build_object('title','Primeiro tema','area','professional'),'{}'::jsonb);
 if (select count(*) from public.torre_labels where lower(btrim(name))='radar')<>1 then raise exception 'Radar label not created for new user'; end if;
 if (select count(*) from public.torre_radar_themes)<>1 then raise exception 'New user theme not isolated'; end if;
end $$;
reset role;
rollback;
