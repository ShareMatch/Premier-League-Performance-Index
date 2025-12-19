-- Fix broken moddatetime trigger on wallets

DROP TRIGGER IF EXISTS wallets_set_updated_at ON public.wallets;

CREATE TRIGGER wallets_set_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION extensions.moddatetime('updated_at');
