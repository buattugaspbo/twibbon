import './style.css';
import { marked } from 'marked';
import { supabase, publicUrl } from './lib/supabase';
import { toast, escapeHtml } from './lib/ui';
import { buildWhatsAppUrl, shareOrCopy } from './lib/share';
import { getIdentity, setIdentity } from './lib/identity';
import { getCountdown, formatCountdown } from './lib/deadline';
import type {
  TwibbonPost,
  TwibbonFile,
  TwibbonMember,
  SettingsMap,
  Identity,
} from './types';

const PAGE_SIZE = 24;

const NIM_REGEX = /^\d{8,10}$/;

interface Els {
  identityModal: HTMLElement;
  identityForm: HTMLFormElement;
  identityName: HTMLInputElement;
  identityNim: HTMLInputElement;
  identityChip: HTMLElement;
  identityChipText: HTMLElement;
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
  identityModal: document.querySelector<HTMLElement>('#identity-modal')!,
  identityForm: document.querySelector<HTMLFormElement>('#identity-form')!,
  identityName: document.querySelector<HTMLInputElement>('#identity-name')!,
  identityNim: document.querySelector<HTMLInputElement>('#identity-nim')!,
  identityChip: document.querySelector<HTMLElement>('#identity-chip')!,
  identityChipText: document.querySelector<HTMLElement>('#identity-chip-text')!,
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

function showIdentityModal(): void {
  els.identityModal.classList.remove('hidden');
  setTimeout(() => els.identityName.focus(), 100);
}

function hideIdentityModal(): void {
  els.identityModal.classList.add('hidden');
}

function renderIdentityChip(identity: Identity): void {
  els.identityChipText.textContent = `${identity.name.split(' ')[0]} · ${identity.nim}`;
  els.identityChip.classList.remove('hidden');
}

function setFieldError(input: HTMLInputElement, msg: string | null): void {
  const key = input.id === 'identity-name' ? 'identity-name' : 'identity-nim';
  const errorEl = document.querySelector<HTMLElement>(`.field-error[data-for="${key}"]`);
  if (errorEl) errorEl.textContent = msg ?? '';
  if (msg) input.classList.add('border-red-500');
  else input.classList.remove('border-red-500');
}

function handleIdentitySubmit(e: Event): void {
  e.preventDefault();
  const name = els.identityName.value.trim();
  const nim = els.identityNim.value.trim();
  let ok = true;
  if (name.length < 3) {
    setFieldError(els.identityName, 'Nama minimal 3 karakter.');
    ok = false;
  } else {
    setFieldError(els.identityName, null);
  }
  if (!NIM_REGEX.test(nim)) {
    setFieldError(els.identityNim, 'NIM harus 8–10 digit angka.');
    ok = false;
  } else {
    setFieldError(els.identityNim, null);
  }
  if (!ok) return;
  const identity: Identity = { name, nim };
  setIdentity(identity);
  renderIdentityChip(identity);
  hideIdentityModal();
  toast(`Halo ${name.split(' ')[0]}! 👋`, 'success', 3000);
}

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
  const { data, error } = await supabase
    .from('twibbon_members')
    .select('*')
    .order('group_number', { ascending: true })
    .order('position', { ascending: true });
  if (error) {
    console.error('[loadMembers]', error);
    els.membersGrid.innerHTML = '<p class="text-gray-500 italic">Gagal memuat daftar anggota.</p>';
    return;
  }
  if (!data || data.length === 0) {
    els.membersGrid.innerHTML = '<p class="text-gray-500 italic col-span-full">Belum ada anggota terdaftar.</p>';
    return;
  }
  els.membersGrid.innerHTML = data
    .map(
      (m: TwibbonMember) => `
      <div class="member-card">
        <div class="member-num">${m.group_number ?? '?'}</div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm truncate" title="${escapeHtml(m.name)}">${escapeHtml(m.name)}</p>
          <p class="member-nim">Kelompok ${m.group_number ?? '?'}${m.nim ? ` · ${escapeHtml(m.nim)}` : ''}</p>
        </div>
      </div>
    `,
    )
    .join('');
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
          <span class="text-xs font-semibold uppercase tracking-wide relative z-10">PKKMB TI</span>
          <span class="text-xs font-mono relative z-10">${escapeHtml(p.nim)}</span>
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
  }
}

function bootstrapIdentity(): void {
  const existing = getIdentity();
  if (existing) {
    renderIdentityChip(existing);
    hideIdentityModal();
  } else {
    showIdentityModal();
  }
  els.identityForm.addEventListener('submit', handleIdentitySubmit);
}

async function main(): Promise<void> {
  setupMobileMenu();
  checkSubmittedFlag();
  bootstrapIdentity();
  await Promise.all([
    loadSettings(),
    loadTerms(),
    loadFrames(),
    loadProgress(),
    loadFeed(),
    loadMembers(),
  ]);
  renderDeadline();
  setupShareButtons();
  setupInfiniteScroll();
}

main().catch(err => {
  console.error(err);
  toast('Gagal memuat halaman. Cek koneksi & refresh.', 'error', 6000);
});