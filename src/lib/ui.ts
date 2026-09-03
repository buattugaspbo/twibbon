type ToastKind = 'success' | 'error' | 'info';

const COLORS: Record<ToastKind, string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  info: 'bg-ti-cyan',
};

export function toast(text: string, kind: ToastKind = 'info', durationMs = 4000): void {
  let stack = document.querySelector('.toast-stack') as HTMLElement | null;
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = `${COLORS[kind]} text-white px-4 py-3 rounded-lg shadow-lg text-sm`;
  el.textContent = text;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 0.3s, transform 0.3s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => el.remove(), 300);
  }, durationMs);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => HTML_ESCAPE_MAP[c]!);
}