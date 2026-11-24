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
  tee: `plain white crew neck cotton t-shirt, ${FLAT}`,
  puffer: `black short quilted puffer down jacket with hood, ${FLAT}`,
  coat: `grey wool straight single-breasted coat, knee length, ${FLAT}`,
  knit: `brown chunky cable knit wool sweater, ${FLAT}`,
  chinos: `navy slim chino trousers, front view laid flat, full length visible, ${STYLE}`,
  shorts: `sand beige linen shorts, front view laid flat, ${STYLE}`,
  boots: `pair of black leather chelsea boots, side view, ${STYLE}`,
  blazer: `navy single-breasted wool blazer over a white shirt, ${FLAT}`,
  trench: `beige double-breasted trench coat with belt, knee length, ${FLAT}`,
  windbreaker: `cobalt blue lightweight sports windbreaker jacket with zipper, ${FLAT}`,
  "dress-shirt": `white classic cotton dress shirt with long sleeves, buttoned, ${FLAT}`,
  "oxford-shirt": `light blue oxford button-down shirt with long sleeves, ${FLAT}`,
  blouse: `cream silk blouse with long sleeves, ${FLAT}`,
  "linen-shirt": `white relaxed linen shirt with short sleeves, ${FLAT}`,
  "sport-top": `black fitted sports crop top, ${FLAT}`,
  "sheath-dress": `black knee-length sleeveless sheath dress, ${FLAT}`,
  trousers: `grey wool classic straight trousers, front view laid flat, full length visible, ${STYLE}`,
  "pencil-skirt": `grey knee-length pencil skirt, front view, ${STYLE}`,
  joggers: `heather grey cotton jogger sweatpants with cuffs, front view laid flat, full length visible, ${STYLE}`,
  leggings: `black high-waist sport leggings, front view laid flat, full length visible, ${STYLE}`,
  oxfords: `pair of black polished leather oxford shoes, three-quarter side view, ${STYLE}`,
  loafers: `pair of brown suede penny loafers, three-quarter side view, ${STYLE}`,
  pumps: `pair of black leather pointed-toe high heel pumps, side view, ${STYLE}`,
  runners: `pair of grey and white mesh running shoes, side view, ${STYLE}`,
  sandals: `pair of tan leather flat sandals, top view, ${STYLE}`,
  tote: `black structured leather tote bag, front view, ${STYLE}`,
  beanie: `charcoal grey ribbed knit beanie hat, front view, ${STYLE}`,
};

const PERSON = "full body studio photo, standing straight facing camera, arms relaxed slightly away from body, neutral expression, wearing plain fitted white t-shirt and light grey fitted trousers, white sneakers, plain light grey seamless background, soft even lighting, photorealistic, sharp focus, head to feet visible";
const BUILD = ["slim build", "average build", "plus-size heavier build"];
export const AVATARS = {};
for (const [g, who] of [["m", "a 28 year old man with short dark hair"], ["f", "a 27 year old woman with brown hair tied back"]])
  BUILD.forEach((b, i) => (AVATARS[`${g}-${i}`] = `${who}, ${b}, ${PERSON}`));

const [what = "all", ...only] = process.argv.slice(2);
const token = process.env.HF_TOKEN;
// Pollinations (FLUX.2 klein) бесплатен по ключу и не тратит квоту Hugging Face, нужную для примерки.
const polKey = process.env.POLLINATIONS_KEY;
const client = polKey ? null : await Client.connect("black-forest-labs/FLUX.1-schnell", token ? { token } : {});

async function viaPollinations(prompt, seed) {
  const r = await fetch("https://gen.pollinations.ai/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${polKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "black-forest-labs/flux.2-klein-4b", prompt, size: "768x1024", n: 1, seed }),
  });
  if (!r.ok) throw new Error(`pollinations ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const it = (await r.json()).data?.[0];
  if (it?.b64_json) return Buffer.from(it.b64_json, "base64");
  if (it?.url) return Buffer.from(await (await fetch(it.url)).arrayBuffer());
  throw new Error("pollinations: пустой ответ");
}

async function gen(dir, id, prompt, seed) {
  const ext = polKey ? "jpg" : "webp";
  const out = `src/assets/${dir}/${id}.${ext}`;
  const exists = ["webp", "jpg", "png"].some((e) => existsSync(`src/assets/${dir}/${id}.${e}`));
  if (exists && !only.includes(id)) return console.log("skip", id);
  const t0 = Date.now();
  if (polKey) {
    writeFileSync(out, await viaPollinations(prompt, seed));
  } else {
    const r = await client.predict("/infer", { prompt, seed, randomize_seed: false, width: 768, height: 1024, num_inference_steps: 4 });
    const res = await fetch(r.data[0].url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  }
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
