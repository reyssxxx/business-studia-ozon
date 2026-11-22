import { useEffect, useRef } from "react";
import { useStore, type Route } from "./store";
import { Icon, Sparkle, Toast } from "./components/ui";
import Catalog from "./screens/Catalog";
import Product from "./screens/Product";
import Result from "./screens/Result";
import Look from "./screens/Look";
import Cart from "./screens/Cart";
import Favorites from "./screens/Favorites";
import Wardrobe from "./screens/Wardrobe";
import Analytics from "./screens/Analytics";

function Screen() {
  const { route } = useStore();
  switch (route.name) {
    case "catalog":
      return <Catalog />;
    case "product":
      return <Product key={route.id} id={route.id} />;
    case "result":
      return <Result key={route.id} id={route.id} />;
    case "look":
      return <Look key={route.id} id={route.id} />;
    case "cart":
      return <Cart />;
    case "favorites":
      return <Favorites />;
    case "wardrobe":
      return <Wardrobe />;
    case "analytics":
      return <Analytics />;
  }
}

const TABS: { route: Route; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  { route: { name: "catalog" }, label: "Главная", icon: () => Icon.home() },
  { route: { name: "cart" }, label: "Корзина", icon: () => Icon.cart() },
  { route: { name: "favorites" }, label: "Избранное", icon: (a) => Icon.heart(24, a) },
  { route: { name: "analytics" }, label: "Пилот", icon: () => Icon.chart() },
];

function TabBar() {
  const { route, tab, cart, favs } = useStore();
  if (route.name !== "catalog" && route.name !== "cart" && route.name !== "favorites" && route.name !== "analytics") return null;
  return (
    <nav className="z-30 grid grid-cols-4 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
      {TABS.map((t) => {
        const active = route.name === t.route.name;
        const badge = t.route.name === "cart" ? cart.length : t.route.name === "favorites" ? favs.length : 0;
        return (
          <button key={t.label} onClick={() => tab(t.route)} className={`relative flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium ${active ? "text-blue" : "text-mute"}`}>
            {t.icon(active)}
            {t.label}
            {badge > 0 && (
              <span className="absolute top-1 left-1/2 ml-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red px-1 text-[10px] font-bold text-white">{badge}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

export default function App() {
  const { route } = useStore();
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [route]);

  return (
    <div className="flex min-h-full items-center justify-center gap-16 sm:p-6">
      <aside className="hidden max-w-[380px] lg:block">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[13px] font-medium text-ink2 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-green" /> Рабочий MVP · кейс Ozon, инициатива ИН-1
        </div>
        <h1 className="text-[46px] leading-[1.04] font-extrabold tracking-tight text-ink">
          Виртуальная
          <br />
          <span className="ai-text">примерка</span> одежды
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-ink2">
          Покупатель видит вещь на своём фото или на фигуре своего роста и веса, получает размер и сразу собирает образ. Генерация идёт в нейросети вживую.
        </p>
        <div className="mt-7 space-y-3">
          {[
            ["Конверсия", "Из примерки в покупку: +12% в основном сценарии", "bg-blue"],
            ["Допродажа", "«Собрать образ»: 6 из 100 примеривших", "ai-grad"],
            ["Возвраты", "Меньше размерных возвратов: −10%", "bg-green"],
          ].map(([t, d, c]) => (
            <div key={t} className="flex items-start gap-3 rounded-2xl bg-white p-3.5 shadow-sm">
              <div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white ${c}`}>
                <Sparkle size={14} />
              </div>
              <div>
                <div className="text-[15px] font-semibold">{t}</div>
                <div className="text-[14px] text-mute">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-white sm:h-[860px] sm:max-h-[calc(100dvh-48px)] sm:w-[400px] sm:rounded-[46px] sm:border-[11px] sm:border-[#11161c] sm:shadow-[0_30px_80px_rgba(0,26,52,.25)]">
        <div ref={scroller} className="no-scrollbar relative flex-1 overflow-y-auto">
          <Screen />
        </div>
        <div id="bar-slot" />
        <TabBar />
        <div id="overlay-slot" />
        <Toast />
      </div>
    </div>
  );
}
