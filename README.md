# Kumpul Twibbon — PKKMB TI UMP 2026

Web aggregator twibbon untuk peserta **PKKMB Fakultas Teknik – Prodi Teknologi Informasi – Universitas Muhammadiyah Palembang 2026**.

Peserta submit twibbon & video perkenalan → admin approve manual → gallery IG-style yang bisa di-share ke WA/IG Story.

---

## Stack

- **Frontend**: Vite + TypeScript + Tailwind CSS (vanilla, no React)
- **Backend**: Supabase (Postgres + Auth + Storage) — pakai project existing
- **Hosting**: Vercel (auto-deploy via GitHub: `buattugaspbo/twibbon`)
- **Repo**: https://github.com/buattugaspbo/twibbon

---

## Environment Variables

Copy-paste ke **Vercel Project Settings → Environment Variables**:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://vmehxcbrdlkcbgpwomzw.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_Dj7VgiiCyWequqKWiI5arA_gAr7w6lK` |

⚠️ Jangan pakai service_role key — cukup anon public key. RLS policies yang handle authorization.

---

## Setup Supabase (sekali)

a. Buka Supabase Dashboard → SQL Editor → New query → paste seluruh isi [`supabase-setup.sql`](./supabase-setup.sql) → Run.
   - Bikin 4 tabel `twibbon_*`
   - Seed 66 anggota dari list HIMTI
   - Bikin storage bucket `twibbon-assets` (public, max 5 MB)
   - Set RLS policies

b. **Authentication** → Providers → **Email** → enable.

c. **Authentication** → Users → **Add user** → Create new user
   - Email: `panitia.pkkmb.ti@ump.ac.id` (atau email admin lo)
   - Confirm

d. Bikin admin email whitelist (opsional — cukup RLS aja udah cukup aman).

---

## Setup Lokal

```bash
git clone https://github.com/buattugaspbo/twibbon.git
cd twibbon
npm install
cp .env.example .env
# edit .env: paste VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
npm run dev   # http://localhost:5173
```

---

## Halaman

| URL | Fungsi |
|---|---|
| `/` | Landing — hero + logo, identity modal, deadline countdown, S&K, bingkai, progress bar, daftar 66 anggota, gallery IG-style |
| `/submit.html` | Form submit (NIM auto-fill dari identitas landing) |
| `/admin/` | Dashboard admin (magic link auth): approval queue, CRUD anggota, CRUD files, settings (judul, target, deadline, video), S&K editor |

---

## Workflow Panitia (daily)

1. Buka `/admin/` → masuk email → klik magic link di email → dashboard
2. Tab **Pending** → review submission masuk → Approve / Reject (+ alasan) / Hapus
4. Tab **Anggota** → edit NIM/nama/kelompok/posisi, atau tambah/hapus manual. Semua perubahan auto-logged di tab **History**
5. Tab **Files** → upload bingkai baru atau video intro
6. Tab **Settings** → ubah judul, target peserta, **deadline** (label + tanggal), URL video
7. Tab **S&K** → edit Markdown S&K (live preview)

---

## Workflow Peserta

1. Buka link web → modal minta **Nama + NIM** → masuk beranda
2. Section **Bahan Twibbon** → download bingkai → post ke IG
3. Klik **Submit** di header → upload screenshot + link post + centang S&K
4. Tunggu approval → muncul di gallery

---

## Deploy ke Vercel

Repo udah di-push ke GitHub: **https://github.com/buattugaspbo/twibbon**

1. Login ke [vercel.com](https://vercel.com) → **Add New Project** → Import `buattugaspbo/twibbon`
2. Framework Preset: **Vite** (auto-detect)
3. **Environment Variables** → paste dari tabel di atas
4. Deploy

Auto-deploy setiap push ke `main`.

---

## Schema

```
twibbon_settings           key-value: event_title, event_subtitle, target_count,
                                       video_url, deadline_at, deadline_label
twibbon_posts              submissions (NIM unik)
twibbon_files              bingkai + video metadata
twibbon_terms              S&K Markdown (id=1)
twibbon_members            66 anggota roster
twibbon_member_history     audit log (siapa ubah apa)

storage: twibbon-assets/ (public)
  screenshots/<nim>-<ts>.<ext>     participant upload
  frames/<filename>                  admin upload
  video/<filename>                   admin upload
```

---

## Branding

- **Palette**: UMP kuning `#F5C518` × TI cyan `#0EA5E9`
- **Font**: Inter (body) + Plus Jakarta Sans (display) + JetBrains Mono (code)
- **Custom SVG**: hero background dengan pattern grid, code snippet accent, polygon motifs — bukan template default
- **Identity chip** di header nge-track siapa yang lagi login

---

## Security Notes

Implementasi keamanan minimal tapi proper:

- **Honeypot** field di submit form (anti-bot)
- **NIM regex** validation client-side
- **Magic link** auth (gak ada password)
- **RLS** enforce di Supabase (public cuma bisa select approved, anon cuma bisa insert pending, admin full access)
- **HTML escape** semua user-generated content (post IG URL, member name, notes)
- **Storage policy** restrict upload ke folder `screenshots/` only untuk anon
- **Input size limit** (5 MB untuk screenshot, 20 MB untuk admin files)

⚠️ Public anon key aman dipakai di client — RLS yang handle authorization.

---

## Logo Files (perlu upload manual)

Drop file logo ke `public/`:
- `public/logo-hmti.png` — logo HMTI (gambar lo yang dikirim)
- `public/logo-ump.png` — logo UMP

File ini udah di-reference di `index.html` (header + hero) dan `admin/index.html` header. Kalau file gak ada, `onerror` handler sembunyikan tag img-nya biar UI gak rusak.

---

## Scripts

| Command | Fungsi |
|---|---|
| `npm run dev` | Dev server di `localhost:5173` |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview build lokal |
| `npm run typecheck` | TypeScript check |

---

## License

Internal — PKKMB FAKULTAS TEKNIK – TEKNOLOGI INFORMASI UMP 2026 · HIMTI.