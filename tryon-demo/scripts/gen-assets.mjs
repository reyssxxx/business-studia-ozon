// Генерация фото товаров и аватаров через FLUX.1-schnell (бесплатный спейс Hugging Face).
// Запуск: node scripts/gen-assets.mjs [garments|avatars|all] [id ...]
// HF_TOKEN из окружения увеличивает квоту. Уже существующие файлы пропускаются.
import { Client } from "@gradio/client";
try { process.loadEnvFile(".env"); } catch {}
import { writeFileSync, existsSync, mkdirSync } from "node:fs";

const STYLE = "professional e-commerce product photography, pure white seamless background, soft even studio lighting, sharp focus, high detail, no text, no logo, no watermark";
const FLAT = `ghost mannequin front view, whole garment fully visible, centered, symmetrical, ${STYLE}`;

export const GARMENTS = {
  bomber: `olive green nylon bomber jacket with zipper and ribbed cuffs, ${FLAT}`,
  hoodie: `heather grey oversized cotton hoodie with kangaroo pocket and drawstrings, ${FLAT}`,
  shirt: `red and black buffalo plaid flannel button-up shirt with long sleeves, ${FLAT}`,
  sweatshirt: `cream off-white plain crewneck sweatshirt with long sleeves, ${FLAT}`,
  dress: `navy blue midi shirt dress with buttons and fabric belt, short sleeves, ${FLAT}`,
  jeans: `classic blue straight-leg denim jeans, front view laid flat, full length visible, ${STYLE}`,
  cargo: `beige cotton cargo pants with side pockets, front view laid flat, full length visible, ${STYLE}`,
  skirt: `dusty pink pleated midi skirt, front view, full length visible, ${STYLE}`,
  sneakers: `pair of minimalist white leather sneakers, three-quarter side view, ${STYLE}`,
  backpack: `black minimalist urban backpack, front view, ${STYLE}`,
  cap: `orange cotton baseball cap, three-quarter front view, ${STYLE}`,
};

const PERSON = "full body studio photo, standing straight facing camera, arms relaxed slightly away from body, neutral expression, wearing plain fitted white t-shirt and light grey fitted trousers, white sneakers, plain light grey seamless background, soft even lighting, photorealistic, sharp focus, head to feet visible";
const BUILD = ["slim build", "average build", "plus-size heavier build"];
export const AVATARS = {};
for (const [g, who] of [["m", "a 28 year old man with short dark hair"], ["f", "a 27 year old woman with brown hair tied back"]])
  BUILD.forEach((b, i) => (AVATARS[`${g}-${i}`] = `${who}, ${b}, ${PERSON}`));

const [what = "all", ...only] = process.argv.slice(2);
const token = process.env.HF_TOKEN;
const client = await Client.connect("black-forest-labs/FLUX.1-schnell", token ? { token } : {});

async function gen(dir, id, prompt, seed) {
  const out = `src/assets/${dir}/${id}.webp`;
  if (existsSync(out) && !only.includes(id)) return console.log("skip", out);
  const t0 = Date.now();
  const r = await client.predict("/infer", { prompt, seed, randomize_seed: false, width: 768, height: 1024, num_inference_steps: 4 });
  const res = await fetch(r.data[0].url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  console.log("ok", out, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}

const jobs = [];
if (what !== "avatars") for (const [id, p] of Object.entries(GARMENTS)) jobs.push(["garments", id, p, 11]);
if (what !== "garments") for (const [id, p] of Object.entries(AVATARS)) jobs.push(["avatars", id, p, 5]);
mkdirSync("src/assets/garments", { recursive: true });
mkdirSync("src/assets/avatars", { recursive: true });
for (const j of jobs) {
  if (only.length && !only.includes(j[1])) continue;
  try {
    await gen(...j);
  } catch (e) {
    console.log("ERR", j[1], e.message ?? JSON.stringify(e).slice(0, 300));
    if (/quota/i.test(e.message ?? "")) break;
  }
}
process.exit(0);
