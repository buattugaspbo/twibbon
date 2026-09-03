import './style.css';
import { marked } from 'marked';
import { supabase, publicUrl } from './lib/supabase';
import { toast, escapeHtml } from './lib/ui';
import { buildWhatsAppUrl, shareOrCopy } from './lib/share';
import { getCountdown, formatCountdown } from './lib/deadline';
import type {
  TwibbonPost,
  TwibbonFile,
  TwibbonMember,
  SettingsMap,
} from './types';

const PAGE_SIZE = 24;

interface Els {
  eventTitle: HTMLElement;
  eventSubtitle: HTMLElement;
  terms: HTMLElement;
  framesGrid: HTMLElement;
  progressBar: HTMLElement;
  progressText: HTMLElement;
  deadlineCard: HTMLElement;
  deadlineLabel: HTMLElement;
  deadlineText: HTMLElement;
  deadlineAbsolute: HTMLElement;
  countdown: HTMLElement;
  membersGrid: HTMLElement;
  feed: HTMLElement;
  feedEmpty: HTMLElement;
  shareWa: HTMLAnchorElement;
  shareCopy: HTMLButtonElement;
  shareIg: HTMLAnchorElement;
  mobileMenuBtn: HTMLButtonElement;
  mobileMenu: HTMLElement;
}

const els: Els = {
  eventTitle: document.querySelector<HTMLElement>('#event-title')!,
  eventSubtitle: document.querySelector<HTMLElement>('#event-subtitle')!,
  terms: document.querySelector<HTMLElement>('#terms-content')!,
  framesGrid: document.querySelector<HTMLElement>('#frames-grid')!,
  progressBar: document.querySelector<HTMLElement>('#progress-bar')!,
  progressText: document.querySelector<HTMLElement>('#progress-text')!,
  deadlineCard: document.querySelector<HTMLElement>('#deadline-card')!,
  deadlineLabel: document.querySelector<HTMLElement>('#deadline-label')!,
  deadlineText: document.querySelector<HTMLElement>('#deadline-text')!,
  deadlineAbsolute: document.querySelector<HTMLElement>('#deadline-absolute')!,
  countdown: document.querySelector<HTMLElement>('#countdown')!,
  membersGrid: document.querySelector<HTMLElement>('#members-grid')!,
  feed: document.querySelector<HTMLElement>('#feed')!,
  feedEmpty: document.querySelector<HTMLElement>('#feed-empty')!,
  shareWa: document.querySelector<HTMLAnchorElement>('#share-wa')!,
  shareCopy: document.querySelector<HTMLButtonElement>('#share-copy')!,
  shareIg: document.querySelector<HTMLAnchorElement>('#share-ig')!,
  mobileMenuBtn: document.querySelector<HTMLButtonElement>('#mobile-menu-btn')!,
  mobileMenu: document.querySelector<HTMLElement>('#mobile-menu')!,
};

let allLoadedPosts: TwibbonPost[] = [];
let renderedCount = 0;
const settingsCache: Partial<SettingsMap> = {};

async function loadSettings(): Promise<void> {
  const { data, error } = await supabase
    .from('twibbon_settings')
    .select('key, value');
  if (error) {
    console.error('[loadSettings]', error);
    return;
  }
  for (const row of data ?? []) {
    (settingsCache as Record<string, unknown>)[row.key] = row.value;
  }
  if (els.eventTitle && settingsCache.event_title) {
    els.eventTitle.textContent = String(settingsCache.event_title);
  }
  if (els.eventSubtitle && settingsCache.event_subtitle) {
    els.eventSubtitle.textContent = String(settingsCache.event_subtitle);
  }
}

async function loadTerms(): Promise<void> {
  const { data, error } = await supabase
    .from('twibbon_terms')
    .select('body_md')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    console.error('[loadTerms]', error);
    return;
  }
  if (data && els.terms) {
    els.terms.innerHTML = await marked.parse(data.body_md, { async: true });
  }
}

async function loadFrames(): Promise<void> {
  const { data, error } = await supabase
    .from('twibbon_files')
    .select('*')
    .eq('file_kind', 'frame')
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('[loadFrames]', error);
    els.framesGrid.innerHTML = '<p class="text-gray-500 italic">Gagal memuat bingkai.</p>';
    return;
  }
  if (!data || data.length === 0) {
    els.framesGrid.innerHTML =
      '<p class="text-gray-500 italic col-span-full">Belum ada bingkai. Panitia akan upload segera.</p>';
    return;
  }
  els.framesGrid.innerHTML = data
    .map(
      (f: TwibbonFile) => `
      <a href="${escapeHtml(publicUrl(f.storage_path))}" download class="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
        <div class="aspect-square overflow-hidden bg-gray-100">
          <img src="${escapeHtml(publicUrl(f.storage_path))}" alt="${escapeHtml(f.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
        </div>
        <div class="p-3 flex items-center justify-between">
          <span class="font-medium text-sm">${escapeHtml(f.title)}</span>
          <span class="text-ti-cyan text-sm font-semibold">Download ↓</span>
        </div>
      </a>
    `,
    )
    .join('');
}

async function loadProgress(): Promise<void> {
  const target = Number(settingsCache.target_count ?? 0);
  const { count, error } = await supabase
    .from('twibbon_posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');
  if (error) {
    console.error('[loadProgress]', error);
    return;
  }
  const approved = count ?? 0;
  const pct = target > 0 ? Math.min(100, Math.round((approved / target) * 100)) : 0;
  els.progressBar.style.width = `${pct}%`;
  els.progressText.textContent =
    target > 0
      ? `${approved} dari ${target} target · ${pct}%`
      : `${approved} twibbon terkumpul`;
}

function renderDeadline(): void {
  const label = String(settingsCache.deadline_label ?? 'Batas submit');
  const at_ = settingsCache.deadline_at;
  const iso = typeof at_ === 'string' && at_.length > 0 ? at_ : null;

  els.deadlineLabel.textContent = label.toUpperCase();
  if (!iso) {
    els.deadlineText.textContent = 'Belum ada deadline yang ditetapkan.';
    els.deadlineAbsolute.textContent = '';
    els.countdown.innerHTML =
      '<span class="text-sm text-gray-400">— : — : — : —</span>';
    return;
  }
  const target = new Date(iso);
  els.deadlineAbsolute.textContent = target.toLocaleString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const update = () => {
    const c = getCountdown(iso);
    if (!c) return;
    if (c.isExpired) {
      els.deadlineCard.classList.add('expired');
      els.deadlineText.textContent = 'Batas waktu sudah lewat. Hubungi panitia kalau masih mau submit.';
      els.countdown.innerHTML = '<span class="text-sm font-semibold text-red-600">Lewat</span>';
      return;
    }
    els.deadlineCard.classList.remove('expired');
    els.deadlineText.textContent = `Sisa waktu ${formatCountdown(c)}`;
    const spans = els.countdown.querySelectorAll<HTMLElement>('[data-cd]');
    spans.forEach(s => {
      const key = s.dataset.cd as keyof typeof c;
      s.textContent = String(c[key]).padStart(2, '0');
    });
  };
  update();
  setInterval(update, 1000);
}

async function loadMembers(): Promise<void> {
  const list = els.membersGrid;
  list.innerHTML = '<p class="text-gray-500">Loading...</p>';
  const { data, error } = await supabase
    .from('twibbon_members')
    .select('*')
    .order('position', { ascending: true });
  if (error) {
    list.innerHTML = `<p class="text-red-500">Error: ${escapeHtml(error.message)}</p>`;
    return;
  }
  if (!data || data.length === 0) {
    list.innerHTML = '<p class="text-gray-500 italic col-span-full">Belum ada anggota terdaftar.</p>';
    return;
  }

  // Group by kelompok (6 anggota per kelompok)
  const grouped = data.reduce((acc, m) => {
    const g = m.group_number ?? 0;
    if (!acc[g]) acc[g] = [];
    acc[g].push(m);
    return acc;
  }, {} as Record<number, typeof data>);

  const groupNumbers = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  list.innerHTML = groupNumbers
    .map(gNum => {
      const members = grouped[gNum];
      const filled = members.filter((m: TwibbonMember) => m.nim && m.nim.trim().length > 0);
      return `
        <div class="col-span-full">
          <h3 class="font-display font-bold text-lg mb-3 flex items-center gap-2">
            <span class="w-8 h-8 rounded-lg bg-ti-cyan text-white flex items-center justify-center text-sm">${gNum}</span>
            <span>Kelompok ${gNum}</span>
            <span class="text-sm font-normal text-gray-500">(${filled.length}/6 terisi)</span>
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            ${members
              .map(
                (m: TwibbonMember) => `
              <div class="member-card cursor-pointer hover:border-ti-cyan transition-colors" data-member-id="${m.id}">
                <div class="member-num">${m.position ?? '?'}</div>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-sm truncate" title="${escapeHtml(m.name)}">${escapeHtml(m.name)}</p>
                  <p class="member-nim">${m.nim ? escapeHtml(m.nim) : 'NIM belum diisi'}</p>
                </div>
              </div>
            `,
              )
              .join('')}
          </div>
        </div>
      `;
    })
    .join('');

  // Setup click handlers untuk modal edit (public bisa isi)
  list.querySelectorAll<HTMLElement>('.member-card').forEach(card => {
    card.addEventListener('click', () => {
      const memberId = card.dataset.memberId;
      if (memberId) showMemberEditModal(memberId, data);
    });
  });
}

function showMemberEditModal(memberId: string, allMembers: TwibbonMember[]): void {
  const member = allMembers.find(m => m.id === memberId);
  if (!member) return;

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-card max-w-md">
      <h3 class="font-display text-xl font-bold mb-4">Edit Anggota Kelompok ${member.group_number} · Posisi ${member.position}</h3>
      <form id="member-edit-form" class="space-y-4">
        <div>
          <label class="block font-medium mb-1">Nama Lengkap *</label>
          <input type="text" id="edit-name" value="${escapeHtml(member.name === '(Belum diisi)' ? '' : member.name)}" required class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-ti-cyan focus:ring-2 focus:ring-ti-cyan/20 outline-none" placeholder="Nama lengkap" />
        </div>
        <div>
          <label class="block font-medium mb-1">NIM * <span class="text-xs text-gray-500">(format: 162026001)</span></label>
          <input type="text" id="edit-nim" value="${escapeHtml(member.nim ?? '')}" required pattern="162026\\d{3}" inputmode="numeric" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-ti-cyan focus:ring-2 focus:ring-ti-cyan/20 outline-none font-mono" placeholder="162026001" />
          <p class="text-xs text-gray-500 mt-1">9 digit, prefix 162026</p>
        </div>
        <div class="flex gap-2">
          <button type="submit" class="btn-primary flex-1">Simpan</button>
          <button type="button" class="btn-secondary" id="cancel-edit">Batal</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.remove();
  });
  modal.querySelector('#cancel-edit')?.addEventListener('click', () => modal.remove());

  const form = modal.querySelector<HTMLFormElement>('#member-edit-form')!;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = (modal.querySelector('#edit-name') as HTMLInputElement).value.trim();
    const nim = (modal.querySelector('#edit-nim') as HTMLInputElement).value.trim();
    if (!name || !nim) return;

    const { error } = await supabase
      .from('twibbon_members')
      .update({ name, nim, updated_at: new Date().toISOString(), updated_by: 'public' })
      .eq('id', memberId);

    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast('Anggota berhasil diperbarui!', 'success');
    modal.remove();
    loadMembers();
  });
}

// Render Twibbon Section
function renderTwibbonSection(): void {
  const deadlineAt = settingsCache.deadline_at;
  const deadlineText = document.getElementById('twibbon-deadline-text');
  const deadlineAbsolute = document.getElementById('twibbon-deadline-absolute');
  const countdown = document.getElementById('twibbon-countdown');

  if (!deadlineText || !deadlineAbsolute || !countdown) return;

  if (!deadlineAt || deadlineAt === 'null') {
    deadlineText.textContent = 'Belum ditetapkan';
    deadlineAbsolute.textContent = '';
    countdown.innerHTML = '<span class="text-sm text-gray-400">— : — : — : —</span>';
  } else {
    const target = new Date(String(deadlineAt));
    deadlineAbsolute.textContent = target.toLocaleString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const update = () => {
      const c = getCountdown(String(deadlineAt));
      if (!c) return;
      if (c.isExpired) {
        deadlineText.textContent = 'Sudah lewat';
        countdown.innerHTML = '<span class="text-sm font-semibold text-red-600">Lewat</span>';
      } else {
        deadlineText.textContent = `Sisa ${formatCountdown(c)}`;
        const spans = countdown.querySelectorAll<HTMLElement>('[data-cd]');
        spans.forEach(s => {
          const key = s.dataset.cd as 'days' | 'hours' | 'minutes' | 'seconds';
          s.textContent = String(c[key]).padStart(2, '0');
        });
      }
    };
    update();
    setInterval(update, 1000);
  }
  loadTwibbonMaterials();
  loadTwibbonRequirements();
}

async function loadTwibbonMaterials(): Promise<void> {
  const container = document.getElementById('twibbon-materials');
  if (!container) return;
  const { data } = await supabase
    .from('twibbon_files')
    .select('*')
    .eq('file_kind', 'frame')
    .order('sort_order', { ascending: true });

  if (!data || data.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-sm">Belum ada bahan twibbon.</p>';
    return;
  }

  container.innerHTML = data
    .map(f => {
      const isLink = f.storage_path.startsWith('http');
      const url = isLink ? f.storage_path : publicUrl(f.storage_path);
      return `
        <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-ti-cyan hover:bg-ti-cyan/5 transition-colors">
          <span class="text-2xl">${isLink ? '🔗' : '🖼️'}</span>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-sm truncate">${escapeHtml(f.title)}</p>
            <p class="text-xs text-gray-500">${isLink ? 'Link Eksternal' : 'Download'}</p>
          </div>
        </a>
      `;
    })
    .join('');
}

function loadTwibbonRequirements(): void {
  const container = document.getElementById('twibbon-requirements');
  if (!container) return;
  const reqMd = `### Template Caption:
\`\`\`
✨ [𝐏𝐊𝐊𝐌𝐁 𝐈𝐓 𝟐𝟔] ✨
Halo semuanya! 👋🏻
Perkenalkan, saya [Nama Lengkap], biasa dipanggil [Nama Panggilan].
#PKKMBUMPalembang #TeknologiInformasiUMP
\`\`\`

### Ketentuan:
- Post twibbon di Instagram/TikTok
- Mention 5 akun teman
- Tag @teknologiump & @hmti_ump
- Akun tidak boleh privat`;
  container.innerHTML = String(marked.parse(reqMd));
}

// Render Video Section
function renderVideoSection(): void {
  const deadlineAt = settingsCache.deadline_video_at;
  const deadlineText = document.getElementById('video-deadline-text');
  const deadlineAbsolute = document.getElementById('video-deadline-absolute');
  const countdown = document.getElementById('video-countdown');

  if (!deadlineText || !deadlineAbsolute || !countdown) return;

  if (!deadlineAt || deadlineAt === 'null') {
    deadlineText.textContent = 'Akan diinfokan kemudian';
    deadlineAbsolute.textContent = '';
    countdown.innerHTML = '<span class="text-sm text-gray-400">— : — : — : —</span>';
  } else {
    const target = new Date(String(deadlineAt));
    deadlineAbsolute.textContent = target.toLocaleString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const update = () => {
      const c = getCountdown(String(deadlineAt));
      if (!c) return;
      if (c.isExpired) {
        deadlineText.textContent = 'Sudah lewat';
        countdown.innerHTML = '<span class="text-sm font-semibold text-red-600">Lewat</span>';
      } else {
        deadlineText.textContent = `Sisa ${formatCountdown(c)}`;
        const spans = countdown.querySelectorAll<HTMLElement>('[data-cd]');
        spans.forEach(s => {
          const key = s.dataset.cd as 'days' | 'hours' | 'minutes' | 'seconds';
          s.textContent = String(c[key]).padStart(2, '0');
        });
      }
    };
    update();
    setInterval(update, 1000);
  }
  loadVideoRequirements();
}

function loadVideoRequirements(): void {
  const container = document.getElementById('video-requirements');
  if (!container) return;
  const reqMd = String(settingsCache.video_requirements_md || `### Ketentuan Video:
1. Tugas individu
2. Durasi: 3-5 menit
3. Pakaian formal (kemeja putih)
4. Mention @hmti_ump & @teknologiump
5. Hashtag: #UMPalembang #TeknologiInformasi`);
  container.innerHTML = String(marked.parse(reqMd));
}

async function loadFeed(): Promise<void> {
  const { data, error } = await supabase
    .from('twibbon_posts')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) {
    console.error('[loadFeed]', error);
    return;
  }
  allLoadedPosts = data ?? [];
  renderedCount = 0;
  els.feed.innerHTML = '';
  if (allLoadedPosts.length === 0) {
    els.feedEmpty.classList.remove('hidden');
    return;
  }
  els.feedEmpty.classList.add('hidden');
  renderFeedPage();
}

function renderFeedPage(): void {
  const next = allLoadedPosts.slice(renderedCount, renderedCount + PAGE_SIZE);
  if (next.length === 0) return;
  const html = next
    .map(
      p => `
      <a href="${escapeHtml(p.ig_url)}" target="_blank" rel="noopener noreferrer" class="tile group" aria-label="Lihat di Instagram">
        <img src="${escapeHtml(publicUrl(p.screenshot_path))}" alt="Twibbon ${escapeHtml(p.nim)}" loading="lazy" />
        <div class="overlay">
          <span class="text-sm font-semibold truncate">${escapeHtml(p.name || 'Peserta PKKMB')}</span>
          <span class="text-xs font-mono text-gray-500">${escapeHtml(p.nim)}</span>
        </div>
      </a>
    `,
    )
    .join('');
  els.feed.insertAdjacentHTML('beforeend', html);
  renderedCount += next.length;
}

function setupInfiniteScroll(): void {
  let loading = false;
  window.addEventListener('scroll', () => {
    if (loading) return;
    if (renderedCount >= allLoadedPosts.length) return;
    const scrolled = window.innerHeight + window.scrollY;
    const threshold = document.body.offsetHeight - 400;
    if (scrolled >= threshold) {
      loading = true;
      renderFeedPage();
      setTimeout(() => {
        loading = false;
      }, 100);
    }
  });
}

function setupShareButtons(): void {
  const url = window.location.origin + window.location.pathname;
  const text = 'Cek twibbon & video perkenalan peserta PKKMB TI UMP 2026!';
  const title = settingsCache.event_title
    ? String(settingsCache.event_title)
    : 'PKKMB TI UMP';
  const payload = { url, text, title };
  els.shareWa.href = buildWhatsAppUrl(payload);
  els.shareWa.target = '_blank';
  els.shareWa.rel = 'noopener noreferrer';
  els.shareCopy.addEventListener('click', async () => {
    const ok = await shareOrCopy(payload);
    toast(ok ? 'Link disalin!' : 'Gagal menyalin link', ok ? 'success' : 'error');
  });
  els.shareIg.href = 'https://www.instagram.com/teknologiump/';
  els.shareIg.target = '_blank';
  els.shareIg.rel = 'noopener noreferrer';
}

function setupMobileMenu(): void {
  if (!els.mobileMenuBtn || !els.mobileMenu) return;
  els.mobileMenuBtn.addEventListener('click', () => {
    els.mobileMenu.classList.toggle('hidden');
  });
  els.mobileMenu.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => els.mobileMenu.classList.add('hidden')),
  );
}

function checkSubmittedFlag(): void {
  const params = new URLSearchParams(window.location.search);
  if (params.get('submitted') === '1') {
    toast('Sukses! Twibbon kamu akan muncul setelah disetujui panitia.', 'success', 6000);
    window.history.replaceState({}, '', window.location.pathname);
    setTimeout(() => {
      document.getElementById('feed')?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  } else if (params.get('rejected') === '1') {
    const reason = params.get('reason') || 'Twibbon kamu ditolak admin. Cek catatan atau hubungi panitia.';
    toast(decodeURIComponent(reason), 'error', 8000);
    window.history.replaceState({}, '', window.location.pathname);
  }
}

async function main(): Promise<void> {
  setupMobileMenu();
  checkSubmittedFlag();
  await Promise.all([
    loadSettings(),
    loadTerms(),
    loadFrames(),
    loadProgress(),
    loadFeed(),
    loadMembers(),
  ]);
  renderDeadline();
  renderTwibbonSection();
  renderVideoSection();
  setupShareButtons();
  setupInfiniteScroll();
}

main().catch(err => {
  console.error(err);
  toast('Gagal memuat halaman. Cek koneksi & refresh.', 'error', 6000);
});