import { useEffect, useRef, useState } from "react";
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
];

function TabBar() {
  const { route, tab, cart, favs } = useStore();
  if (route.name !== "catalog" && route.name !== "cart" && route.name !== "favorites" && route.name !== "analytics") return null;
  return (
    <nav aria-label="Навигация приложения" className="z-30 grid grid-cols-3 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
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
  const { route, go, tab } = useStore();
  const [modelOpen, setModelOpen] = useState(false);
  const device = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (modelOpen) device.current?.focus({ preventScroll: true });
  }, [modelOpen]);
  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [route]);

  return (
    <main className={`demo-stage ${modelOpen ? "demo-stage-open" : "demo-stage-start"}`}>
      <div className="demo-glass-wordmark" aria-hidden="true">OZON</div>
      <section className="demo-intro" aria-labelledby="demo-title">
        <header className="demo-heading" inert={!modelOpen}>
          <span className="demo-mark"><Sparkle size={20} /></span>
          <span>Примерочная</span>
          <span className="demo-case">Учебный кейс Ozon</span>
        </header>

        <div className="demo-hero">
          <h1 id="demo-title">Виртуальная<br />примерка<br />одежды</h1>
          <p>Посмотрите, как вещь выглядит на вас. Подберите размер и соберите образ перед покупкой.</p>
          <div className="demo-action-slot">
            {!modelOpen && (
              <button type="button" className="demo-primary demo-enter" onClick={() => setModelOpen(true)}>
                Перейти к модели {Icon.chevron(18)}
              </button>
            )}
            <div className="demo-actions" inert={!modelOpen}>
              <button type="button" className="demo-primary" onClick={() => { tab({ name: "catalog" }); go({ name: "product", id: "bomber" }); }}>
                Попробовать примерку {Icon.chevron(18)}
              </button>
              <button type="button" className="demo-secondary" onClick={() => tab({ name: "analytics" })}>
                {Icon.chart(18)} Аналитика пилота
              </button>
            </div>
          </div>
        </div>

        <div className="demo-metrics" inert={!modelOpen} aria-label="Целевые показатели пилота">
          <p>Цели пилота</p>
          <dl>
            <div><dt>Конверсия в покупку</dt><dd>+12%</dd></div>
            <div><dt>Примеривших соберут образ</dt><dd>6 из 100</dd></div>
            <div><dt>Размерные возвраты</dt><dd>−10%</dd></div>
          </dl>
        </div>
      </section>

      <div className="demo-device-shell" ref={device} tabIndex={-1} aria-label="Модель примерочной" inert={!modelOpen}>
        <div className="demo-phone-keys" aria-hidden="true">
          <span className="demo-phone-key demo-phone-key-power" />
          <span className="demo-phone-key demo-phone-key-volume-up" />
          <span className="demo-phone-key demo-phone-key-volume-down" />
        </div>
        <div className="demo-device">
          {modelOpen && <div className="demo-mobile-pilot"><button type="button" onClick={() => tab({ name: route.name === "analytics" ? "catalog" : "analytics" })}>{route.name === "analytics" ? "К каталогу" : "Аналитика пилота"}</button></div>}
          <div ref={scroller} className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <Screen />
          </div>
          <div id="bar-slot" />
          <TabBar />
          <div id="overlay-slot" />
          <Toast />
        </div>
      </div>
    </main>
  );
}
