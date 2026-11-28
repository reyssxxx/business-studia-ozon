// Образ целиком за один проход: человек + несколько вещей в одном запросе (OpenRouter, Gemini).
// Запуск: node scripts/test-gemini-outfit.mjs <модель> [формальный|кэжуал]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
try { process.loadEnvFile(".env"); } catch {}
const KEY = process.env.OPENROUTER_KEY;
if (!KEY) { console.error("Нет OPENROUTER_KEY в .env"); process.exit(1); }
const MODEL = process.argv[2] || "google/gemini-nano-banana-2.1";
const SET = process.argv[3] || "formal";
const OUT = process.env.OUT || "gemini-out";
mkdirSync(OUT, { recursive: true });
const A = "src/assets/avatars/", G = "src/assets/garments/";
const uri = (p) => `data:${p.endsWith(".webp") ? "image/webp" : "image/jpeg"};base64,` + readFileSync(p).toString("base64");

const SETS = {
  formal: { person: "m-1.webp", items: [["navy blazer (jacket)", "blazer.jpg"], ["white classic dress shirt", "dress-shirt.jpg"], ["grey classic trousers", "trousers.jpg"], ["black polished oxford shoes", "oxfords.jpg"]] },
  casual: { person: "m-1.webp", items: [["grey oversized hoodie", "hoodie.webp"], ["blue straight jeans", "jeans.webp"], ["white leather sneakers", "sneakers.webp"], ["olive bomber jacket", "bomber.webp"]] },
  // образы с аксессуарами для сравнения моделей
  "street-m": { person: "m-1.webp", items: [["olive bomber jacket", "bomber.webp"], ["plain white t-shirt", "tee.jpg"], ["blue straight jeans", "jeans.webp"], ["white leather sneakers", "sneakers.webp"], ["orange baseball cap", "cap.jpg"]] },
  "formal-f": { person: "f-1.jpg", items: [["navy blazer (jacket)", "blazer.jpg"], ["cream silk blouse", "blouse.jpg"], ["grey knee-length pencil skirt", "pencil-skirt.jpg"], ["black pointed-toe high heel pumps", "pumps.jpg"], ["black leather tote bag", "tote.jpg"]] },
};
const { person, items } = SETS[SET] ?? SETS.formal;

const list = items.map(([n], i) => `image ${i + 2}: ${n}`).join("; ");
const names = items.map(([n]) => n).join(" ").toLowerCase();
const acc = (names.includes("cap") ? " The cap is worn on the head." : "") + (names.includes("bag") ? " The bag is carried naturally in the hand." : "") + " Do not add any clothing or accessories that are not in the list: the person wears no hat and carries no bag unless one is listed.";
const prompt = [
  `Image 1 is a photo of a person. The other images are garments, in order: ${list}.`,
  `Edit image 1: dress the person in ALL of these garments together as one complete outfit, each in its natural place (outer jacket over the top, trousers or skirt, shoes).${acc}`,
  "Completely REMOVE the person's original t-shirt, trousers and shoes: no part of the original clothes may remain visible. If a garment is a skirt or dress, the legs below its hem must be bare skin.",
  "Each garment must keep its exact color, pattern and cut. Keep the person's face, hair, skin, body shape, pose and the plain background exactly the same.",
  "Full body visible from head to feet, photorealistic, same framing and aspect ratio as image 1.",
].join(" ");

const content = [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: uri(A + person) } }, ...items.map(([, f]) => ({ type: "image_url", image_url: { url: uri(G + f) } }))];
const t0 = Date.now();
const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST", headers: { Authorization: `Bearer ${KEY}`, "content-type": "application/json" },
  body: JSON.stringify({ model: MODEL, modalities: ["image", "text"], usage: { include: true }, messages: [{ role: "user", content }] }),
  signal: AbortSignal.timeout(180000),
});
const j = await r.json();
const img = j.choices?.[0]?.message?.images?.[0]?.image_url?.url;
if (!img) { console.log(MODEL, "НЕТ КАРТИНКИ", r.status, JSON.stringify(j.error ?? j).slice(0, 260)); process.exit(0); }
const name = `${OUT}/${MODEL.split("/")[1]}-${SET}.png`;
writeFileSync(name, Buffer.from(img.split(",")[1], "base64"));
console.log(MODEL, "OK", ((Date.now() - t0) / 1000).toFixed(1) + "с", "цена $" + (j.usage?.cost ?? 0).toFixed(4), name);
