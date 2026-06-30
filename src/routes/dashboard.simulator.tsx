import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { processIncomingMessage } from "@/stores/store-bot/engine";
import { TEST_BUSINESS_ID, TEST_CUSTOMER_PHONE } from "@/stores/store-bot/seed";
import { useStoreBotState } from "@/stores/store-bot/use-store-bot-state";
import type { BotResponse } from "@/stores/store-bot/types";

export const Route = createFileRoute("/dashboard/simulator")({
  component: SimulatorPage,
});

type ChatEntry = {
  id: string;
  role: "customer" | "bot";
  text: string;
};

function SimulatorPage() {
  const { state } = useStoreBotState();
  const [phone, setPhone] = useState(TEST_CUSTOMER_PHONE);
  const [message, setMessage] = useState("hi");
  const [entries, setEntries] = useState<ChatEntry[]>([
    {
      id: "welcome",
      role: "bot",
      text: "Send hi to start, or use quick replies as the flow progresses.",
    },
  ]);
  const [lastResponse, setLastResponse] = useState<BotResponse | null>(null);
  const session = useMemo(
    () =>
      state.sessions.find(
        (item) => item.businessId === TEST_BUSINESS_ID && item.customerPhone === phone,
      ),
    [phone, state.sessions],
  );

  async function send(value = message) {
    const trimmed = value.trim();
    if (!trimmed) return;

    setEntries((current) => [...current, { id: makeEntryId(), role: "customer", text: trimmed }]);
    setMessage("");

    try {
      const response = await processIncomingMessage({
        businessId: TEST_BUSINESS_ID,
        customerPhone: phone,
        message: trimmed,
      });
      setLastResponse(response);
      setEntries((current) => [
        ...current,
        ...response.messages.map((text) => ({ id: makeEntryId(), role: "bot" as const, text })),
      ]);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Simulator failed.";
      setEntries((current) => [...current, { id: makeEntryId(), role: "bot", text }]);
    }
  }

  function restart() {
    void send("restart");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Bot test bench
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold">WhatsApp Simulator</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Messages are processed through the same local service that will later sit behind
            WhatsApp webhooks.
          </p>
        </div>
        <label className="w-full text-sm lg:w-72">
          <span className="mb-2 block text-muted-foreground">Customer phone</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
          />
        </label>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="flex min-h-[620px] flex-col overflow-hidden rounded-lg border border-border bg-surface/60">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <div className="font-display text-lg font-semibold">Customer Chat</div>
              <div className="text-xs text-muted-foreground">
                Type numbers, commands, or normal text.
              </div>
            </div>
            <button
              type="button"
              onClick={restart}
              className="studio-icon-button"
              aria-label="Restart conversation"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className={`flex ${entry.role === "customer" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[82%] whitespace-pre-line rounded-lg px-3 py-2 text-sm ${
                    entry.role === "customer"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-background/75 text-foreground"
                  }`}
                >
                  {entry.text}
                </div>
              </div>
            ))}
          </div>

          {lastResponse?.quickReplies.length ? (
            <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
              {lastResponse.quickReplies.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => send(reply)}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:border-primary"
                >
                  {reply}
                </button>
              ))}
            </div>
          ) : null}

          <form
            className="flex gap-2 border-t border-border p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-primary"
              placeholder="Send a customer message"
            />
            <button type="submit" className="studio-button-primary">
              <Send className="h-4 w-4" />
              Send
            </button>
          </form>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-border bg-surface/60 p-4">
            <h2 className="font-display text-lg font-semibold">Debug</h2>
            <div className="mt-4 space-y-2 text-sm">
              <DebugRow
                label="Step"
                value={lastResponse?.session.step ?? session?.step ?? "No session"}
              />
              <DebugRow label="Previous" value={lastResponse?.debug.previousStep ?? "-"} />
              <DebugRow label="Next" value={lastResponse?.debug.nextStep ?? "-"} />
              <DebugRow
                label="Cart items"
                value={String(lastResponse?.debug.cartItemCount ?? session?.cart.length ?? 0)}
              />
              <DebugRow
                label="Cart total"
                value={`$${(lastResponse?.debug.cartTotal ?? 0).toFixed(2)}`}
              />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface/60 p-4">
            <h2 className="font-display text-lg font-semibold">Commands</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {["back", "main menu", "cancel", "restart"].map((command) => (
                <button
                  key={command}
                  type="button"
                  onClick={() => send(command)}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:border-primary"
                >
                  {command}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface/60 p-4">
            <h2 className="font-display text-lg font-semibold">Live Stock</h2>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto text-sm">
              {state.products.map((product) => (
                <div
                  key={product.id}
                  className="flex justify-between gap-3 border-b border-border pb-2 last:border-0"
                >
                  <span className={product.isActive ? "" : "text-muted-foreground"}>
                    {product.name}
                  </span>
                  <span>{product.stockQuantity}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function makeEntryId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
