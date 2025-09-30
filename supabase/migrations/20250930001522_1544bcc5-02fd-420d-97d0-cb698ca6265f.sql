-- Fix search_path for the update_updated_at_column function
create or replace function app.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;