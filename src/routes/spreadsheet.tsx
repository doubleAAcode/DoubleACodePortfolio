import { createFileRoute } from "@tanstack/react-router";
import {
  Banknote,
  Cloud,
  Download,
  Lock,
  LogOut,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Settings,
  Trash2,
  Upload,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ClientPayment,
  ExpensePayer,
  Finder,
  PartnerPayout,
  PayoutType,
  Person,
  ProjectExpense,
  ProjectStatus,
  SpreadsheetDocument,
  StudioProject,
  StudioSettings,
  StudioSpreadsheetData,
} from "@/lib/spreadsheet.types";

export const Route = createFileRoute("/spreadsheet")({
  head: () => ({
    meta: [
      { title: "Double A Studio Spreadsheet" },
      {
        name: "description",
        content: "Private Double A studio client, project, expense, and payout tracker.",
      },
    ],
  }),
  component: StudioSpreadsheet,
});

type SaveState = "idle" | "loading" | "saving" | "saved" | "error";
type ActiveTab = "dashboard" | "projects" | "payments" | "expenses" | "payouts" | "balances" | "settings";
type GitHubSheetConfig = {
  owner: string;
  repo: string;
  branch: string;
  path: string;
};
type GitHubContentResponse = {
  content?: string;
  sha?: string;
};
type GitHubWriteResponse = {
  content?: {
    sha?: string;
  };
};
type GitHubRequestError = Error & {
  status?: number;
};
type LegacyRow = {
  id?: string;
  client?: string;
  project?: string;
  status?: string;
  finder?: string;
  projectPrice?: number;
  amountPaid?: number;
  expenses?: number;
  expensesPaidBy?: string;
  notes?: string;
};

const AUTH_KEY = "double-a-spreadsheet-authenticated";
const TOKEN_KEY = "double-a-spreadsheet-token";
const CONFIG_KEY = "double-a-spreadsheet-github-config";
const DEFAULT_GITHUB_CONFIG: GitHubSheetConfig = {
  owner: "doubleAAcode",
  repo: "DoubleACodePortfolio",
  branch: "main",
  path: "data/studio-spreadsheet.json",
};
const SAVE_DEBOUNCE_MS = 1500;

const DEFAULT_SETTINGS: StudioSettings = {
  finderFeeRate: 0.15,
  husseinDefaultWorkPercent: 0.5,
  saeedDefaultWorkPercent: 0.5,
};

const EMPTY_SHEET: StudioSpreadsheetData = {
  version: 2,
  settings: DEFAULT_SETTINGS,
  projects: [],
  clientPayments: [],
  expenses: [],
  payouts: [],
};

const PEOPLE: Person[] = ["Hussein", "Saeed", "Third Party"];
const FINDERS: Finder[] = ["Nobody", "Hussein", "Saeed", "Third Party"];
const EXPENSE_PAYERS: ExpensePayer[] = ["Studio", "Hussein", "Saeed", "Third Party"];
const PROJECT_STATUSES: ProjectStatus[] = ["Lead", "In Progress", "Completed", "Cancelled"];
const PAYOUT_TYPES: PayoutType[] = ["Profit Share", "Expense Reimbursement", "Finder Fee", "Mixed"];

function StudioSpreadsheet() {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setAuthenticated(
      Boolean(window.sessionStorage.getItem(TOKEN_KEY)) &&
        window.sessionStorage.getItem(AUTH_KEY) === "true",
    );
  }, []);

  if (!authenticated) {
    return <PasswordGate onUnlock={() => setAuthenticated(true)} />;
  }

  return <SpreadsheetApp onLock={() => setAuthenticated(false)} />;
}

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [token, setToken] = useState("");
  const [config, setConfig] = useState<GitHubSheetConfig>(DEFAULT_GITHUB_CONFIG);
  const [error, setError] = useState("");
  const [showConfig, setShowConfig] = useState(false);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    try {
      if (!token.trim()) throw new Error("Paste a GitHub token first.");
      if (!config.owner.trim() || !config.repo.trim() || !config.branch.trim() || !config.path.trim()) {
        throw new Error("GitHub owner, repo, branch, and path are required.");
      }
      window.sessionStorage.setItem(TOKEN_KEY, token.trim());
      window.sessionStorage.setItem(CONFIG_KEY, JSON.stringify(normalizeGitHubConfig(config)));
      window.sessionStorage.setItem(AUTH_KEY, "true");
      onUnlock();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="absolute inset-0 -z-10 bg-grid opacity-20" />
      <div className="absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(ellipse_at_top,oklch(0.65_0.27_5_/_0.18),transparent_62%)]" />

      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <div className="w-full rounded-3xl border border-border bg-surface/70 p-6 shadow-[0_30px_100px_-55px_oklch(0.65_0.27_5/0.85)] backdrop-blur md:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-background">
              <Lock className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold">Studio Spreadsheet</h1>
              <p className="text-xs text-muted-foreground">GitHub-saved private finance route</p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                GitHub token
              </span>
              <input
                value={token}
                onChange={(event) => {
                  setToken(event.target.value);
                  setError("");
                }}
                required
                autoComplete="off"
                className="rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
                placeholder="github_pat_..."
              />
            </label>

            <button
              type="button"
              onClick={() => setShowConfig((current) => !current)}
              className="text-xs font-medium text-accent hover:text-accent-bright"
            >
              {showConfig ? "Hide repo settings" : "Repo settings"}
            </button>

            {showConfig ? (
              <div className="grid gap-3 rounded-2xl border border-border bg-background/65 p-3">
                <RepoInput
                  label="Owner"
                  value={config.owner}
                  onChange={(value) => setConfig((current) => ({ ...current, owner: value }))}
                />
                <RepoInput
                  label="Repo"
                  value={config.repo}
                  onChange={(value) => setConfig((current) => ({ ...current, repo: value }))}
                />
                <RepoInput
                  label="Branch"
                  value={config.branch}
                  onChange={(value) => setConfig((current) => ({ ...current, branch: value }))}
                />
                <RepoInput
                  label="JSON path"
                  value={config.path}
                  onChange={(value) => setConfig((current) => ({ ...current, path: value }))}
                />
              </div>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <button
              type="submit"
              className="w-full rounded-full px-6 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.01]"
              style={{ background: "var(--gradient-brand)" }}
            >
              Open spreadsheet
            </button>

            <p className="text-xs leading-relaxed text-muted-foreground">
              The token is kept only in this browser session. Give it contents read/write access
              to the selected private repo.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}

function SpreadsheetApp({ onLock }: { onLock: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const skipNextSave = useRef(true);
  const saveInFlight = useRef(false);
  const pendingData = useRef<StudioSpreadsheetData | null>(null);
  const latestData = useRef<StudioSpreadsheetData>(EMPTY_SHEET);
  const cloudSha = useRef<string | undefined>(undefined);
  const [sessionToken, setSessionToken] = useState("");
  const [githubConfig, setGithubConfig] = useState<GitHubSheetConfig>(DEFAULT_GITHUB_CONFIG);
  const [data, setData] = useState<StudioSpreadsheetData>(EMPTY_SHEET);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [statusMessage, setStatusMessage] = useState("Loading GitHub sheet...");
  const [lastSavedAt, setLastSavedAt] = useState<string>("");

  useEffect(() => {
    setSessionToken(window.sessionStorage.getItem(TOKEN_KEY) ?? "");
    setGithubConfig(readStoredConfig());
  }, []);

  useEffect(() => {
    if (!sessionToken) return;
    void loadCloudSheet();
  }, [sessionToken, githubConfig]);

  useEffect(() => {
    latestData.current = data;

    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    setSaveState("saving");
    setStatusMessage("Saving changes to GitHub...");
    const timeout = window.setTimeout(() => {
      void saveCloudSheet(latestData.current);
    }, SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [data]);

  const model = useMemo(() => calculateStudioModel(data), [data]);

  async function loadCloudSheet() {
    setSaveState("loading");
    setStatusMessage("Loading GitHub sheet...");

    try {
      const { document, sha } = await loadGitHubSpreadsheet(sessionToken, githubConfig);
      cloudSha.current = sha;
      const nextData = normalizeSheet(document);

      pendingData.current = null;
      skipNextSave.current = true;
      setData(nextData);
      setLastSavedAt(document.updatedAt ?? "");
      setSaveState("saved");
      setStatusMessage(document.updatedAt ? "GitHub sheet loaded." : "New GitHub sheet ready.");

      if (!document.updatedAt) {
        await saveCloudSheet(nextData);
      }
    } catch (err) {
      setSaveState("error");
      setStatusMessage(err instanceof Error ? err.message : "Could not load GitHub sheet.");
      setData(EMPTY_SHEET);
    }
  }

  async function saveCloudSheet(nextData: StudioSpreadsheetData) {
    pendingData.current = nextData;
    if (saveInFlight.current) return;

    saveInFlight.current = true;
    setSaveState("saving");
    setStatusMessage("Saving to GitHub...");

    let shouldFlushQueue = true;

    try {
      let saved: SpreadsheetDocument | undefined;

      while (pendingData.current) {
        const dataToSave = pendingData.current;
        pendingData.current = null;
        const result = await saveGitHubSpreadsheet(sessionToken, githubConfig, dataToSave, cloudSha.current);
        cloudSha.current = result.sha;
        saved = result.document;
      }

      setSaveState("saved");
      setLastSavedAt(saved?.updatedAt ?? new Date().toISOString());
      setStatusMessage("Saved to GitHub.");
    } catch (err) {
      pendingData.current = latestData.current;
      cloudSha.current = undefined;
      shouldFlushQueue = false;
      setSaveState("error");
      setStatusMessage(
        err instanceof Error
          ? `${err.message} Latest edits are still queued; make another change or press Refresh after confirming GitHub.`
          : "Could not save to GitHub. Latest edits are still queued.",
      );
    } finally {
      saveInFlight.current = false;

      if (shouldFlushQueue && pendingData.current) {
        void saveCloudSheet(pendingData.current);
      }
    }
  }

  function updateData(updater: (current: StudioSpreadsheetData) => StudioSpreadsheetData) {
    setData((current) => updater(current));
  }

  function addProject() {
    updateData((current) => ({
      ...current,
      projects: [...current.projects, emptyProject(nextProjectId(current.projects), current.settings)],
    }));
    setActiveTab("projects");
  }

  function addPayment() {
    updateData((current) => ({
      ...current,
      clientPayments: [...current.clientPayments, emptyPayment(current.projects[0]?.projectId ?? "")],
    }));
    setActiveTab("payments");
  }

  function addExpense() {
    updateData((current) => ({
      ...current,
      expenses: [...current.expenses, emptyExpense(current.projects[0]?.projectId ?? "")],
    }));
    setActiveTab("expenses");
  }

  function addPayout() {
    updateData((current) => ({
      ...current,
      payouts: [...current.payouts, emptyPayout()],
    }));
    setActiveTab("payouts");
  }

  function lock() {
    window.sessionStorage.removeItem(AUTH_KEY);
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(CONFIG_KEY);
    onLock();
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `double-a-studio-spreadsheet-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function importData(file: File | undefined) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as SpreadsheetDocument | StudioSpreadsheetData | LegacyRow[];
        if (Array.isArray(parsed)) {
          setData(normalizeSheet({ rows: parsed, updatedAt: "" }));
        } else if ("data" in parsed || "rows" in parsed) {
          setData(normalizeSheet(parsed as SpreadsheetDocument));
        } else {
          setData(normalizeSheet({ data: parsed as StudioSpreadsheetData, updatedAt: "" }));
        }
      } catch {
        setSaveState("error");
        setStatusMessage("Imported file is not valid spreadsheet JSON.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground md:px-6 md:py-10">
      <div className="absolute inset-0 -z-10 bg-grid opacity-20" />
      <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(ellipse_at_top,oklch(0.55_0.24_305_/_0.16),transparent_65%)]" />

      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-accent">
              Double A private route
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight md:text-6xl">
              Studio <span className="text-gradient-brand">Ledger</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              A workbook-style tracker for projects, client payments, expenses, finder fees, and
              partner balances.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={addProject} className="studio-button-primary" disabled={saveState === "loading"}>
              <Plus className="h-4 w-4" />
              Add project
            </button>
            <button onClick={() => void loadCloudSheet()} className="studio-button">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button onClick={exportData} className="studio-button">
              <Download className="h-4 w-4" />
              Export
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="studio-button">
              <Upload className="h-4 w-4" />
              Import
            </button>
            <button onClick={lock} className="studio-button">
              <LogOut className="h-4 w-4" />
              Lock
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => importData(event.target.files?.[0])}
            />
          </div>
        </header>

        <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-border bg-surface/60 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Cloud className={["h-4 w-4", saveState === "error" ? "text-destructive" : "text-accent"].join(" ")} />
            <span>{statusMessage}</span>
          </div>
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {lastSavedAt ? `Last save ${new Date(lastSavedAt).toLocaleString()}` : "No save yet"}
          </span>
        </div>

        <section className="mt-6 grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-6">
          <SummaryCard label="Contract value" value={model.dashboard.contractValue} />
          <SummaryCard label="Client paid" value={model.dashboard.clientPaid} />
          <SummaryCard label="Remaining" value={model.dashboard.remainingFromClients} />
          <SummaryCard label="Expenses" value={model.dashboard.expenses} />
          <SummaryCard label="Finder fees" value={model.dashboard.finderFees} />
          <SummaryCard label="Net to split" value={model.dashboard.netProfitToSplit} />
        </section>

        <nav className="mt-6 flex gap-2 overflow-x-auto border-b border-border pb-3">
          {[
            ["dashboard", "Dashboard"],
            ["projects", "Projects"],
            ["payments", "Client Payments"],
            ["expenses", "Expenses"],
            ["payouts", "Payouts"],
            ["balances", "Balances"],
            ["settings", "Settings"],
          ].map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as ActiveTab)}
              className={[
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab
                  ? "border-accent bg-accent/15 text-accent-bright"
                  : "border-border bg-surface/40 text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </nav>

        {activeTab === "dashboard" ? <DashboardView data={data} model={model} /> : null}
        {activeTab === "projects" ? (
          <ProjectsView
            data={data}
            model={model}
            onAdd={addProject}
            onUpdate={(projects) => updateData((current) => ({ ...current, projects }))}
          />
        ) : null}
        {activeTab === "payments" ? (
          <PaymentsView
            data={data}
            onAdd={addPayment}
            onUpdate={(clientPayments) => updateData((current) => ({ ...current, clientPayments }))}
          />
        ) : null}
        {activeTab === "expenses" ? (
          <ExpensesView
            data={data}
            onAdd={addExpense}
            onUpdate={(expenses) => updateData((current) => ({ ...current, expenses }))}
          />
        ) : null}
        {activeTab === "payouts" ? (
          <PayoutsView
            data={data}
            onAdd={addPayout}
            onUpdate={(payouts) => updateData((current) => ({ ...current, payouts }))}
          />
        ) : null}
        {activeTab === "balances" ? <BalancesView model={model} /> : null}
        {activeTab === "settings" ? (
          <SettingsView
            settings={data.settings}
            onUpdate={(settings) => updateData((current) => ({ ...current, settings }))}
          />
        ) : null}
      </div>
    </main>
  );
}

function DashboardView({ data, model }: { data: StudioSpreadsheetData; model: StudioModel }) {
  return (
    <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-3xl border border-border bg-surface/55 p-5">
        <div className="flex items-center gap-3">
          <WalletCards className="h-5 w-5 text-accent" />
          <h2 className="font-display text-xl font-semibold">Cash Collected By</h2>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {PEOPLE.map((person) => (
            <MetricBlock key={person} label={person} value={model.dashboard.cashCollectedBy[person]} />
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-surface/55 p-5">
        <div className="flex items-center gap-3">
          <Banknote className="h-5 w-5 text-accent" />
          <h2 className="font-display text-xl font-semibold">Net Balances</h2>
        </div>
        <div className="mt-5 space-y-4">
          {PEOPLE.map((person) => (
            <PayoutLine key={person} label={`${person} net balance`} value={model.balances[person].netBalance} />
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-surface/55 p-5 lg:col-span-2">
        <div className="flex items-center gap-3">
          <ReceiptText className="h-5 w-5 text-accent" />
          <h2 className="font-display text-xl font-semibold">Recent Activity</h2>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <ActivityList
            title="Payments"
            rows={data.clientPayments.slice(-5).reverse().map((payment) => ({
              label: projectLabel(data, payment.projectId),
              meta: `${payment.collectedBy || "Unassigned"} · ${payment.paymentMethod || "No method"}`,
              value: payment.amount,
            }))}
          />
          <ActivityList
            title="Expenses"
            rows={data.expenses.slice(-5).reverse().map((expense) => ({
              label: projectLabel(data, expense.projectId),
              meta: `${expense.paidBy} · ${expense.expenseType || "Expense"}`,
              value: expense.amount,
            }))}
          />
          <ActivityList
            title="Payouts"
            rows={data.payouts.slice(-5).reverse().map((payout) => ({
              label: payout.paidTo,
              meta: `${payout.paidTo} · ${payout.payoutType}`,
              value: payout.amount,
            }))}
          />
        </div>
      </div>
    </section>
  );
}

function ProjectsView({
  data,
  model,
  onAdd,
  onUpdate,
}: {
  data: StudioSpreadsheetData;
  model: StudioModel;
  onAdd: () => void;
  onUpdate: (projects: StudioProject[]) => void;
}) {
  function updateRow(id: string, patch: Partial<StudioProject>) {
    onUpdate(data.projects.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeRow(id: string) {
    onUpdate(data.projects.filter((row) => row.id !== id));
  }

  return (
    <SheetPanel
      title="Projects"
      subtitle="Master contract table. Payments and expenses roll up per project."
      actionLabel="Add project"
      onAdd={onAdd}
    >
      <div className="overflow-x-auto">
        <table className="min-w-[1800px] border-collapse text-left text-sm">
          <TableHead
            headers={[
              "Project ID",
              "Project",
              "Client",
              "Total price",
              "Status",
              "Finder",
              "Hussein %",
              "Saeed %",
              "Client paid",
              "Remaining",
              "Expenses",
              "Finder fee",
              "Net to split",
              "Hussein due",
              "Saeed due",
              "Third party due",
              "Notes",
              "",
            ]}
          />
          <tbody>
            {data.projects.map((row) => {
              const rollup = model.projects[row.projectId] ?? emptyProjectRollup(row);
              return (
                <tr key={row.id} className="border-t border-border/70">
                  <Td><TextInput value={row.projectId} onChange={(value) => updateRow(row.id, { projectId: value })} /></Td>
                  <Td><TextInput value={row.name} placeholder="Project name" onChange={(value) => updateRow(row.id, { name: value })} /></Td>
                  <Td><TextInput value={row.client} placeholder="Client" onChange={(value) => updateRow(row.id, { client: value })} /></Td>
                  <Td><MoneyInput value={row.totalPrice} onChange={(value) => updateRow(row.id, { totalPrice: value })} /></Td>
                  <Td><SelectInput value={row.status} options={PROJECT_STATUSES} onChange={(value) => updateRow(row.id, { status: value as ProjectStatus })} /></Td>
                  <Td><SelectInput value={row.finder} options={FINDERS} onChange={(value) => updateRow(row.id, { finder: value as Finder })} /></Td>
                  <Td><PercentInput value={row.husseinWorkPercent} onChange={(value) => updateRow(row.id, { husseinWorkPercent: value })} /></Td>
                  <Td><PercentInput value={row.saeedWorkPercent} onChange={(value) => updateRow(row.id, { saeedWorkPercent: value })} /></Td>
                  <ReadOnlyMoney value={rollup.clientPaid} />
                  <ReadOnlyMoney value={rollup.remainingFromClient} />
                  <ReadOnlyMoney value={rollup.expenses} />
                  <ReadOnlyMoney value={rollup.finderFee} />
                  <ReadOnlyMoney value={rollup.netProfitToSplit} />
                  <ReadOnlyMoney value={rollup.totalDue.Hussein} highlight />
                  <ReadOnlyMoney value={rollup.totalDue.Saeed} highlight />
                  <ReadOnlyMoney value={rollup.totalDue["Third Party"]} />
                  <Td><TextInput value={row.notes} placeholder="Optional" onChange={(value) => updateRow(row.id, { notes: value })} /></Td>
                  <DeleteCell onDelete={() => removeRow(row.id)} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SheetPanel>
  );
}

function PaymentsView({
  data,
  onAdd,
  onUpdate,
}: {
  data: StudioSpreadsheetData;
  onAdd: () => void;
  onUpdate: (payments: ClientPayment[]) => void;
}) {
  function updateRow(id: string, patch: Partial<ClientPayment>) {
    onUpdate(data.clientPayments.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  return (
    <SheetPanel
      title="Client Payments"
      subtitle="Track partial payments received. Project name is inferred from the selected project ID."
      actionLabel="Add payment"
      onAdd={onAdd}
    >
      <LedgerTable
        minWidth="1120px"
        headers={["Date", "Project ID", "Project name", "Amount paid", "Collected by", "Payment method", "Notes", ""]}
      >
        {data.clientPayments.map((row) => (
          <tr key={row.id} className="border-t border-border/70">
            <Td><DateInput value={row.date} onChange={(value) => updateRow(row.id, { date: value })} /></Td>
            <Td><SelectInput value={row.projectId} options={projectIds(data)} onChange={(value) => updateRow(row.id, { projectId: value })} /></Td>
            <ReadOnlyText value={projectName(data, row.projectId)} />
            <Td><MoneyInput value={row.amount} onChange={(value) => updateRow(row.id, { amount: value })} /></Td>
            <Td><SelectInput value={row.collectedBy} options={["", ...PEOPLE]} onChange={(value) => updateRow(row.id, { collectedBy: value as Person | "" })} /></Td>
            <Td><TextInput value={row.paymentMethod} placeholder="Whish, cash..." onChange={(value) => updateRow(row.id, { paymentMethod: value })} /></Td>
            <Td><TextInput value={row.notes} placeholder="Optional" onChange={(value) => updateRow(row.id, { notes: value })} /></Td>
            <DeleteCell onDelete={() => onUpdate(data.clientPayments.filter((item) => item.id !== row.id))} />
          </tr>
        ))}
      </LedgerTable>
    </SheetPanel>
  );
}

function ExpensesView({
  data,
  onAdd,
  onUpdate,
}: {
  data: StudioSpreadsheetData;
  onAdd: () => void;
  onUpdate: (expenses: ProjectExpense[]) => void;
}) {
  function updateRow(id: string, patch: Partial<ProjectExpense>) {
    onUpdate(data.expenses.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  return (
    <SheetPanel
      title="Expenses"
      subtitle="Costs paid for each project. Expenses paid by Hussein or Saeed become reimbursements."
      actionLabel="Add expense"
      onAdd={onAdd}
    >
      <LedgerTable
        minWidth="1120px"
        headers={["Date", "Project ID", "Project name", "Expense type", "Paid by", "Amount", "Notes", ""]}
      >
        {data.expenses.map((row) => (
          <tr key={row.id} className="border-t border-border/70">
            <Td><DateInput value={row.date} onChange={(value) => updateRow(row.id, { date: value })} /></Td>
            <Td><SelectInput value={row.projectId} options={projectIds(data)} onChange={(value) => updateRow(row.id, { projectId: value })} /></Td>
            <ReadOnlyText value={projectName(data, row.projectId)} />
            <Td><TextInput value={row.expenseType} placeholder="Domain / Hosting" onChange={(value) => updateRow(row.id, { expenseType: value })} /></Td>
            <Td><SelectInput value={row.paidBy} options={EXPENSE_PAYERS} onChange={(value) => updateRow(row.id, { paidBy: value as ExpensePayer })} /></Td>
            <Td><MoneyInput value={row.amount} onChange={(value) => updateRow(row.id, { amount: value })} /></Td>
            <Td><TextInput value={row.notes} placeholder="Optional" onChange={(value) => updateRow(row.id, { notes: value })} /></Td>
            <DeleteCell onDelete={() => onUpdate(data.expenses.filter((item) => item.id !== row.id))} />
          </tr>
        ))}
      </LedgerTable>
    </SheetPanel>
  );
}

function PayoutsView({
  data,
  onAdd,
  onUpdate,
}: {
  data: StudioSpreadsheetData;
  onAdd: () => void;
  onUpdate: (payouts: PartnerPayout[]) => void;
}) {
  function updateRow(id: string, patch: Partial<PartnerPayout>) {
    onUpdate(data.payouts.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  return (
    <SheetPanel
      title="Partner Payouts"
      subtitle="Actual money paid out to each person. Payouts are not tied to a project."
      actionLabel="Add payout"
      onAdd={onAdd}
    >
      <LedgerTable
        minWidth="820px"
        headers={["Date", "Paid to", "Amount", "Payout type", "Notes", ""]}
      >
        {data.payouts.map((row) => (
          <tr key={row.id} className="border-t border-border/70">
            <Td><DateInput value={row.date} onChange={(value) => updateRow(row.id, { date: value })} /></Td>
            <Td><SelectInput value={row.paidTo} options={PEOPLE} onChange={(value) => updateRow(row.id, { paidTo: value as Person })} /></Td>
            <Td><MoneyInput value={row.amount} onChange={(value) => updateRow(row.id, { amount: value })} /></Td>
            <Td><SelectInput value={row.payoutType} options={PAYOUT_TYPES} onChange={(value) => updateRow(row.id, { payoutType: value as PayoutType })} /></Td>
            <Td><TextInput value={row.notes} placeholder="Optional" onChange={(value) => updateRow(row.id, { notes: value })} /></Td>
            <DeleteCell onDelete={() => onUpdate(data.payouts.filter((item) => item.id !== row.id))} />
          </tr>
        ))}
      </LedgerTable>
    </SheetPanel>
  );
}

function BalancesView({ model }: { model: StudioModel }) {
  return (
    <SheetPanel
      title="Partner Balances"
      subtitle="Positive net balance means this person should receive money. Negative means they have already received or absorbed more than due."
    >
      <div className="overflow-x-auto">
        <table className="min-w-[920px] border-collapse text-left text-sm">
          <TableHead
            headers={[
              "Person",
              "Profit share earned",
              "Finder fees earned",
              "Expense reimbursements",
              "Total due",
              "Already paid out",
              "Net balance",
            ]}
          />
          <tbody>
            {PEOPLE.map((person) => {
              const balance = model.balances[person];
              return (
                <tr key={person} className="border-t border-border/70">
                  <Td><span className="font-medium">{person}</span></Td>
                  <ReadOnlyMoney value={balance.profitShare} />
                  <ReadOnlyMoney value={balance.finderFees} />
                  <ReadOnlyMoney value={balance.expenseReimbursements} />
                  <ReadOnlyMoney value={balance.totalDue} highlight />
                  <ReadOnlyMoney value={balance.paidOut} />
                  <ReadOnlyMoney value={balance.netBalance} highlight />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SheetPanel>
  );
}

function SettingsView({
  settings,
  onUpdate,
}: {
  settings: StudioSettings;
  onUpdate: (settings: StudioSettings) => void;
}) {
  return (
    <section className="mt-6 grid gap-4 md:grid-cols-3">
      <div className="rounded-3xl border border-border bg-surface/55 p-5">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-accent" />
          <h2 className="font-display text-xl font-semibold">Rules</h2>
        </div>
        <div className="mt-5 space-y-4">
          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Finder fee rate</span>
            <PercentInput
              value={settings.finderFeeRate}
              onChange={(finderFeeRate) => onUpdate({ ...settings, finderFeeRate })}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Default Hussein work %</span>
            <PercentInput
              value={settings.husseinDefaultWorkPercent}
              onChange={(husseinDefaultWorkPercent) => onUpdate({ ...settings, husseinDefaultWorkPercent })}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Default Saeed work %</span>
            <PercentInput
              value={settings.saeedDefaultWorkPercent}
              onChange={(saeedDefaultWorkPercent) => onUpdate({ ...settings, saeedDefaultWorkPercent })}
            />
          </label>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-surface/55 p-5 md:col-span-2">
        <h2 className="font-display text-xl font-semibold">Workbook Logic</h2>
        <div className="mt-4 grid gap-3 text-sm leading-relaxed text-muted-foreground md:grid-cols-2">
          <p><span className="text-foreground">Client paid</span> is the sum of Client Payments per project.</p>
          <p><span className="text-foreground">Remaining</span> is total price minus collected client payments.</p>
          <p><span className="text-foreground">Finder fee</span> is calculated after expenses: max(0, paid - expenses) × finder fee rate.</p>
          <p><span className="text-foreground">Net to split</span> is paid minus finder fee minus expenses.</p>
          <p><span className="text-foreground">Expense reimbursements</span> are added only for expenses paid by Hussein or Saeed.</p>
          <p><span className="text-foreground">Net balance</span> is total due minus actual payouts already recorded.</p>
        </div>
      </div>
    </section>
  );
}

function SheetPanel({
  title,
  subtitle,
  actionLabel,
  onAdd,
  children,
}: {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAdd?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-border bg-surface/55">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>
        {onAdd && actionLabel ? (
          <button onClick={onAdd} className="studio-button-primary">
            <Plus className="h-4 w-4" />
            {actionLabel}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function LedgerTable({
  headers,
  minWidth,
  children,
}: {
  headers: string[];
  minWidth: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-left text-sm" style={{ minWidth }}>
        <TableHead headers={headers} />
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function TableHead({ headers }: { headers: string[] }) {
  return (
    <thead className="bg-background/80 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
      <tr>
        {headers.map((header, index) => (
          <Th key={`${header}-${index}`}>{header}</Th>
        ))}
      </tr>
    </thead>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-background p-5">
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-2xl font-semibold text-gradient-brand">
        {formatMoney(value)}
      </div>
    </div>
  );
}

function MetricBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 font-mono text-lg">{formatMoney(value)}</div>
    </div>
  );
}

function ActivityList({ title, rows }: { title: string; rows: { label: string; meta: string; value: number }[] }) {
  return (
    <div className="rounded-2xl border border-border bg-background/50 p-4">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.length ? rows.map((row, index) => (
          <div key={`${row.label}-${index}`} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
            <div>
              <div className="text-sm text-foreground">{row.label}</div>
              <div className="text-xs text-muted-foreground">{row.meta}</div>
            </div>
            <div className="font-mono text-sm">{formatMoney(row.value)}</div>
          </div>
        )) : <p className="text-sm text-muted-foreground">No entries yet.</p>}
      </div>
    </div>
  );
}

function PayoutLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-foreground">{label}</span>
      <span className="font-mono text-sm">{formatMoney(value)}</span>
    </div>
  );
}

function RepoInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
      />
    </label>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="whitespace-nowrap px-3 py-3 font-medium">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-3 align-top">{children}</td>;
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full min-w-36 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-accent"
    />
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      type="date"
      className="w-36 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
    />
  );
}

function MoneyInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <input
      value={Number.isFinite(value) && value !== 0 ? value : ""}
      onChange={(event) => onChange(Number(event.target.value))}
      type="number"
      min="0"
      step="0.01"
      placeholder="0"
      className="w-28 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-accent"
    />
  );
}

function PercentInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <input
      value={Number.isFinite(value) ? Math.round(value * 1000) / 10 : 0}
      onChange={(event) => onChange(Math.max(0, Number(event.target.value)) / 100)}
      type="number"
      min="0"
      max="100"
      step="0.1"
      className="w-24 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
    />
  );
}

function SelectInput({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full min-w-28 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
    >
      {options.map((option) => (
        <option key={option || "blank"} value={option}>
          {option || "Unassigned"}
        </option>
      ))}
    </select>
  );
}

function ReadOnlyMoney({ value, highlight = false }: { value: number; highlight?: boolean }) {
  return (
    <td className="whitespace-nowrap px-3 py-3 align-middle">
      <span className={highlight ? "font-mono text-sm text-accent-bright" : "font-mono text-sm text-foreground"}>
        {formatMoney(value)}
      </span>
    </td>
  );
}

function ReadOnlyText({ value }: { value: string }) {
  return (
    <td className="min-w-48 px-3 py-3 align-middle text-sm text-muted-foreground">
      {value || "No project"}
    </td>
  );
}

function DeleteCell({ onDelete }: { onDelete: () => void }) {
  return (
    <td className="px-3 py-3 align-middle">
      <button
        onClick={onDelete}
        className="studio-icon-button text-muted-foreground hover:text-destructive"
        title="Delete row"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </td>
  );
}

type ProjectRollup = {
  project: StudioProject;
  clientPaid: number;
  remainingFromClient: number;
  expenses: number;
  finderFee: number;
  paidAfterFinderFee: number;
  netProfitToSplit: number;
  profitShare: Record<Person, number>;
  finderFeeTo: Record<Person, number>;
  reimbursements: Record<Person, number>;
  totalDue: Record<Person, number>;
};

type PersonBalance = {
  profitShare: number;
  finderFees: number;
  expenseReimbursements: number;
  totalDue: number;
  paidOut: number;
  netBalance: number;
};

type StudioModel = {
  projects: Record<string, ProjectRollup>;
  balances: Record<Person, PersonBalance>;
  dashboard: {
    contractValue: number;
    clientPaid: number;
    remainingFromClients: number;
    finderFees: number;
    expenses: number;
    netProfitToSplit: number;
    cashCollectedBy: Record<Person, number>;
  };
};

function calculateStudioModel(data: StudioSpreadsheetData): StudioModel {
  const projects: Record<string, ProjectRollup> = {};
  const balances = emptyBalances();
  const cashCollectedBy = emptyPersonRecord();

  for (const payment of data.clientPayments) {
    if (payment.collectedBy) cashCollectedBy[payment.collectedBy] += safeNumber(payment.amount);
  }

  for (const project of data.projects) {
    const clientPaid = sumByProject(data.clientPayments, project.projectId, "amount");
    const expenses = sumByProject(data.expenses, project.projectId, "amount");
    const finderFee = project.finder === "Nobody" ? 0 : Math.max(0, clientPaid - expenses) * data.settings.finderFeeRate;
    const paidAfterFinderFee = clientPaid - finderFee;
    const netProfitToSplit = paidAfterFinderFee - expenses;
    const profitShare = emptyPersonRecord();
    const finderFeeTo = emptyPersonRecord();
    const reimbursements = emptyPersonRecord();
    const totalDue = emptyPersonRecord();

    profitShare.Hussein = netProfitToSplit * safeNumber(project.husseinWorkPercent);
    profitShare.Saeed = netProfitToSplit * safeNumber(project.saeedWorkPercent);
    if (project.finder !== "Nobody") finderFeeTo[project.finder] = finderFee;

    for (const expense of data.expenses.filter((item) => item.projectId === project.projectId)) {
      if (expense.paidBy === "Hussein" || expense.paidBy === "Saeed") {
        reimbursements[expense.paidBy] += safeNumber(expense.amount);
      }
    }

    for (const person of PEOPLE) {
      totalDue[person] = profitShare[person] + finderFeeTo[person] + reimbursements[person];
      balances[person].profitShare += profitShare[person];
      balances[person].finderFees += finderFeeTo[person];
      balances[person].expenseReimbursements += reimbursements[person];
      balances[person].totalDue += totalDue[person];
    }

    projects[project.projectId] = {
      project,
      clientPaid,
      remainingFromClient: Math.max(0, safeNumber(project.totalPrice) - clientPaid),
      expenses,
      finderFee,
      paidAfterFinderFee,
      netProfitToSplit,
      profitShare,
      finderFeeTo,
      reimbursements,
      totalDue,
    };
  }

  for (const payout of data.payouts) {
    balances[payout.paidTo].paidOut += safeNumber(payout.amount);
  }

  for (const person of PEOPLE) {
    balances[person].netBalance = balances[person].totalDue - balances[person].paidOut;
  }

  return {
    projects,
    balances,
    dashboard: {
      contractValue: data.projects.reduce((sum, project) => sum + safeNumber(project.totalPrice), 0),
      clientPaid: Object.values(projects).reduce((sum, project) => sum + project.clientPaid, 0),
      remainingFromClients: Object.values(projects).reduce((sum, project) => sum + project.remainingFromClient, 0),
      finderFees: Object.values(projects).reduce((sum, project) => sum + project.finderFee, 0),
      expenses: Object.values(projects).reduce((sum, project) => sum + project.expenses, 0),
      netProfitToSplit: Object.values(projects).reduce((sum, project) => sum + project.netProfitToSplit, 0),
      cashCollectedBy,
    },
  };
}

function emptyProjectRollup(project: StudioProject): ProjectRollup {
  return {
    project,
    clientPaid: 0,
    remainingFromClient: safeNumber(project.totalPrice),
    expenses: 0,
    finderFee: 0,
    paidAfterFinderFee: 0,
    netProfitToSplit: 0,
    profitShare: emptyPersonRecord(),
    finderFeeTo: emptyPersonRecord(),
    reimbursements: emptyPersonRecord(),
    totalDue: emptyPersonRecord(),
  };
}

function emptyBalances(): Record<Person, PersonBalance> {
  return {
    Hussein: emptyBalance(),
    Saeed: emptyBalance(),
    "Third Party": emptyBalance(),
  };
}

function emptyBalance(): PersonBalance {
  return {
    profitShare: 0,
    finderFees: 0,
    expenseReimbursements: 0,
    totalDue: 0,
    paidOut: 0,
    netBalance: 0,
  };
}

function emptyPersonRecord(): Record<Person, number> {
  return { Hussein: 0, Saeed: 0, "Third Party": 0 };
}

function normalizeSheet(document: SpreadsheetDocument): StudioSpreadsheetData {
  if (document.data?.version === 2) {
    return {
      version: 2,
      settings: normalizeSettings(document.data.settings),
      projects: (document.data.projects ?? []).map(normalizeProject),
      clientPayments: (document.data.clientPayments ?? []).map(normalizePayment),
      expenses: (document.data.expenses ?? []).map(normalizeExpense),
      payouts: (document.data.payouts ?? []).map(normalizePayout),
    };
  }

  if (Array.isArray(document.rows)) {
    return migrateLegacyRows(document.rows as LegacyRow[]);
  }

  return EMPTY_SHEET;
}

function migrateLegacyRows(rows: LegacyRow[]): StudioSpreadsheetData {
  const projects = rows.map((row, index) => {
    const projectId = `P${String(index + 1).padStart(3, "0")}`;
    return normalizeProject({
      id: row.id ?? makeId(),
      projectId,
      name: row.project ?? "",
      client: row.client ?? "",
      totalPrice: safeNumber(row.projectPrice ?? row.amountPaid),
      status: normalizeStatus(row.status),
      finder: normalizeFinder(row.finder),
      husseinWorkPercent: DEFAULT_SETTINGS.husseinDefaultWorkPercent,
      saeedWorkPercent: DEFAULT_SETTINGS.saeedDefaultWorkPercent,
      notes: row.notes ?? "",
    });
  });

  const clientPayments = rows
    .map((row, index) => ({
      id: makeId(),
      date: todayInput(),
      projectId: projects[index]?.projectId ?? "",
      amount: safeNumber(row.amountPaid),
      collectedBy: "" as const,
      paymentMethod: "",
      notes: "",
    }))
    .filter((payment) => payment.amount > 0)
    .map(normalizePayment);

  const expenses = rows
    .map((row, index) => ({
      id: makeId(),
      date: todayInput(),
      projectId: projects[index]?.projectId ?? "",
      expenseType: "General",
      paidBy: normalizeExpensePayer(row.expensesPaidBy),
      amount: safeNumber(row.expenses),
      notes: "",
    }))
    .filter((expense) => expense.amount > 0)
    .map(normalizeExpense);

  return {
    version: 2,
    settings: DEFAULT_SETTINGS,
    projects,
    clientPayments,
    expenses,
    payouts: [],
  };
}

function normalizeSettings(settings: Partial<StudioSettings> | undefined): StudioSettings {
  return {
    finderFeeRate: safeNumber(settings?.finderFeeRate || DEFAULT_SETTINGS.finderFeeRate),
    husseinDefaultWorkPercent: safeNumber(settings?.husseinDefaultWorkPercent || DEFAULT_SETTINGS.husseinDefaultWorkPercent),
    saeedDefaultWorkPercent: safeNumber(settings?.saeedDefaultWorkPercent || DEFAULT_SETTINGS.saeedDefaultWorkPercent),
  };
}

function normalizeProject(project: Partial<StudioProject>): StudioProject {
  return {
    id: project.id ?? makeId(),
    projectId: project.projectId?.trim() || "P001",
    name: project.name ?? "",
    client: project.client ?? "",
    totalPrice: safeNumber(project.totalPrice),
    status: normalizeStatus(project.status),
    finder: normalizeFinder(project.finder),
    husseinWorkPercent: safeNumber(project.husseinWorkPercent),
    saeedWorkPercent: safeNumber(project.saeedWorkPercent),
    notes: project.notes ?? "",
  };
}

function normalizePayment(payment: Partial<ClientPayment>): ClientPayment {
  return {
    id: payment.id ?? makeId(),
    date: payment.date || todayInput(),
    projectId: payment.projectId ?? "",
    amount: safeNumber(payment.amount),
    collectedBy: normalizePersonOrBlank(payment.collectedBy),
    paymentMethod: payment.paymentMethod ?? "",
    notes: payment.notes ?? "",
  };
}

function normalizeExpense(expense: Partial<ProjectExpense>): ProjectExpense {
  return {
    id: expense.id ?? makeId(),
    date: expense.date || todayInput(),
    projectId: expense.projectId ?? "",
    expenseType: expense.expenseType ?? "",
    paidBy: normalizeExpensePayer(expense.paidBy),
    amount: safeNumber(expense.amount),
    notes: expense.notes ?? "",
  };
}

function normalizePayout(payout: Partial<PartnerPayout>): PartnerPayout {
  return {
    id: payout.id ?? makeId(),
    date: payout.date || todayInput(),
    paidTo: normalizePerson(payout.paidTo),
    amount: safeNumber(payout.amount),
    payoutType: normalizePayoutType(payout.payoutType),
    notes: payout.notes ?? "",
  };
}

function normalizePerson(value: unknown): Person {
  if (value === "Saeed" || value === "Partner 2" || value === "Partner") return "Saeed";
  if (value === "Third Party") return "Third Party";
  return "Hussein";
}

function normalizePersonOrBlank(value: unknown): Person | "" {
  if (!value) return "";
  return normalizePerson(value);
}

function normalizeFinder(value: unknown): Finder {
  if (value === "Nobody" || value === "None" || !value) return "Nobody";
  return normalizePerson(value);
}

function normalizeExpensePayer(value: unknown): ExpensePayer {
  if (value === "Studio") return "Studio";
  return normalizePerson(value);
}

function normalizeStatus(value: unknown): ProjectStatus {
  if (value === "In Progress" || value === "Active") return "In Progress";
  if (value === "Completed" || value === "Paid" || value === "Closed") return "Completed";
  if (value === "Cancelled") return "Cancelled";
  return "Lead";
}

function normalizePayoutType(value: unknown): PayoutType {
  if (value === "Expense Reimbursement") return "Expense Reimbursement";
  if (value === "Finder Fee") return "Finder Fee";
  if (value === "Mixed") return "Mixed";
  return "Profit Share";
}

function emptyProject(projectId: string, settings: StudioSettings): StudioProject {
  return {
    id: makeId(),
    projectId,
    name: "",
    client: "",
    totalPrice: 0,
    status: "Lead",
    finder: "Nobody",
    husseinWorkPercent: settings.husseinDefaultWorkPercent,
    saeedWorkPercent: settings.saeedDefaultWorkPercent,
    notes: "",
  };
}

function emptyPayment(projectId: string): ClientPayment {
  return {
    id: makeId(),
    date: todayInput(),
    projectId,
    amount: 0,
    collectedBy: "",
    paymentMethod: "",
    notes: "",
  };
}

function emptyExpense(projectId: string): ProjectExpense {
  return {
    id: makeId(),
    date: todayInput(),
    projectId,
    expenseType: "",
    paidBy: "Studio",
    amount: 0,
    notes: "",
  };
}

function emptyPayout(): PartnerPayout {
  return {
    id: makeId(),
    date: todayInput(),
    paidTo: "Hussein",
    amount: 0,
    payoutType: "Mixed",
    notes: "",
  };
}

function nextProjectId(projects: StudioProject[]) {
  const nextNumber =
    projects.reduce((max, project) => {
      const match = project.projectId.match(/^P(\d+)$/i);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1;

  return `P${String(nextNumber).padStart(3, "0")}`;
}

function projectIds(data: StudioSpreadsheetData) {
  return data.projects.length ? data.projects.map((project) => project.projectId) : [""];
}

function projectName(data: StudioSpreadsheetData, projectId: string) {
  return data.projects.find((project) => project.projectId === projectId)?.name ?? "";
}

function projectLabel(data: StudioSpreadsheetData, projectId: string) {
  const project = data.projects.find((item) => item.projectId === projectId);
  return project ? `${project.projectId} · ${project.name || "Untitled project"}` : projectId || "No project";
}

function sumByProject<T extends { projectId: string }>(
  rows: T[],
  projectId: string,
  key: keyof T,
) {
  return rows
    .filter((row) => row.projectId === projectId)
    .reduce((sum, row) => sum + safeNumber(row[key]), 0);
}

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function makeId() {
  return crypto.randomUUID();
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function readStoredConfig() {
  try {
    const stored = window.sessionStorage.getItem(CONFIG_KEY);
    if (!stored) return DEFAULT_GITHUB_CONFIG;
    return normalizeGitHubConfig(JSON.parse(stored) as Partial<GitHubSheetConfig>);
  } catch {
    return DEFAULT_GITHUB_CONFIG;
  }
}

function normalizeGitHubConfig(config: Partial<GitHubSheetConfig>) {
  return {
    owner: config.owner?.trim() || DEFAULT_GITHUB_CONFIG.owner,
    repo: config.repo?.trim() || DEFAULT_GITHUB_CONFIG.repo,
    branch: config.branch?.trim() || DEFAULT_GITHUB_CONFIG.branch,
    path: config.path?.trim() || DEFAULT_GITHUB_CONFIG.path,
  };
}

function getGitHubContentUrl(config: GitHubSheetConfig) {
  const path = config.path
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");

  return `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(
    config.repo,
  )}/contents/${path}`;
}

async function githubFetch<T>(token: string, url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 404) return undefined as T;
    const message = await response.text();
    const error: GitHubRequestError = new Error(`GitHub request failed: ${response.status} ${message}`);
    error.status = response.status;
    throw error;
  }

  return (await response.json()) as T;
}

async function readGitHubSpreadsheetFile(token: string, config: GitHubSheetConfig) {
  const url = `${getGitHubContentUrl(config)}?ref=${encodeURIComponent(config.branch)}`;
  const file = await githubFetch<GitHubContentResponse | undefined>(token, url);

  if (!file?.content) return { sha: undefined, document: undefined };

  const json = decodeBase64(file.content.replace(/\s/g, ""));
  return {
    sha: file.sha,
    document: JSON.parse(json) as SpreadsheetDocument,
  };
}

async function loadGitHubSpreadsheet(
  token: string,
  config: GitHubSheetConfig,
): Promise<{ document: SpreadsheetDocument; sha?: string }> {
  const { document, sha } = await readGitHubSpreadsheetFile(token, config);
  return {
    document: document ?? { data: EMPTY_SHEET, updatedAt: "" },
    sha,
  };
}

async function saveGitHubSpreadsheet(
  token: string,
  config: GitHubSheetConfig,
  data: StudioSpreadsheetData,
  knownSha?: string,
): Promise<{ document: SpreadsheetDocument; sha?: string }> {
  const document = {
    data,
    updatedAt: new Date().toISOString(),
  };

  const sha = await writeGitHubSpreadsheetFile(token, config, document, knownSha);

  return { document, sha };
}

async function writeGitHubSpreadsheetFile(
  token: string,
  config: GitHubSheetConfig,
  document: SpreadsheetDocument,
  knownSha?: string,
  attempt = 0,
) {
  const sha = knownSha ?? (await readGitHubSpreadsheetFile(token, config)).sha;

  try {
    const response = await githubFetch<GitHubWriteResponse>(token, getGitHubContentUrl(config), {
      method: "PUT",
      body: JSON.stringify({
        message: "Update studio spreadsheet",
        content: encodeBase64(JSON.stringify(document, null, 2)),
        branch: config.branch,
        sha,
      }),
    });

    return response.content?.sha;
  } catch (err) {
    if (isGitHubConflict(err) && attempt < 5) {
      await wait(700 * (attempt + 1));
      const freshSha = (await readGitHubSpreadsheetFile(token, config)).sha;
      return writeGitHubSpreadsheetFile(token, config, document, freshSha, attempt + 1);
    }

    throw err;
  }
}

function isGitHubConflict(err: unknown) {
  return err instanceof Error && (err as GitHubRequestError).status === 409;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
