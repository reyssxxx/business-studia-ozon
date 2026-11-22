// Картинки товаров и аватаров. Если есть фото (.webp/.jpg), берём его, иначе временный рисунок (.svg).
// Фото создаёт scripts/gen-assets.mjs, свои фото можно просто положить в папку с тем же именем.
const garments = import.meta.glob<string>("../assets/garments/*.{webp,jpg,png,svg}", { eager: true, import: "default", query: "?url" });
const avatars = import.meta.glob<string>("../assets/avatars/*.{webp,jpg,png,svg}", { eager: true, import: "default", query: "?url" });

function pick(map: Record<string, string>, dir: string, names: string[]): { url: string; photo: boolean } {
  for (const n of names)
    for (const ext of ["webp", "jpg", "png", "svg"]) {
      const url = map[`../assets/${dir}/${n}.${ext}`];
      if (url) return { url, photo: ext !== "svg" };
    }
  throw new Error(`Нет картинки ${dir}/${names[0]}`);
}

export const garmentImage = (id: string) => pick(garments, "garments", [id]);
/** g: пол, h: рост 0..2, b: комплекция 0..2. Фото-аватары различаются комплекцией. */
export const avatarImage = (g: string, h: number, b: number) => pick(avatars, "avatars", [`${g}-${b}`, `${g}-${h}-${b}`]);
