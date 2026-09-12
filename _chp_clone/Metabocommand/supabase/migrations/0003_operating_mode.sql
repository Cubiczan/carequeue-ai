-- Phase 2b: Operating mode state + writable thresholds
-- Run in Supabase Dashboard -> SQL Editor AFTER 0001 and 0002

-- ============================================================
-- 1. APP SETTINGS (single-row key-value store for cross-role config)
-- ============================================================
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.app_settings (key, value)
values ('operating_mode', 'efficiency')
on conflict (key) do nothing;

alter table public.app_settings enable row level security;

create policy "app_settings_read_all_authenticated"
  on public.app_settings for select
  to authenticated
  using (true);

create policy "app_settings_update_all_authenticated"
  on public.app_settings for update
  to authenticated
  using (true);

-- Expose app_settings via realtime so Harmony mode changes broadcast live
alter publication supabase_realtime add table public.app_settings;

-- ============================================================
-- 2. Notification preferences on profiles
-- ============================================================
alter table public.profiles
  add column if not exists notification_prefs jsonb
    not null default '{"approvals": true, "agent_updates": true, "activity": false}'::jsonb;
