-- Update the handle_new_user trigger to also set ilaa_status from user metadata.
-- This ensures profiles created at signup have the correct ilaa_status.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, user_type, is_ilaa_member, ilaa_id_number, ilaa_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'user_type', 'independent'),
    coalesce((new.raw_user_meta_data->>'ilaa_member')::boolean, false),
    new.raw_user_meta_data->>'id_number',
    coalesce(new.raw_user_meta_data->>'ilaa_status', 'none')
  );
  return new;
end;
$$;
