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
  { route: { name: "wardrobe" }, label: "Гардероб", icon: () => <Sparkle size={22} /> },
  { route: { name: "analytics" }, label: "Аналитика", icon: () => Icon.chart(22) },
  { route: { name: "favorites" }, label: "Избранное", icon: (a) => Icon.heart(24, a) },
  { route: { name: "cart" }, label: "Корзина", icon: () => Icon.cart() },
];

function TabBar() {
  const { route, tab, cart, favs } = useStore();
  if (!TABS.some((item) => item.route.name === route.name)) return null;
  return (
    <nav aria-label="Навигация приложения" className="z-30 mvp-mobile-nav pb-[env(safe-area-inset-bottom)]">
      {TABS.map((t) => {
        const active = route.name === t.route.name;
        const badge = t.route.name === "cart" ? cart.length : t.route.name === "favorites" ? favs.length : 0;
        return (
          <button key={t.label} aria-current={active ? "page" : undefined} onClick={() => tab(t.route)} className={`relative flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium ${active ? "bg-blue-soft text-blue" : "text-mute"}`}>
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
    <main className="app">
      <div ref={scroller} className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Screen />
      </div>
      <div id="bar-slot" />
      <TabBar />
      <div id="overlay-slot" />
      <Toast />
    </main>
  );
}
