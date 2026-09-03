# Kumpul Twibbon — PKKMB TI UMP 2026

Web aggregator twibbon untuk peserta **PKKMB Fakultas Teknik – Prodi Teknologi Informasi – Universitas Muhammadiyah Palembang 2026**.

Peserta submit twibbon & video perkenalan → admin approve manual → gallery IG-style yang bisa di-share ke WA/IG Story.

---

## Stack

- **Frontend**: Vite + TypeScript + Tailwind CSS (vanilla, no React)
- **Backend**: Supabase (Postgres + Auth + Storage)
- **Hosting**: Vercel (auto-deploy via GitHub: `buattugaspbo/twibbon`)
- **Repo**: https://github.com/buattugaspbo/twibbon
- **Live**: https://pkkmbti.vercel.app

---

## Setup Supabase (sekali)

### 1. Database & Storage

Buka Supabase Dashboard → SQL Editor → New query → paste seluruh isi [`supabase-setup.sql`](./supabase-setup.sql) → Run.

- Bikin 5 tabel `twibbon_*`
- Bikin storage bucket `twibbon-assets` (public, max 5 MB)
- Set RLS policies
- Seed settings + S&K default

### 2. Refactor Kelompok (100 Slot Kosong)

Buka SQL Editor → paste isi [`supabase-refactor-kelompok.sql`](./supabase-refactor-kelompok.sql) → Run.

- Hapus 66 anggota lama (pindah ke history)
- Bikin 100 slot kosong: 20 kelompok × 5 anggota
- Kelompok 1: posisi 1-5, Kelompok 2: posisi 6-10, dst
- Admin bisa isi/edit manual via admin panel

### 3. Admin User

Buka Supabase Dashboard → **Authentication** → **Users** → **Add user**:
- Email: `asepcontoh@gmail.com`
- Password: `hmtiadmin911`
- Auto-confirm email: **YES** (centang)
- Save

### 4. Upload Bahan Twibbon & Video

Admin login → Tab **Files** → Upload:
- **Bingkai twibbon**: pilih `public/frame-video-intro.png` (7 MB)
- **Video intro**: upload manual file video lo (dari zip)
- Atau tambahin link eksternal: https://twb.nz/teknologinformasi26

---

## Environment Variables

Copy-paste ke **Vercel Project Settings → Environment Variables**:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://vmehxcbrdlkcbgpwomzw.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZWh4Y2JyZGxrY2JncHdvbXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU1Mjg2MDUsImV4cCI6MjA0MTEwNDYwNX0.c-2vgoYE2DnOHWWmO7lQCNn6YLLxH0_u2Xl-egXsSR0` |

⚠️ **Environment**: centang **Production, Preview, Development** (semua) untuk kedua variable.

Setelah Save → **Deployments** → Redeploy deployment terakhir.

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
| `/` | Landing — hero, deadline countdown, S&K, bingkai download, progress bar, 100 slot anggota (20 kelompok), gallery IG-style |
| `/submit.html` | Form submit: Nama + NIM + link IG + screenshot upload |
| `/admin/` | Dashboard admin (magic link `asepcontoh@gmail.com` / `hmtiadmin911`): approval queue, CRUD anggota (100 slot), CRUD files, settings (deadline, target, video), S&K editor |

---

## Workflow Admin

1. Login `/admin/` → email `asepcontoh@gmail.com` → masuk dashboard
2. Tab **Pending** → Approve/Reject submission masuk
3. Tab **Anggota** → isi 100 slot kosong (wajib Nama + NIM), edit/hapus manual. History auto-log.
4. Tab **Files** → upload bingkai baru, atau link eksternal https://twb.nz/teknologinformasi26
5. Tab **Settings** → ubah deadline (label + tanggal), target peserta (default 66), video URL
6. Tab **S&K** → edit Markdown live preview

---

## Workflow Peserta

1. Buka web → klik **Submit**
2. Isi **Nama + NIM** (wajib 8-10 digit angka)
3. Download bingkai dari section **Bahan Twibbon** → edit pakai foto → post ke IG
4. Submit: link post IG + screenshot + centang S&K
5. Tunggu approval admin → muncul di gallery

---

## Struktur Kelompok

**20 kelompok × 5 anggota = 100 slot**

| Kelompok | Posisi (NIM urutan) |
|---|---|
| 1 | 1-5 |
| 2 | 6-10 |
| 3 | 11-15 |
| ... | ... |
| 20 | 96-100 |

Admin isi manual via panel admin. Semua perubahan tercatat di tab **History** (siapa, kapan, apa yang diubah).

---

## Bahan Twibbon

- **Link eksternal**: https://twb.nz/teknologinformasi26
- **File lokal**: `public/frame-video-intro.png` (7 MB) — upload manual via admin panel tab Files
- **Video perkenalan**: upload manual ZIP video lo via admin panel

---

## Schema

```
twibbon_settings           key-value: event_title, event_subtitle, target_count (default 66),
                                       video_url, deadline_at, deadline_label
twibbon_posts              submissions (NIM unique, status: pending/approved/rejected)
twibbon_files              bingkai + video metadata (file_kind: frame/video)
twibbon_terms              S&K Markdown (id=1)
twibbon_members            100 slot anggota (20 kelompok × 5 anggota, diisi manual)
twibbon_member_history     audit log (action: created/updated/deleted, old_data, new_data)

storage: twibbon-assets/ (public)
  screenshots/<nim>-<ts>.<ext>     participant upload
  frames/<filename>                  admin upload
  video/<filename>                   admin upload
```

---

## Branding

- **Palette**: UMP kuning `#F5C518` × TI cyan `#0EA5E9`
- **Font**: Inter (body) + Plus Jakarta Sans (display) + JetBrains Mono (code)
- **Logo**: HMTI + UMP di navbar (favicon: logo HMTI)
- **Hero background**: custom SVG grid pattern (bukan template AI)

---

## Security

- **Honeypot** field anti-bot di submit form
- **NIM regex** validation client-side (8-10 digit)
- **Magic link** auth (no password bruteforce)
- **RLS** enforce: public read approved only, anon insert pending only, admin full access
- **HTML escape** all user-generated content (post URL, member name, notes)
- **Storage policy**: anon upload restricted to `screenshots/` folder only
- **Input size limit**: 5 MB screenshot (user), 20 MB files (admin)

---

## Admin Credentials

**Email**: `asepcontoh@gmail.com`  
**Password**: `hmtiadmin911`

⚠️ Ganti password via Supabase Dashboard → Authentication → Users → edit user → Reset password.

---

## Deploy ke Vercel

1. Push ke GitHub `buattugaspbo/twibbon` (udah auto-connect)
2. Vercel auto-detect Vite → auto-deploy setiap push `main`
3. Set env vars (lihat tabel di atas) → Redeploy
4. Live: https://pkkmbti.vercel.app

---

## Scripts

| Command | Fungsi |
|---|---|
| `npm run dev` | Dev server `localhost:5173` |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview build lokal |
| `npm run typecheck` | TypeScript check |

---

## Troubleshooting

**Q: Web stuck "Memuat..." / Console error 401 Unauthorized**  
A: Anon key salah. Buka Supabase → Settings → API → copy **anon public** (JWT panjang `eyJhbGci...`) → ganti di Vercel env vars → Redeploy.

**Q: Admin gak bisa login**  
A: User belum dibuat atau email belum confirmed. Buka Supabase → Authentication → Users → Add `asepcontoh@gmail.com` dengan password `hmtiadmin911` → centang Auto-confirm.

**Q: Kelompok masih 66 anggota, bukan 100 slot**  
A: Belum run migration. Buka SQL Editor → paste `supabase-refactor-kelompok.sql` → Run.

**Q: Favicon masih logo PT**  
A: Browser cache. Hard refresh (`Ctrl+Shift+R`) atau buka incognito.

---

## License

Internal — PKKMB FAKULTAS TEKNIK – TEKNOLOGI INFORMASI UMP 2026 · HIMTI.

---

**Created by bazzcreate** · https://bazzcreate.vercel.app