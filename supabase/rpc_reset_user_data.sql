-- Function to reset (delete) all user data
create or replace function reset_user_data()
returns void
language plpgsql
security definer
as $$
declare
  auth_user_id uuid;
begin
  -- Get current user ID
  auth_user_id := auth.uid();

  if auth_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Delete all transactions for this user
  delete from transactions
  where user_id = auth_user_id;

  -- Delete all categories for this user
  delete from categories
  where user_id = auth_user_id;
end;
$$;
