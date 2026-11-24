// Маска области, которую модель должна перерисовать (белое = менять, чёрное = оставить).
// Авто-маска IDM-VTON умеет только верх. Для низа и платьев рисуем свою: IDM-VTON принимает любую маску,
// поэтому одна модель надевает всё, и не нужна Leffa с её тяжёлым заказом GPU (120+ секунд на запуск).
//
// Допущение: человек снят в полный рост лицом к камере (так просит шторка примерки, так сделаны аватары).
// Границы заданы долями кадра 768×1024. В проде их заменяет маска по позе (ключевые точки бёдер, колен, лодыжек).
import { deflateSync } from "node:zlib";
import type { Category } from "./types.js";

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Доли кадра: x слева направо, y сверху вниз */
export const REGIONS: Partial<Record<Category, Box>> = {
  // от линии талии до лодыжек (обувь остаётся): брюки, джинсы, юбки, шорты
  bottoms: { x0: 0.27, y0: 0.52, x1: 0.73, y1: 0.91 },
  // платье: от плеч до лодыжек, чтобы под подолом не осталось прежних брюк
  "one-pieces": { x0: 0.24, y0: 0.2, x1: 0.76, y1: 0.9 },
};

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** PNG серого изображения w×h: прямоугольник box белый, остальное чёрное. Без внешних библиотек. */
export function rectMaskPng(w: number, h: number, box: Box): Buffer {
  const x0 = Math.round(box.x0 * w), x1 = Math.round(box.x1 * w);
  const y0 = Math.round(box.y0 * h), y1 = Math.round(box.y1 * h);
  const raw = Buffer.alloc((w + 1) * h); // на строку: байт фильтра 0 + w пикселей
  for (let y = y0; y < y1; y++) raw.fill(255, y * (w + 1) + 1 + x0, y * (w + 1) + 1 + x1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // 8 бит
  ihdr[9] = 0; // оттенки серого
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

export function maskFor(category: Category): Blob | null {
  const box = REGIONS[category];
  return box ? new Blob([new Uint8Array(rectMaskPng(768, 1024, box))], { type: "image/png" }) : null;
}
