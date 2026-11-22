import { byId } from "../data/catalog";
import { useStore } from "../store";
import { Button } from "../components/ui";
import { ItemCard } from "./Catalog";
import { track } from "../lib/analytics";

export default function Favorites() {
  const { favs, go, tab } = useStore();
  return (
    <div className="px-3 pt-4 pb-6">
      <h1 className="px-1 text-[26px] font-bold">Избранное</h1>
      {favs.length === 0 ? (
        <div className="mt-10 text-center">
          <div className="text-[44px]">🤍</div>
          <div className="mt-2 text-[17px] font-semibold">Здесь будут понравившиеся вещи</div>
          <Button className="mx-auto mt-5" size="md" onClick={() => tab({ name: "catalog" })}>
            На главную
          </Button>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-x-2.5 gap-y-5">
          {favs.map((id) => (
            <ItemCard
              key={id}
              item={byId(id)}
              onClick={() => {
                track({ type: "view_product", item: id });
                go({ name: "product", id });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
