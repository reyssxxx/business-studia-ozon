// Прогрев кэша: заранее примеряет все вещи на всех фото-аватарах через запущенный сервер.
// После прогрева режим «по росту и весу» отвечает мгновенно и не зависит от нейросети на защите.
// Запуск: сначала npm run dev, затем node scripts/prewarm.mjs [http://localhost:5180]
import { readFileSync, readdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:5180";
const MIME = { webp: "image/webp", jpg: "image/jpeg", png: "image/png" };
const uri = (p) => `data:${MIME[p.split(".").pop()]};base64,` + readFileSync(p).toString("base64");
const photos = (dir) => readdirSync(dir).filter((f) => /\.(webp|jpg|png)$/.test(f)).map((f) => ({ id: f.replace(/\.\w+$/, ""), uri: uri(`${dir}/${f}`) }));

// те же категории и описания, что в src/data/catalog.ts
const ITEMS = {
  bomber: ["tops", "olive bomber jacket"], hoodie: ["tops", "grey oversized hoodie"], shirt: ["tops", "red plaid flannel shirt"],
  sweatshirt: ["tops", "cream crewneck sweatshirt"], dress: ["one-pieces", "navy midi shirt dress"], jeans: ["bottoms", "blue straight jeans"],
  cargo: ["bottoms", "beige cargo pants"], skirt: ["bottoms", "pink pleated midi skirt"],
};
// образы: основная вещь → вторая (как в LOOKS)
const LOOKS = { bomber: "jeans", hoodie: "cargo", shirt: "jeans", sweatshirt: "cargo", jeans: "bomber", cargo: "hoodie", skirt: "sweatshirt" };
const WOMEN_ONLY = ["dress", "skirt"];

async function tryOn(person, garment, id) {
  const [category, description] = ITEMS[id];
  const r = await fetch(base + "/api/tryon", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ personImage: person, garmentImage: garment, category, description, cacheable: true }) });
  const d = await r.json();
  if (!d.ok) throw new Error(d.error);
  return d;
}

const avatars = photos("src/assets/avatars");
const garments = Object.fromEntries(photos("src/assets/garments").map((g) => [g.id, g.uri]));
console.log(`аватаров с фото: ${avatars.length}, вещей с фото: ${Object.keys(garments).length}`);
let made = 0, cached = 0, failed = 0;
for (const a of avatars)
  for (const id of Object.keys(ITEMS)) {
    if (!garments[id] || (a.id.startsWith("m") && WOMEN_ONLY.includes(id))) continue;
    try {
      const d = await tryOn(a.uri, garments[id], id);
      d.cached ? cached++ : made++;
      console.log(a.id, id, d.cached ? "уже в кэше" : `готово за ${(d.ms / 1000).toFixed(0)} сек`);
      const second = LOOKS[id];
      if (second && garments[second] && !(a.id.startsWith("m") && WOMEN_ONLY.includes(second))) {
        const l = await tryOn(d.image, garments[second], second);
        l.cached ? cached++ : made++;
        console.log(a.id, id, "+", second, l.cached ? "уже в кэше" : `готово за ${(l.ms / 1000).toFixed(0)} сек`);
      }
    } catch (e) {
      failed++;
      console.log(a.id, id, "ошибка:", e.message);
      if (/лимит/i.test(e.message)) { console.log("Квота закончилась, продолжите позже: готовые результаты сохранены."); process.exit(1); }
    }
  }
console.log(`сгенерировано ${made}, было в кэше ${cached}, ошибок ${failed}`);
