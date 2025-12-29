create extension if not exists pg_net;

create or replace function notify_user_verified()
returns trigger as $$
begin

  if new.is_user_verified = true
     and old.is_user_verified is distinct from true
     and new.registration_completed_at is null then

    -- Send webhook
    begin
      perform net.http_post(
        url := 'https://sm-n8n-prod-u57860.vm.elestio.app/webhook/supabase-user-verified',
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'user_id', new.user_id
        )
      );
    exception
      when others then
        perform net.http_post(
          url := 'https://sm-n8n-prod-u57860.vm.elestio.app/webhook-test/supabase-user-verified',
          headers := jsonb_build_object(
            'user_id', new.user_id
          )
        );
    end;

    update public.user_compliance
    set registration_completed_at = now()
    where user_id = new.user_id;

  end if;

  return new;
end;
$$ language plpgsql;


drop trigger if exists user_verified_trigger on public.user_compliance;

create trigger user_verified_trigger
after update on public.user_compliance
for each row
execute function notify_user_verified();
