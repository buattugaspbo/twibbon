-- =====================================================
-- REFACTOR: Kelompok → 6 anggota per kelompok (urutan NIM)
-- =====================================================
-- Cara pakai:
-- 1. Buka Supabase Dashboard → SQL Editor → New query
-- 2. Copy-paste isi file ini → Run
--
-- Struktur baru:
-- - Total peserta: estimasi 120 (disesuaikan nanti)
-- - Per kelompok: 6 anggota
-- - Total kelompok: 20 kelompok
-- - Urutan: NIM 1-6 (kelompok 1), 7-12 (kelompok 2), dst
-- =====================================================

-- 1. Hapus semua anggota existing (pindah ke history dulu)
insert into twibbon_member_history (member_id, member_nim, member_name, action, old_data, new_data, changed_by, changed_by_kind, note)
select
  id,
  nim,
  name,
  'deleted',
  row_to_json(twibbon_members.*),
  null,
  'system',
  'system',
  'Refactor kelompok: 6 anggota per kelompok, urutan NIM'
from twibbon_members;

delete from twibbon_members;

-- 2. Bikin 120 slot kosong (20 kelompok × 6 anggota/kelompok)
-- Kelompok 1: posisi 1-6, Kelompok 2: posisi 7-12, dst
insert into twibbon_members (group_number, position, nim, name, created_by, updated_by)
select
  ceil(n::numeric / 6)::int as group_number,
  n as position,
  null as nim,
  '(Belum diisi)' as name,
  'system' as created_by,
  'system' as updated_by
from generate_series(1, 120) as n;

-- 3. Verify
select
  group_number,
  count(*) as anggota_count
from twibbon_members
group by group_number
order by group_number;

-- Expected: 20 baris, masing-masing count = 6

-- 4. Update target count default jadi 120
insert into twibbon_settings (key, value, updated_at)
values ('target_count', '120', now())
on conflict (key) do update set value = excluded.value, updated_at = now();

-- 5. Inject bahan twibbon (link eksternal + file lokal dari public/)
insert into twibbon_files (title, storage_path, file_kind, sort_order)
values
  ('Bingkai Twibbon PKKMB IT 2026', 'frames/frame-video-intro.png', 'frame', 1),
  ('Link Twibbon Online', 'https://twb.nz/teknologinformasi26', 'frame', 2)
on conflict do nothing;

-- Note: file frames/frame-video-intro.png harus di-upload manual via admin panel
-- atau copy dari public/ ke Supabase Storage bucket twibbon-assets