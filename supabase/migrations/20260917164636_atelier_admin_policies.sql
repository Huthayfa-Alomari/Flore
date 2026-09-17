begin;

drop policy if exists "Flower types are viewable by everyone" on public.flower_types;
drop policy if exists "Flower types are writable by admin only" on public.flower_types;
create policy "Flower types are viewable by everyone" on public.flower_types
  for select to anon, authenticated using (true);
create policy "Admins can insert flower types" on public.flower_types
  for insert to authenticated
  with check (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'));
create policy "Admins can update flower types" on public.flower_types
  for update to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'))
  with check (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'));
create policy "Admins can delete flower types" on public.flower_types
  for delete to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'));

drop policy if exists "Public can view greenery" on public.greenery_options;
create policy "Public can view greenery" on public.greenery_options
  for select to anon, authenticated using (true);
create policy "Admins can insert greenery" on public.greenery_options
  for insert to authenticated
  with check (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'));
create policy "Admins can update greenery" on public.greenery_options
  for update to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'))
  with check (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'));
create policy "Admins can delete greenery" on public.greenery_options
  for delete to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'));

drop policy if exists "Vase options are viewable by everyone" on public.vase_options;
drop policy if exists "Vase options are writable by admin only" on public.vase_options;
create policy "Vase options are viewable by everyone" on public.vase_options
  for select to anon, authenticated using (true);
create policy "Admins can insert vase options" on public.vase_options
  for insert to authenticated
  with check (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'));
create policy "Admins can update vase options" on public.vase_options
  for update to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'))
  with check (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'));
create policy "Admins can delete vase options" on public.vase_options
  for delete to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'));

drop policy if exists "Public can view sizes" on public.bouquet_sizes;
create policy "Public can view sizes" on public.bouquet_sizes
  for select to anon, authenticated using (true);
create policy "Admins can insert bouquet sizes" on public.bouquet_sizes
  for insert to authenticated
  with check (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'));
create policy "Admins can update bouquet sizes" on public.bouquet_sizes
  for update to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'))
  with check (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'));
create policy "Admins can delete bouquet sizes" on public.bouquet_sizes
  for delete to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'));

commit;
