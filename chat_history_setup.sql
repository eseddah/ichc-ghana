-- ChemPrep Scientist chat history: run this ONCE in Supabase (SQL Editor).
-- Visitors can only ADD their own messages or DELETE their own chats (through the two functions below).
-- Only the two Ambassador accounts can READ everyone's chats.

create table if not exists public.chat_logs (
  id          bigint generated always as identity primary key,
  visitor_id  text        not null,
  conv_id     text        not null,
  role        text        not null check (role in ('user','bot')),
  body        text        not null,
  lang        text,
  created_at  timestamptz not null default now()      -- the database timestamp
);
create index if not exists chat_logs_conv_idx on public.chat_logs (conv_id, created_at);
create index if not exists chat_logs_visitor_idx on public.chat_logs (visitor_id);

alter table public.chat_logs enable row level security;

drop policy if exists "ambassadors read chat logs" on public.chat_logs;
create policy "ambassadors read chat logs" on public.chat_logs
  for select to authenticated
  using ( lower(auth.jwt() ->> 'email') in ('edmondeddah999@gmail.com','kwamedjabaadjarbeng@gmail.com') );

create or replace function public.log_chat_message(p_visitor text, p_conv text, p_role text, p_body text, p_lang text default null)
returns void language sql security definer set search_path = public as $$
  insert into public.chat_logs (visitor_id, conv_id, role, body, lang)
  values (left(p_visitor, 64), left(p_conv, 64), p_role, left(p_body, 8000), left(coalesce(p_lang, ''), 20));
$$;

create or replace function public.delete_my_chat(p_visitor text, p_conv text default null)
returns void language sql security definer set search_path = public as $$
  delete from public.chat_logs where visitor_id = p_visitor and (p_conv is null or conv_id = p_conv);
$$;

grant execute on function public.log_chat_message(text, text, text, text, text) to anon, authenticated;
grant execute on function public.delete_my_chat(text, text) to anon, authenticated;
