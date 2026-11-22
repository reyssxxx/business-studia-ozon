// Общий контракт провайдера примерки. Новая нейросеть = один файл с такой функцией.
export type Category = "tops" | "bottoms" | "one-pieces";
export type ProviderId = "fal" | "hf" | "pollinations" | "mock";

export interface TryOnInput {
  personImage: string; // data:image/...;base64
  garmentImage: string; // data:image/...;base64
  category: Category;
  /** короткое описание вещи по-английски, помогает IDM-VTON */
  description?: string;
  /** true: в запросе нет фото покупателя (аватар), результат можно кэшировать */
  cacheable?: boolean;
}

export type Env = Record<string, string | undefined>;
/** Возвращает результат как data URI */
export type Provider = (input: TryOnInput, env: Env) => Promise<string>;

export class ProviderError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

export function toBlob(dataUri: string): Blob {
  const [head, b64] = dataUri.split(",", 2);
  return new Blob([Buffer.from(b64, "base64")], { type: head.slice(5, head.indexOf(";")) });
}

export async function urlToDataUri(url: string, token?: string): Promise<string> {
  const r = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!r.ok) throw new ProviderError(`Не удалось скачать результат (${r.status})`);
  const type = r.headers.get("content-type") || "image/png";
  return `data:${type};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
}
