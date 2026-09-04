-- =====================================================
-- COMPLETE SETUP: Twibbon PKKMB TI UMP 2026
-- =====================================================
-- SAFE untuk database yang shared dengan projek lain
-- Hanya touch tabel twibbon_* dan bucket twibbon-assets
-- Idempotent: bisa run berkali-kali tanpa rusak data existing
-- =====================================================

-- =====================================================
-- 1. STORAGE BUCKET SETUP
-- =====================================================

-- Create bucket jika belum ada
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'twibbon-assets',
  'twibbon-assets',
  true,
  52428800, -- 50 MB
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']::text[]
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']::text[];

-- Drop existing policies (akan di-recreate)
drop policy if exists "Public can read files" on storage.objects;
drop policy if exists "Authenticated users can upload files" on storage.objects;
drop policy if exists "Authenticated users can update files" on storage.objects;
drop policy if exists "Authenticated users can delete files" on storage.objects;
drop policy if exists "Anon can upload screenshots" on storage.objects;

-- RLS policies untuk storage
create policy "Public can read files"
on storage.objects for select
to public
using (bucket_id = 'twibbon-assets');

create policy "Authenticated users can upload files"
on storage.objects for insert
to authenticated
with check (bucket_id = 'twibbon-assets');

create policy "Authenticated users can update files"
on storage.objects for update
to authenticated
using (bucket_id = 'twibbon-assets');

create policy "Authenticated users can delete files"
on storage.objects for delete
to authenticated
using (bucket_id = 'twibbon-assets');

create policy "Anon can upload screenshots"
on storage.objects for insert
to anon
with check (
  bucket_id = 'twibbon-assets'
  and (storage.foldername(name))[1] = 'screenshots'
);

-- Grant permissions
grant all on storage.objects to authenticated;
grant select on storage.objects to anon;
grant insert on storage.objects to anon;

-- =====================================================
-- 2. TABLES SETUP
-- =====================================================

-- twibbon_settings (key-value config)
create table if not exists twibbon_settings (
  key text primary key,
  value text not null
);

alter table twibbon_settings enable row level security;

drop policy if exists "Public read settings" on twibbon_settings;
drop policy if exists "Authenticated can update settings" on twibbon_settings;

create policy "Public read settings"
on twibbon_settings for select
to public
using (true);

create policy "Authenticated can update settings"
on twibbon_settings for all
to authenticated
using (true)
with check (true);

-- Seed default settings (insert only if not exists)
insert into twibbon_settings (key, value) values
  ('event_title', 'PKKMB TI UMP 2026'),
  ('event_subtitle', 'Fakultas Teknik – Teknologi Informasi'),
  ('target_count', '66'),
  ('video_url', 'https://www.youtube.com/embed/dQw4w9WgXcQ'),
  ('deadline_at', '2026-12-31T23:59:00+07:00'),
  ('deadline_label', 'Deadline Submit')
on conflict (key) do nothing;

-- twibbon_posts (submissions)
create table if not exists twibbon_posts (
  id bigint primary key generated always as identity,
  nim text not null unique,
  name text,
  ig_url text not null,
  screenshot_url text not null,
  status text not null default 'pending',
  rejection_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table twibbon_posts enable row level security;

drop policy if exists "Public read approved posts" on twibbon_posts;
drop policy if exists "Anon can insert posts" on twibbon_posts;
drop policy if exists "Authenticated full access posts" on twibbon_posts;

create policy "Public read approved posts"
on twibbon_posts for select
to public
using (status = 'approved');

create policy "Anon can insert posts"
on twibbon_posts for insert
to anon
with check (status = 'pending');

create policy "Authenticated full access posts"
on twibbon_posts for all
to authenticated
using (true)
with check (true);

-- Add name column if not exists
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'twibbon_posts' and column_name = 'name'
  ) then
    alter table twibbon_posts add column name text;
  end if;
end $$;

-- Update existing posts with default name
update twibbon_posts set name = '(Nama belum diisi)' where name is null;

-- twibbon_files (bingkai + video)
create table if not exists twibbon_files (
  id bigint primary key generated always as identity,
  title text not null,
  storage_path text not null,
  file_kind text not null check (file_kind in ('frame', 'video')),
  created_at timestamptz default now()
);

alter table twibbon_files enable row level security;

drop policy if exists "Public read files" on twibbon_files;
drop policy if exists "Authenticated manage files" on twibbon_files;

create policy "Public read files"
on twibbon_files for select
to public
using (true);

create policy "Authenticated manage files"
on twibbon_files for all
to authenticated
using (true)
with check (true);

-- twibbon_terms (S&K)
create table if not exists twibbon_terms (
  id bigint primary key default 1,
  content text not null,
  updated_at timestamptz default now()
);

alter table twibbon_terms enable row level security;

drop policy if exists "Public read terms" on twibbon_terms;
drop policy if exists "Authenticated update terms" on twibbon_terms;

create policy "Public read terms"
on twibbon_terms for select
to public
using (true);

create policy "Authenticated update terms"
on twibbon_terms for all
to authenticated
using (true)
with check (true);

-- Seed default S&K
insert into twibbon_terms (id, content) values (
  1,
  E'# Syarat & Ketentuan\n\n1. Peserta adalah mahasiswa baru **Prodi Teknologi Informasi UMP 2026**\n2. Wajib menggunakan **bingkai twibbon resmi** yang disediakan\n3. Upload ke Instagram/TikTok dengan hashtag **#PKKMB_TI_UMP_2026**\n4. Screenshot post wajib jelas & tidak blur\n5. Satu NIM hanya boleh submit **satu kali**\n6. Submission yang melanggar akan **ditolak otomatis**\n\n**Kontak**: @hmti_ump (Instagram)'
)
on conflict (id) do nothing;

-- twibbon_members (100 slot kelompok)
create table if not exists twibbon_members (
  id bigint primary key generated always as identity,
  name text,
  nim text,
  notes text,
  position int not null unique check (position between 1 and 100),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table twibbon_members enable row level security;

drop policy if exists "Public read members" on twibbon_members;
drop policy if exists "Authenticated manage members" on twibbon_members;

create policy "Public read members"
on twibbon_members for select
to public
using (true);

create policy "Authenticated manage members"
on twibbon_members for all
to authenticated
using (true)
with check (true);

-- Create 100 empty slots (only if table is empty)
do $$
begin
  if (select count(*) from twibbon_members) = 0 then
    insert into twibbon_members (position)
    select generate_series(1, 100);
  end if;
end $$;

-- twibbon_member_history (audit log)
create table if not exists twibbon_member_history (
  id bigint primary key generated always as identity,
  member_id bigint,
  action text not null check (action in ('created', 'updated', 'deleted')),
  old_data jsonb,
  new_data jsonb,
  changed_by text,
  changed_at timestamptz default now()
);

alter table twibbon_member_history enable row level security;

drop policy if exists "Authenticated read history" on twibbon_member_history;

create policy "Authenticated read history"
on twibbon_member_history for select
to authenticated
using (true);

-- =====================================================
-- 3. FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_twibbon_posts_updated_at on twibbon_posts;
drop trigger if exists update_twibbon_members_updated_at on twibbon_members;
drop trigger if exists update_twibbon_terms_updated_at on twibbon_terms;

create trigger update_twibbon_posts_updated_at
before update on twibbon_posts
for each row execute function update_updated_at();

create trigger update_twibbon_members_updated_at
before update on twibbon_members
for each row execute function update_updated_at();

create trigger update_twibbon_terms_updated_at
before update on twibbon_terms
for each row execute function update_updated_at();

-- =====================================================
-- 4. INDEXES
-- =====================================================

create index if not exists idx_posts_status on twibbon_posts(status);
create index if not exists idx_posts_nim on twibbon_posts(nim);
create index if not exists idx_members_position on twibbon_members(position);

-- =====================================================
-- ✅ SETUP COMPLETE
-- =====================================================
-- Run this SQL di Supabase SQL Editor
-- Safe untuk database shared (cuma touch twibbon_*)
-- =====================================================
