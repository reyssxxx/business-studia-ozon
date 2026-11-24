// Бесплатный провайдер: открытые модели на Hugging Face Spaces (ZeroGPU).
//   IDM-VTON — лучший результат для верха.
//   Leffa    — умеет низ и платья (чекпойнт dress_code), запасной вариант для верха.
// 20–40 сек на картинку, дневная квота GPU. HF_TOKEN увеличивает квоту.
import { Client, handle_file } from "@gradio/client";
import { ProviderError, toBlob, urlToDataUri, type Provider, type TryOnInput } from "./types.js";

const clients = new Map<string, Promise<Client>>();
function space(id: string, token?: string): Promise<Client> {
  let c = clients.get(id);
  if (!c) {
    c = Client.connect(id, token ? { token: token as `hf_${string}` } : {});
    c.catch(() => clients.delete(id));
    clients.set(id, c);
  }
  return c;
}

function wrap(e: unknown): ProviderError {
  if (e instanceof ProviderError) return e;
  const msg = (e as { message?: string })?.message ?? String(e);
  console.error("[tryon] hf", msg.slice(0, 300));
  if (/quota/i.test(msg)) return new ProviderError("Бесплатный лимит нейросети на сегодня закончился", 429);
  if (/queue|full|busy/i.test(msg)) return new ProviderError("Нейросеть сейчас перегружена, попробуйте ещё раз", 503);
  return new ProviderError("Бесплатная нейросеть не ответила", 502);
}

async function idmVton(b: TryOnInput, token?: string): Promise<string> {
  const c = await space("yisol/IDM-VTON", token);
  const r = await c.predict("/tryon", {
    dict: { background: handle_file(toBlob(b.personImage)), layers: [], composite: null },
    garm_img: handle_file(toBlob(b.garmentImage)),
    garment_des: b.description || "clothing",
    is_checked: true, // автомаска по позе
    is_checked_crop: false,
    denoise_steps: 30,
    seed: 42,
  });
  return urlToDataUri((r.data as { url: string }[])[0].url, token);
}

async function leffa(b: TryOnInput, token?: string): Promise<string> {
  const c = await space("franciszzj/Leffa", token);
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

export const hf: Provider = async (b, env) => {
  const token = env.HF_TOKEN || undefined;
  const chain = b.category === "tops" ? [idmVton, leffa] : [leffa];
  let last: ProviderError | null = null;
  for (const model of chain) {
    try {
      return await model(b, token);
    } catch (e) {
      last = wrap(e); // у каждого спейса своя очередь, пробуем следующий
    }
  }
  throw last ?? new ProviderError("Нейросеть не ответила");
};
