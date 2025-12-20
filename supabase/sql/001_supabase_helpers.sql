-- Private schema used by triggers / RLS helpers
create schema if not exists app_private;

-- moddatetime helper (commonly used in triggers)
create or replace function public.moddatetime()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
