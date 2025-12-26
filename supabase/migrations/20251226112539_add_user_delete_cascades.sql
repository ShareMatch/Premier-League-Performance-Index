-- user_compliance
alter table public.user_compliance
drop constraint user_compliance_user_id_fkey;

alter table public.user_compliance
add constraint user_compliance_user_id_fkey
foreign key (user_id)
references public.users(id)
on delete cascade;

-- user_otp_verification
alter table public.user_otp_verification
drop constraint user_otp_verification_user_id_fkey;

alter table public.user_otp_verification
add constraint user_otp_verification_user_id_fkey
foreign key (user_id)
references public.users(id)
on delete cascade;

-- wallets
alter table public.wallets
drop constraint wallets_user_id_fkey;

alter table public.wallets
add constraint wallets_user_id_fkey
foreign key (user_id)
references public.users(id)
on delete cascade;

-- positions
alter table public.positions
drop constraint positions_user_id_fkey;

alter table public.positions
add constraint positions_user_id_fkey
foreign key (user_id)
references public.users(id)
on delete cascade;

-- transactions
alter table public.transactions
drop constraint transactions_user_id_fkey;

alter table public.transactions
add constraint transactions_user_id_fkey
foreign key (user_id)
references public.users(id)
on delete cascade;

-- login_history
alter table public.login_history
drop constraint login_history_user_id_fkey;

alter table public.login_history
add constraint login_history_user_id_fkey
foreign key (user_id)
references public.users(id)
on delete cascade;

-- user_preferences
alter table public.user_preferences
drop constraint user_preferences_user_id_fkey;

alter table public.user_preferences
add constraint user_preferences_user_id_fkey
foreign key (user_id)
references public.users(id)
on delete cascade;

-- user_payment_details
alter table public.user_payment_details
drop constraint user_payment_details_user_id_fkey;

alter table public.user_payment_details
add constraint user_payment_details_user_id_fkey
foreign key (user_id)
references public.users(id)
on delete cascade;
