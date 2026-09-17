begin;

alter table public.flower_types
  add column if not exists color_family text;

alter table public.orders
  add column if not exists recipient_phone text,
  add column if not exists tracking_token_hash text;

update public.flower_types
set color_family = case
  when lower(coalesce(name,'') || ' ' || coalesce(name_ar,'')) ~ '(red|أحمر|احمر|حمراء)' then 'red'
  when lower(coalesce(name,'') || ' ' || coalesce(name_ar,'')) ~ '(pink|وردي|وردية|زهري)' then 'pink'
  when lower(coalesce(name,'') || ' ' || coalesce(name_ar,'')) ~ '(white|أبيض|ابيض|بيضاء)' then 'white'
  when lower(coalesce(name,'') || ' ' || coalesce(name_ar,'')) ~ '(yellow|أصفر|اصفر|صفراء|sunflower|دوار الشمس|عباد الشمس)' then 'yellow'
  when lower(coalesce(name,'') || ' ' || coalesce(name_ar,'')) ~ '(purple|lavender|بنفسجي|بنفسجية|خزامى)' then 'purple'
  when lower(coalesce(name,'') || ' ' || coalesce(name_ar,'')) ~ '(orange|peach|برتقالي|خوخي)' then 'orange'
  else coalesce(nullif(color_family,''), 'other')
end;

update public.flower_types
set color = case
  when color_family = 'red' then '#C41E3A'
  when color_family = 'pink' then '#F48FB1'
  when color_family = 'white' then '#FFFFFF'
  when color_family = 'yellow' then '#F2C94C'
  when color_family = 'purple' then '#B497D6'
  when color_family = 'orange' then '#F4A261'
  else color
end
where color_family in ('red','pink','white','yellow','purple','orange');

update public.vase_options
set container_type = 'vase'
where container_type is null
   or container_type not in ('basket','glass_vase','vase','wrap','luxury_box');

alter table public.vase_options
  drop constraint if exists vase_options_container_type_check;
alter table public.vase_options
  add constraint vase_options_container_type_check
  check (container_type in ('basket','glass_vase','vase','wrap','luxury_box')) not valid;
alter table public.vase_options
  validate constraint vase_options_container_type_check;

-- Keep the oldest duplicate visible; hide the later duplicate without deleting production data.
update public.vase_options
set in_stock = false
where id = 'cdb9522f-c8a8-4ae0-90b6-739886b217fa';

create index if not exists idx_flower_types_stock_color
  on public.flower_types (in_stock, color_family);
create index if not exists idx_orders_user_id
  on public.orders (user_id);
create index if not exists idx_orders_driver_id
  on public.orders (driver_id);
create index if not exists idx_orders_tracking_token_hash
  on public.orders (tracking_token_hash)
  where tracking_token_hash is not null;
create index if not exists idx_ai_generation_logs_identifier_created
  on public.ai_generation_logs (identifier, created_at desc);

create or replace function public.claim_ai_generation_slot(
  p_identifier text,
  p_daily_limit integer default 5
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  used_count integer;
  remaining_count integer;
begin
  if p_identifier is null or length(trim(p_identifier)) = 0 then
    raise exception 'identifier is required';
  end if;
  if p_daily_limit < 1 or p_daily_limit > 100 then
    raise exception 'invalid daily limit';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_identifier, 0));

  select count(*)::integer
    into used_count
  from public.ai_generation_logs
  where identifier = p_identifier
    and created_at >= now() - interval '24 hours';

  if used_count >= p_daily_limit then
    return jsonb_build_object('allowed', false, 'remaining', 0);
  end if;

  insert into public.ai_generation_logs(identifier) values (p_identifier);
  remaining_count := greatest(0, p_daily_limit - used_count - 1);
  return jsonb_build_object('allowed', true, 'remaining', remaining_count);
end;
$$;

revoke all on function public.claim_ai_generation_slot(text, integer) from public, anon, authenticated;
grant execute on function public.claim_ai_generation_slot(text, integer) to service_role;

alter function public.update_updated_at() set search_path = public, pg_temp;
alter function public.validate_order_total() set search_path = public, pg_temp;
alter function public.handle_new_user() set search_path = public, pg_temp;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_admin(uuid) from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

commit;
