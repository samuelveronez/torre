begin;
-- Separate the old ALL policy so DELETE can be restricted to drafts.
drop policy conversations_owner on public.torre_conversations;
create policy conversations_read on public.torre_conversations for select to authenticated using(user_id=(select auth.uid()));
create policy conversations_insert on public.torre_conversations for insert to authenticated with check(user_id=(select auth.uid()));
create policy conversations_update on public.torre_conversations for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy conversations_delete_draft on public.torre_conversations for delete to authenticated using(
 user_id=(select auth.uid()) and state='draft' and not exists(
  select 1 from public.torre_conversation_tasks t where t.conversation_id=torre_conversations.id and t.user_id=(select auth.uid())
 )
);
grant delete on public.torre_conversations to authenticated;
commit;
