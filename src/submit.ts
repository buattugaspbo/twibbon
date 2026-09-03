import './style.css';
import { supabase, STORAGE_BUCKET } from './lib/supabase';
import { toast } from './lib/ui';
import { getIdentity } from './lib/identity';

const IG_URL_REGEX =
  /^https:\/\/(www\.)?instagram\.com\/(p|reel|reels)\/[A-Za-z0-9_-]+/;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const form = document.querySelector<HTMLFormElement>('#submit-form')!;
const igInput = document.querySelector<HTMLInputElement>('#ig-url')!;
const fileInput = document.querySelector<HTMLInputElement>('#screenshot')!;
const agreeCheckbox = document.querySelector<HTMLInputElement>('#agree')!;
const honeypot = document.querySelector<HTMLInputElement>('#website')!;
const submitBtn = document.querySelector<HTMLButtonElement>('#submit-btn')!;
const dropZone = document.querySelector<HTMLDivElement>('#drop-zone')!;
const filePreview = document.querySelector<HTMLImageElement>('#file-preview')!;
const fileLabel = document.querySelector<HTMLElement>('#file-label')!;
const identityBanner = document.querySelector<HTMLElement>('#identity-banner')!;
const identityName = document.querySelector<HTMLElement>('#identity-banner-name')!;
const identityNim = document.querySelector<HTMLElement>('#identity-banner-nim')!;

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

function bootstrap(): void {
  const identity = getIdentity();
  if (!identity) {
    // No identity → force re-entry through landing
    toast('Isi nama & NIM kamu dulu di beranda ya.', 'error', 6000);
    setTimeout(() => {
      window.location.href = '/';
    }, 1500);
    return;
  }
  identityName.textContent = identity.name;
  identityNim.textContent = identity.nim;
  identityBanner.classList.remove('hidden');
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (honeypot.value) return;

  const identity = getIdentity();
  if (!identity) {
    window.location.href = '/';
    return;
  }

  let ok = true;
  const igVal = igInput.value.trim();
  if (!IG_URL_REGEX.test(igVal)) {
    setFieldError(igInput, 'Link harus URL Instagram post/reel yang valid.');
    ok = false;
  } else {
    setFieldError(igInput, null);
  }

  const file = fileInput.files?.[0] ?? null;
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
    const path = `screenshots/${identity.nim}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file!, { contentType: file!.type, upsert: false });
    if (upErr) throw upErr;

    const { error: insErr } = await supabase
      .from('twibbon_posts')
      .insert({ nim: identity.nim, ig_url: igVal, screenshot_path: path });
    if (insErr) {
      await supabase.storage.from(STORAGE_BUCKET).remove([path]);
      if (insErr.code === '23505') {
        throw new Error('NIM kamu sudah pernah submit twibbon.');
      }
      throw insErr;
    }

    window.location.href = '/index.html?submitted=1';
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal submit. Coba lagi.';
    toast(msg, 'error', 6000);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Twibbon';
  }
});

bootstrap();
setupDropZone();