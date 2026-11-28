// Платный режим: токен от /api/unlock хранится в браузере. Сервер проверяет подпись сам, кнопка ничего не решает.
import { useSyncExternalStore } from "react";
import { load, save } from "./storage";

interface PaidState {
  token: string | null;
  expiresAt: number;
  /** включён ли платный режим переключателем */
  on: boolean;
}

const KEY = "tryon.paid.v1";
let state: PaidState = load<PaidState>(KEY, { token: null, expiresAt: 0, on: false });
const subs = new Set<() => void>();
function set(next: PaidState) {
  state = next;
  save(KEY, next);
  subs.forEach((f) => f());
}

const valid = (s: PaidState) => !!s.token && s.expiresAt > Date.now();
// Токен истёк: тихо возвращаемся в бесплатный режим
if (state.token && !valid(state)) state = { token: null, expiresAt: 0, on: false };

export function usePaid(): PaidState & { active: boolean } {
  const s = useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state,
  );
  return { ...s, active: valid(s) && s.on };
}

/** Токен для запроса, если платный режим включён и не истёк */
export function paidToken(): string | null {
  if (valid(state) && state.on) return state.token;
  if (state.token && !valid(state)) set({ token: null, expiresAt: 0, on: false });
  return null;
}

export async function unlock(password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const r = await fetch("/api/unlock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    const d = (await r.json().catch(() => ({}))) as { ok?: boolean; token?: string; expiresAt?: number; error?: string };
    if (!r.ok || !d.ok || !d.token) return { ok: false, error: d.error ?? "Неверный пароль" };
    set({ token: d.token, expiresAt: d.expiresAt ?? 0, on: true });
    return { ok: true };
  } catch {
    return { ok: false, error: "Нет связи с сервером" };
  }
}

export const setPaidOn = (on: boolean) => valid(state) && set({ ...state, on });
export const lock = () => set({ token: null, expiresAt: 0, on: false });
