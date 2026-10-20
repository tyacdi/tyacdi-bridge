-- TYACDI BRIDGE Supabase schema
-- Run this in Supabase Dashboard > SQL Editor. Enable email confirmation in Auth settings.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Member',
  role text not null default 'Professional' check (role in ('Founder','CEO / Executive','Operator','Professional','Student / Emerging talent','Investor')),
  company text,
  bio text,
  location text,
  interests text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint no_self_connection check(from_user <> to_user),
  constraint unique_connection_request unique(from_user,to_user)
);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_created_at_idx on public.profiles(created_at desc);
create index if not exists connection_to_status_idx on public.connection_requests(to_user,status);
create index if not exists connection_from_idx on public.connection_requests(from_user);

alter table public.profiles enable row level security;
alter table public.connection_requests enable row level security;

-- A signed-in member can browse member profiles; only their own profile is editable.
create policy "Signed-in members can browse profiles" on public.profiles
 for select to authenticated using (true);
create policy "Members can create own profile" on public.profiles
 for insert to authenticated with check (auth.uid() = id);
create policy "Members can update own profile" on public.profiles
 for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Members can see requests they sent or received.
create policy "Participants can view connection requests" on public.connection_requests
 for select to authenticated using (auth.uid() = from_user or auth.uid() = to_user);
create policy "Members can send requests as themselves" on public.connection_requests
 for insert to authenticated with check (auth.uid() = from_user);
create policy "Recipients can respond to requests" on public.connection_requests
 for update to authenticated using (auth.uid() = to_user) with check (auth.uid() = to_user);
create policy "Senders can withdraw pending requests" on public.connection_requests
 for delete to authenticated using (auth.uid() = from_user and status = 'pending');

-- Create a profile automatically when an Auth user is registered.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role, company, bio)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'Member'),
    coalesce(new.raw_user_meta_data ->> 'role', 'Professional'),
    nullif(new.raw_user_meta_data ->> 'company', ''),
    nullif(new.raw_user_meta_data ->> 'bio', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
 for each row execute procedure public.handle_new_user();

-- Updated timestamp trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists connection_requests_updated_at on public.connection_requests;
create trigger connection_requests_updated_at before update on public.connection_requests for each row execute procedure public.set_updated_at();

grant usage on schema public to authenticated;
grant select,insert,update on public.profiles to authenticated;
grant select,insert,update,delete on public.connection_requests to authenticated;
