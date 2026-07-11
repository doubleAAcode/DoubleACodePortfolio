import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { StoreLayout } from "@/stores/pavone-new/components/StoreLayout";
import { CartProvider, useCart } from "@/stores/pavone-new/lib/cart";
import { formatPrice } from "@/stores/pavone-new/lib/brand";
import { createOrder } from "@/stores/pavone-new/lib/catalog";

export const Route = createFileRoute("/stores/pavone/checkout")({
  component: PavoneCheckoutRoute,
  head: () => ({
    meta: [
      { title: "Checkout - PAVONE BY RAY" },
      {
        name: "description",
        content: "Submit your order inquiry. The boutique team will confirm by phone or WhatsApp.",
      },
      { property: "og:url", content: "/stores/pavone/checkout" },
    ],
    links: [{ rel: "canonical", href: "/stores/pavone/checkout" }],
  }),
});

function PavoneCheckoutRoute() {
  return (
    <div className="pavone-new-store min-h-screen bg-background text-foreground">
      <CartProvider>
        <CheckoutPage />
      </CartProvider>
    </div>
  );
}

function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (items.length === 0) {
      toast("Your bag is empty");
      return;
    }

    setSubmitting(true);
    try {
      await createOrder({
        customer_name: name.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || null,
        address: address.trim(),
        notes: notes.trim() || null,
        total: subtotal,
        items: items.map((item) => ({
          product_id: item.productId,
          product_name: item.name,
          product_slug: item.slug,
          product_image: item.image,
          price: item.price,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
        })),
      });
      clear();
      setDone(true);
    } catch (error) {
      console.error(error);
      toast.error("Could not submit your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-lg px-4 py-24 text-center sm:py-32">
          <CheckCircle2 className="mx-auto h-12 w-12" strokeWidth={1} />
          <h1 className="mt-6 font-serif text-3xl">Thank you, we received your order</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            The boutique team will contact you shortly by phone or WhatsApp to confirm your order
            and arrange delivery.
          </p>
          <Link to="/stores/pavone/shop" className="btn-primary mt-10">
            Continue Shopping
          </Link>
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-10 text-center">
          <p className="eyebrow">Almost There</p>
          <h1 className="mt-3 font-serif text-3xl sm:text-4xl">Order Details</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            No payment needed now. We will confirm your order personally.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-serif text-xl">Your bag is empty.</p>
            <Link to="/stores/pavone/shop" className="btn-primary mt-8">
              Shop Now
            </Link>
          </div>
        ) : (
          <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label-elegant" htmlFor="name">
                  Full Name *
                </label>
                <input
                  id="name"
                  required
                  className="input-elegant"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="label-elegant" htmlFor="phone">
                    Phone Number *
                  </label>
                  <input
                    id="phone"
                    required
                    type="tel"
                    className="input-elegant"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+961 00 000 000"
                  />
                </div>
                <div>
                  <label className="label-elegant" htmlFor="whatsapp">
                    WhatsApp (if different)
                  </label>
                  <input
                    id="whatsapp"
                    type="tel"
                    className="input-elegant"
                    value={whatsapp}
                    onChange={(event) => setWhatsapp(event.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div>
                <label className="label-elegant" htmlFor="address">
                  Address / Delivery Area *
                </label>
                <textarea
                  id="address"
                  required
                  rows={3}
                  className="input-elegant"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Street, building, city..."
                />
              </div>
              <div>
                <label className="label-elegant" htmlFor="notes">
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  className="input-elegant"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Anything we should know? (optional)"
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Order"}
              </button>
            </form>

            <aside className="h-fit border border-border p-6">
              <h2 className="font-serif text-xl">Your Order</h2>
              <ul className="mt-5 space-y-4">
                {items.map((item) => (
                  <li key={`${item.productId}-${item.size}-${item.color}`} className="flex gap-3">
                    <div className="h-16 w-12 shrink-0 overflow-hidden bg-secondary">
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[item.size, item.color].filter(Boolean).join(" / ")} x {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm">{formatPrice(item.price * item.quantity)}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                <span className="text-xs tracking-[0.2em] uppercase text-muted-foreground">
                  Total
                </span>
                <span className="font-serif text-xl">{formatPrice(subtotal)}</span>
              </div>
            </aside>
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
