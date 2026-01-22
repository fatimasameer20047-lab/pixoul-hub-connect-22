-- Ensure every new auth user gets a profile row without overwriting existing data
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (user_id, full_name, username, email, phone_number)
  values (
    new.id,
    coalesce(nullif(trim((new.raw_user_meta_data->>'full_name')::text), ''), new.email),
    nullif(lower(new.raw_user_meta_data->>'username'), ''),
    new.email,
    nullif(new.raw_user_meta_data->>'phone_number', '')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();
