-- =====================================================
-- PKKMB TI UMP — Kumpul Twibbon — Supabase Setup
-- =====================================================
-- Cara pakai:
-- 1. Buka Supabase Dashboard project-mu (existing)
-- 2. SQL Editor → New query
-- 3. Copy-paste semua isi file ini → Run
--
-- Notes:
-- - Aman dijalankan berulang (CREATE IF NOT EXISTS, ON CONFLICT)
-- - Tidak menghapus data existing di project Supabase-mu
-- - Hanya menambahkan tabel prefix 'twibbon_' + storage
-- =====================================================

-- ===== 1. SCHEMA =====

create table if not exists twibbon_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists twibbon_posts (
  id uuid primary key default gen_random_uuid(),
  nim text not null,
  ig_url text not null,
  screenshot_path text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reject_reason text,
  created_at timestamptz default now(),
  approved_at timestamptz,
  unique(nim)
);
create index if not exists twibbon_posts_status_created_idx on twibbon_posts (status, created_at desc);

create table if not exists twibbon_files (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  storage_path text not null,
  file_kind text not null check (file_kind in ('frame','video')),
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists twibbon_terms (
  id int primary key default 1,
  body_md text not null,
  updated_at timestamptz default now(),
  check (id = 1)
);

-- NEW: Members roster (TI 2026 maba)
create table if not exists twibbon_members (
  id uuid primary key default gen_random_uuid(),
  position int,                    -- 1..66 (urutan seed), NULL untuk tambahan
  group_number int,                -- kelompok 1..15
  nim text,                        -- NIM asli (diisi admin nanti), NULL dulu
  name text not null,              -- nama lengkap
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  created_by text default 'system',
  updated_at timestamptz default now(),
  updated_by text
);
create unique index if not exists twibbon_members_nim_unique on twibbon_members (nim) where nim is not null;
create index if not exists twibbon_members_group_idx on twibbon_members (group_number);
create index if not exists twibbon_members_position_idx on twibbon_members (position);

-- NEW: Audit history untuk perubahan members
create table if not exists twibbon_member_history (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references twibbon_members(id) on delete cascade,
  member_nim text,                 -- snapshot nim (jika ada) sebelum dihapus
  member_name text,                -- snapshot nama sebelum dihapus
  action text not null check (action in ('created','updated','deleted')),
  old_data jsonb,
  new_data jsonb,
  changed_by text not null,
  changed_by_kind text not null check (changed_by_kind in ('admin','system')),
  note text,
  changed_at timestamptz default now()
);
create index if not exists twibbon_member_history_member_idx on twibbon_member_history (member_id, changed_at desc);

-- ===== 2. SEED DATA =====

-- Settings (deadline + subtitle baru)
insert into twibbon_settings (key, value) values
  ('event_title', '"PKKMB FAKULTAS TEKNIK – TEKNOLOGI INFORMASI 2026"'),
  ('event_subtitle', '"Universitas Muhammadiyah Palembang · Himpunan Mahasiswa Teknologi Informasi"'),
  ('target_count', '90'),
  ('video_url', '""'),
  ('deadline_at', 'null'),
  ('deadline_label', '"Batas submit twibbon & video perkenalan"')
on conflict (key) do nothing;

-- S&K (Markdown)
insert into twibbon_terms (id, body_md) values
  (1, '## 🎯 Ketentuan Umum

1. **Video perkenalan wajib** di-post di Instagram (feed/reels), mention & tag sesuai aturan di bawah.
2. Akun IG **tidak boleh privat** selama periode PKKMB.
3. **Mention 5 teman** di kolom komentar postingan twibbon kamu.
4. **Tag akun** @teknologiump & @hmti_ump di postingan / reels kamu.
5. Hashtag wajib: `#PKKMBUMPalembang` `#UniversitasMuhammadiyahPalembang` `#FakultasTeknikUMP` `#TeknologiInformasiUMP` `#Teknologiump`
6. Satu NIM hanya boleh submit satu twibbon.

## 🎥 Ketentuan Video Perkenalan

1. Tugas video **individu**.
2. Video wajib menjelaskan:
   - Nama lengkap
   - Asal daerah
   - Minat & bakat
   - Hobby
   - 3 fun fact tentang diri sendiri
   - Menyebutkan nama fakultas & program studi
3. Tambahkan hashtag: `#UMPalembang` `#FakultasTeknik` `#TeknologiInformasi` `#MeetTheCamaba` `#HelloCampus` `#CodeYourFuture`
4. Sound bebas, sekreatif mungkin.
5. Durasi video **3–5 menit**.
6. Pakaian:
   - Cowok: Kemeja putih, celana hitam
   - Cewek: Kemeja putih, rok hitam, jilbab hitam
7. Mention IG & TikTok: @hmti_ump & @teknologiump
8. Akun tidak boleh privat.
9. Tag akun 5 teman kamu.

## 👥 Ketentuan Kelompok

- Buat kelompok **6 orang** (urut sesuai NIM).
- Saling mengenal satu sama lain dengan anggota kelompok.
- Jadwal upload video perkenalan akan diinfokan kemudian oleh panitia.

## ⚠️ Catatan

- Panitia berhak menolak twibbon yang tidak memenuhi ketentuan.
- Screenshot twibbon yang disubmit akan **ditampilkan secara publik** di website.
- Dengan submit, Anda menyetujui ketentuan di atas.

Semangat semuanya! 🚀')
on conflict (id) do update set body_md = excluded.body_md, updated_at = now();

-- Members seed (66 nama dari list, kelompok 1-11)
-- NIM sementara pakai placeholder 'TI26-001' s.d. 'TI26-066'.
-- Admin nanti update dengan NIM asli via dashboard.
do $$
declare
  members_data text[] := array[
    -- Group 1
    'ANDI MUHAMMAD ABDUL AZIZ', 'MAULANA FIRMANSYAH', 'MUTIARA AD PUTRI',
    'IBRAHIMOVIC ADHAMSYSH', 'ZAHRA NAOLIN DIVA', 'BAGUS TRI ANGGARA',
    -- Group 2
    'ADIE SASTRANEGARA', 'FAREL WAHYU RAMADHAN', 'PUTRI ANGGUN ZULYANA',
    'MEITHA TAURISSIA ADINARASTI', 'EXCEL MULYONO', 'TIARA WULANDARI',
    -- Group 3
    'MUHAMMAD SALIMUN', 'CHALISA AULIA', 'SUCI SANIA',
    'ARI MUSTADA', 'JUWITA PURNAMA SARI', 'RASYA AFIF ZAKI',
    -- Group 4
    'ANDRIANINGSIH', 'FARIZ PUTRA RADHITIA', 'RIFKI RIANSYAH',
    'INDAH RIZKY PERMATA', 'MUHAMMAD RIZKY ALHAFIDZ', 'MUHAMMAD AZIZ AL-FARUQ',
    -- Group 5
    'DESTRI ULANDARI', 'DEWI TRI ANDINI', 'NABILA AULIA',
    'M. FELLO ALKAHLIFI', 'CORNELIA DWI RATU', 'NATASYA ZAHRA PERMATASARI',
    -- Group 6
    'ZERIL APRIANTI', 'ANDIKA SAPUTRA', 'DENNY BAGASKARA',
    'FITRIA LINTANG', 'MUHAMMAD ROCHMEIDI HOLIL', 'HLESNA WAHYU RAHMA',
    -- Group 7
    'NAYLA PUTRI AYU', 'MUHAMAD YUSUF', 'ARNALDO AGUSTIAN PAHLEVI',
    'JULIA SETIYANINGSIH', 'GYO PARLINDO', 'EDIZ MIKA R.',
    -- Group 8
    'DIVA SABIRA', 'FARREL RIZKY FREDIANTO', 'RANGGA DEFRANTINUS',
    'IRFA ERWANDI', 'ALFI SYAHR ANDRIANO', 'ADAVIN IBRAHIM MAHAR DIKA',
    -- Group 9
    'FAIRUS ZACKY', 'BAGAS SATRYO WIRATAMA', 'MUHAMMAD SYAFIB SAPUTRA',
    'PIONA SAPUTRI', 'MUHAMMAD AL FAHRI', 'FAHRI AGUNG',
    -- Group 10
    'RIZKI AYU ARAFAH', 'UMAIR AL FARUQ', 'ASRUL HIDAYATULLAH',
    'RAHMAT DANI', 'R.A. KHALIILAH MAAHIIRAH', 'NYIMAS JEANYVER CINTO',
    -- Group 11
    'ALFATH ADIKA GUMAY', 'M RENADI FAHRI', 'NABILA AULIA',
    'MERCHI ADE PUTRA', 'MUHAMMAD YUSUF', 'LAKSANA REVAN KARSANI'
  ];
  i int;
  grp int;
  pos int;
  nim text;
begin
  for i in 1..array_length(members_data, 1) loop
    pos := i;
    grp := ceil(i::numeric / 6);
    nim := 'TI26-' || lpad(i::text, 3, '0');
    insert into twibbon_members (position, group_number, nim, name, created_by)
    values (pos, grp, nim, members_data[i], 'system')
    on conflict do nothing;
  end loop;
end $$;

-- ===== 3. RLS POLICIES =====

alter table twibbon_posts enable row level security;
alter table twibbon_settings enable row level security;
alter table twibbon_files enable row level security;
alter table twibbon_terms enable row level security;
alter table twibbon_members enable row level security;
alter table twibbon_member_history enable row level security;

-- twibbon_posts
drop policy if exists "public reads approved" on twibbon_posts;
drop policy if exists "anon inserts pending" on twibbon_posts;
drop policy if exists "admin all posts" on twibbon_posts;

create policy "public reads approved" on twibbon_posts
  for select using (status = 'approved');
create policy "anon inserts pending" on twibbon_posts
  for insert with check (status = 'pending');
create policy "admin all posts" on twibbon_posts
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- twibbon_settings
drop policy if exists "public read settings" on twibbon_settings;
drop policy if exists "admin write settings" on twibbon_settings;
create policy "public read settings" on twibbon_settings for select using (true);
create policy "admin write settings" on twibbon_settings
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- twibbon_files
drop policy if exists "public read files" on twibbon_files;
drop policy if exists "admin write files" on twibbon_files;
create policy "public read files" on twibbon_files for select using (true);
create policy "admin write files" on twibbon_files
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- twibbon_terms
drop policy if exists "public read terms" on twibbon_terms;
drop policy if exists "admin write terms" on twibbon_terms;
create policy "public read terms" on twibbon_terms for select using (true);
create policy "admin write terms" on twibbon_terms
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- twibbon_members (public read, admin write, public insert for self-identification)
drop policy if exists "public read members" on twibbon_members;
drop policy if exists "public insert members" on twibbon_members;
drop policy if exists "admin all members" on twibbon_members;
create policy "public read members" on twibbon_members for select using (true);
create policy "public insert members" on twibbon_members for insert with check (true);
create policy "admin all members" on twibbon_members
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- twibbon_member_history (admin only)
drop policy if exists "admin read history" on twibbon_member_history;
drop policy if exists "admin write history" on twibbon_member_history;
create policy "admin read history" on twibbon_member_history for select using (auth.role() = 'authenticated');
create policy "admin write history" on twibbon_member_history
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ===== 4. STORAGE BUCKET =====

insert into storage.buckets (id, name, public, file_size_limit)
values ('twibbon-assets', 'twibbon-assets', true, 5242880)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "public read assets" on storage.objects;
drop policy if exists "admin write assets" on storage.objects;
drop policy if exists "anon upload screenshots" on storage.objects;

create policy "public read assets" on storage.objects
  for select using (bucket_id = 'twibbon-assets');
create policy "admin write assets" on storage.objects
  for all using (bucket_id = 'twibbon-assets' and auth.role() = 'authenticated')
  with check (bucket_id = 'twibbon-assets' and auth.role() = 'authenticated');
create policy "anon upload screenshots" on storage.objects
  for insert with check (
    bucket_id = 'twibbon-assets'
    and (storage.foldername(name))[1] = 'screenshots'
  );

-- ===== 5. ADMIN USER =====
-- Buat manual via Supabase Dashboard:
--   Authentication → Users → Add user → "Create new user"
--   Masukkan email admin (misal: panitia.pkkmb.ti@ump.ac.id)
--   Pastikan provider "Email" enabled (untuk magic link).
--
-- Setelah user dibuat, login di /admin/ dengan email tersebut.

-- ===== SELESAI =====
-- Quick checks:
--   select * from twibbon_settings;
--   select count(*) from twibbon_members;          -- harusnya 66
--   select * from twibbon_terms;
--   select * from storage.buckets where id = 'twibbon-assets';