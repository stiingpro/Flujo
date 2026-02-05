-- Create a function to reset (delete) all data for the calling user
create or replace function reset_user_data()
returns void
language plpgsql
security definer
as $$
declare
  current_user_id uuid;
begin
  -- Get the current user's ID
  current_user_id := auth.uid();

  -- If no user is logged in, raise exception
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Delete transactions for this user
  delete from transactions
  where user_id = current_user_id;

  -- Delete categories for this user
  delete from categories
  where user_id = current_user_id;

  -- We do NOT delete the profile because the user account itself remains, just the data is wiped.
end;
$$;
