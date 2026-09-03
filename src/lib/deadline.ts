export interface CountdownParts {
  isExpired: boolean;
  isLive: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function getCountdown(targetIso: string | null): CountdownParts | null {
  if (!targetIso) return null;
  const target = new Date(targetIso).getTime();
  if (Number.isNaN(target)) return null;
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) {
    return { isExpired: true, isLive: false, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  return {
    isExpired: false,
    isLive: true,
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function formatCountdown(c: CountdownParts): string {
  if (c.isExpired) return 'Sudah lewat';
  return `${c.days} hari ${String(c.hours).padStart(2, '0')}:${String(c.minutes).padStart(2, '0')}:${String(c.seconds).padStart(2, '0')}`;
}