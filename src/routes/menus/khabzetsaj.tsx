import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Minus, Phone, Plus, Search, ShoppingBag, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

const WHATSAPP_NUMBER = "96176984099";
const PHONE_DISPLAY = "76 98 40 99";
const LOGO_SRC = "/images/menus/khabzet-saj/logo.webp";

export const Route = createFileRoute("/menus/khabzetsaj")({
  head: () => ({
    meta: [
      { title: "Khabzet Saj Menu | خبزة صاج" },
      {
        name: "description",
        content:
          "Khabzet Saj digital menu: Lebanese saj manakish, special saj sandwiches, and sweet saj. Order on WhatsApp.",
      },
      { property: "og:title", content: "Khabzet Saj Menu | خبزة صاج" },
      {
        property: "og:description",
        content: "Lebanese saj manakish, special sandwiches, and sweets. Order on WhatsApp.",
      },
      { property: "og:image", content: LOGO_SRC },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@500;700;900&display=swap",
      },
    ],
  }),
  component: KhabzetSajMenuPage,
});

type ProductOption = {
  id: string;
  label: string;
  ar: string;
  price: number;
};

type Product = {
  name: string;
  ar: string;
  description?: string;
  descriptionAr?: string;
  price: number;
  image?: string;
  options?: ProductOption[];
};

type Category = {
  id: string;
  name: string;
  ar: string;
  note?: { en: string; ar: string };
  products: Product[];
};

type CartLine = {
  key: string;
  name: string;
  ar: string;
  optionLabels: string[];
  unitPrice: number;
  quantity: number;
};

const CHEESE_OPTION: ProductOption = { id: "cheese", label: "Cheese", ar: "جبنة", price: 100000 };

const MIX = {
  en: "mayo mustard sauce - pickles - tomato - mint",
  ar: "مايو ماستيرد صوص – كبيس – بندورة – نعنع",
};
const CORN_MIX = {
  en: "mayo mustard sauce - pickles - lettuce - corn",
  ar: "مايو ماستيرد صوص – كبيس – خس – ذرة",
};

const categories: Category[] = [
  {
    id: "lebanese",
    name: "Lebanese Style",
    ar: "ع اللبناني",
    note: {
      en: "We have brown dough, free of sugar.",
      ar: "عنّا عجين أسمر خالي من السكر",
    },
    products: [
      { name: "Zaatar Baladi", ar: "زعتر بلدي", price: 100000 },
      { name: "Zaatar & Labneh", ar: "زعتر ولبنة", price: 200000 },
      { name: "Labneh", ar: "لبنة", price: 200000 },
      { name: "Keshek Baladi", ar: "كشك بلدي", price: 200000 },
      { name: "Keshek & Cheese", ar: "كشك وجبنة", price: 200000 },
      { name: "Akkawi Cheese", ar: "جبنة عكاوي", price: 200000 },
      { name: "Akkawi (Al-Nakka)", ar: "جبنة عكاوي الناقة", price: 300000 },
      { name: "Zaatar & Cheese", ar: "زعتر وجبنة", price: 200000 },
      { name: "Kashkaval Cheese", ar: "قشقوان", price: 300000 },
      { name: "3 Cheese", ar: "٣ أجبان", price: 300000 },
    ],
  },
  {
    id: "special",
    name: "Special",
    ar: "السبسيال",
    products: [
      {
        name: "Bulghari Mix",
        ar: "خلطة بلغاري",
        description: "mohamara paste - mozzarella - mint - cucumber",
        descriptionAr: "صوص محمرة – موزاريلا – خيار – نعنع",
        price: 300000,
        image: "/images/menus/khabzet-saj/bulghari.webp",
      },
      {
        name: "Mortadella & Cheese",
        ar: "مرتديلا وجبنة",
        description: "mayo mustard sauce - pickles - tomato - lettuce - corn",
        descriptionAr: "مايو ماستيرد صوص – كبيس – بندورة – خس – ذرة",
        price: 300000,
      },
      {
        name: "Hotdog & Cheese",
        ar: "هوت دوغ وجبنة",
        description: CORN_MIX.en,
        descriptionAr: CORN_MIX.ar,
        price: 300000,
      },
      {
        name: "Turkey & Cheese",
        ar: "حبش وجبنة",
        description: CORN_MIX.en,
        descriptionAr: CORN_MIX.ar,
        price: 300000,
      },
      {
        name: "Smoked Turkey & Cheese",
        ar: "حبش مدخن وجبنة",
        description: CORN_MIX.en,
        descriptionAr: CORN_MIX.ar,
        price: 350000,
        image: "/images/menus/khabzet-saj/smoked-turkey.webp",
      },
      {
        name: "Rosto & Cheese",
        ar: "روستو وجبنة",
        description: MIX.en,
        descriptionAr: MIX.ar,
        price: 500000,
        image: "/images/menus/khabzet-saj/rosto.webp",
      },
      {
        name: "Sojouk",
        ar: "سجق",
        description: MIX.en,
        descriptionAr: MIX.ar,
        price: 400000,
        options: [CHEESE_OPTION],
      },
      {
        name: "Kafta",
        ar: "كفتة",
        description: "mayo mustard sauce - pickles - tomato",
        descriptionAr: "مايو ماستيرد صوص – كبيس – بندورة",
        price: 400000,
        options: [CHEESE_OPTION],
        image: "/images/menus/khabzet-saj/kafta.webp",
      },
      { name: "Vegetable Plate", ar: "صحن خضرة", price: 100000 },
    ],
  },
  {
    id: "sweet",
    name: "Sweet",
    ar: "حلّي ضرسك",
    products: [
      {
        name: "Nutella",
        ar: "نوتيلا",
        price: 250000,
        image: "/images/menus/khabzet-saj/nutella.webp",
        options: [
          { id: "banana", label: "Banana", ar: "موز", price: 50000 },
          { id: "strawberry", label: "Strawberry", ar: "فريز", price: 50000 },
          { id: "hazelnut", label: "Hazelnut", ar: "بندق", price: 50000 },
        ],
      },
    ],
  },
];

const formatPrice = (value: number) => `${value.toLocaleString("en-US")} L.L`;

const whatsappLink = (message: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

const GENERAL_MESSAGE = "Hello Khabzet Saj, I'd like to place an order.";

function buildOrderMessage(lines: CartLine[], total: number, note: string) {
  const items = lines.map((line) => {
    const extras = line.optionLabels.length ? ` + ${line.optionLabels.join(", ")}` : "";
    return `- ${line.quantity}x ${line.name} (${line.ar})${extras} = ${formatPrice(
      line.unitPrice * line.quantity,
    )}`;
  });
  const trimmedNote = note.trim();
  return [
    "Hello Khabzet Saj, I'd like to order:",
    ...items,
    "",
    `Total: ${formatPrice(total)}`,
    ...(trimmedNote ? ["", `Notes: ${trimmedNote}`] : []),
  ].join("\n");
}

function KhabzetSajMenuPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [note, setNote] = useState("");

  const visibleCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return categories
      .filter((category) => activeCategory === "all" || category.id === activeCategory)
      .map((category) => ({
        ...category,
        products: normalizedQuery
          ? category.products.filter((product) =>
              [product.name, product.ar, product.description, product.descriptionAr]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(normalizedQuery),
            )
          : category.products,
      }))
      .filter((category) => category.products.length > 0);
  }, [activeCategory, query]);

  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const total = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  const addToCart = (product: Product, selected: ProductOption[]) => {
    const key = [product.name, ...selected.map((option) => option.id)].join("|");
    const unitPrice = product.price + selected.reduce((sum, option) => sum + option.price, 0);
    setCart((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing) {
        return current.map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [
        ...current,
        {
          key,
          name: product.name,
          ar: product.ar,
          optionLabels: selected.map((option) => option.label),
          unitPrice,
          quantity: 1,
        },
      ];
    });
  };

  const changeQuantity = (key: string, delta: number) => {
    setCart((current) =>
      current
        .map((line) => (line.key === key ? { ...line, quantity: line.quantity + delta } : line))
        .filter((line) => line.quantity > 0),
    );
  };

  const removeLine = (key: string) => {
    setCart((current) => current.filter((line) => line.key !== key));
  };

  return (
    <main
      className="min-h-screen bg-[#fbfbf6] pb-28 text-[#3d3d3d]"
      style={{ fontFamily: "'Cairo', 'Inter', system-ui, sans-serif" }}
    >
      <header className="relative px-4 pb-10 pt-8 sm:pt-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 bottom-[7.5rem] bg-[#97c11f] opacity-100 [background-image:repeating-linear-gradient(135deg,transparent_0_26px,rgba(255,255,255,0.9)_26px_46px)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-[4.5rem] h-12 bg-[#97c11f]">
          <div className="absolute inset-x-0 bottom-3 border-t-2 border-dashed border-white" />
        </div>

        <div className="relative mx-auto w-full max-w-xs rounded-3xl border-2 border-dashed border-[#97c11f] bg-white p-4 text-center shadow-[0_14px_40px_rgba(0,0,0,0.18)] outline outline-[6px] outline-white sm:max-w-sm">
          <p className="text-sm font-black uppercase tracking-[0.5em] text-[#97c11f] sm:text-base">
            Menu
          </p>
          <img
            src={LOGO_SRC}
            alt="Khabzet Saj - خبزة صاج"
            className="mx-auto mt-1 h-auto w-full max-w-[16rem]"
            width={1200}
            height={690}
          />
          <a
            href={`tel:+${WHATSAPP_NUMBER}`}
            className="mt-1 block text-3xl font-black tracking-wide text-[#97c11f] sm:text-4xl"
            dir="ltr"
          >
            {PHONE_DISPLAY}
          </a>
        </div>
      </header>

      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-2 px-4 pb-4">
        <a
          href={whatsappLink(GENERAL_MESSAGE)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-[#25d366] px-5 py-2.5 text-sm font-black text-white shadow transition hover:brightness-95"
        >
          <WhatsAppIcon className="h-5 w-5" />
          Chat on WhatsApp
        </a>
        <a
          href={`tel:+${WHATSAPP_NUMBER}`}
          className="inline-flex items-center gap-2 rounded-full border-2 border-[#3d3d3d] px-5 py-2 text-sm font-black text-[#3d3d3d] transition hover:bg-[#3d3d3d] hover:text-white"
        >
          <Phone className="h-4 w-4" aria-hidden="true" />
          Call
        </a>
      </div>

      <section className="sticky top-0 z-30 border-b border-[#97c11f]/30 bg-[#fbfbf6]/95 backdrop-blur">
        <div className="mx-auto max-w-3xl space-y-2 px-3 py-2.5 sm:px-4">
          <nav className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0" aria-label="Menu categories">
            <CategoryButton
              active={activeCategory === "all"}
              label="All"
              onClick={() => setActiveCategory("all")}
            />
            {categories.map((category) => (
              <CategoryButton
                key={category.id}
                active={activeCategory === category.id}
                label={category.name}
                ar={category.ar}
                onClick={() => setActiveCategory(category.id)}
              />
            ))}
          </nav>
          <label className="grid grid-cols-[auto_1fr] items-center gap-2 rounded-xl border border-[#3d3d3d]/15 bg-white px-3 py-2 focus-within:border-[#97c11f]">
            <Search className="h-4 w-4 text-[#97c11f]" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search menu / ابحث"
              className="min-w-0 bg-transparent text-sm font-bold outline-none placeholder:text-[#3d3d3d]/40"
            />
          </label>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-10 px-3 py-8 sm:px-4">
        {visibleCategories.map((category) => (
          <MenuCategory key={category.id} category={category} onAdd={addToCart} />
        ))}

        {visibleCategories.length === 0 ? (
          <div className="rounded-2xl border border-[#97c11f]/40 bg-white p-8 text-center">
            <p className="text-2xl font-black text-[#97c11f]">No matching items</p>
            <p className="mt-2 text-sm font-bold text-[#3d3d3d]/60">
              Try another category or search term.
            </p>
          </div>
        ) : null}
      </div>

      <section className="mx-auto max-w-3xl px-3 sm:px-4">
        <div className="rounded-[2rem] bg-[#3d3d3d] px-5 py-8 text-center text-white">
          <p className="text-3xl font-black sm:text-4xl" dir="rtl" lang="ar">
            أكيد عنّا دليفيري
          </p>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/60">
            We deliver
          </p>
          <a
            href={`tel:+${WHATSAPP_NUMBER}`}
            className="mt-3 inline-block text-4xl font-black tracking-wide text-[#97c11f]"
            dir="ltr"
          >
            {PHONE_DISPLAY}
          </a>
          <div className="mx-auto mt-6 flex max-w-sm items-start justify-center gap-2 border-t border-dashed border-white/30 pt-5 text-sm font-bold text-white/85">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#97c11f]" aria-hidden="true" />
            <div>
              <p dir="rtl" lang="ar">
                بيروت، الجناح — نزلة خوري هوم، خلف محلات C Brands
              </p>
              <p className="mt-1 text-white/60">
                Beirut, Jnah — Khoury Home descent, behind C Brands stores
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="px-4 pt-8 text-center">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#3d3d3d]/50 transition hover:text-[#97c11f]"
        >
          <span>Powered by</span>
          <span className="text-[#3d3d3d]/70">Double A Code</span>
        </a>
      </footer>

      {itemCount > 0 && !cartOpen ? (
        <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 rounded-2xl bg-[#3d3d3d] px-4 py-3 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
          >
            <span className="flex items-center gap-3">
              <span className="relative">
                <ShoppingBag className="h-6 w-6" aria-hidden="true" />
                <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#97c11f] px-1 text-xs font-black text-[#2a3a00]">
                  {itemCount}
                </span>
              </span>
              <span className="text-sm font-black">View cart</span>
            </span>
            <span className="text-sm font-black text-[#97c11f]">{formatPrice(total)}</span>
          </button>
        </div>
      ) : null}

      {cartOpen ? (
        <CartSheet
          lines={cart}
          total={total}
          note={note}
          onNoteChange={setNote}
          onClose={() => setCartOpen(false)}
          onChangeQuantity={changeQuantity}
          onRemove={removeLine}
        />
      ) : null}
    </main>
  );
}

function CartSheet({
  lines,
  total,
  note,
  onNoteChange,
  onClose,
  onChangeQuantity,
  onRemove,
}: {
  lines: CartLine[];
  total: number;
  note: string;
  onNoteChange: (value: string) => void;
  onClose: () => void;
  onChangeQuantity: (key: string, delta: number) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Your cart"
        className="flex max-h-[88vh] w-full max-w-xl flex-col rounded-t-3xl bg-[#fbfbf6] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#3d3d3d]/10 px-5 py-4">
          <h2 className="text-xl font-black">
            Your cart <span dir="rtl" lang="ar" className="text-[#97c11f]">سلتك</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="rounded-full p-1.5 hover:bg-[#3d3d3d]/10"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {lines.length === 0 ? (
            <p className="py-8 text-center text-sm font-bold text-[#3d3d3d]/60">
              Your cart is empty.
            </p>
          ) : (
            lines.map((line) => (
              <div
                key={line.key}
                className="flex items-center gap-3 rounded-xl border border-[#3d3d3d]/10 bg-white p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black leading-tight">
                    {line.name}{" "}
                    <span dir="rtl" lang="ar" className="text-[#3d3d3d]/60">
                      {line.ar}
                    </span>
                  </p>
                  {line.optionLabels.length ? (
                    <p className="text-xs font-bold text-[#4d6600]">
                      + {line.optionLabels.join(", ")}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs font-black text-[#3d3d3d]/70">
                    {formatPrice(line.unitPrice * line.quantity)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onChangeQuantity(line.key, -1)}
                    aria-label={`Decrease ${line.name}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#3d3d3d]/20"
                  >
                    <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <span className="w-5 text-center text-sm font-black">{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() => onChangeQuantity(line.key, 1)}
                    aria-label={`Increase ${line.name}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-[#97c11f] text-white"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(line.key)}
                    aria-label={`Remove ${line.name}`}
                    className="ml-1 rounded-full p-1.5 text-[#3d3d3d]/50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))
          )}

          {lines.length > 0 ? (
            <textarea
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="Notes / address (optional)"
              rows={2}
              className="w-full resize-none rounded-xl border border-[#3d3d3d]/15 bg-white px-3 py-2 text-sm font-bold outline-none placeholder:text-[#3d3d3d]/40 focus:border-[#97c11f]"
            />
          ) : null}
        </div>

        <div className="space-y-3 border-t border-[#3d3d3d]/10 px-5 py-4">
          <div className="flex items-center justify-between text-base font-black">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
          <a
            href={lines.length ? whatsappLink(buildOrderMessage(lines, total, note)) : undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={lines.length === 0}
            className={[
              "flex w-full items-center justify-center gap-2 rounded-full bg-[#25d366] px-5 py-3 text-sm font-black text-white shadow transition",
              lines.length === 0 ? "pointer-events-none opacity-50" : "hover:brightness-95",
            ].join(" ")}
          >
            <WhatsAppIcon className="h-5 w-5" />
            Send order on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

function CategoryButton({
  active,
  label,
  ar,
  onClick,
}: {
  active: boolean;
  label: string;
  ar?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "shrink-0 rounded-full border-2 px-4 py-1.5 text-sm font-black transition",
        active
          ? "border-[#97c11f] bg-[#97c11f] text-white"
          : "border-[#3d3d3d]/15 bg-white text-[#3d3d3d] hover:border-[#97c11f] hover:text-[#6f9000]",
      ].join(" ")}
    >
      {label}
      {ar ? (
        <span className="ml-2 opacity-80" dir="rtl" lang="ar">
          {ar}
        </span>
      ) : null}
    </button>
  );
}

function MenuCategory({
  category,
  onAdd,
}: {
  category: Category;
  onAdd: (product: Product, selected: ProductOption[]) => void;
}) {
  return (
    <section id={category.id} className="scroll-mt-32">
      <div className="mb-5 flex items-center gap-3">
        <div className="h-0 flex-1 border-t-2 border-dashed border-[#97c11f]" />
        <div className="text-center">
          <h2
            className="text-4xl font-black leading-tight text-[#97c11f] sm:text-5xl"
            dir="rtl"
            lang="ar"
          >
            {category.ar}
          </h2>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#3d3d3d]/60">
            {category.name}
          </p>
        </div>
        <div className="h-0 flex-1 border-t-2 border-dashed border-[#97c11f]" />
      </div>

      {category.note ? (
        <div className="mb-4 rounded-2xl bg-[#97c11f]/15 px-4 py-3 text-center">
          <p className="text-lg font-black" dir="rtl" lang="ar">
            {category.note.ar}
          </p>
          <p className="text-sm font-bold text-[#3d3d3d]/70">{category.note.en}</p>
        </div>
      ) : null}

      <div className="grid gap-3">
        {category.products.map((product) => (
          <ProductCard key={product.name} product={product} onAdd={onAdd} />
        ))}
      </div>
    </section>
  );
}

function ProductCard({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (product: Product, selected: ProductOption[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [justAdded, setJustAdded] = useState(false);

  const selected = (product.options ?? []).filter((option) => selectedIds.includes(option.id));
  const unitPrice = product.price + selected.reduce((sum, option) => sum + option.price, 0);

  const toggleOption = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const handleAdd = () => {
    onAdd(product, selected);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 900);
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-[#3d3d3d]/10 bg-white shadow-sm">
      <div className="flex items-stretch">
        {product.image ? (
          <div className="flex w-28 shrink-0 items-center justify-center bg-[#97c11f]/10 sm:w-36">
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              className="h-full max-h-36 w-full object-contain p-1"
            />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 p-3.5 sm:p-4">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-left text-lg font-black leading-tight sm:text-xl" dir="rtl" lang="ar">
                  {product.ar}
                </h3>
                <p className="text-sm font-black uppercase tracking-wide text-[#3d3d3d]/70">
                  {product.name}
                </p>
              </div>
              <p className="shrink-0 whitespace-nowrap rounded-lg bg-[#3d3d3d] px-2.5 py-1 text-sm font-black text-white">
                {formatPrice(unitPrice)}
              </p>
            </div>

            {product.description ? (
              <div className="mt-2 text-xs font-bold leading-relaxed text-[#3d3d3d]/60 sm:text-sm">
                {product.descriptionAr ? (
                  <p className="text-left" dir="rtl" lang="ar">
                    {product.descriptionAr}
                  </p>
                ) : null}
                <p>{product.description}</p>
              </div>
            ) : null}

            {product.options?.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {product.options.map((option) => {
                  const active = selectedIds.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleOption(option.id)}
                      aria-pressed={active}
                      className={[
                        "rounded-full border-2 px-2.5 py-0.5 text-xs font-black transition",
                        active
                          ? "border-[#97c11f] bg-[#97c11f] text-white"
                          : "border-[#97c11f]/50 bg-[#97c11f]/10 text-[#4d6600]",
                      ].join(" ")}
                    >
                      <bdi>
                        + {option.label} {formatPrice(option.price)}
                      </bdi>
                      {" · "}
                      <bdi lang="ar">{option.ar}</bdi>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className={[
              "inline-flex w-fit items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black text-white transition",
              justAdded ? "bg-[#4d6600]" : "bg-[#97c11f] hover:brightness-95",
            ].join(" ")}
          >
            {justAdded ? (
              "Added ✓"
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add to cart
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}
