// Тест качества Gemini (через OpenRouter) на наших парах «человек + вещь».
// Запуск: node scripts/test-gemini.mjs [модель] [теги через запятую]
// Ключ: OPENROUTER_KEY в .env. Результаты: /tmp-папка из переменной OUT или ./gemini-out. Печатает цену каждой картинки.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
try { process.loadEnvFile(".env"); } catch {}
const KEY = process.env.OPENROUTER_KEY;
if (!KEY) { console.error("Нет OPENROUTER_KEY в .env"); process.exit(1); }
const MODEL = process.argv[2] || "google/gemini-2.5-flash-image";
const only = (process.argv[3] || "").split(",").filter(Boolean);
const OUT = process.env.OUT || "gemini-out";
mkdirSync(OUT, { recursive: true });
const A = "src/assets/avatars/", G = "src/assets/garments/";
const uri = (p) => `data:${p.endsWith(".webp") ? "image/webp" : "image/jpeg"};base64,` + readFileSync(p).toString("base64");

const WHAT = {
  tops: "as the top (upper body clothing; if it is a jacket, wear it over the existing t-shirt)",
  bottoms: "as the bottoms (trousers, jeans or skirt). Completely REMOVE the person's original trousers: no part of the original trousers may remain visible. If the new garment is shorter than the original trousers, the legs below its hem must be bare skin. Keep the top the person already wears",
  "one-pieces": "as a full dress. Completely REMOVE the person's original t-shirt and trousers: no sleeves, collar or trouser legs of the original clothes may remain visible; the arms not covered by the dress and the legs below its hem must be bare skin. In the result the person wears NO trousers, NO leggings and NO t-shirt at all: show bare calves and ankles down to the sneakers",
};
const prompt = (cat, desc) => [
  "Image 1 is a photo of a person. Image 2 is a photo of a garment.",
  `Edit image 1: dress the person in the garment from image 2 ${WHAT[cat]} (${desc}).`,
  "Keep the person's face, hair, skin, body shape, pose, shoes, hands and the plain background exactly the same.",
  "The garment must keep its exact color, pattern and cut, and fit naturally with realistic folds and shadows. Photorealistic, same framing and aspect ratio as image 1.",
].join(" ");

const pairs = [
  ["hoodie", "m-1.webp", "hoodie.webp", "tops", "grey oversized hoodie"],
  ["jeans", "m-1.webp", "jeans.webp", "bottoms", "blue straight jeans"],
  ["cargo", "m-1.webp", "cargo.webp", "bottoms", "beige cargo pants"],
  ["blazer", "m-1.webp", "blazer.jpg", "tops", "navy single-breasted blazer"],
  ["skirt", "f-1.jpg", "skirt.webp", "bottoms", "pink pleated midi skirt"],
  ["dress", "f-1.jpg", "sheath-dress.jpg", "one-pieces", "black knee-length sheath dress"],
];
let total = 0;
for (const [tag, person, garm, cat, desc] of pairs) {
  if (only.length && !only.includes(tag)) continue;
  const t0 = Date.now();
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        modalities: ["image", "text"],
        usage: { include: true },
        messages: [{ role: "user", content: [{ type: "text", text: prompt(cat, desc) }, { type: "image_url", image_url: { url: uri(A + person) } }, { type: "image_url", image_url: { url: uri(G + garm) } }] }],
      }),
      signal: AbortSignal.timeout(120000),
    });
    const j = await r.json();
    const img = j.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!img) { console.log(tag, "НЕТ КАРТИНКИ", r.status, JSON.stringify(j.error ?? j).slice(0, 220)); continue; }
    writeFileSync(`${OUT}/${MODEL.split("/")[1]}-${tag}.png`, Buffer.from(img.split(",")[1], "base64"));
    const cost = j.usage?.cost ?? 0; total += cost;
    console.log(tag, "OK", ((Date.now() - t0) / 1000).toFixed(1) + "с", "цена $" + cost.toFixed(4));
  } catch (e) { console.log(tag, "ERR", e.message?.slice(0, 160)); }
}
console.log("итого $" + total.toFixed(4));
