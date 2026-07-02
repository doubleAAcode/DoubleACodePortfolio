import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const hardeningSql = read("supabase/wa_reliability_hardening.sql");
const coreSql = read("supabase/wa_bot_core_schema.sql");
const catalogSql = read("supabase/wa_catalog_settings_schema.sql");
const diagnosticsHandler = read("src/lib/whatsapp/diagnostics.server.ts");
const dashboardHandlers = read("src/lib/whatsapp/dashboard-api-handlers.server.ts");
const sender = read("src/lib/whatsapp/sender.server.ts");
const sessionStore = read("src/lib/whatsapp/conversation-store.server.ts");
const conversationEngine = read("src/lib/whatsapp/conversation-engine.server.ts");

test("order creation RPC locks stock rows before inserting reservations", () => {
  assert.match(hardeningSql, /create or replace function public\.wa_create_pending_order/);
  assert.match(hardeningSql, /from public\.wa_product_variants as pv[\s\S]*for update;/);
  assert.match(hardeningSql, /from public\.wa_products as p[\s\S]*for update;/);
  assert.match(hardeningSql, /coalesce\(sum\(sr\.quantity\), 0\)::integer/);
  assert.match(hardeningSql, /Insufficient stock for reservation/);
  assert.match(coreSql, /from public\.wa_product_variants as pv[\s\S]*for update;/);
});

test("database constraints cover critical status and non-negative values", () => {
  for (const status of [
    "PENDING_OWNER_CONFIRMATION",
    "ACCEPTED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "COMPLETED",
    "REJECTED",
    "CANCELLED",
  ]) {
    assert.match(hardeningSql, new RegExp(`'${status}'`));
  }

  assert.match(hardeningSql, /wa_stock_reservations_status_check/);
  assert.match(hardeningSql, /wa_order_notifications_status_check/);
  assert.match(catalogSql, /wa_products_stock_non_negative_check/);
  assert.match(catalogSql, /wa_product_variants_stock_non_negative_check/);
});

test("diagnostics endpoint remains dashboard-auth protected", () => {
  assert.match(dashboardHandlers, /createDashboardDiagnosticsHandlers/);
  assert.match(dashboardHandlers, /getDashboardSessionFromRequest\(request, envSuffix\)/);
  assert.match(dashboardHandlers, /Unauthorized/);
  assert.match(diagnosticsHandler, /integrityWarnings/);
  assert.match(diagnosticsHandler, /failedNotifications/);
  assert.match(diagnosticsHandler, /expiredActiveReservations/);
});

test("WhatsApp sender uses timeout and retryable failure classification", () => {
  assert.match(sender, /WHATSAPP_SEND_TIMEOUT_MS/);
  assert.match(sender, /AbortController/);
  assert.match(sender, /isRetryableStatus/);
  assert.match(sender, /status === 429/);
  assert.match(sender, /status >= 500/);
});

test("stored conversation sessions are schema-validated on load", () => {
  assert.match(sessionStore, /validSteps/);
  assert.match(sessionStore, /validateStoredSessionRow/);
  assert.match(sessionStore, /recovered malformed stored session/);
  assert.match(sessionStore, /SELECT_LANGUAGE/);
});

test("new checkout flows clear previous completed order markers", () => {
  const customerNameHandler = conversationEngine.match(
    /async function handleCustomerName[\s\S]*?async function handleFulfillmentMethod/,
  )?.[0];
  assert.ok(customerNameHandler);
  assert.doesNotMatch(customerNameHandler, /saveWhatsAppCustomerProfileFromOrder\(result\.order\)/);

  const startCheckout = conversationEngine.match(
    /async function startCheckout[\s\S]*?async function handleSavedCustomerDetails/,
  )?.[0];
  assert.ok(startCheckout);
  assert.match(startCheckout, /createdOrderId:\s*undefined/);
  assert.match(startCheckout, /createdOrderNumber:\s*undefined/);

  const completedOrderHandler = conversationEngine.match(
    /async function handleCompletedOrder[\s\S]*?async function moveToProductDetails/,
  )?.[0];
  assert.ok(completedOrderHandler);
  assert.match(completedOrderHandler, /createdOrderId:\s*undefined/);
  assert.match(completedOrderHandler, /createdOrderNumber:\s*undefined/);
});

function read(path) {
  return readFileSync(join(root, path), "utf8");
}
