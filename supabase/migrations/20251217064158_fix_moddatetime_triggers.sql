-- Fix broken moddatetime triggers (created without required argument)

-- USERS
DROP TRIGGER IF EXISTS users_set_updated_at ON public.users;

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.moddatetime('updated_at');

-- WALLETS
DROP TRIGGER IF EXISTS wallets_set_updated_at ON public.wallets;

CREATE TRIGGER wallets_set_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION public.moddatetime('updated_at');
