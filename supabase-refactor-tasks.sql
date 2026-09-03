-- =====================================================
-- MAJOR REFACTOR: Pisah Twibbon & Video Perkenalan
-- =====================================================
-- Schema baru:
-- - twibbon_tasks: 2 tugas terpisah (twibbon + video)
--   → tiap task punya: syarat (markdown), bahan (link/file), deadline
-- - twibbon_task_submissions: submit per task (NIM bisa submit multiple tasks)
-- - twibbon_members: NIM format 162026001, grouped display
-- =====================================================

-- 1. Bikin tabel tasks (tugas terpisah)
create table if not exists twibbon_tasks (
  id uuid primary key default gen_random_uuid(),
  task_key text unique not null, -- 'twibbon', 'video'
  task_title text not null,
  requirements_md text, -- syarat (markdown)
  materials jsonb, -- [{type: 'link'|'file', title, url, storage_path}]
  deadline_at timestamptz,
  deadline_label text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Bikin tabel submissions per task
create table if not exists twibbon_task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_key text not null references twibbon_tasks(task_key),
  nim text not null,
  submission_data jsonb not null, -- {ig_url, screenshot_path, video_url, etc}
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  notes text,
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

create index if not exists idx_task_submissions_nim on twibbon_task_submissions(nim);
create index if not exists idx_task_submissions_status on twibbon_task_submissions(status);

-- 3. Seed 2 tasks (twibbon + video)
insert into twibbon_tasks (task_key, task_title, requirements_md, materials, deadline_label)
values
  ('twibbon', 'Twibbon PKKMB IT 2026',
   '### Template Caption:
```
✨ [𝐏𝐊𝐊𝐌𝐁 𝐈𝐓 𝟐𝟔] ✨
Halo semuanya! 👋🏻
Perkenalkan, saya [Nama Lengkap], biasa dipanggil [Nama Panggilan].
...
```

### Ketentuan:
- Post twibbon di Instagram/TikTok
- Mention 5 akun teman
- Tag @teknologiump & @hmti_ump
- Akun tidak boleh privat',
   '[{"type":"link","title":"Link Twibbon Online","url":"https://twb.nz/teknologinformasi26"},{"type":"file","title":"Bingkai Twibbon","storage_path":"frames/frame-video-intro.png"}]'::jsonb,
   'Batas Submit Twibbon'),

  ('video', 'Video Perkenalan',
   '### Ketentuan Video:
1. Tugas individu
2. Durasi: 3-5 menit
3. Pakaian:
   - Cowok: Kemeja putih + Celana hitam
   - Cewek: Kemeja putih + Rok hitam + Jilbab hitam
4. Wajib sebutkan:
   - Nama lengkap, asal daerah
   - Minat & bakat, hobby
   - 3 Fun fact tentang diri
   - Nama Fakultas Teknik & Program Studi TI
5. Hashtag: #UMPalembang #FakultasTeknik #TeknologiInformasi #MeetTheCamaba #HelloCampus #CodeYourFuture
6. Mention: @hmti_ump & @teknologiump
7. Tag 5 temanmu
8. Akun tidak boleh privat',
   '[]'::jsonb,
   'Batas Upload Video')
on conflict (task_key) do nothing;

-- 4. Migrate existing twibbon_posts → twibbon_task_submissions
insert into twibbon_task_submissions (task_key, nim, submission_data, status, submitted_at, reviewed_at)
select
  'twibbon',
  nim,
  jsonb_build_object('ig_url', ig_url, 'screenshot_path', screenshot_path),
  status,
  created_at,
  approved_at
from twibbon_posts
on conflict do nothing;

-- 5. RLS policies
alter table twibbon_tasks enable row level security;
alter table twibbon_task_submissions enable row level security;

create policy "public read tasks" on twibbon_tasks for select using (true);
create policy "anon insert submissions" on twibbon_task_submissions
  for insert with check (auth.role() = 'anon' or auth.role() = 'authenticated');
create policy "admin full access tasks" on twibbon_tasks for all using (auth.role() = 'authenticated');
create policy "admin full access submissions" on twibbon_task_submissions for all using (auth.role() = 'authenticated');