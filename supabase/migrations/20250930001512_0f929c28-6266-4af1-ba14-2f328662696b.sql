-- Create app schema
create schema if not exists app;

-- User profiles table
create table if not exists app.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text default 'America/Chicago',
  created_at timestamptz not null default now()
);

alter table app.user_profiles enable row level security;

create policy "Users can view own profile"
  on app.user_profiles for select
  using (auth.uid() = user_id);

create policy "Users can update own profile"
  on app.user_profiles for update
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on app.user_profiles for insert
  with check (auth.uid() = user_id);

-- Devotionals table
create table if not exists app.devotionals (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  reference text not null,
  translation text,
  verse_text text not null,
  reflection text not null,
  prayer_short text,
  prayer_long text,
  themes jsonb default '[]'::jsonb,
  raw jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, date)
);

alter table app.devotionals enable row level security;

create policy "Users can view own devotionals"
  on app.devotionals for select
  using (auth.uid() = user_id);

create policy "Users can insert own devotionals"
  on app.devotionals for insert
  with check (auth.uid() = user_id);

-- Journals table
create table if not exists app.journals (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  prompts jsonb not null default '[]'::jsonb,
  content_md text not null default '',
  tags text[] default '{}',
  word_count int generated always as (coalesce(array_length(regexp_split_to_array(content_md, '\s+'),1),0)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app.journals enable row level security;

create policy "Users can manage own journals"
  on app.journals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Conversations table
create table if not exists app.conversations (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

alter table app.conversations enable row level security;

create policy "Users can manage own conversations"
  on app.conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Conversation messages table
create table if not exists app.conversation_messages (
  id bigserial primary key,
  conversation_id bigint not null references app.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text check (role in ('system','user','assistant')) not null,
  content text not null,
  ts timestamptz not null default now()
);

alter table app.conversation_messages enable row level security;

create policy "Users can manage own messages"
  on app.conversation_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Theme aggregates table (renamed window to time_window)
create table if not exists app.theme_aggregates (
  user_id uuid not null references auth.users(id) on delete cascade,
  time_window text not null check (time_window in ('7','30')),
  theme text not null,
  count int not null default 0,
  last_seen date,
  primary key (user_id, time_window, theme)
);

alter table app.theme_aggregates enable row level security;

create policy "Users can manage own theme aggregates"
  on app.theme_aggregates for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger to update journals updated_at
create or replace function app.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_journals_updated_at
  before update on app.journals
  for each row
  execute function app.update_updated_at_column();

-- Function to auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into app.user_profiles (user_id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();