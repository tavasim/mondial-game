-- NOTE (legacy): This file was an early Supabase-only schema (profiles/predictions/matches).
-- The Next.js app now stores predictions via Prisma in Postgres tables like "Prediction" (see prisma/migrations).
-- Do not apply this alongside Prisma migrations unless you intentionally want parallel schemas.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.tournaments (
  id text primary key,
  name text not null,
  betting_deadline_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id text primary key,
  tournament_id text not null references public.tournaments (id) on delete cascade,
  phase text not null default 'group',
  group_code text,
  round smallint,
  home_team text not null,
  away_team text not null,
  kickoff_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.profiles (id) on delete cascade,
  match_id text not null references public.matches (id) on delete cascade,
  home_goals smallint not null,
  away_goals smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint predictions_score_range check (
    home_goals between 0 and 20
    and away_goals between 0 and 20
  ),
  constraint predictions_user_match unique (user_id, match_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists matches_tournament_kickoff_idx on public.matches (tournament_id, kickoff_at);

create index if not exists matches_group_round_idx on public.matches (tournament_id, group_code, round);

create index if not exists predictions_user_idx on public.predictions (user_id);

create index if not exists predictions_match_idx on public.predictions (match_id);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_matches_updated_at on public.matches;
create trigger set_matches_updated_at
before update on public.matches
for each row
execute function public.set_updated_at ();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at ();

drop trigger if exists set_predictions_updated_at on public.predictions;
create trigger set_predictions_updated_at
before update on public.predictions
for each row
execute function public.set_updated_at ();

-- ---------------------------------------------------------------------------
-- Auto-create profile on Supabase Auth signup
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user ();

-- ---------------------------------------------------------------------------
-- Block prediction writes after tournament betting deadline
-- ---------------------------------------------------------------------------

create or replace function public.enforce_prediction_betting_deadline ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ddl timestamptz;
  tid text;
begin
  select m.tournament_id into tid from public.matches m where m.id = new.match_id;
  if tid is null then
    raise exception 'Unknown match_id %', new.match_id;
  end if;

  select t.betting_deadline_at into ddl
  from public.tournaments t
  where t.id = tid;

  if ddl is not null and now() > ddl then
    raise exception 'Betting period has closed for this tournament';
  end if;

  return new;
end;
$$;

drop trigger if exists predictions_enforce_deadline on public.predictions;
create trigger predictions_enforce_deadline
before insert
or update on public.predictions for each row
execute function public.enforce_prediction_betting_deadline ();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.tournaments enable row level security;
alter table public.matches enable row level security;
alter table public.profiles enable row level security;
alter table public.predictions enable row level security;

drop policy if exists tournaments_select_all on public.tournaments;
create policy tournaments_select_all on public.tournaments for select using (true);

drop policy if exists matches_select_all on public.matches;
create policy matches_select_all on public.matches for select using (true);

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid () = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid () = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert with check (auth.uid () = id);

drop policy if exists predictions_select_own on public.predictions;
create policy predictions_select_own on public.predictions for select using (auth.uid () = user_id);

drop policy if exists predictions_insert_own on public.predictions;
create policy predictions_insert_own on public.predictions for insert with check (auth.uid () = user_id);

drop policy if exists predictions_update_own on public.predictions;
create policy predictions_update_own on public.predictions for update using (auth.uid () = user_id)
with
  check (auth.uid () = user_id);

drop policy if exists predictions_delete_own on public.predictions;
create policy predictions_delete_own on public.predictions for delete using (auth.uid () = user_id);

-- ---------------------------------------------------------------------------
-- Grants (Supabase: anon + authenticated clients)
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on table public.tournaments to anon, authenticated;
grant select on table public.matches to anon, authenticated;

grant select, insert, update, delete on table public.predictions to authenticated;
grant select, insert, update on table public.profiles to authenticated;
