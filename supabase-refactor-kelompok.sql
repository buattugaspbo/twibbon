-- =====================================================
-- REFACTOR: Kelompok → 100 slot kosong (20 kelompok × 5 anggota)
-- =====================================================
-- Cara pakai:
-- 1. Buka Supabase Dashboard → SQL Editor → New query
-- 2. Copy-paste isi file ini → Run
-- 3. Refresh admin panel → tab "Anggota"
--
-- Notes:
-- - Hapus 66 anggota existing (sudah ada di history)
-- - Bikin 100 slot kosong (NIM kosong, nama placeholder)
-- - Bisa diedit siapapun via admin panel
-- - History tetap tercatat
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
  'Refactor kelompok: 66 anggota lama dihapus, diganti 100 slot kosong'
from twibbon_members;

delete from twibbon_members;

-- 2. Bikin 100 slot kosong (20 kelompok × 5 anggota/kelompok)
-- Kelompok 1: posisi 1-5, Kelompok 2: posisi 6-10, dst
insert into twibbon_members (group_number, position, nim, name, created_by, updated_by)
select
  ceil(n::numeric / 5)::int as group_number,
  n as position,
  null as nim,
  '(Belum diisi)' as name,
  'system' as created_by,
  'system' as updated_by
from generate_series(1, 100) as n;

-- 3. Verify
select
  group_number,
  count(*) as anggota_count
from twibbon_members
group by group_number
order by group_number;

-- Expected: 20 baris, masing-masing count = 5