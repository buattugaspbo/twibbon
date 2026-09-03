-- Quick fixes: pisah deadline twibbon + video, support link bahan, kelompok 6 anggota
-- Run di Supabase SQL Editor

-- 1. Tambah deadline video perkenalan (pisah dari deadline twibbon)
insert into twibbon_settings (key, value, updated_at)
values
  ('deadline_video_at', 'null', now()),
  ('deadline_video_label', '"Batas Upload Video"', now()),
  ('video_requirements_md', '"### Ketentuan Video:\n1. Tugas individu\n2. Durasi: 3-5 menit\n3. Pakaian:\n   - Cowok: Kemeja putih + Celana hitam\n   - Cewek: Kemeja putih + Rok hitam + Jilbab hitam\n4. Wajib sebutkan: Nama lengkap, asal daerah, minat & bakat, hobby, 3 fun fact, Fakultas Teknik & Prodi TI\n5. Hashtag: #UMPalembang #FakultasTeknik #TeknologiInformasi #MeetTheCamaba #HelloCampus #CodeYourFuture\n6. Mention: @hmti_ump & @teknologiump (IG + TikTok)\n7. Tag 5 temanmu\n8. Akun tidak boleh privat"', now()),
  ('grup_link', '"https://chat.whatsapp.com/XXX"', now())
on conflict (key) do update set value = excluded.value, updated_at = now();

-- 2. Update twibbon_files: support link eksternal (URL langsung tanpa storage_path)
-- Sudah support dari schema existing — storage_path bisa berisi URL

-- 3. Kelompok: update jadi 6 anggota (hapus 100 slot lama, bikin 120 baru)
truncate twibbon_members cascade;

insert into twibbon_members (group_number, position, nim, name, created_by, updated_by)
select
  ceil(n::numeric / 6)::int as group_number,
  n as position,
  null as nim,
  '(Belum diisi)' as name,
  'system' as created_by,
  'system' as updated_by
from generate_series(1, 120) as n;

-- Verify: 20 kelompok × 6 anggota
select group_number, count(*) as anggota_count
from twibbon_members
group by group_number
order by group_number;
