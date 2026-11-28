// Бесплатный провайдер: открытые модели на Hugging Face Spaces (ZeroGPU).
//   IDM-VTON — лучший результат для верха.
//   Leffa    — умеет низ и платья (чекпойнт dress_code), запасной вариант для верха.
// 20–40 сек на картинку, дневная квота GPU. HF_TOKEN увеличивает квоту.
import { Client, handle_file } from "@gradio/client";
import { ProviderError, toBlob, urlToDataUri, type Provider, type TryOnInput } from "./types.js";
import { maskFor } from "./mask.js";
import { withKeys } from "../keys.js";

const clients = new Map<string, Promise<Client>>();
// клиент на каждую пару «space + токен»: у разных токенов своя квота
function space(id: string, token?: string): Promise<Client> {
  const k = `${id}|${token ?? "anon"}`;
  let c = clients.get(k);
  if (!c) {
    c = Client.connect(id, token ? { token: token as `hf_${string}` } : {});
    c.catch(() => clients.delete(k));
    clients.set(k, c);
  }
  return c;
}

/** «Try again in 17:26:07» из сообщения ZeroGPU → миллисекунды */
function retryMs(msg: string): number | undefined {
  const m = /try again in (\d+):(\d+):(\d+)/i.exec(msg);
  return m ? ((+m[1] * 60 + +m[2]) * 60 + +m[3]) * 1000 : undefined;
}

function wrap(e: unknown): ProviderError {
  if (e instanceof ProviderError) return e;
  const msg = (e as { message?: string })?.message ?? String(e);
  console.error("[tryon] hf", msg.slice(0, 300));
  if (/quota|runs limit/i.test(msg)) return new ProviderError("Бесплатный лимит нейросети на сегодня закончился", 429, retryMs(msg) ?? 10 * 60_000);
  if (/queue|full|busy/i.test(msg)) return new ProviderError("Нейросеть сейчас перегружена, попробуйте ещё раз", 503);
  return new ProviderError("Бесплатная нейросеть не ответила", 502);
}

async function idmVton(b: TryOnInput, token?: string): Promise<string> {
  const c = await space("yisol/IDM-VTON", token);
  // Верх: автомаска по позе. Низ и платья: своя маска (автомаска у этой модели только на верх).
  const mask = maskFor(b.category);
  const r = await c.predict("/tryon", {
    dict: { background: handle_file(toBlob(b.personImage)), layers: mask ? [handle_file(mask)] : [], composite: null },
    garm_img: handle_file(toBlob(b.garmentImage)),
    garment_des: b.description || "clothing",
    is_checked: !mask,
    is_checked_crop: false,
    denoise_steps: 30,
    seed: 42,
  });
  return urlToDataUri((r.data as { url: string }[])[0].url, token);
}

async function leffa(b: TryOnInput, token?: string, spaceId = "franciszzj/Leffa"): Promise<string> {
  const c = await space(spaceId, token);
  const r = await c.predict("/leffa_predict_vt", {
    src_image_path: handle_file(toBlob(b.personImage)),
    ref_image_path: handle_file(toBlob(b.garmentImage)),
    ref_acceleration: false,
    step: 30,
    scale: 2.5,
    seed: 42,
    vt_model_type: b.category === "tops" ? "viton_hd" : "dress_code",
    vt_garment_type: b.category === "tops" ? "upper_body" : b.category === "bottoms" ? "lower_body" : "dresses",
    vt_repaint: false,
  });
  return urlToDataUri((r.data as { url: string }[])[0].url, token);
}

// Если Hugging Face отказал Leffa из-за квоты, следующие 5 минут не тратим на неё время (для этого токена)
const leffaSkipUntil = new Map<string, number>();
const QUOTA = /requested vs|quota/i;

export const hf: Provider = (b, env) =>
  // токены по кругу: расходуем квоты поровну; когда на токене лимит, он встаёт на паузу и берётся следующий. Без токенов работаем анонимно.
  withKeys("hf", env, (token) => hfChain(b, token, env), { strategy: "round-robin", allowAnonymous: true });

async function hfChain(b: TryOnInput, token: string | undefined, env: Record<string, string | undefined>): Promise<string> {
  // LEFFA_SPACE: своя копия Leffa (Space на платном GPU или любой адрес с её API). Без квоты ZeroGPU она не падает.
  const leffaSpace = env.LEFFA_SPACE || "franciszzj/Leffa";
  const runLeffa = (x: TryOnInput, t?: string) => leffa(x, t, leffaSpace);
  const skipKey = token ?? "anon";

  // Верх: IDM-VTON (она заказывает около 60 секунд GPU), запасная Leffa.
  // Низ и платья: Leffa даёт лучший результат, но заказывает 120+ секунд и на бесплатной квоте иногда отказывает.
  // Тогда следом идёт IDM-VTON со своей маской. HF_LOWER_MODEL=idm ставит IDM-VTON первой.
  const lowerIdmFirst = env.HF_LOWER_MODEL === "idm";
  const chain = b.category === "tops" || lowerIdmFirst ? [idmVton, runLeffa] : [runLeffa, idmVton];

  let last: ProviderError | null = null;
  for (const model of chain) {
    if (model === runLeffa && Date.now() < (leffaSkipUntil.get(skipKey) ?? 0) && chain.length > 1) continue;
    try {
      return await model(b, token);
    } catch (e) {
      last = wrap(e); // у каждого спейса своя очередь и квота, пробуем следующий
      const msg = (e as { message?: string })?.message ?? "";
      if (model === runLeffa && QUOTA.test(msg)) leffaSkipUntil.set(skipKey, Date.now() + 5 * 60_000);
    }
  }
  throw last ?? new ProviderError("Нейросеть не ответила", 502);
}
