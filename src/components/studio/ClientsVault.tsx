import {
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createVaultKey,
  openVault,
  reopenVault,
  sealVault,
  type VaultKey,
} from "@/lib/client-vault";
import type {
  ClientLogin,
  ClientRecord,
  ClientsVaultContent,
  EncryptedVault,
} from "@/lib/spreadsheet.types";

const MIN_PASSPHRASE_LENGTH = 12;
const RENEWAL_WINDOW_DAYS = 60;

type RenewalKind = "Hosting" | "Domain" | "Email";

const LOGIN_PRESETS = [
  { label: "Zoho mailbox", short: "Mailbox" },
  { label: "Hosting panel", short: "Hosting login" },
  { label: "Domain registrar", short: "Registrar login" },
  { label: "", short: "Other login" },
];

export function ClientsVault({
  vault,
  knownClients,
  onVaultChange,
}: {
  vault: EncryptedVault | undefined;
  knownClients: string[];
  onVaultChange: (vault: EncryptedVault) => void;
}) {
  const vaultKey = useRef<VaultKey | null>(null);
  const lastSealed = useRef("");
  const sealSequence = useRef(0);
  const [content, setContent] = useState<ClientsVaultContent | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<string[]>([]);

  useEffect(() => {
    const key = vaultKey.current;
    if (!key || !vault || vault.data === lastSealed.current) return;

    if (vault.salt !== key.salt) {
      vaultKey.current = null;
      setContent(null);
      return;
    }

    let cancelled = false;
    void reopenVault(vault, key)
      .then((next) => {
        if (cancelled) return;
        lastSealed.current = vault.data;
        setContent(normalizeContent(next));
      })
      .catch(() => {
        if (cancelled) return;
        vaultKey.current = null;
        setContent(null);
      });

    return () => {
      cancelled = true;
    };
  }, [vault]);

  async function createVault(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
      setError(`Use at least ${MIN_PASSPHRASE_LENGTH} characters. A few random words works well.`);
      return;
    }
    if (passphrase !== confirmation) {
      setError("The two passphrases do not match.");
      return;
    }

    setBusy(true);
    try {
      const key = await createVaultKey(passphrase);
      const empty: ClientsVaultContent = { version: 1, clients: [] };
      const sealed = await sealVault(empty, key);
      vaultKey.current = key;
      lastSealed.current = sealed.data;
      onVaultChange(sealed);
      setContent(empty);
      setPassphrase("");
      setConfirmation("");
    } catch {
      setError("Could not create the vault in this browser.");
    } finally {
      setBusy(false);
    }
  }

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    if (!vault) return;
    setError("");
    setBusy(true);

    try {
      const opened = await openVault(vault, passphrase);
      vaultKey.current = opened.vaultKey;
      lastSealed.current = vault.data;
      setContent(normalizeContent(opened.content));
      setPassphrase("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlock the vault.");
    } finally {
      setBusy(false);
    }
  }

  function lockVault() {
    vaultKey.current = null;
    setContent(null);
    setPassphrase("");
    setConfirmation("");
    setOpenIds([]);
  }

  function commit(next: ClientsVaultContent) {
    const key = vaultKey.current;
    setContent(next);
    if (!key) return;

    const sequence = ++sealSequence.current;
    void sealVault(next, key).then((sealed) => {
      if (sequence !== sealSequence.current) return;
      lastSealed.current = sealed.data;
      onVaultChange(sealed);
    });
  }

  function updateClient(id: string, patch: Partial<ClientRecord>) {
    if (!content) return;
    commit({
      ...content,
      clients: content.clients.map((client) => (client.id === id ? { ...client, ...patch } : client)),
    });
  }

  function addClient() {
    if (!content) return;
    const client = emptyClient();
    commit({ ...content, clients: [client, ...content.clients] });
    setOpenIds((current) => [client.id, ...current]);
  }

  function deleteClient(id: string) {
    if (!content) return;
    const client = content.clients.find((item) => item.id === id);
    if (!window.confirm(`Delete ${client?.name || "this client"} and all of its saved logins?`)) return;
    commit({ ...content, clients: content.clients.filter((item) => item.id !== id) });
  }

  const renewals = useMemo(() => (content ? collectRenewals(content.clients) : []), [content]);

  const visibleClients = useMemo(() => {
    if (!content) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return content.clients;
    return content.clients.filter((client) =>
      [client.name, client.website, client.domainName, client.hostingProvider, client.contactName]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [content, query]);

  if (!content) {
    return (
      <LockedPanel
        hasVault={Boolean(vault)}
        passphrase={passphrase}
        confirmation={confirmation}
        error={error}
        busy={busy}
        onPassphrase={(value) => {
          setPassphrase(value);
          setError("");
        }}
        onConfirmation={(value) => {
          setConfirmation(value);
          setError("");
        }}
        onCreate={createVault}
        onUnlock={unlock}
      />
    );
  }

  return (
    <section className="mt-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-accent">
            Client vault
          </div>
          <h2 className="mt-1 font-display text-2xl font-semibold">Hosting, domains, and logins</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Everything on this tab is encrypted in your browser before it is saved. Without the
            vault passphrase, the saved file shows only scrambled text.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={addClient} className="studio-button-primary">
            <Plus className="h-4 w-4" />
            Add client
          </button>
          <button onClick={lockVault} className="studio-button">
            <Lock className="h-4 w-4" />
            Lock vault
          </button>
        </div>
      </div>

      <RenewalStrip renewals={renewals} />

      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search clients, domains, or hosting"
          className="w-full rounded-2xl border border-border bg-surface/55 py-3 pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-accent"
        />
      </label>

      <datalist id="studio-known-clients">
        {knownClients.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {content.clients.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface/40 px-6 py-12 text-center text-sm text-muted-foreground">
          No clients yet. Press <span className="text-foreground">Add client</span> to save a
          client's hosting, domain, renewal dates, and logins.
        </div>
      ) : visibleClients.length === 0 ? (
        <div className="rounded-3xl border border-border bg-surface/40 px-6 py-10 text-center text-sm text-muted-foreground">
          No client matches that search.
        </div>
      ) : (
        <div className="space-y-4">
          {visibleClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              open={openIds.includes(client.id)}
              onToggle={() =>
                setOpenIds((current) =>
                  current.includes(client.id)
                    ? current.filter((id) => id !== client.id)
                    : [...current, client.id],
                )
              }
              onUpdate={(patch) => updateClient(client.id, patch)}
              onDelete={() => deleteClient(client.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function LockedPanel({
  hasVault,
  passphrase,
  confirmation,
  error,
  busy,
  onPassphrase,
  onConfirmation,
  onCreate,
  onUnlock,
}: {
  hasVault: boolean;
  passphrase: string;
  confirmation: string;
  error: string;
  busy: boolean;
  onPassphrase: (value: string) => void;
  onConfirmation: (value: string) => void;
  onCreate: (event: React.FormEvent) => void;
  onUnlock: (event: React.FormEvent) => void;
}) {
  return (
    <section className="mt-6 flex justify-center">
      <form
        onSubmit={hasVault ? onUnlock : onCreate}
        className="w-full max-w-md rounded-3xl border border-border bg-surface/60 p-6 md:p-8"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-background">
            <KeyRound className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">
              {hasVault ? "Unlock client vault" : "Create client vault"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Hosting, domains, renewals, and logins per client
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <label className="grid gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Vault passphrase
            </span>
            <input
              type="password"
              value={passphrase}
              onChange={(event) => onPassphrase(event.target.value)}
              autoComplete="off"
              autoFocus
              required
              className="rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
            />
          </label>

          {!hasVault ? (
            <label className="grid gap-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Repeat passphrase
              </span>
              <input
                type="password"
                value={confirmation}
                onChange={(event) => onConfirmation(event.target.value)}
                autoComplete="off"
                required
                className="rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
              />
            </label>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full px-6 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.01] disabled:opacity-60"
            style={{ background: "var(--gradient-brand)" }}
          >
            {busy ? "Working..." : hasVault ? "Unlock vault" : "Create vault"}
          </button>

          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-accent" />
            {hasVault
              ? "The passphrase is never saved. You will be asked for it again after a refresh."
              : "Pick a long passphrase that only you and Saeed know. It cannot be recovered, so if it is lost the saved logins are lost too."}
          </p>
        </div>
      </form>
    </section>
  );
}

function RenewalStrip({
  renewals,
}: {
  renewals: { clientName: string; kind: RenewalKind; date: string; days: number }[];
}) {
  return (
    <div className="rounded-3xl border border-border bg-surface/55 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CalendarClock className="h-4 w-4 text-accent" />
        Renewals in the next {RENEWAL_WINDOW_DAYS} days
      </div>
      {renewals.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nothing is due soon.</p>
      ) : (
        <ul className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {renewals.map((item) => (
            <li
              key={`${item.clientName}-${item.kind}-${item.date}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/60 px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate">
                <span className="font-medium">{item.clientName || "Unnamed client"}</span>
                <span className="text-muted-foreground"> - {item.kind}</span>
              </span>
              <DueBadge days={item.days} date={item.date} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DueBadge({ days, date }: { days: number; date: string }) {
  const tone =
    days < 0
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : days <= 30
        ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
        : "border-border bg-background/60 text-muted-foreground";
  const label =
    days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `In ${days}d`;

  return (
    <span
      title={date}
      className={`shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[11px] ${tone}`}
    >
      {label}
    </span>
  );
}

function ClientCard({
  client,
  open,
  onToggle,
  onUpdate,
  onDelete,
}: {
  client: ClientRecord;
  open: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<ClientRecord>) => void;
  onDelete: () => void;
}) {
  const badges: { kind: RenewalKind; date: string }[] = [
    { kind: "Hosting" as const, date: client.hostingRenewal },
    { kind: "Domain" as const, date: client.domainRenewal },
    { kind: "Email" as const, date: client.mailRenewal },
  ].filter((item) => item.date);

  function updateLogin(id: string, patch: Partial<ClientLogin>) {
    onUpdate({
      logins: client.logins.map((login) => (login.id === id ? { ...login, ...patch } : login)),
    });
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-surface/55">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={open}
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-semibold">
              {client.name || "Unnamed client"}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {[client.website || client.domainName, client.hostingProvider]
                .filter(Boolean)
                .join(" - ") || "No details yet"}
            </span>
          </span>
        </button>
        <div className="hidden flex-wrap justify-end gap-2 sm:flex">
          {badges.map((item) => (
            <span key={item.kind} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {item.kind}
              <DueBadge days={daysUntil(item.date)} date={item.date} />
            </span>
          ))}
        </div>
        <button
          onClick={onDelete}
          className="studio-icon-button text-muted-foreground hover:text-destructive"
          title="Delete client"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {open ? (
        <div className="space-y-6 border-t border-border px-4 py-5">
          <Group title="Client">
            <Field label="Client name">
              <TextField
                value={client.name}
                list="studio-known-clients"
                onChange={(name) => onUpdate({ name })}
              />
            </Field>
            <Field label="Website">
              <TextField
                value={client.website}
                placeholder="https://"
                onChange={(website) => onUpdate({ website })}
              />
            </Field>
            <Field label="Contact person">
              <TextField value={client.contactName} onChange={(contactName) => onUpdate({ contactName })} />
            </Field>
            <Field label="Phone / WhatsApp">
              <TextField value={client.contactPhone} onChange={(contactPhone) => onUpdate({ contactPhone })} />
            </Field>
            <Field label="Contact email">
              <TextField value={client.contactEmail} onChange={(contactEmail) => onUpdate({ contactEmail })} />
            </Field>
          </Group>

          <Group title="Hosting">
            <Field label="Where is it hosted">
              <TextField
                value={client.hostingProvider}
                placeholder="Provider, e.g. Hostinger, own VPS"
                onChange={(hostingProvider) => onUpdate({ hostingProvider })}
              />
            </Field>
            <Field label="Plan / server details">
              <TextField
                value={client.hostingDetails}
                placeholder="Plan, IP, region..."
                onChange={(hostingDetails) => onUpdate({ hostingDetails })}
              />
            </Field>
            <Field label="Started">
              <DateField value={client.hostingStarted} onChange={(hostingStarted) => onUpdate({ hostingStarted })} />
            </Field>
            <Field label="Renews on" badgeDate={client.hostingRenewal}>
              <DateField value={client.hostingRenewal} onChange={(hostingRenewal) => onUpdate({ hostingRenewal })} />
            </Field>
            <Field label="Cost">
              <TextField
                value={client.hostingCost}
                placeholder="e.g. $60 / year"
                onChange={(hostingCost) => onUpdate({ hostingCost })}
              />
            </Field>
          </Group>

          <Group title="Domain">
            <Field label="Domain name">
              <TextField value={client.domainName} placeholder="example.com" onChange={(domainName) => onUpdate({ domainName })} />
            </Field>
            <Field label="Registrar">
              <TextField
                value={client.domainRegistrar}
                placeholder="GoDaddy, Namecheap..."
                onChange={(domainRegistrar) => onUpdate({ domainRegistrar })}
              />
            </Field>
            <Field label="Registered">
              <DateField value={client.domainStarted} onChange={(domainStarted) => onUpdate({ domainStarted })} />
            </Field>
            <Field label="Renews on" badgeDate={client.domainRenewal}>
              <DateField value={client.domainRenewal} onChange={(domainRenewal) => onUpdate({ domainRenewal })} />
            </Field>
            <Field label="Cost">
              <TextField
                value={client.domainCost}
                placeholder="e.g. $15 / year"
                onChange={(domainCost) => onUpdate({ domainCost })}
              />
            </Field>
          </Group>

          <Group title="Email">
            <Field label="Email provider">
              <TextField
                value={client.mailProvider}
                placeholder="Zoho Mail Lite..."
                onChange={(mailProvider) => onUpdate({ mailProvider })}
              />
            </Field>
            <Field label="Started">
              <DateField value={client.mailStarted} onChange={(mailStarted) => onUpdate({ mailStarted })} />
            </Field>
            <Field label="Renews on" badgeDate={client.mailRenewal}>
              <DateField value={client.mailRenewal} onChange={(mailRenewal) => onUpdate({ mailRenewal })} />
            </Field>
            <Field label="Cost">
              <TextField
                value={client.mailCost}
                placeholder="e.g. $1 / user / month"
                onChange={(mailCost) => onUpdate({ mailCost })}
              />
            </Field>
          </Group>

          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-accent">
                Logins and settings
              </h3>
              <div className="flex flex-wrap gap-2">
                {LOGIN_PRESETS.map((preset) => (
                  <button
                    key={preset.short}
                    onClick={() => onUpdate({ logins: [...client.logins, emptyLogin(preset.label)] })}
                    className="studio-button"
                  >
                    <Plus className="h-4 w-4" />
                    {preset.short}
                  </button>
                ))}
              </div>
            </div>

            {client.logins.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No logins saved. Add the Zoho mailboxes, hosting panel, or registrar account here.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {client.logins.map((login) => (
                  <LoginRow
                    key={login.id}
                    login={login}
                    onChange={(patch) => updateLogin(login.id, patch)}
                    onDelete={() =>
                      onUpdate({ logins: client.logins.filter((item) => item.id !== login.id) })
                    }
                  />
                ))}
              </div>
            )}
          </div>

          <Field label="Notes">
            <textarea
              value={client.notes}
              onChange={(event) => onUpdate({ notes: event.target.value })}
              rows={3}
              placeholder="DNS records, who pays renewals, anything to remember"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-accent"
            />
          </Field>
        </div>
      ) : null}
    </article>
  );
}

function LoginRow({
  login,
  onChange,
  onDelete,
}: {
  login: ClientLogin;
  onChange: (patch: Partial<ClientLogin>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/50 p-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Label">
          <TextField value={login.label} placeholder="Zoho mailbox" onChange={(label) => onChange({ label })} />
        </Field>
        <Field label="Login URL">
          <TextField value={login.url} placeholder="https://" onChange={(url) => onChange({ url })} />
        </Field>
        <Field label="Email / username">
          <CopyableText value={login.username} onChange={(username) => onChange({ username })} />
        </Field>
        <Field label="Password">
          <PasswordField value={login.password} onChange={(password) => onChange({ password })} />
        </Field>
      </div>
      <div className="mt-3 flex items-end gap-3">
        <div className="flex-1">
          <Field label="Settings / notes">
            <TextField
              value={login.notes}
              placeholder="IMAP, SMTP, 2FA phone, recovery email..."
              onChange={(notes) => onChange({ notes })}
            />
          </Field>
        </div>
        <button
          onClick={onDelete}
          className="studio-icon-button mb-0.5 text-muted-foreground hover:text-destructive"
          title="Delete login"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-accent">{title}</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  badgeDate,
  children,
}: {
  label: string;
  badgeDate?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="flex min-h-[22px] items-center justify-between gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
        {badgeDate ? <DueBadge days={daysUntil(badgeDate)} date={badgeDate} /> : null}
      </span>
      {children}
    </div>
  );
}

const inputClass =
  "w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-accent";

function TextField({
  value,
  onChange,
  placeholder,
  list,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  list?: string;
}) {
  return (
    <input
      value={value}
      list={list}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      className={inputClass}
    />
  );
}

function DateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={inputClass}
    />
  );
}

function useCopied() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy(value: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return { copied, copy };
}

function CopyButton({ value }: { value: string }) {
  const { copied, copy } = useCopied();

  return (
    <button
      type="button"
      onClick={() => void copy(value)}
      className="studio-icon-button shrink-0 text-muted-foreground hover:text-foreground"
      title={copied ? "Copied" : "Copy"}
    >
      {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function CopyableText({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      <TextField value={value} onChange={onChange} />
      <CopyButton value={value} />
    </div>
  );
}

function PasswordField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="new-password"
        className={`${inputClass} font-mono`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="studio-icon-button shrink-0 text-muted-foreground hover:text-foreground"
        title={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
      <CopyButton value={value} />
    </div>
  );
}

function collectRenewals(clients: ClientRecord[]) {
  const items: { clientName: string; kind: RenewalKind; date: string; days: number }[] = [];

  for (const client of clients) {
    const dates: [RenewalKind, string][] = [
      ["Hosting", client.hostingRenewal],
      ["Domain", client.domainRenewal],
      ["Email", client.mailRenewal],
    ];
    for (const [kind, date] of dates) {
      if (!date) continue;
      const days = daysUntil(date);
      if (days <= RENEWAL_WINDOW_DAYS) items.push({ clientName: client.name, kind, date, days });
    }
  }

  return items.sort((a, b) => a.days - b.days);
}

function daysUntil(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return Number.POSITIVE_INFINITY;
  const target = new Date(year, month - 1, day).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86_400_000);
}

function emptyClient(): ClientRecord {
  return {
    id: crypto.randomUUID(),
    name: "",
    website: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    hostingProvider: "",
    hostingDetails: "",
    hostingStarted: "",
    hostingRenewal: "",
    hostingCost: "",
    domainName: "",
    domainRegistrar: "",
    domainStarted: "",
    domainRenewal: "",
    domainCost: "",
    mailProvider: "",
    mailStarted: "",
    mailRenewal: "",
    mailCost: "",
    logins: [],
    notes: "",
  };
}

function emptyLogin(label: string): ClientLogin {
  return { id: crypto.randomUUID(), label, url: "", username: "", password: "", notes: "" };
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeContent(content: Partial<ClientsVaultContent> | undefined): ClientsVaultContent {
  const base = emptyClient();
  const clients = Array.isArray(content?.clients) ? content.clients : [];

  return {
    version: 1,
    clients: clients.map((raw) => {
      const client = raw as Partial<ClientRecord>;
      const merged = { ...base } as Record<string, unknown>;
      for (const key of Object.keys(base)) {
        if (key === "logins") continue;
        merged[key] = text((client as Record<string, unknown>)[key]);
      }
      merged.id = text(client.id) || crypto.randomUUID();
      merged.logins = (Array.isArray(client.logins) ? client.logins : []).map((login) => ({
        id: text(login?.id) || crypto.randomUUID(),
        label: text(login?.label),
        url: text(login?.url),
        username: text(login?.username),
        password: text(login?.password),
        notes: text(login?.notes),
      }));
      return merged as unknown as ClientRecord;
    }),
  };
}
