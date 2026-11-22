import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { Body } from "./lib/size";
import { load, save } from "./lib/storage";
import { byId } from "./data/catalog";
import { track } from "./lib/analytics";

export type Route =
  | { name: "catalog" }
  | { name: "product"; id: string }
  | { name: "tryon"; id: string }
  | { name: "result"; id: string }
  | { name: "look"; id: string }
  | { name: "cart" }
  | { name: "favorites" }
  | { name: "wardrobe" }
  | { name: "analytics" };

export interface CartLine {
  id: string;
  size: string;
  source: "tryon" | "product" | "look";
}

export interface Settings {
  timeoutSec: number;
  accessCode: string;
  /** Когда собирать образ для примерки по фото: сразу или по признаку интереса (экономит генерации на платном API).
   *  Для аватаров образ собирается всегда: в проде такие пары кэшируются. */
  lookPolicy: "eager" | "intent";
  /** true: каждая примерка генерируется заново, как у реального покупателя. false: аватары берутся из серверного кэша (мгновенно). */
  liveGen: boolean;
}

/** После стольких проигнорированных подряд образов перестаём собирать их сами */
export const LOOK_SKIP_LIMIT = 3;

/** Вещь в гардеробе покупателя */
export interface Owned {
  id: string;
  /** order: из истории заказов; manual: покупатель отметил сам */
  source: "order" | "manual";
  /** дата заказа для подписи */
  date?: string;
}

// Демо: в «истории заказов» уже есть джинсы и кеды, чтобы был виден подбор с вашими вещами
const WARDROBE_SEED: Owned[] = [
  { id: "jeans", source: "order", date: "12 октября" },
  { id: "sneakers", source: "order", date: "3 сентября" },
];

export interface Person {
  /** Что отправляем в API: фото покупателя или аватар */
  image: string;
  mode: "photo" | "avatar";
}

interface Store {
  route: Route;
  go: (r: Route) => void;
  back: () => void;
  tab: (r: Route) => void;
  canBack: boolean;
  cart: CartLine[];
  addToCart: (l: CartLine) => void;
  removeFromCart: (i: number) => void;
  body: Body;
  setBody: (b: Body) => void;
  person: Person | null;
  setPerson: (p: Person | null) => void;
  /** результаты примерок в этой сессии: id вещи → картинка */
  results: Record<string, string>;
  setResult: (id: string, img: string) => void;
  settings: Settings;
  setSettings: (s: Settings) => void;
  toast: string | null;
  showToast: (t: string) => void;
  favs: string[];
  toggleFav: (id: string) => void;
  wardrobe: Owned[];
  toggleOwned: (id: string) => void;
  /** покупатель отключил автоподбор образов */
  lookOff: boolean;
  setLookOff: (v: boolean) => void;
  /** сколько предложенных образов подряд не открыли */
  lookSkips: number;
  noteLook: (viewed: boolean) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Route[]>([{ name: "catalog" }]);
  const [cart, setCart] = useState<CartLine[]>(() => load("tryon.cart", []));
  const [body, setBodyState] = useState<Body>(() => load("tryon.body", { height: 175, weight: 70, gender: "m" }));
  const [person, setPerson] = useState<Person | null>(null); // фото только в памяти вкладки
  const [results, setResults] = useState<Record<string, string>>({});
  const [settings, setSettingsState] = useState<Settings>(() => ({ timeoutSec: 90, accessCode: "", lookPolicy: "eager", liveGen: true, ...load<Partial<Settings>>("tryon.settings.v2", {}) }));
  const [toast, setToast] = useState<string | null>(null);
  const [favs, setFavs] = useState<string[]>(() => load("tryon.favs", []));
  const toggleFav = useCallback((id: string) => {
    setFavs((f) => {
      const next = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
      save("tryon.favs", next);
      return next;
    });
  }, []);

  const [wardrobe, setWardrobe] = useState<Owned[]>(() => load("tryon.wardrobe.v1", WARDROBE_SEED));
  const toggleOwned = useCallback((id: string) => {
    setWardrobe((w) => {
      const next = w.some((x) => x.id === id) ? w.filter((x) => x.id !== id) : [...w, { id, source: "manual" as const }];
      save("tryon.wardrobe.v1", next);
      return next;
    });
  }, []);
  const [lookOff, setLookOffState] = useState<boolean>(() => load("tryon.lookOff", false));
  const [lookSkips, setLookSkips] = useState<number>(() => load("tryon.lookSkips", 0));
  const setLookOff = useCallback((v: boolean) => {
    setLookOffState(v);
    save("tryon.lookOff", v);
    if (!v) {
      setLookSkips(0);
      save("tryon.lookSkips", 0);
    }
  }, []);
  const noteLook = useCallback((viewed: boolean) => {
    setLookSkips((n) => {
      const next = viewed ? 0 : n + 1;
      save("tryon.lookSkips", next);
      return next;
    });
  }, []);

  const routeRef = useRef<Route>(stack[stack.length - 1]);
  routeRef.current = stack[stack.length - 1];

  const go = useCallback((r: Route) => {
    setStack((s) => [...s, r]);
    window.scrollTo(0, 0);
  }, []);
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const tab = useCallback((r: Route) => setStack([r]), []);

  const showToast = useCallback((t: string) => {
    setToast(t);
    window.setTimeout(() => setToast((cur) => (cur === t ? null : cur)), 2200);
  }, []);

  const addToCart = useCallback(
    (l: CartLine) => {
      setCart((c) => {
        const next = [...c, l];
        save("tryon.cart", next);
        return next;
      });
      // look_add (один раз на образ) пишет экран «Собрать образ», здесь только позиции корзины
      track({ type: "add_cart", item: l.id, source: l.source, price: byId(l.id).price });
    },
    [],
  );
  const removeFromCart = useCallback((i: number) => {
    setCart((c) => {
      const next = c.filter((_, j) => j !== i);
      save("tryon.cart", next);
      return next;
    });
  }, []);

  const value = useMemo<Store>(
    () => ({
      route: stack[stack.length - 1],
      go,
      back,
      tab,
      canBack: stack.length > 1,
      cart,
      addToCart,
      removeFromCart,
      body,
      setBody: (b) => {
        setBodyState(b);
        save("tryon.body", b);
      },
      person,
      setPerson: (p) => {
        setPerson(p);
        setResults({});
      },
      results,
      setResult: (id, img) => {
        setResults((r) => ({ ...r, [id]: img }));
        // примерка доделалась в фоне, пока покупатель смотрел другое
        const r = routeRef.current;
        if (!(r.name === "result" && r.id === id)) showToast(`Примерка готова: ${byId(id).title.toLowerCase()}. Она в вашей примерочной`);
      },
      settings,
      setSettings: (s) => {
        setSettingsState(s);
        save("tryon.settings.v2", s);
      },
      toast,
      showToast,
      favs,
      toggleFav,
      wardrobe,
      toggleOwned,
      lookOff,
      setLookOff,
      lookSkips,
      noteLook,
    }),
    [stack, go, back, tab, cart, addToCart, removeFromCart, body, person, results, settings, toast, showToast, favs, toggleFav, wardrobe, toggleOwned, lookOff, setLookOff, lookSkips, noteLook],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("no store");
  return s;
}
