import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, FilePlus2, Lock, Printer, Save, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DocumentEditor } from "@/components/studio/docs/DocumentEditor";
import { DOCUMENT_CSS, DocumentPreview } from "@/components/studio/docs/DocumentPreview";
import {
  applyTypeDefaults,
  DEFAULT_COUNTERS,
  DEFAULT_SELLER,
  formatDocNumber,
  makeId,
  newDocument,
  TYPE_META,
  type DocState,
  type DocShow,
  type DocType,
  type Seller,
  type StoredDocuments,
} from "@/lib/documents/model";

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: "Double A Documents" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Private Double A receipt, invoice, and estimate maker." },
    ],
  }),
  component: DocumentsPage,
});

const TOKEN_KEY = "double-a-spreadsheet-token";
const STORE_KEY = "double-a-documents-v1";
const REPO_API = "https://api.github.com/repos/doubleAAcode/DoubleACodePortfolio";
const PAPER_PX = { a4: 793.7, letter: 816 } as const;
const TYPES: DocType[] = ["receipt", "invoice", "estimate"];
const QUICK_TOGGLES: [keyof DocShow, string][] = [
  ["stamp", "Stamp"],
  ["banner", "Amount banner"],
  ["words", "Amount in words"],
  ["note", "Note"],
  ["signature", "Signature"],
  ["logo", "Logo"],
];

type Gate = "checking" | "locked" | "ready";

async function tokenCanWrite(token: string) {
  try {
    const response = await fetch(REPO_API, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    });
    if (!response.ok) return false;
    const repo = (await response.json()) as { permissions?: { push?: boolean } };
    return repo.permissions?.push === true;
  } catch {
    return false;
  }
}

function DocumentsPage() {
  const [gate, setGate] = useState<Gate>("checking");

  useEffect(() => {
    const token = window.sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      setGate("locked");
      return;
    }
    void tokenCanWrite(token).then((ok) => {
      if (!ok) window.sessionStorage.removeItem(TOKEN_KEY);
      setGate(ok ? "ready" : "locked");
    });
  }, []);

  if (gate === "checking") {
    return <main className="min-h-screen bg-background" />;
  }
  if (gate === "locked") {
    return <UnlockPanel onUnlock={() => setGate("ready")} />;
  }
  return <DocumentMaker onLock={() => setGate("locked")} />;
}

function UnlockPanel({ onUnlock }: { onUnlock: () => void }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const value = token.trim();
    if (await tokenCanWrite(value)) {
      window.sessionStorage.setItem(TOKEN_KEY, value);
      onUnlock();
    } else {
      setError("That token cannot write to the Double A repo.");
    }
    setBusy(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-border bg-surface/70 p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-background">
            <Lock className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold">Documents</h1>
            <p className="text-xs text-muted-foreground">Receipts, invoices, and estimates</p>
          </div>
        </div>
        <label className="mt-6 grid gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">GitHub token</span>
          <input
            value={token}
            onChange={(event) => {
              setToken(event.target.value);
              setError("");
            }}
            required
            autoComplete="off"
            placeholder="github_pat_..."
            className="rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
          />
        </label>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-full px-6 py-3 text-sm font-medium text-background disabled:opacity-60"
          style={{ background: "var(--gradient-brand)" }}
        >
          {busy ? "Checking..." : "Open documents"}
        </button>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Same token as the studio spreadsheet. It is checked against the repo and kept only in this browser
          session, so only your team can issue documents in the Double A name.
        </p>
      </form>
    </main>
  );
}

function loadStored(): StoredDocuments {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredDocuments;
      if (parsed.version === 1 && parsed.current) {
        return {
          ...parsed,
          seller: { ...DEFAULT_SELLER, ...parsed.seller },
          counters: { ...DEFAULT_COUNTERS, ...parsed.counters },
          saved: parsed.saved ?? [],
        };
      }
    }
  } catch {
    // fall through to a fresh start
  }
  return {
    version: 1,
    current: newDocument("receipt", DEFAULT_COUNTERS.receipt),
    seller: DEFAULT_SELLER,
    counters: { ...DEFAULT_COUNTERS },
    saved: [],
  };
}

function DocumentMaker({ onLock }: { onLock: () => void }) {
  const [store, setStore] = useState<StoredDocuments | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setStore(loadStored());
  }, []);

  useEffect(() => {
    if (!store) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
      } catch {
        setNotice("Browser storage is full, so this draft was not kept. Remove a saved document or the custom logo.");
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [store]);

  if (!store) return <main className="min-h-screen bg-background" />;

  const { current: doc, seller, counters, saved } = store;

  function patchDoc(patch: Partial<DocState>) {
    setStore((state) => (state ? { ...state, current: { ...state.current, ...patch } } : state));
  }

  function patchSeller(patch: Partial<Seller>) {
    setStore((state) => (state ? { ...state, seller: { ...state.seller, ...patch } } : state));
  }

  function toggleShow(key: keyof DocShow) {
    patchDoc({ show: { ...doc.show, [key]: !doc.show[key] } });
  }

  function switchType(type: DocType) {
    if (type === doc.type) return;
    setStore((state) =>
      state ? { ...state, current: applyTypeDefaults(state.current, type, state.counters[type]) } : state,
    );
  }

  function startNew(type: DocType = doc.type) {
    setStore((state) => {
      if (!state) return state;
      const counter = state.counters[type];
      const current = newDocument(type, counter, state.current);
      return { ...state, current, counters: { ...state.counters, [type]: counter } };
    });
    setNotice("");
  }

  function duplicate() {
    setStore((state) => {
      if (!state) return state;
      const type = state.current.type;
      const next = state.counters[type] + 1;
      return {
        ...state,
        counters: { ...state.counters, [type]: next },
        current: { ...state.current, number: formatDocNumber(type, next) },
      };
    });
    setNotice("Duplicated with a new number.");
  }

  function saveDoc() {
    setStore((state) => {
      if (!state) return state;
      const type = state.current.type;
      const usesNext = state.current.number === formatDocNumber(type, state.counters[type], state.current.date);
      const counters = usesNext ? { ...state.counters, [type]: state.counters[type] + 1 } : state.counters;
      const entry = { id: makeId(), savedAt: new Date().toISOString(), doc: state.current };
      const others = state.saved.filter((item) => item.doc.number !== state.current.number || item.doc.type !== type);
      return { ...state, counters, saved: [entry, ...others].slice(0, 40) };
    });
    setNotice("Saved in this browser.");
  }

  function printDoc() {
    const previous = document.title;
    const name = (doc.clientEn || doc.clientAr || "").trim();
    document.title = [doc.number, name].filter(Boolean).join(" - ");
    window.addEventListener("afterprint", () => (document.title = previous), { once: true });
    window.print();
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground md:px-6 print:min-h-0 print:bg-white print:p-0">
      <style>{DOCUMENT_CSS}</style>
      <style>{`@page { size: ${doc.paper === "a4" ? "A4" : "Letter"}; margin: 0; }`}</style>

      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-col gap-4 pb-5 md:flex-row md:items-end md:justify-between print:hidden">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-accent">Double A private route</p>
            <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">
              Documents <span className="text-gradient-brand">Maker</span>
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={printDoc} className="studio-button-primary">
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </button>
            <button onClick={saveDoc} className="studio-button">
              <Save className="h-4 w-4" />
              Save
            </button>
            <button onClick={() => startNew()} className="studio-button">
              <FilePlus2 className="h-4 w-4" />
              New
            </button>
            <button onClick={duplicate} className="studio-button">
              <Copy className="h-4 w-4" />
              Duplicate
            </button>
            <button
              onClick={() => {
                window.sessionStorage.removeItem(TOKEN_KEY);
                onLock();
              }}
              className="studio-button"
            >
              <Lock className="h-4 w-4" />
              Lock
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4 print:hidden">
          {TYPES.map((type) => (
            <button
              key={type}
              onClick={() => switchType(type)}
              className={[
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                doc.type === type
                  ? "border-accent bg-accent/15 text-accent-bright"
                  : "border-border bg-surface/40 text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {TYPE_META[type].en}
              <span className="ml-2 opacity-70" dir="rtl">{TYPE_META[type].ar}</span>
            </button>
          ))}
          {notice ? <span className="ml-2 text-xs text-muted-foreground">{notice}</span> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-4 print:hidden">
          <span className="mr-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Quick show / hide</span>
          {QUICK_TOGGLES.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleShow(key)}
              aria-pressed={doc.show[key]}
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                doc.show[key]
                  ? "border-accent bg-accent/15 text-accent-bright"
                  : "border-border bg-surface/40 text-muted-foreground line-through hover:text-foreground",
              ].join(" ")}
            >
              {doc.show[key] ? <Check className="h-3.5 w-3.5" /> : null}
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(380px,460px)_1fr]">
          <div className="space-y-3 print:hidden">
            <DocumentEditor doc={doc} seller={seller} onChange={patchDoc} onSellerChange={patchSeller} />

            <details className="group rounded-3xl border border-border bg-surface/55">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold">
                Saved documents ({saved.length})
                <span className="text-muted-foreground transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <div className="space-y-2 border-t border-border px-4 py-4">
                {saved.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing saved yet. Drafts are kept in this browser only.</p>
                ) : (
                  saved.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2 rounded-xl border border-border bg-background/50 px-3 py-2 text-sm">
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() => setStore((state) => (state ? { ...state, current: entry.doc } : state))}
                      >
                        <span className="block truncate font-medium">{entry.doc.number}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {TYPE_META[entry.doc.type].en} - {entry.doc.clientEn || entry.doc.clientAr || "No client"}
                        </span>
                      </button>
                      <button
                        className="studio-icon-button text-muted-foreground hover:text-destructive"
                        title="Delete"
                        onClick={() =>
                          setStore((state) =>
                            state ? { ...state, saved: state.saved.filter((item) => item.id !== entry.id) } : state,
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </details>
          </div>

          <div className="xl:sticky xl:top-4 xl:self-start">
            <PreviewFrame doc={doc} seller={seller} />
          </div>
        </div>
      </div>
    </main>
  );
}

function PreviewFrame({ doc, seller }: { doc: DocState; seller: Seller }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(1123);
  const paperPx = PAPER_PX[doc.paper];

  useEffect(() => {
    const box = boxRef.current;
    const paper = paperRef.current;
    if (!box || !paper) return;

    const measure = () => {
      setScale(Math.min(1, (box.clientWidth || paperPx) / paperPx));
      setHeight(paper.offsetHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(paper);
    return () => observer.disconnect();
  }, [paperPx]);

  return (
    <div ref={boxRef} className="w-full overflow-hidden rounded-3xl border border-border bg-[#e9e7f0] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)] print:rounded-none print:border-0 print:bg-white print:shadow-none">
      <div className="dp-print-root" style={{ width: paperPx * scale, height: height * scale, margin: "0 auto" }}>
        <div
          ref={paperRef}
          className="dp-scale"
          style={{ width: paperPx, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          <DocumentPreview doc={doc} seller={seller} />
        </div>
      </div>
    </div>
  );
}
