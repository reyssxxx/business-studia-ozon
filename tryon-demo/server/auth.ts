// Платный режим по паролю. Пароль знают только свои: друзья по ссылке получают только бесплатный режим.
// Проверяет сервер, поэтому подменить режим в браузере нельзя.
//   POST /api/unlock { password } → { ok, token, expiresAt }   токен = «срок.подпись», подпись HMAC-SHA256 от срока
//   GET  /api/unlock              → { enabled, ttlHours }       настроен ли платный режим
// Переменные: PAID_PASSWORD, AUTH_SECRET (32+ случайных символа), PAID_TTL_HOURS (по умолчанию 12), PAID_ENABLED=false (выключатель).
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Env } from "./providers/types.js";

export function paidEnabled(env: Env): boolean {
  return env.PAID_ENABLED !== "false" && !!env.PAID_PASSWORD && (env.AUTH_SECRET ?? "").length >= 16;
}

export const ttlHours = (env: Env) => Number(env.PAID_TTL_HOURS || 12);

const sign = (payload: string, env: Env) => createHmac("sha256", env.AUTH_SECRET ?? "").update(payload).digest("hex");

export function issueToken(env: Env, now = Date.now()): { token: string; expiresAt: number } {
  const expiresAt = now + ttlHours(env) * 3_600_000;
  return { token: `${expiresAt}.${sign(String(expiresAt), env)}`, expiresAt };
}

export function verifyToken(token: string | null | undefined, env: Env, now = Date.now()): boolean {
  if (!paidEnabled(env) || !token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) <= now) return false;
  const want = Buffer.from(sign(exp, env), "hex");
  const got = Buffer.from(sig, "hex");
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Сравнение пароля за постоянное время: хэшируем обе стороны, чтобы длина не влияла */
function samePassword(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

// не больше 5 неверных паролей за 15 минут с одного адреса
const fails = new Map<string, number[]>();
const WINDOW = 15 * 60_000;
const MAX_FAILS = 5;
const recent = (ip: string, now: number) => (fails.get(ip) ?? []).filter((t) => now - t < WINDOW);

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";

export async function handleUnlock(req: Request, env: Env): Promise<Response> {
  if (req.method === "GET") return json({ ok: true, enabled: paidEnabled(env), ttlHours: ttlHours(env) });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
  if (!paidEnabled(env)) return json({ ok: false, error: "Платный режим не настроен на сервере" }, 503);

  const ip = clientIp(req);
  const now = Date.now();
  if (recent(ip, now).length >= MAX_FAILS) return json({ ok: false, error: "Слишком много попыток, подождите 15 минут" }, 429);

  let password = "";
  try {
    password = String((await req.json()).password ?? "");
  } catch {
    return json({ ok: false, error: "bad json" }, 400);
  }
  if (!samePassword(password, env.PAID_PASSWORD!)) {
    fails.set(ip, [...recent(ip, now), now]);
    await new Promise((r) => setTimeout(r, 600)); // замедляем подбор
    return json({ ok: false, error: "Неверный пароль" }, 401);
  }
  fails.delete(ip);
  return json({ ok: true, ...issueToken(env, now) });
}
