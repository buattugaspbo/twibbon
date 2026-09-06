-- =====================================================
-- FIX: twibbon_members RLS untuk public update
-- =====================================================
-- Run di Supabase SQL Editor
-- =====================================================

-- Drop existing policies
drop policy if exists "Public read members" on twibbon_members;
drop policy if exists "Authenticated manage members" on twibbon_members;
drop policy if exists "Public can update members" on twibbon_members;

-- Recreate policies: allow public to update anggota (untuk modal edit di landing)
create policy "Public read members"
on twibbon_members for select
to public
using (true);

create policy "Public can update members"
on twibbon_members for update
to public
using (true)
with check (true);

create policy "Authenticated full access members"
on twibbon_members for all
to authenticated
using (true)
with check (true);

-- Verify RLS setup
select schemaname, tablename, policyname, permissive, roles, cmd
from pg_policies
where tablename = 'twibbon_members';