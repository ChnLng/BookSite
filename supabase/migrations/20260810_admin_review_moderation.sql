alter table public.comments
  add column if not exists user_email text,
  add column if not exists visible boolean not null default true;

update public.comments as comment
set user_email = profile.email
from public.profiles as profile
where comment.user_id = profile.id
  and comment.user_email is null;

create index if not exists comments_visible_created_idx
  on public.comments (visible, created_at desc);

drop policy if exists "Anyone can read comments" on public.comments;
drop policy if exists "Anyone can read visible comments" on public.comments;

create policy "Anyone can read visible comments" on public.comments
  for select using (
    visible = true
    or auth.uid() = user_id
    or public.is_admin()
  );

notify pgrst, 'reload schema';
