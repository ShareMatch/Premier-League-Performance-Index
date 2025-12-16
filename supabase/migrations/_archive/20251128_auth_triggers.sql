-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := NEW.id;

  -- 1. Create entry in public.users
  INSERT INTO public.users (id, email, full_name, created_at, updated_at)
  VALUES (
    v_user_id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NOW(),
    NOW()
  );

  -- 2. Create entry in public.wallets
  INSERT INTO public.wallets (user_id, balance, reserved_cents, currency, created_at, updated_at)
  VALUES (
    v_user_id,
    1000000, -- Default balance: $10,000.00 (in cents)
    0,
    'USD',
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
