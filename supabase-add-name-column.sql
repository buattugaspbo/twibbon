-- Add name column to twibbon_posts (untuk tampil di gallery)
alter table twibbon_posts add column if not exists name text;

-- Update existing posts (set name dari NIM sementara, nanti diisi manual/otomatis)
update twibbon_posts set name = '(Nama belum diisi)' where name is null;
