// Временные иллюстрации товаров (flat-lay на белом фоне), пока нет настоящих фото.
// Запуск: node scripts/make-placeholders.mjs
import { writeFileSync, mkdirSync } from "node:fs";

const W = 600, H = 800;
const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
};

const shapes = {
  top: (c, o = {}) => `
    <path d="M190 170 L250 140 Q300 175 350 140 L410 170 L500 250 L460 330 L420 300 L420 640 Q300 660 180 640 L180 300 L140 330 L100 250 Z" fill="${c}"/>
    <path d="M250 140 Q300 200 350 140" fill="none" stroke="${shade(c, 0.75)}" stroke-width="10"/>
    ${o.hood ? `<path d="M240 145 Q300 60 360 145 Q300 190 240 145Z" fill="${shade(c, 0.85)}"/><line x1="285" y1="190" x2="280" y2="300" stroke="${shade(c, 0.6)}" stroke-width="5"/><line x1="315" y1="190" x2="320" y2="300" stroke="${shade(c, 0.6)}" stroke-width="5"/><path d="M220 470 L380 470 L400 560 L200 560Z" fill="${shade(c, 0.88)}"/>` : ""}
    ${o.zip ? `<line x1="300" y1="175" x2="300" y2="640" stroke="${shade(c, 0.55)}" stroke-width="6"/><rect x="180" y="610" width="240" height="34" fill="${shade(c, 0.7)}"/><rect x="420" y="300" width="0" height="0"/>` : ""}
    ${o.buttons ? [220, 290, 360, 430, 500, 570].map((y) => `<circle cx="300" cy="${y}" r="7" fill="${shade(c, 0.5)}"/>`).join("") + `<line x1="300" y1="175" x2="300" y2="645" stroke="${shade(c, 0.7)}" stroke-width="3"/>` : ""}
    ${o.check ? [0, 1, 2, 3, 4, 5, 6].map((i) => `<line x1="${180 + i * 40}" y1="170" x2="${180 + i * 40}" y2="645" stroke="${shade(c, 0.65)}" stroke-width="8" opacity="0.6"/><line x1="140" y1="${230 + i * 65}" x2="460" y2="${230 + i * 65}" stroke="${shade(c, 0.65)}" stroke-width="8" opacity="0.6"/>`).join("") : ""}`,
  dress: (c) => `
    <path d="M230 140 Q300 185 370 140 L420 180 L470 260 L430 300 L400 270 L410 400 L470 700 Q300 730 130 700 L190 400 L200 270 L170 300 L130 260 L180 180 Z" fill="${c}"/>
    <path d="M200 400 L400 400" stroke="${shade(c, 0.6)}" stroke-width="14"/>
    ${[200, 260, 320].map((y) => `<circle cx="300" cy="${y}" r="7" fill="${shade(c, 0.5)}"/>`).join("")}`,
  pants: (c, o = {}) => `
    <path d="M190 120 L410 120 L440 720 L330 720 L300 300 L270 720 L160 720 Z" fill="${c}"/>
    <rect x="190" y="120" width="220" height="34" fill="${shade(c, 0.8)}"/>
    <line x1="300" y1="154" x2="300" y2="290" stroke="${shade(c, 0.6)}" stroke-width="4"/>
    ${o.cargo ? `<rect x="160" y="380" width="80" height="110" rx="8" fill="${shade(c, 0.85)}" stroke="${shade(c, 0.6)}" stroke-width="4"/><rect x="360" y="380" width="80" height="110" rx="8" fill="${shade(c, 0.85)}" stroke="${shade(c, 0.6)}" stroke-width="4"/>` : `<path d="M200 165 Q230 230 270 170" fill="none" stroke="${shade(c, 1.25)}" stroke-width="5"/><path d="M400 165 Q370 230 330 170" fill="none" stroke="${shade(c, 1.25)}" stroke-width="5"/>`}`,
  skirt: (c) => `
    <rect x="200" y="160" width="200" height="40" fill="${shade(c, 0.85)}"/>
    <path d="M200 200 L400 200 L470 640 L130 640 Z" fill="${c}"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<line x1="${215 + i * 25}" y1="205" x2="${145 + i * 45}" y2="638" stroke="${shade(c, 0.78)}" stroke-width="4"/>`).join("")}`,
  sneakers: (c) => `
    <g transform="translate(0 120)"><path d="M110 380 L120 300 Q170 290 210 250 L300 260 Q330 330 470 350 Q500 360 495 400 L110 400Z" fill="${c}" stroke="#d0d0d0" stroke-width="4"/><rect x="105" y="395" width="395" height="30" rx="12" fill="#e8e8e8"/>
    ${[0, 1, 2].map((i) => `<line x1="${230 + i * 25}" y1="${270 + i * 8}" x2="${260 + i * 25}" y2="${300 + i * 8}" stroke="#bbb" stroke-width="5"/>`).join("")}</g>
    <g transform="translate(20 -60) scale(0.85)"><path d="M110 380 L120 300 Q170 290 210 250 L300 260 Q330 330 470 350 Q500 360 495 400 L110 400Z" fill="${c}" stroke="#d0d0d0" stroke-width="4"/><rect x="105" y="395" width="395" height="30" rx="12" fill="#e8e8e8"/></g>`,
  backpack: (c) => `
    <path d="M240 170 Q300 90 360 170" fill="none" stroke="${shade(c, 0.6)}" stroke-width="18"/>
    <rect x="170" y="170" width="260" height="440" rx="70" fill="${c}"/>
    <rect x="215" y="420" width="170" height="150" rx="30" fill="${shade(c, 0.85)}"/>
    <line x1="230" y1="440" x2="370" y2="440" stroke="${shade(c, 0.55)}" stroke-width="6"/>`,
  cap: (c) => `
    <path d="M150 460 Q160 250 320 250 Q470 255 470 460 Z" fill="${c}"/>
    <path d="M150 460 Q90 470 70 520 Q260 520 330 470 Z" fill="${shade(c, 0.8)}"/>
    <circle cx="320" cy="252" r="12" fill="${shade(c, 0.7)}"/>
    <path d="M320 255 L320 460" stroke="${shade(c, 0.75)}" stroke-width="4"/>`,
};

const items = [
  ["bomber", "top", "#5f6b3f", { zip: true }],
  ["hoodie", "top", "#8d9096", { hood: true }],
  ["shirt", "top", "#b4473d", { check: true, buttons: true }],
  ["sweatshirt", "top", "#e9dfcc", {}],
  ["dress", "dress", "#2f4a73", {}],
  ["jeans", "pants", "#3c5a85", {}],
  ["cargo", "pants", "#a08a68", { cargo: true }],
  ["skirt", "skirt", "#c9a4b8", {}],
  ["sneakers", "sneakers", "#fafafa", {}],
  ["backpack", "backpack", "#262626", {}],
  ["cap", "cap", "#ff662c", {}],
  ["tee", "top", "#f1f1ef", {}],
  ["puffer", "top", "#232325", { zip: true }],
  ["coat", "dress", "#8a8d91", {}],
  ["knit", "top", "#7a5a43", {}],
  ["chinos", "pants", "#28324a", {}],
  ["shorts", "skirt", "#d6c4a2", {}],
  ["boots", "sneakers", "#2a2624", {}],
];

mkdirSync("src/assets/garments", { recursive: true });
for (const [id, kind, color, opts] of items) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#ffffff"/>${shapes[kind](color, opts)}</svg>`;
  writeFileSync(`src/assets/garments/${id}.svg`, svg);
}
console.log("ok", items.length);

// Временные аватары для режима «по росту и весу»: 2 пола × 3 роста × 3 комплекции.
// Заменить на сгенерированные фото людей в базовой одежде (тот же id, .jpg).
mkdirSync("src/assets/avatars", { recursive: true });
const skin = "#d9b49a", base = "#e4e4e4";
for (const g of ["m", "f"]) for (const [hi, hs] of [[0, 0.9], [1, 0.97], [2, 1.04]]) for (const [bi, bs] of [[0, 0.82], [1, 1], [2, 1.25]]) {
  const cx = 300, top = 800 - 720 * hs;
  const sh = 95 * bs * (g === "m" ? 1.1 : 0.95), hip = 80 * bs * (g === "f" ? 1.15 : 1);
  const y = (k) => top + (800 - top) * k;
  const body = `
    <circle cx="${cx}" cy="${y(0.08)}" r="${48 * hs}" fill="${skin}"/>
    <rect x="${cx - 18}" y="${y(0.13)}" width="36" height="${y(0.17) - y(0.13)}" fill="${skin}"/>
    <path d="M${cx - sh} ${y(0.18)} Q${cx} ${y(0.16)} ${cx + sh} ${y(0.18)} L${cx + sh * 0.92} ${y(0.47)} L${cx + hip} ${y(0.55)} L${cx - hip} ${y(0.55)} L${cx - sh * 0.92} ${y(0.47)} Z" fill="${base}"/>
    <path d="M${cx - sh} ${y(0.19)} L${cx - sh - 26 * bs} ${y(0.5)} L${cx - sh - 4} ${y(0.51)} L${cx - sh + 22} ${y(0.27)}Z" fill="${skin}"/>
    <path d="M${cx + sh} ${y(0.19)} L${cx + sh + 26 * bs} ${y(0.5)} L${cx + sh + 4} ${y(0.51)} L${cx + sh - 22} ${y(0.27)}Z" fill="${skin}"/>
    <path d="M${cx - hip} ${y(0.55)} L${cx + hip} ${y(0.55)} L${cx + hip * 0.7} ${y(0.98)} L${cx + 12} ${y(0.98)} L${cx} ${y(0.62)} L${cx - 12} ${y(0.98)} L${cx - hip * 0.7} ${y(0.98)} Z" fill="#9aa3ad"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800"><rect width="600" height="800" fill="#f2f2f2"/>${body}</svg>`;
  writeFileSync(`src/assets/avatars/${g}-${hi}-${bi}.svg`, svg);
}
console.log("avatars ok");
