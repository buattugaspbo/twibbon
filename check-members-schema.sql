-- Check schema twibbon_members
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'twibbon_members'
order by ordinal_position;

-- Check sample data
select * from twibbon_members limit 5;

-- Check RLS policies
select schemaname, tablename, policyname, permissive, roles, cmd, qual
from pg_policies
where tablename = 'twibbon_members';
