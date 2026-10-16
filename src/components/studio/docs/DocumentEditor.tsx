import { ImagePlus, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import {
  ACCENTS,
  emptyItem,
  type AccentPreset,
  type DocItem,
  type DocShow,
  type DocState,
  type Seller,
} from "@/lib/documents/model";
import { amountInWords, type CurrencyCode } from "@/lib/documents/number-words";

type EditorProps = {
  doc: DocState;
  seller: Seller;
  onChange: (patch: Partial<DocState>) => void;
  onSellerChange: (patch: Partial<Seller>) => void;
};

const inputClass =
  "w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-accent";

const SHOW_LABELS: [keyof DocShow, string][] = [
  ["logo", "Logo"],
  ["banner", "Amount banner"],
  ["stamp", "Status stamp (PAID IN FULL)"],
  ["items", "Itemized lines table"],
  ["words", "Amount in words"],
  ["paymentMethod", "Payment method"],
  ["balance", "Balance remaining"],
  ["note", "Note box"],
  ["terms", "Terms"],
  ["signature", "Signature lines"],
  ["footer", "Contact footer"],
];

export function DocumentEditor({ doc, seller, onChange, onSellerChange }: EditorProps) {
  const isReceipt = doc.type === "receipt";
  const autoWords = amountInWords(
    isReceipt ? Number(doc.receivedAmount) || 0 : doc.items.reduce((sum, item) => sum + item.qty * item.price, 0),
    doc.currency,
  );

  function updateItem(id: string, patch: Partial<DocItem>) {
    onChange({ items: doc.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  }

  function setShow(key: keyof DocShow, value: boolean) {
    onChange({ show: { ...doc.show, [key]: value } });
  }

  function pickAccent(accent: Exclude<AccentPreset, "custom">) {
    const [colorA, colorB, colorC] = ACCENTS[accent];
    onChange({ accent, colorA, colorB, colorC });
  }

  function uploadLogo(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 480 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        onChange({ logoDataUrl: canvas.toDataURL("image/png"), show: { ...doc.show, logo: true } });
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-3">
      <Section title="Document" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Number">
            <input className={inputClass} value={doc.number} onChange={(event) => onChange({ number: event.target.value })} />
          </Field>
          <Field label="Date">
            <input className={inputClass} type="date" value={doc.date} onChange={(event) => onChange({ date: event.target.value })} />
          </Field>
          {!isReceipt ? (
            <Field label={doc.type === "invoice" ? "Due date" : "Valid until"}>
              <input className={inputClass} type="date" value={doc.dueDate} onChange={(event) => onChange({ dueDate: event.target.value })} />
            </Field>
          ) : null}
          <Field label="Currency">
            <select className={inputClass} value={doc.currency} onChange={(event) => onChange({ currency: event.target.value as CurrencyCode })}>
              <option value="USD">US dollar ($)</option>
              <option value="EUR">Euro</option>
              <option value="LBP">Lebanese pound (L.L.)</option>
            </select>
          </Field>
          <Field label="Language">
            <select className={inputClass} value={doc.lang} onChange={(event) => onChange({ lang: event.target.value as DocState["lang"] })}>
              <option value="both">English + Arabic</option>
              <option value="en">English only</option>
              <option value="ar">Arabic only</option>
            </select>
          </Field>
          <Field label="Paper">
            <select className={inputClass} value={doc.paper} onChange={(event) => onChange({ paper: event.target.value as DocState["paper"] })}>
              <option value="a4">A4</option>
              <option value="letter">US Letter</option>
            </select>
          </Field>
        </div>
      </Section>

      <Section title={isReceipt ? "Received from" : doc.type === "invoice" ? "Bill to" : "Prepared for"} defaultOpen>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name (English)">
            <input className={inputClass} value={doc.clientEn} onChange={(event) => onChange({ clientEn: event.target.value })} />
          </Field>
          <Field label="Name (Arabic)">
            <input className={inputClass} dir="rtl" value={doc.clientAr} onChange={(event) => onChange({ clientAr: event.target.value })} />
          </Field>
          <Field label="Phone">
            <input className={inputClass} value={doc.clientPhone} onChange={(event) => onChange({ clientPhone: event.target.value })} />
          </Field>
          <Field label="Email">
            <input className={inputClass} value={doc.clientEmail} onChange={(event) => onChange({ clientEmail: event.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address">
              <input className={inputClass} value={doc.clientAddress} onChange={(event) => onChange({ clientAddress: event.target.value })} />
            </Field>
          </div>
        </div>
      </Section>

      {isReceipt ? (
        <Section title="Payment" defaultOpen>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Amount received">
              <input className={inputClass} type="number" min="0" step="0.01" value={doc.receivedAmount || ""} onChange={(event) => onChange({ receivedAmount: Number(event.target.value) })} />
            </Field>
            <Field label="Agreed total (for balance)">
              <input className={inputClass} type="number" min="0" step="0.01" value={doc.projectTotal || ""} onChange={(event) => onChange({ projectTotal: Number(event.target.value) })} />
            </Field>
            <Field label="Payment for (English)">
              <input className={inputClass} value={doc.paymentForEn} onChange={(event) => onChange({ paymentForEn: event.target.value })} />
            </Field>
            <Field label="Payment for (Arabic)">
              <input className={inputClass} dir="rtl" value={doc.paymentForAr} onChange={(event) => onChange({ paymentForAr: event.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Payment method (optional)">
                <input className={inputClass} placeholder="Cash, Whish, bank transfer..." value={doc.paymentMethod} onChange={(event) => onChange({ paymentMethod: event.target.value, show: { ...doc.show, paymentMethod: event.target.value.trim() ? true : doc.show.paymentMethod } })} />
              </Field>
            </div>
          </div>
        </Section>
      ) : null}

      {!isReceipt || doc.show.items ? (
        <Section title="Items" defaultOpen>
          <div className="space-y-3">
            {doc.items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-background/50 p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className={inputClass} placeholder="Description (English)" value={item.descEn} onChange={(event) => updateItem(item.id, { descEn: event.target.value })} />
                  <input className={inputClass} dir="rtl" placeholder="الوصف (عربي)" value={item.descAr} onChange={(event) => updateItem(item.id, { descAr: event.target.value })} />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input className={`${inputClass} w-20`} type="number" min="0" step="1" placeholder="Qty" value={item.qty} onChange={(event) => updateItem(item.id, { qty: Number(event.target.value) })} />
                  <input className={inputClass} type="number" min="0" step="0.01" placeholder="Unit price" value={item.price || ""} onChange={(event) => updateItem(item.id, { price: Number(event.target.value) })} />
                  <button
                    type="button"
                    onClick={() => onChange({ items: doc.items.filter((row) => row.id !== item.id) })}
                    className="studio-icon-button shrink-0 text-muted-foreground hover:text-destructive"
                    title="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => onChange({ items: [...doc.items, emptyItem()] })} className="studio-button">
              <Plus className="h-4 w-4" />
              Add item
            </button>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Discount %">
                <input className={inputClass} type="number" min="0" max="100" step="0.1" value={doc.discountPct || ""} onChange={(event) => onChange({ discountPct: Number(event.target.value) })} />
              </Field>
              <Field label="Tax %">
                <input className={inputClass} type="number" min="0" max="100" step="0.1" value={doc.taxPct || ""} onChange={(event) => onChange({ taxPct: Number(event.target.value) })} />
              </Field>
            </div>
          </div>
        </Section>
      ) : null}

      <Section title="Show or hide">
        <div className="grid gap-2 sm:grid-cols-2">
          {SHOW_LABELS.map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-background/50 px-3 py-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={doc.show[key]} onChange={(event) => setShow(key, event.target.checked)} />
              {label}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Wording">
        <div className="space-y-3">
          <TwoLine label="Stamp text" en={doc.stampEn} ar={doc.stampAr} onEn={(stampEn) => onChange({ stampEn })} onAr={(stampAr) => onChange({ stampAr })} />
          <TwoLine label="Note" multiline en={doc.noteEn} ar={doc.noteAr} onEn={(noteEn) => onChange({ noteEn })} onAr={(noteAr) => onChange({ noteAr })} />
          <TwoLine label="Terms" multiline en={doc.termsEn} ar={doc.termsAr} onEn={(termsEn) => onChange({ termsEn })} onAr={(termsAr) => onChange({ termsAr })} />
          <TwoLine
            label="Amount in words (leave empty for automatic)"
            en={doc.wordsEn}
            ar={doc.wordsAr}
            placeholderEn={autoWords.en}
            placeholderAr={autoWords.ar}
            onEn={(wordsEn) => onChange({ wordsEn })}
            onAr={(wordsAr) => onChange({ wordsAr })}
          />
        </div>
      </Section>

      <Section title="Design">
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Colour theme</div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ACCENTS) as Exclude<AccentPreset, "custom">[]).map((accent) => (
                <button
                  key={accent}
                  type="button"
                  onClick={() => pickAccent(accent)}
                  title={accent}
                  className={`h-9 w-16 rounded-full border-2 transition-transform hover:scale-105 ${doc.accent === accent ? "border-foreground" : "border-transparent"}`}
                  style={{ background: `linear-gradient(90deg, ${ACCENTS[accent][0]}, ${ACCENTS[accent][1]}, ${ACCENTS[accent][2]})` }}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              Custom
              {(["colorA", "colorB", "colorC"] as const).map((key) => (
                <input
                  key={key}
                  type="color"
                  value={doc[key]}
                  onChange={(event) => onChange({ [key]: event.target.value, accent: "custom" })}
                  className="h-8 w-10 cursor-pointer rounded-lg border border-border bg-background p-0.5"
                />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Logo</div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="studio-button cursor-pointer">
                <ImagePlus className="h-4 w-4" />
                Upload logo
                <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadLogo(event.target.files?.[0])} />
              </label>
              {doc.logoDataUrl ? (
                <button type="button" onClick={() => onChange({ logoDataUrl: "" })} className="studio-button">
                  Use Double A logo
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Your business details">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Business name">
            <input className={inputClass} value={seller.name} onChange={(event) => onSellerChange({ name: event.target.value })} />
          </Field>
          <Field label="Website">
            <input className={inputClass} value={seller.website} onChange={(event) => onSellerChange({ website: event.target.value })} />
          </Field>
          <Field label="Tagline (English)">
            <input className={inputClass} value={seller.taglineEn} onChange={(event) => onSellerChange({ taglineEn: event.target.value })} />
          </Field>
          <Field label="Tagline (Arabic)">
            <input className={inputClass} dir="rtl" value={seller.taglineAr} onChange={(event) => onSellerChange({ taglineAr: event.target.value })} />
          </Field>
          <Field label="Email">
            <input className={inputClass} value={seller.email} onChange={(event) => onSellerChange({ email: event.target.value })} />
          </Field>
          <Field label="Phones">
            <input className={inputClass} value={seller.phones} onChange={(event) => onSellerChange({ phones: event.target.value })} />
          </Field>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details open={defaultOpen} className="group rounded-3xl border border-border bg-surface/55">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold">
        {title}
        <span className="text-muted-foreground transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="border-t border-border px-4 py-4">{children}</div>
    </details>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function TwoLine({
  label,
  en,
  ar,
  onEn,
  onAr,
  multiline,
  placeholderEn,
  placeholderAr,
}: {
  label: string;
  en: string;
  ar: string;
  onEn: (value: string) => void;
  onAr: (value: string) => void;
  multiline?: boolean;
  placeholderEn?: string;
  placeholderAr?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="grid gap-2">
        {multiline ? (
          <>
            <textarea className={inputClass} rows={2} placeholder={placeholderEn ?? "English"} value={en} onChange={(event) => onEn(event.target.value)} />
            <textarea className={inputClass} dir="rtl" rows={2} placeholder={placeholderAr ?? "عربي"} value={ar} onChange={(event) => onAr(event.target.value)} />
          </>
        ) : (
          <>
            <input className={inputClass} placeholder={placeholderEn ?? "English"} value={en} onChange={(event) => onEn(event.target.value)} />
            <input className={inputClass} dir="rtl" placeholder={placeholderAr ?? "عربي"} value={ar} onChange={(event) => onAr(event.target.value)} />
          </>
        )}
      </div>
    </div>
  );
}
