import type { Identity } from '../types';

const STORAGE_KEY = 'twibbon.identity.v1';

export function getIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Identity>;
    if (typeof parsed.name !== 'string' || typeof parsed.nim !== 'string') return null;
    return { name: parsed.name, nim: parsed.nim };
  } catch {
    return null;
  }
}

export function setIdentity(identity: Identity): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
}

export function clearIdentity(): void {
  localStorage.removeItem(STORAGE_KEY);
}