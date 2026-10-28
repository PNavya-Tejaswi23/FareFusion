-- FareFusion database schema
-- Run this script in Supabase SQL Editor for your own project.
-- No user authentication is implemented in this student MVP. See README security notes.

create extension if not exists pgcrypto;

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  pickup text not null check (char_length(trim(pickup)) between 2 and 180),
  destination text not null check (char_length(trim(destination)) between 2 and 180),
  vehicle_type text not null default 'all'
    check (vehicle_type in ('all', 'bike', 'auto', 'cab')),
  preferred_provider text null
    check (preferred_provider is null or preferred_provider in ('ola', 'uber', 'rapido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint different_locations check (lower(trim(pickup)) <> lower(trim(destination)))
);

create index if not exists saved_searches_created_at_idx
  on public.saved_searches (created_at desc);
create index if not exists saved_searches_route_idx
  on public.saved_searches (lower(pickup), lower(destination));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists saved_searches_set_updated_at on public.saved_searches;
create trigger saved_searches_set_updated_at
before update on public.saved_searches
for each row execute function public.set_updated_at();

alter table public.saved_searches enable row level security;

-- The Express server uses a server-side service-role/secret key, which bypasses RLS.
-- Do not add anonymous public policies for this table in this MVP. Browser access is not used.
-- In a production app, use Supabase Auth, associate rows with auth.uid(), and write
-- policies that let users access only their own rows. Keep the service key server-only.

revoke all on table public.saved_searches from anon, authenticated;
grant select, insert, delete, update on table public.saved_searches to service_role;
