-- Backfill profiles for existing auth users who signed up before the trigger was created
INSERT INTO public.profiles (id, name, email)
SELECT au.id, COALESCE(au.raw_user_meta_data->>'name', au.email), au.email
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id);
