-- =====================================================
-- FIX: Admin upload error + Storage RLS policies
-- =====================================================
-- Run di Supabase SQL Editor
-- =====================================================

-- 1. Check storage bucket exists & has correct settings
update storage.buckets
set public = true,
    file_size_limit = 52428800, -- 50 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
where id = 'twibbon-uploads';

-- 2. Fix RLS policies untuk storage (allow authenticated users to upload)
drop policy if exists "Authenticated users can upload files" on storage.objects;
drop policy if exists "Public can read files" on storage.objects;

create policy "Authenticated users can upload files"
on storage.objects for insert
to authenticated
with check (bucket_id = 'twibbon-uploads');

create policy "Authenticated users can update files"
on storage.objects for update
to authenticated
using (bucket_id = 'twibbon-uploads');

create policy "Authenticated users can delete files"
on storage.objects for delete
to authenticated
using (bucket_id = 'twibbon-uploads');

create policy "Public can read files"
on storage.objects for select
to public
using (bucket_id = 'twibbon-uploads');

-- 3. Grant storage permissions
grant all on storage.objects to authenticated;
grant select on storage.objects to anon;