-- =====================================================
-- DEBUG & FIX: twibbon_members schema + RLS
-- =====================================================
-- Run di Supabase SQL Editor untuk check + fix issue
-- =====================================================

-- 1. Check current schema
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_name = 'twibbon_members'
order by ordinal_position;

-- 2. Check sample data (first 5 rows)
select * from twibbon_members order by position limit 5;

-- 3. Check RLS policies
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where tablename = 'twibbon_members';

-- =====================================================
-- FIX: Update RLS policies untuk twibbon_members
-- =====================================================

-- Drop existing policies
drop policy if exists "Public read members" on twibbon_members;
drop policy if exists "Authenticated manage members" on twibbon_members;
drop policy if exists "Public can update members" on twibbon_members;

-- Recreate policies dengan UPDATE untuk public (untuk modal edit di landing)
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

-- =====================================================
-- VERIFY: Test update manual
-- =====================================================

-- Test update posisi 1 (untuk verify RLS works)
-- Uncomment line di bawah untuk test:
-- update twibbon_members set name = 'Test User', nim = '162026001' where position = 1;

-- Check hasil update
select * from twibbon_members where position = 1;