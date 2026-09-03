import './style.css';
import { supabase, STORAGE_BUCKET } from './lib/supabase';
import { toast } from './lib/ui';

function showJoinGrupPopup(): void {
  const popup = document.createElement('div');
  popup.className = 'modal-backdrop';
  popup.innerHTML = `
    <div class="modal-card max-w-md text-center">
      <h3 class="font-display text-2xl font-bold mb-2">🎉 Berhasil Submit!</h3>
      <p class="text-gray-600 mb-4">Twibbon kamu akan muncul di gallery setelah admin approve.</p>
      <p class="font-semibold mb-3">Jangan lupa join grup untuk update info PKKMB:</p>
      <div class="flex flex-col sm:flex-row gap-2">
        <a href="https://chat.whatsapp.com/XXX" target="_blank" rel="noopener noreferrer" class="btn-primary flex-1">
          📱 Join Grup WA
        </a>
        <button id="close-popup" class="btn-secondary flex-1">Tutup</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);
  popup.addEventListener('click', e => {
    if (e.target === popup || (e.target as HTMLElement).id === 'close-popup') {
      popup.remove();
    }
  });
}

const IG_URL_REGEX =
  /^https:\/\/(www\.)?instagram\.com\/(p|reel|reels)\/[A-Za-z0-9_-]+/;
const NIM_REGEX = /^162026\d{3}$/;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const form = document.querySelector<HTMLFormElement>('#submit-form')!;
const nameInput = document.querySelector<HTMLInputElement>('#name')!;
const nimInput = document.querySelector<HTMLInputElement>('#nim')!;
const igInput = document.querySelector<HTMLInputElement>('#ig-url')!;
const fileInput = document.querySelector<HTMLInputElement>('#screenshot')!;
const agreeCheckbox = document.querySelector<HTMLInputElement>('#agree')!;
const honeypot = document.querySelector<HTMLInputElement>('#website')!;
const submitBtn = document.querySelector<HTMLButtonElement>('#submit-btn')!;
const dropZone = document.querySelector<HTMLDivElement>('#drop-zone')!;
const filePreview = document.querySelector<HTMLImageElement>('#file-preview')!;
const fileLabel = document.querySelector<HTMLElement>('#file-label')!;

function setFieldError(field: HTMLElement, msg: string | null): void {
  const errorEl = field.parentElement?.querySelector<HTMLElement>('.field-error');
  if (errorEl) errorEl.textContent = msg ?? '';
  if (msg) field.classList.add('border-red-500');
  else field.classList.remove('border-red-500');
}

function escapeFileName(name: string): string {
  return name.replace(/[<>&"']/g, c =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]!),
  );
}

function handleFileSelect(file: File): void {
  const url = URL.createObjectURL(file);
  filePreview.src = url;
  filePreview.classList.remove('hidden');
  fileLabel.innerHTML = `<span class="font-medium">${escapeFileName(file.name)}</span><br/><span class="text-xs text-gray-400">${(file.size / 1024 / 1024).toFixed(2)} MB</span>`;
}

function setupDropZone(): void {
  if (!dropZone) return;
  dropZone.addEventListener('click', () => fileInput.click());
  ['dragenter', 'dragover'].forEach(ev =>
    dropZone.addEventListener(ev, e => {
      e.preventDefault();
      dropZone.classList.add('border-ti-cyan', 'bg-ti-cyan/5');
    }),
  );
  ['dragleave', 'drop'].forEach(ev =>
    dropZone.addEventListener(ev, e => {
      e.preventDefault();
      dropZone.classList.remove('border-ti-cyan', 'bg-ti-cyan/5');
    }),
  );
  dropZone.addEventListener('drop', e => {
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
      handleFileSelect(file);
    }
  });
}

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (file) handleFileSelect(file);
});

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (honeypot.value) return;

  let ok = true;
  const name = nameInput.value.trim();
  const nim = nimInput.value.trim();
  const igVal = igInput.value.trim();
  const file = fileInput.files?.[0] ?? null;

  if (name.length < 3) {
    setFieldError(nameInput, 'Nama minimal 3 karakter.');
    ok = false;
  } else {
    setFieldError(nameInput, null);
  }

  if (!NIM_REGEX.test(nim)) {
    setFieldError(nimInput, 'NIM harus format 162026xxx (9 digit).');
    ok = false;
  } else {
    setFieldError(nimInput, null);
  }

  if (!IG_URL_REGEX.test(igVal)) {
    setFieldError(igInput, 'Link harus URL Instagram post/reel yang valid.');
    ok = false;
  } else {
    setFieldError(igInput, null);
  }

  if (!file) {
    setFieldError(fileInput, 'Screenshot wajib di-upload.');
    ok = false;
  } else if (file.size > MAX_FILE_SIZE) {
    setFieldError(fileInput, 'Ukuran file maksimal 5 MB.');
    ok = false;
  } else if (!ALLOWED_TYPES.includes(file.type)) {
    setFieldError(fileInput, 'Format harus JPG, PNG, atau WebP.');
    ok = false;
  } else {
    setFieldError(fileInput, null);
  }

  if (!agreeCheckbox.checked) {
    setFieldError(agreeCheckbox, 'Kamu harus menyetujui S&K.');
    ok = false;
  } else {
    setFieldError(agreeCheckbox, null);
  }

  if (!ok) {
    toast('Periksa kembali isian kamu.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Mengupload...';

  try {
    const ext = file!.name.split('.').pop() || 'jpg';
    const path = `screenshots/${nim}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file!, { contentType: file!.type, upsert: false });
    if (upErr) throw upErr;

    const { error: insErr } = await supabase
      .from('twibbon_posts')
      .insert({ nim, name, ig_url: igVal, screenshot_path: path });
    if (insErr) {
      await supabase.storage.from(STORAGE_BUCKET).remove([path]);
      if (insErr.code === '23505') {
        throw new Error('NIM kamu sudah pernah submit twibbon.');
      }
      throw insErr;
    }

    // Show popup join grup
    showJoinGrupPopup();

    setTimeout(() => {
      window.location.href = '/index.html?submitted=1';
    }, 3000);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal submit. Coba lagi.';
    toast(msg, 'error', 6000);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Twibbon';
  }
});

setupDropZone();