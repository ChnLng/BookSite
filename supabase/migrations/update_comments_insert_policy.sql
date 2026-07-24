drop policy if exists "Users can insert their own comments" on public.comments;

create policy "Users can insert their own comments" on public.comments
  for insert
  with check (auth.uid() = user_id or user_id is null);
