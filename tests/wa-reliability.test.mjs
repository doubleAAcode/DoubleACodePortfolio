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
const adminHandlers = read("src/lib/whatsapp/admin-api-handlers.server.ts");
const adminClient = read("src/lib/whatsapp/admin-client.ts");
const dashboardStore = read("src/lib/whatsapp/dashboard-store.server.ts");
const flowImageRoute = read("src/routes/api.wa-admin.businesses.$businessId.flow-image.ts");
const sender = read("src/lib/whatsapp/sender.server.ts");
const reliability = read("src/lib/whatsapp/reliability.ts");
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
  assert.match(sender, /isRetryableHttpStatus/);
  assert.match(reliability, /status === 429/);
  assert.match(reliability, /status >= 500/);
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

test("new browse paths clear stale catalog route context", () => {
  assert.match(conversationEngine, /function resetBrowseContext/);

  const categoryHandler = conversationEngine.match(
    /async function handleCategorySelection[\s\S]*?async function handleProductSelection/,
  )?.[0];
  assert.ok(categoryHandler);
  assert.match(categoryHandler, /context:\s*resetBrowseContext\(session\.context,\s*\{/);
  assert.match(categoryHandler, /selectedCategoryId:\s*selectedCategory\.id/);

  const cartMenuHandler = conversationEngine.match(
    /async function handleCartMenu[\s\S]*?async function handleEditCartItem/,
  )?.[0];
  assert.ok(cartMenuHandler);
  assert.match(cartMenuHandler, /currentStep:\s*"SELECT_BROWSE_GROUP"/);
  assert.match(cartMenuHandler, /browseGroupSelectionResponse\(nextSession,\s*flowSettings\)/);

  const completedOrderHandler = conversationEngine.match(
    /async function handleCompletedOrder[\s\S]*?async function moveToProductDetails/,
  )?.[0];
  assert.ok(completedOrderHandler);
  assert.match(completedOrderHandler, /currentStep:\s*"SELECT_BROWSE_GROUP"/);
  assert.match(completedOrderHandler, /context:\s*resetBrowseContext\(session\.context,\s*\{/);
  assert.match(completedOrderHandler, /browseGroupSelectionResponse\(nextSession,\s*flowSettings\)/);

  const browseGroupResponse = conversationEngine.match(
    /async function browseGroupSelectionResponse[\s\S]*?async function groupValueSelectionResponse/,
  )?.[0];
  assert.ok(browseGroupResponse);
  assert.match(browseGroupResponse, /context:\s*resetBrowseContext\(session\.context,\s*\{\s*selectedCatalogGroupId:\s*group\.id/);
});

test("visual human handoff sends once and then stays paused", () => {
  const visualRuntimeHandler = conversationEngine.match(
    /async function handleVisualRuntimeMessage[\s\S]*?async function enterVisualNode/,
  )?.[0];
  assert.ok(visualRuntimeHandler);
  const handoffHandler = visualRuntimeHandler.match(
    /if \(node\.type === "HUMAN_HANDOFF"\) \{[\s\S]*?\n  \}/,
  )?.[0];
  assert.ok(handoffHandler);
  assert.match(handoffHandler, /markHumanHandoffPaused\(session, node\.id, now\)/);
  assert.match(handoffHandler, /return \[\];/);
  assert.doesNotMatch(handoffHandler, /runtimeTextResponse\(flow, node/);

  const enterVisualNode = conversationEngine.match(
    /async function enterVisualNode[\s\S]*?async function continueFromRuntimeNode/,
  )?.[0];
  assert.ok(enterVisualNode);
  assert.match(enterVisualNode, /node\.type === "HUMAN_HANDOFF"/);
  assert.match(enterVisualNode, /markHumanHandoffPaused\(session, node\.id, now\)/);
  assert.match(enterVisualNode, /runtimeTextResponse\(flow, node, language\)/);
});

test("admin flow image uploads use authenticated FormData storage route", () => {
  assert.match(dashboardStore, /export async function uploadWaFlowImage/);
  assert.match(dashboardStore, /"flow-images"/);
  assert.match(adminHandlers, /createInternalAdminBusinessFlowImageUploadHandlers/);
  assert.match(adminHandlers, /requireAdmin\(request\)/);
  assert.match(adminHandlers, /request\.formData\(\)/);
  assert.match(adminHandlers, /uploadWaFlowImage\(file, params\.businessId\)/);
  assert.match(adminClient, /export async function uploadAdminFlowImage/);
  assert.match(adminClient, /body:\s*formData/);
  assert.match(adminClient, /init\.body instanceof FormData/);
  assert.match(flowImageRoute, /\/api\/wa-admin\/businesses\/\$businessId\/flow-image/);
});

function read(path) {
  return readFileSync(join(root, path), "utf8");
}
