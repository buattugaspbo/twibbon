import './style.css';
import { marked } from 'marked';
import { supabase, STORAGE_BUCKET, publicUrl } from './lib/supabase';
import { toast, formatDate, escapeHtml } from './lib/ui';
import type {
  TwibbonPost,
  TwibbonFile,
  TwibbonMember,
  TwibbonMemberHistory,
} from './types';

const authGate = document.querySelector<HTMLElement>('#auth-gate')!;
const dashboard = document.querySelector<HTMLElement>('#dashboard')!;
const loginForm = document.querySelector<HTMLFormElement>('#login-form')!;
const loginEmail = document.querySelector<HTMLInputElement>('#login-email')!;
const logoutBtn = document.querySelector<HTMLButtonElement>('#logout-btn')!;
const adminEmailEl = document.querySelector<HTMLElement>('#admin-email')!;
const tabBtns = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
const tabPanels = document.querySelectorAll<HTMLElement>('[data-panel]');

// Members modal refs
const memberModal = document.querySelector<HTMLElement>('#member-modal')!;
const memberForm = document.querySelector<HTMLFormElement>('#member-form')!;
const memberModalTitle = document.querySelector<HTMLElement>('#member-modal-title')!;
const memberIdInput = document.querySelector<HTMLInputElement>('#member-id')!;
const memberPosInput = document.querySelector<HTMLInputElement>('#member-position')!;
const memberGroupInput = document.querySelector<HTMLInputElement>('#member-group')!;
const memberNimInput = document.querySelector<HTMLInputElement>('#member-nim')!;
const memberNameInput = document.querySelector<HTMLInputElement>('#member-name')!;
const memberNoteInput = document.querySelector<HTMLTextAreaElement>('#member-note')!;
const memberCancelBtn = document.querySelector<HTMLButtonElement>('#member-cancel')!;
const addMemberBtn = document.querySelector<HTMLButtonElement>('#add-member-btn')!;

function showDashboard(): void {
  authGate.classList.add('hidden');
  dashboard.classList.remove('hidden');
  logoutBtn?.classList.remove('hidden');
  supabase.auth.getSession().then(({ data }) => {
    if (data.session?.user?.email) {
      adminEmailEl.textContent = data.session.user.email;
    }
  });
  switchTab('pending');
}

function showAuthGate(): void {
  authGate.classList.remove('hidden');
  dashboard.classList.add('hidden');
  logoutBtn?.classList.add('hidden');
}

function switchTab(name: string): void {
  tabBtns.forEach(b => {
    if (b.dataset.tab === name) {
      b.classList.add('bg-ump-yellow', 'text-ink');
      b.classList.remove('bg-white', 'text-gray-700');
    } else {
      b.classList.remove('bg-ump-yellow', 'text-ink');
      b.classList.add('bg-white', 'text-gray-700');
    }
  });
  tabPanels.forEach(p => p.classList.toggle('hidden', p.dataset.panel !== name));
  if (name === 'pending') renderPending();
  else if (name === 'approved') renderApproved();
  else if (name === 'rejected') renderRejected();
  else if (name === 'members') renderMembers();
  else if (name === 'history') renderHistory();
  else if (name === 'files') renderFiles();
  else if (name === 'settings') renderSettings();
  else if (name === 'terms') renderTerms();
}

tabBtns.forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab!)));

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email = loginEmail.value.trim();
  if (!email) return;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin + '/admin/',
      shouldCreateUser: false,
    },
  });
  if (error) {
    toast(error.message, 'error', 6000);
  } else {
    toast('Cek email kamu untuk link login.', 'success', 8000);
  }
});

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  showAuthGate();
  toast('Logout berhasil.', 'info');
});

async function getCurrentAdminEmail(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.email ?? 'admin';
}

async function logMemberHistory(
  member: TwibbonMember | null,
  action: 'created' | 'updated' | 'deleted',
  oldData: Partial<TwibbonMember> | null,
  newData: Partial<TwibbonMember> | null,
  note: string | null,
): Promise<void> {
  const { error } = await supabase.from('twibbon_member_history').insert({
    member_id: member?.id ?? null,
    member_nim: member?.nim ?? oldData?.nim ?? null,
    member_name: member?.name ?? oldData?.name ?? null,
    action,
    old_data: oldData,
    new_data: newData,
    changed_by: await getCurrentAdminEmail(),
    changed_by_kind: 'admin',
    note,
  });
  if (error) console.error('[logMemberHistory]', error);
}

// ===== PENDING =====

async function renderPending(): Promise<void> {
  const list = document.querySelector<HTMLElement>('#pending-list')!;
  list.innerHTML = '<p class="text-gray-500">Loading...</p>';
  const { data, error } = await supabase
    .from('twibbon_posts')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) {
    list.innerHTML = `<p class="text-red-500">Error: ${escapeHtml(error.message)}</p>`;
    return;
  }
  if (!data || data.length === 0) {
    list.innerHTML = '<p class="text-gray-500 italic">Tidak ada submission pending.</p>';
    return;
  }
  list.innerHTML = data
    .map(
      (p: TwibbonPost) => `
      <div class="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row gap-4">
        <img src="${escapeHtml(publicUrl(p.screenshot_path))}" alt="" class="w-full sm:w-32 h-48 sm:h-32 object-cover rounded" />
        <div class="flex-1 min-w-0">
          <p class="font-mono text-sm text-gray-500">${escapeHtml(p.nim)}</p>
          <a href="${escapeHtml(p.ig_url)}" target="_blank" rel="noopener noreferrer" class="text-ti-cyan hover:underline text-sm block truncate">${escapeHtml(p.ig_url)}</a>
          <p class="text-xs text-gray-400 mt-1">${formatDate(p.created_at)}</p>
          <div class="flex gap-2 mt-3 flex-wrap">
            <button data-id="${p.id}" data-act="approve" class="btn-primary text-sm py-1.5 px-4">Approve</button>
            <button data-id="${p.id}" data-act="reject" class="btn-secondary text-sm py-1.5 px-4">Reject</button>
            <button data-id="${p.id}" data-act="delete" class="text-xs text-red-500 hover:underline self-center">Hapus</button>
          </div>
        </div>
      </div>
    `,
    )
    .join('');
  list.querySelectorAll<HTMLButtonElement>('button[data-act]').forEach(b => {
    b.addEventListener('click', () => handleAction(b.dataset.id!, b.dataset.act!));
  });
}

async function handleAction(id: string, act: string): Promise<void> {
  if (act === 'approve') {
    const { error } = await supabase
      .from('twibbon_posts')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast('Approved!', 'success');
    renderPending();
  } else if (act === 'reject') {
    const reason = prompt('Alasan reject (opsional)?');
    if (reason === null) return;
    const { error } = await supabase
      .from('twibbon_posts')
      .update({ status: 'rejected', reject_reason: reason || null })
      .eq('id', id);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast('Rejected.', 'info');
    renderPending();
  } else if (act === 'delete') {
    if (!confirm('Hapus submission ini permanen? (Screenshot di storage juga akan dihapus)')) return;
    const { data: row } = await supabase
      .from('twibbon_posts')
      .select('screenshot_path')
      .eq('id', id)
      .maybeSingle();
    if (row?.screenshot_path) {
      await supabase.storage.from(STORAGE_BUCKET).remove([row.screenshot_path]);
    }
    const { error } = await supabase.from('twibbon_posts').delete().eq('id', id);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast('Dihapus.', 'info');
    renderPending();
  } else if (act === 'unapprove') {
    const { error } = await supabase
      .from('twibbon_posts')
      .update({ status: 'pending', approved_at: null })
      .eq('id', id);
    if (error) toast(error.message, 'error');
    else {
      toast('Dikembalikan ke pending.', 'info');
      renderApproved();
    }
  }
}

async function renderApproved(): Promise<void> {
  const list = document.querySelector<HTMLElement>('#approved-list')!;
  list.innerHTML = '<p class="text-gray-500">Loading...</p>';
  const { data } = await supabase
    .from('twibbon_posts')
    .select('*')
    .eq('status', 'approved')
    .order('approved_at', { ascending: false });
  if (!data || data.length === 0) {
    list.innerHTML = '<p class="text-gray-500 italic">Belum ada yang di-approve.</p>';
    return;
  }
  list.innerHTML =
    `<p class="text-sm text-gray-500 mb-3">${data.length} post approved.</p>` +
    data
      .map(
        (p: TwibbonPost) => `
      <div class="bg-white rounded-lg shadow p-3 flex gap-3 items-center">
        <img src="${escapeHtml(publicUrl(p.screenshot_path))}" alt="" class="w-16 h-16 object-cover rounded" />
        <div class="flex-1 min-w-0">
          <p class="font-mono text-sm">${escapeHtml(p.nim)}</p>
          <p class="text-xs text-gray-400">${formatDate(p.approved_at ?? p.created_at)}</p>
        </div>
        <button data-id="${p.id}" data-act="unapprove" class="text-xs text-red-500 hover:underline whitespace-nowrap">Unapprove</button>
      </div>
    `,
      )
      .join('');
  list
    .querySelectorAll<HTMLButtonElement>('button[data-act="unapprove"]')
    .forEach(b => b.addEventListener('click', () => handleAction(b.dataset.id!, 'unapprove')));
}

async function renderRejected(): Promise<void> {
  const list = document.querySelector<HTMLElement>('#rejected-list')!;
  list.innerHTML = '<p class="text-gray-500">Loading...</p>';
  const { data } = await supabase
    .from('twibbon_posts')
    .select('*')
    .eq('status', 'rejected')
    .order('created_at', { ascending: false });
  if (!data || data.length === 0) {
    list.innerHTML = '<p class="text-gray-500 italic">Tidak ada yang di-reject.</p>';
    return;
  }
  list.innerHTML = data
    .map(
      (p: TwibbonPost) => `
      <div class="bg-white rounded-lg shadow p-3">
        <div class="flex gap-3 items-center">
          <img src="${escapeHtml(publicUrl(p.screenshot_path))}" alt="" class="w-12 h-12 object-cover rounded" />
          <div class="flex-1 min-w-0">
            <p class="font-mono text-sm">${escapeHtml(p.nim)}</p>
            <p class="text-xs text-gray-400">${formatDate(p.created_at)}</p>
          </div>
        </div>
        ${p.reject_reason ? `<p class="text-xs text-red-500 mt-2">Alasan: ${escapeHtml(p.reject_reason)}</p>` : ''}
      </div>
    `,
    )
    .join('');
}

// ===== MEMBERS =====

function openMemberModal(member: TwibbonMember | null): void {
  memberIdInput.value = member?.id ?? '';
  memberPosInput.value = member?.position != null ? String(member.position) : '';
  memberGroupInput.value = member?.group_number != null ? String(member.group_number) : '';
  memberNimInput.value = member?.nim ?? '';
  memberNameInput.value = member?.name ?? '';
  memberNoteInput.value = '';
  memberModalTitle.textContent = member ? 'Edit Anggota' : 'Tambah Anggota';
  memberModal.classList.remove('hidden');
  setTimeout(() => memberNameInput.focus(), 100);
}

function closeMemberModal(): void {
  memberModal.classList.add('hidden');
  memberForm.reset();
  memberIdInput.value = '';
}

addMemberBtn?.addEventListener('click', () => openMemberModal(null));
memberCancelBtn?.addEventListener('click', closeMemberModal);
memberModal?.addEventListener('click', e => {
  if (e.target === memberModal) closeMemberModal();
});

memberForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const id = memberIdInput.value;
  const name = memberNameInput.value.trim();
  if (!name) {
    toast('Nama wajib diisi.', 'error');
    return;
  }
  const payload = {
    position: memberPosInput.value ? Number(memberPosInput.value) : null,
    group_number: memberGroupInput.value ? Number(memberGroupInput.value) : null,
    nim: memberNimInput.value.trim() || null,
    name,
    updated_at: new Date().toISOString(),
    updated_by: await getCurrentAdminEmail(),
  };
  const note = memberNoteInput.value.trim() || null;

  if (id) {
    const { data: old } = await supabase
      .from('twibbon_members')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    const { error } = await supabase
      .from('twibbon_members')
      .update(payload)
      .eq('id', id);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    if (old) await logMemberHistory(old, 'updated', old, payload, note);
    toast('Anggota diperbarui.', 'success');
  } else {
    const { data: created, error } = await supabase
      .from('twibbon_members')
      .insert({ ...payload, created_by: await getCurrentAdminEmail() })
      .select('*')
      .single();
    if (error) {
      toast(error.message, 'error');
      return;
    }
    if (created) await logMemberHistory(created, 'created', null, created, note);
    toast('Anggota ditambahkan.', 'success');
  }
  closeMemberModal();
  renderMembers();
});

async function renderMembers(): Promise<void> {
  const list = document.querySelector<HTMLElement>('#members-list')!;
  list.innerHTML = '<p class="text-gray-500">Loading...</p>';
  const { data, error } = await supabase
    .from('twibbon_members')
    .select('*')
    .order('group_number', { ascending: true })
    .order('position', { ascending: true });
  if (error) {
    list.innerHTML = `<p class="text-red-500">Error: ${escapeHtml(error.message)}</p>`;
    return;
  }
  if (!data || data.length === 0) {
    list.innerHTML = '<p class="text-gray-500 italic">Belum ada anggota. Klik + Tambah.</p>';
    return;
  }
  list.innerHTML =
    `<p class="text-sm text-gray-500 mb-3">${data.length} anggota terdaftar.</p>` +
    data
      .map(
        (m: TwibbonMember) => `
      <div class="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
        <div class="w-9 h-9 rounded-full ump-gradient text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
          ${m.group_number ?? '?'}
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm truncate">${escapeHtml(m.name)}</p>
          <p class="text-xs text-gray-500">Kelompok ${m.group_number ?? '?'}${m.position ? ` · Posisi ${m.position}` : ''}${m.nim ? ` · NIM <span class="font-mono">${escapeHtml(m.nim)}</span>` : ''}</p>
          ${m.updated_by ? `<p class="text-[10px] text-gray-400 mt-0.5">Update terakhir: ${escapeHtml(m.updated_by)} · ${formatDate(m.updated_at)}</p>` : ''}
        </div>
        <button data-id="${m.id}" data-act="edit-member" class="text-xs text-ti-cyan hover:underline whitespace-nowrap">Edit</button>
        <button data-id="${m.id}" data-act="delete-member" class="text-xs text-red-500 hover:underline whitespace-nowrap">Hapus</button>
      </div>
    `,
      )
      .join('');

  list
    .querySelectorAll<HTMLButtonElement>('button[data-act="edit-member"]')
    .forEach(b => {
      b.addEventListener('click', () => {
        const m = data.find(x => x.id === b.dataset.id);
        if (m) openMemberModal(m);
      });
    });
  list
    .querySelectorAll<HTMLButtonElement>('button[data-act="delete-member"]')
    .forEach(b => {
      b.addEventListener('click', async () => {
        const m = data.find(x => x.id === b.dataset.id);
        if (!m) return;
        if (!confirm(`Hapus anggota ${m.name}?`)) return;
        const { error } = await supabase.from('twibbon_members').delete().eq('id', m.id);
        if (error) {
          toast(error.message, 'error');
          return;
        }
        await logMemberHistory(m, 'deleted', m, null, null);
        toast('Dihapus.', 'info');
        renderMembers();
      });
    });
}

async function renderHistory(): Promise<void> {
  const list = document.querySelector<HTMLElement>('#history-list')!;
  list.innerHTML = '<p class="text-gray-500">Loading...</p>';
  const { data, error } = await supabase
    .from('twibbon_member_history')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(100);
  if (error) {
    list.innerHTML = `<p class="text-red-500">Error: ${escapeHtml(error.message)}</p>`;
    return;
  }
  if (!data || data.length === 0) {
    list.innerHTML = '<p class="text-gray-500 italic">Belum ada history.</p>';
    return;
  }

  const diffSummary = (h: TwibbonMemberHistory): string => {
    if (h.action === 'created') return `Nama: <strong>${escapeHtml(h.new_data?.name ?? '?')}</strong>`;
    if (h.action === 'deleted') return `Nama: <strong class="text-red-600 line-through">${escapeHtml(h.old_data?.name ?? '?')}</strong>`;
    const changes: string[] = [];
    const oldData = h.old_data ?? {};
    const newData = h.new_data ?? {};
    for (const key of ['name', 'nim', 'group_number', 'position'] as const) {
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changes.push(`<span class="text-xs text-gray-500">${key}:</span> <span class="line-through text-red-500">${escapeHtml(String(oldData[key] ?? '∅'))}</span> → <span class="text-green-600 font-semibold">${escapeHtml(String(newData[key] ?? '∅'))}</span>`);
      }
    }
    return changes.join('<br/>') || '—';
  };

  const badgeClass = (a: string) =>
    a === 'created'
      ? 'bg-green-100 text-green-700'
      : a === 'deleted'
        ? 'bg-red-100 text-red-700'
        : 'bg-blue-100 text-blue-700';

  list.innerHTML = data
    .map(
      h => `
      <div class="bg-white rounded-lg border border-gray-200 p-3">
        <div class="flex items-center justify-between gap-2 mb-1">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded text-xs font-semibold ${badgeClass(h.action)}">${h.action.toUpperCase()}</span>
            <span class="text-xs text-gray-500">${formatDate(h.changed_at)}</span>
          </div>
          <span class="text-xs text-gray-500">${escapeHtml(h.changed_by)}</span>
        </div>
        <div class="text-sm">${diffSummary(h)}</div>
        ${h.note ? `<p class="text-xs text-gray-500 mt-1 italic">Catatan: ${escapeHtml(h.note)}</p>` : ''}
      </div>
    `,
    )
    .join('');
}

// ===== FILES =====

async function renderFiles(): Promise<void> {
  const list = document.querySelector<HTMLElement>('#files-list')!;
  list.innerHTML = '<p class="text-gray-500">Loading...</p>';
  const { data } = await supabase
    .from('twibbon_files')
    .select('*')
    .order('sort_order', { ascending: true });
  if (!data || data.length === 0) {
    list.innerHTML = '<p class="text-gray-500 italic">Belum ada file.</p>';
  } else {
    list.innerHTML = data
      .map(
        (f: TwibbonFile) => `
      <div class="bg-white rounded-lg shadow p-3 flex gap-3 items-center">
        <img src="${escapeHtml(publicUrl(f.storage_path))}" alt="" class="w-16 h-16 object-cover rounded" />
        <div class="flex-1 min-w-0">
          <p class="font-medium">${escapeHtml(f.title)}</p>
          <p class="text-xs text-gray-400">${escapeHtml(f.file_kind)} · ${escapeHtml(f.storage_path)}</p>
        </div>
        <button data-id="${f.id}" data-path="${escapeHtml(f.storage_path)}" data-act="delete-file" class="text-xs text-red-500 hover:underline whitespace-nowrap">Hapus</button>
      </div>
    `,
      )
      .join('');
    list
      .querySelectorAll<HTMLButtonElement>('button[data-act="delete-file"]')
      .forEach(b => {
        b.addEventListener('click', async () => {
          if (!confirm('Hapus file ini?')) return;
          await supabase.storage.from(STORAGE_BUCKET).remove([b.dataset.path!]);
          await supabase.from('twibbon_files').delete().eq('id', b.dataset.id!);
          toast('File dihapus.', 'info');
          renderFiles();
        });
      });
  }
  setupFileUpload();
}

function setupFileUpload(): void {
  const form = document.querySelector<HTMLFormElement>('#file-upload-form');
  if (!form || form.dataset.bound === '1') return;
  form.dataset.bound = '1';
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const titleInput = form.querySelector<HTMLInputElement>('#file-title');
    const kindInput = form.querySelector<HTMLSelectElement>('#file-kind');
    const fileInput = form.querySelector<HTMLInputElement>('#file-input');
    const title = titleInput?.value.trim();
    const kind = kindInput?.value as 'frame' | 'video' | '';
    const file = fileInput?.files?.[0];
    if (!title || !kind || !file) {
      toast('Lengkapi semua field.', 'error');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast('File terlalu besar (maks 20 MB).', 'error');
      return;
    }
    const folder = kind === 'frame' ? 'frames' : 'video';
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${folder}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { contentType: file.type });
    if (upErr) {
      toast(upErr.message, 'error');
      return;
    }
    const { error: insErr } = await supabase
      .from('twibbon_files')
      .insert({ title, storage_path: path, file_kind: kind });
    if (insErr) {
      await supabase.storage.from(STORAGE_BUCKET).remove([path]);
      toast(insErr.message, 'error');
      return;
    }
    toast('File di-upload!', 'success');
    form.reset();
    renderFiles();
  });
}

// ===== SETTINGS =====

async function renderSettings(): Promise<void> {
  const form = document.querySelector<HTMLFormElement>('#settings-form')!;
  const { data } = await supabase.from('twibbon_settings').select('*');
  const map: Record<string, unknown> = {};
  for (const row of data ?? []) map[row.key] = row.value;
  const titleEl = form.querySelector<HTMLInputElement>('#setting-event-title');
  const subtitleEl = form.querySelector<HTMLInputElement>('#setting-event-subtitle');
  const targetEl = form.querySelector<HTMLInputElement>('#setting-target-count');
  const videoEl = form.querySelector<HTMLInputElement>('#setting-video-url');
  const deadlineLabelEl = form.querySelector<HTMLInputElement>('#setting-deadline-label');
  const deadlineAtEl = form.querySelector<HTMLInputElement>('#setting-deadline-at');
  if (titleEl) titleEl.value = String(map.event_title ?? '');
  if (subtitleEl) subtitleEl.value = String(map.event_subtitle ?? '');
  if (targetEl) targetEl.value = String(map.target_count ?? '0');
  if (videoEl) videoEl.value = String(map.video_url ?? '');
  if (deadlineLabelEl) deadlineLabelEl.value = String(map.deadline_label ?? '');
  if (deadlineAtEl && typeof map.deadline_at === 'string') {
    const d = new Date(map.deadline_at);
    if (!Number.isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, '0');
      deadlineAtEl.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  }
  if (form.dataset.bound === '1') return;
  form.dataset.bound = '1';

  document.querySelector<HTMLButtonElement>('#clear-deadline-btn')?.addEventListener('click', async () => {
    if (!confirm('Hapus deadline?')) return;
    const { error } = await supabase
      .from('twibbon_settings')
      .upsert({ key: 'deadline_at', value: null, updated_at: new Date().toISOString() });
    if (error) toast(error.message, 'error');
    else {
      toast('Deadline dihapus.', 'info');
      if (deadlineAtEl) deadlineAtEl.value = '';
    }
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const deadlineLocal = deadlineAtEl?.value;
    const deadlineIso = deadlineLocal ? new Date(deadlineLocal).toISOString() : null;
    const updates = [
      { key: 'event_title', value: titleEl?.value ?? '' },
      { key: 'event_subtitle', value: subtitleEl?.value ?? '' },
      { key: 'target_count', value: Number(targetEl?.value ?? 0) },
      { key: 'video_url', value: videoEl?.value ?? '' },
      { key: 'deadline_label', value: deadlineLabelEl?.value ?? '' },
      { key: 'deadline_at', value: deadlineIso },
    ];
    for (const u of updates) {
      const { error } = await supabase
        .from('twibbon_settings')
        .upsert({ key: u.key, value: u.value, updated_at: new Date().toISOString() });
      if (error) {
        toast(error.message, 'error');
        return;
      }
    }
    toast('Settings disimpan!', 'success');
  });
}

// ===== TERMS =====

async function renderTerms(): Promise<void> {
  const form = document.querySelector<HTMLFormElement>('#terms-form')!;
  const textarea = form.querySelector<HTMLTextAreaElement>('#terms-textarea')!;
  const preview = form.querySelector<HTMLElement>('#terms-preview')!;
  const { data } = await supabase.from('twibbon_terms').select('*').eq('id', 1).maybeSingle();
  if (data) textarea.value = data.body_md;
  const render = () => {
    preview.innerHTML = marked.parse(textarea.value, { async: false }) as string;
  };
  render();
  textarea.addEventListener('input', render);
  if (form.dataset.bound === '1') return;
  form.dataset.bound = '1';
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const { error } = await supabase
      .from('twibbon_terms')
      .upsert({ id: 1, body_md: textarea.value, updated_at: new Date().toISOString() });
    if (error) toast(error.message, 'error');
    else toast('S&K disimpan!', 'success');
  });
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) showDashboard();
  else showAuthGate();
});

(async () => {
  const { data } = await supabase.auth.getSession();
  if (data.session) showDashboard();
  else showAuthGate();
})();