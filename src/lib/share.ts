export interface SharePayload {
  url: string;
  title: string;
  text: string;
}

export function buildWhatsAppUrl(payload: SharePayload): string {
  const params = new URLSearchParams({
    text: `${payload.text}\n${payload.url}`,
  });
  return `https://wa.me/?${params.toString()}`;
}

export async function shareOrCopy(payload: SharePayload): Promise<boolean> {
  if (navigator.share) {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      return true;
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return false;
    }
  }
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(`${payload.text}\n${payload.url}`);
      return true;
    } catch {
      /* fallthrough */
    }
  }
  return false;
}