create extension if not exists pg_cron;

create or replace function public.cleanup_abandoned_users()
returns void
language plpgsql
security definer
as $$
declare
  v_deleted_auth_ids uuid[];
begin
  -- Delete unverified users older than 24h
  with deleted_users as (
    delete from public.users
    where id in (
      select u.id
      from public.users u
      join public.user_compliance uc
        on uc.user_id = u.id
      where
        uc.is_user_verified = false
        and u.created_at < now() - interval '24 hours'
    )
    returning auth_user_id
  )
  select array_agg(auth_user_id)
  into v_deleted_auth_ids
  from deleted_users
  where auth_user_id is not null;

  -- Clean up auth.users
  if v_deleted_auth_ids is not null then
    delete from auth.users
    where id = any(v_deleted_auth_ids);
  end if;
end;
$$;

select cron.schedule(
  'cleanup_abandoned_users_daily',
  '0 1 * * *',
  $$ call public.cleanup_abandoned_users(); $$
);
