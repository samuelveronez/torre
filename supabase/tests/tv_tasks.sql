begin;
insert into auth.users(id) values('b7ba7610-735e-4da5-a17f-104419acb031'),('b7ba7610-735e-4da5-a17f-104419acb032');
insert into public.torre_labels(id,user_id,name) values
 ('b7ba7610-735e-4da5-a17f-104419acb041','b7ba7610-735e-4da5-a17f-104419acb031','Família'),
 ('b7ba7610-735e-4da5-a17f-104419acb042','b7ba7610-735e-4da5-a17f-104419acb032','Família');
insert into public.torre_tasks(id,user_id,title,area,status,completed_at,archived_at) values
 ('b7ba7610-735e-4da5-a17f-104419acb051','b7ba7610-735e-4da5-a17f-104419acb031','Visível','personal','todo',null,null),
 ('b7ba7610-735e-4da5-a17f-104419acb052','b7ba7610-735e-4da5-a17f-104419acb031','Profissional','professional','todo',null,null),
 ('b7ba7610-735e-4da5-a17f-104419acb053','b7ba7610-735e-4da5-a17f-104419acb031','Concluída','personal','completed',now(),null),
 ('b7ba7610-735e-4da5-a17f-104419acb054','b7ba7610-735e-4da5-a17f-104419acb031','Sem label','personal','todo',null,null),
 ('b7ba7610-735e-4da5-a17f-104419acb055','b7ba7610-735e-4da5-a17f-104419acb031','Arquivada','personal','todo',null,now()),
 ('b7ba7610-735e-4da5-a17f-104419acb056','b7ba7610-735e-4da5-a17f-104419acb032','De outro usuário','personal','todo',null,null);
insert into public.torre_task_labels(user_id,task_id,label_id) values
 ('b7ba7610-735e-4da5-a17f-104419acb031','b7ba7610-735e-4da5-a17f-104419acb051','b7ba7610-735e-4da5-a17f-104419acb041'),
 ('b7ba7610-735e-4da5-a17f-104419acb031','b7ba7610-735e-4da5-a17f-104419acb052','b7ba7610-735e-4da5-a17f-104419acb041'),
 ('b7ba7610-735e-4da5-a17f-104419acb031','b7ba7610-735e-4da5-a17f-104419acb053','b7ba7610-735e-4da5-a17f-104419acb041'),
 ('b7ba7610-735e-4da5-a17f-104419acb031','b7ba7610-735e-4da5-a17f-104419acb055','b7ba7610-735e-4da5-a17f-104419acb041'),
 ('b7ba7610-735e-4da5-a17f-104419acb032','b7ba7610-735e-4da5-a17f-104419acb056','b7ba7610-735e-4da5-a17f-104419acb042');
insert into public.torre_tv_tokens(user_id,token_hash) values('b7ba7610-735e-4da5-a17f-104419acb031',sha256(convert_to('token-de-teste','utf8')));
do $$begin
 if (select count(*) from public.torre_tv_tasks('token-de-teste'))<>1 then raise exception 'Filter wrong';end if;
 if (select title from public.torre_tv_tasks('token-de-teste'))<>'Visível' then raise exception 'Wrong task';end if;
 if exists(select 1 from public.torre_tv_tasks('errado')) or exists(select 1 from public.torre_tv_tasks('')) or exists(select 1 from public.torre_tv_tasks(null)) then raise exception 'Invalid token accepted';end if;
 if has_table_privilege('anon','public.torre_tv_tokens','select') or has_table_privilege('authenticated','public.torre_tv_tokens','select') then raise exception 'Token table exposed';end if;
 if not has_function_privilege('anon','public.torre_tv_tasks(text)','execute') then raise exception 'Anon cannot call';end if;
end $$;
rollback;
