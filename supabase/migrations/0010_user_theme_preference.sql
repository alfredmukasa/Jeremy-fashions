-- User appearance preferences (light / dark only)
alter table public.profiles
  add column if not exists theme_preference text not null default 'light'
    check (theme_preference in ('light', 'dark')),
  add column if not exists appearance_mode text not null default 'light'
    check (appearance_mode in ('light', 'dark')),
  add column if not exists theme_updated_at timestamptz;

create index if not exists profiles_appearance_mode_idx on public.profiles (appearance_mode);
