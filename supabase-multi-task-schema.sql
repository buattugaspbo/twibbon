-- =====================================================
-- SCHEMA REFACTOR: Multi-Task System (Twibbon + Video + Future Tasks)
-- =====================================================
-- Run di Supabase SQL Editor
-- =====================================================

-- 1. Drop old tables (backup dulu kalau ada data penting!)
-- drop table if exists twibbon_posts cascade;
-- drop table if exists twibbon_files cascade;

-- 2. Bikin tabel tasks (dynamic task list)
create table if not exists twibbon_tasks (
  id uuid primary key default gen_random_uuid(),
  task_key text unique not null, -- slug: 'twibbon', 'video', 'kelompok'
  task_title text not null, -- "Twibbon PKKMB IT 2026"
  task_order int not null default 0, -- urutan tampil di landing
  requirements_md text, -- syarat (Markdown)
  materials jsonb default '[]'::jsonb, -- [{type: 'link'|'file', title, url?, storage_path?}]
  deadline_at timestamptz,
  deadline_label text, -- "Batas Submit Twibbon"
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Bikin tabel submissions per task
create table if not exists twibbon_task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_key text not null references twibbon_tasks(task_key) on delete cascade,
  name text not null, -- nama lengkap submitter
  nim text not null, -- NIM submitter (format: 162026xxx)
  submission_data jsonb not null, -- {ig_url?, screenshot_path?, video_url?, ...}
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  notes text, -- catatan admin (alasan reject, dll)
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

create index if not exists idx_task_submissions_task_key on twibbon_task_submissions(task_key);
create index if not exists idx_task_submissions_nim on twibbon_task_submissions(nim);
create index if not exists idx_task_submissions_status on twibbon_task_submissions(status);

-- 4. Seed 2 tasks awal: Twibbon + Video Perkenalan
insert into twibbon_tasks (task_key, task_title, task_order, requirements_md, materials, deadline_label)
values
  -- TASK 1: TWIBBON
  ('twibbon', '📸 Twibbon PKKMB IT 2026', 1,
   '### Template Caption:
```
✨ [𝐏𝐊𝐊𝐌𝐁 𝐈𝐓 𝟐𝟔] ✨

Halo semuanya! 👋🏻
Perkenalkan, saya [Nama Lengkap], biasa dipanggil [Nama Panggilan].
Saya berasal dari [Asal Sekolah/Kota] dan merupakan mahasiswa baru Program Studi Teknologi Informasi, Fakultas Teknik, Universitas Muhammadiyah Palembang. 💻

⭐ "[Kata-kata / quotes / motto hidup]"

Harapan saya di PKKMB ini, semoga bisa mendapatkan banyak pengalaman baru, bertemu teman-teman baru, dan memulai perjalanan perkuliahan dengan penuh semangat.

Let''s start this journey! ✨
Sampai jumpa di PKKMB 2026! 👋🏻

#PKKMBUMPalembang #UniversitasMuhammadiyahPalembang #FakultasTeknikUMP #TeknologiInformasiUMP #Teknologiump
```

### Ketentuan:
- Post twibbon di **Instagram/TikTok**
- **Mention 5 akun teman** di caption
- **Tag akun** @teknologiump & @hmti_ump
- **Akun tidak boleh privat**
- Submit: link post IG + screenshot',
   '[
     {"type":"link","title":"Link Twibbon Online","url":"https://twb.nz/teknologinformasi26"},
     {"type":"file","title":"Bingkai Twibbon (PNG)","storage_path":"frames/frame-video-intro.png"}
   ]'::jsonb,
   'Batas Submit Twibbon'),

  -- TASK 2: VIDEO PERKENALAN
  ('video', '🎥 Video Perkenalan', 2,
   '### Ketentuan Video:
1. **Tugas individu**
2. **Durasi**: 3-5 menit
3. **Pakaian**:
   - **Cowok**: Kemeja putih + Celana dasar hitam
   - **Cewek**: Kemeja putih + Rok hitam + Jilbab hitam
4. **Wajib sebutkan**:
   - Nama lengkap
   - Asal daerah
   - Minat & bakat
   - Hobby
   - **3 Fun fact tentang diri sendiri**
   - Menyebutkan nama **Fakultas Teknik** dan **Program Studi Teknologi Informasi**
5. **Hashtag** (wajib):
   - #UMPalembang
   - #FakultasTeknik
   - #TeknologiInformasi
   - #MeetTheCamaba
   - #HelloCampus
   - #CodeYourFuture
6. **Mention** di caption:
   - Instagram: @hmti_ump & @teknologiump
   - TikTok: @hmti_ump & @teknologiump
7. **Tag 5 temanmu**
8. **Akun tidak boleh privat**

⚠️ **Jadwal upload akan diinfokan kemudian!**',
   '[]'::jsonb,
   'Batas Upload Video')
on conflict (task_key) do nothing;

-- 5. RLS policies
alter table twibbon_tasks enable row level security;
alter table twibbon_task_submissions enable row level security;

drop policy if exists "public read tasks" on twibbon_tasks;
drop policy if exists "anon insert submissions" on twibbon_task_submissions;
drop policy if exists "admin full access tasks" on twibbon_tasks;
drop policy if exists "admin full access submissions" on twibbon_task_submissions;

create policy "public read tasks" on twibbon_tasks
  for select using (is_active = true);

create policy "anon insert submissions" on twibbon_task_submissions
  for insert with check (true);

create policy "admin full access tasks" on twibbon_tasks
  for all using (auth.role() = 'authenticated');

create policy "admin full access submissions" on twibbon_task_submissions
  for all using (auth.role() = 'authenticated');

-- 6. Migrate existing twibbon_posts → twibbon_task_submissions (kalau ada data lama)
-- Uncomment kalau mau migrate:
-- insert into twibbon_task_submissions (task_key, name, nim, submission_data, status, submitted_at, reviewed_at)
-- select
--   'twibbon',
--   '(Migrated)',
--   nim,
--   jsonb_build_object('ig_url', ig_url, 'screenshot_path', screenshot_path),
--   status,
--   created_at,
--   approved_at
-- from twibbon_posts
-- on conflict do nothing;