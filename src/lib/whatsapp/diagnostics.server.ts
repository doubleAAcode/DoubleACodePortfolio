import "@tanstack/react-start/server-only";

import { isServerSupabaseConfigured, supabaseServerRest } from "@/lib/supabase/server-rest.server";

import { getMissingWhatsAppConfigKeys, getWhatsAppServerConfig } from "./config.server";
import { getOwnerNotificationHealth } from "./owner-notifications.server";

export type WaDiagnosticsReport = {
  ok: boolean;
  checkedAt: string;
  businessId: string;
  supabase: {
    configured: boolean;
    reachable: boolean;
    error?: string;
  };
  whatsapp: {
    configured: boolean;
    missingKeys: string[];
  };
  latestWebhookAt: string | null;
  latestSuccessfulOutgoingMessageAt: string | null;
  failedNotifications: number;
  retryableNotifications: number;
  templateRequiredNotifications: number;
  ownerNotifications: {
    pending: number;
    failed: number;
    latestNewOrderAt: string | null;
    lastReminderCheckAt: string | null;
    ordersPendingLongerThanFirstReminder: number;
    ordersPendingLongerThanSecondReminder: number;
    emailProviderConfigured: boolean;
    browserNotifications: string;
  };
  expiredActiveReservations: number;
  integrityWarnings: Array<{ code: string; count: number; message: string }>;
  appVersion: string;
};

export async function getWaDiagnostics({
  businessId,
  configSuffix = "",
}: {
  businessId: string;
  configSuffix?: string;
}): Promise<WaDiagnosticsReport> {
  const checkedAt = new Date().toISOString();
  const config = getWhatsAppServerConfig(configSuffix);
  const missingKeys = getMissingWhatsAppConfigKeys(config);
  const base: WaDiagnosticsReport = {
    ok: false,
    checkedAt,
    businessId,
    supabase: {
      configured: isServerSupabaseConfigured(),
      reachable: false,
    },
    whatsapp: {
      configured: missingKeys.length === 0,
      missingKeys,
    },
    latestWebhookAt: null,
    latestSuccessfulOutgoingMessageAt: null,
    failedNotifications: 0,
    retryableNotifications: 0,
    templateRequiredNotifications: 0,
    ownerNotifications: {
      pending: 0,
      failed: 0,
      latestNewOrderAt: null,
      lastReminderCheckAt: null,
      ordersPendingLongerThanFirstReminder: 0,
      ordersPendingLongerThanSecondReminder: 0,
      emailProviderConfigured: false,
      browserNotifications: "client-side only",
    },
    expiredActiveReservations: 0,
    integrityWarnings: [],
    appVersion: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version || "local",
  };

  if (!base.supabase.configured) {
    return base;
  }

  try {
    const [
      latestWebhook,
      latestSent,
      failedNotifications,
      retryableNotifications,
      templateRequiredNotifications,
      expiredReservations,
      integrityWarnings,
      ownerNotificationHealth,
    ] = await Promise.all([
      getLatestWebhookAt(),
      getLatestSuccessfulOutgoingMessageAt(businessId),
      countRows(
        `/wa_order_notifications?select=id&business_id=eq.${encodeURIComponent(
          businessId,
        )}&status=eq.FAILED&limit=51`,
      ),
      countRows(
        `/wa_order_notifications?select=id&business_id=eq.${encodeURIComponent(
          businessId,
        )}&status=eq.RETRYABLE&limit=51`,
      ),
      countRows(
        `/wa_order_notifications?select=id&business_id=eq.${encodeURIComponent(
          businessId,
        )}&status=eq.TEMPLATE_REQUIRED&limit=51`,
      ),
      countRows(
        `/wa_stock_reservations?select=id&business_id=eq.${encodeURIComponent(
          businessId,
        )}&status=eq.ACTIVE&expires_at=lt.${encodeURIComponent(checkedAt)}&limit=51`,
      ),
      getIntegrityWarnings(businessId),
      getOwnerNotificationHealth({ businessId }),
    ]);

    const report: WaDiagnosticsReport = {
      ...base,
      ok: integrityWarnings.length === 0,
      supabase: { configured: true, reachable: true },
      latestWebhookAt: latestWebhook,
      latestSuccessfulOutgoingMessageAt: latestSent,
      failedNotifications,
      retryableNotifications,
      templateRequiredNotifications,
      ownerNotifications: {
        pending: ownerNotificationHealth.pendingOwnerNotifications,
        failed: ownerNotificationHealth.failedOwnerNotifications,
        latestNewOrderAt: ownerNotificationHealth.latestNewOrderNotificationAt,
        lastReminderCheckAt: ownerNotificationHealth.lastReminderCheckAt,
        ordersPendingLongerThanFirstReminder:
          ownerNotificationHealth.ordersPendingLongerThanFirstReminder,
        ordersPendingLongerThanSecondReminder:
          ownerNotificationHealth.ordersPendingLongerThanSecondReminder,
        emailProviderConfigured: ownerNotificationHealth.emailProviderConfigured,
        browserNotifications: ownerNotificationHealth.browserNotifications,
      },
      expiredActiveReservations: expiredReservations,
      integrityWarnings,
    };

    return report;
  } catch (error) {
    return {
      ...base,
      supabase: {
        configured: true,
        reachable: false,
        error: error instanceof Error ? error.message : "Supabase diagnostics failed.",
      },
    };
  }
}

async function getLatestWebhookAt() {
  const rows = await supabaseServerRest<Array<{ created_at: string }>>(
    "/wa_webhook_logs?select=created_at&order=created_at.desc&limit=1",
  );
  return rows[0]?.created_at ?? null;
}

async function getLatestSuccessfulOutgoingMessageAt(businessId: string) {
  const rows = await supabaseServerRest<Array<{ sent_at: string | null }>>(
    `/wa_order_notifications?select=sent_at&business_id=eq.${encodeURIComponent(
      businessId,
    )}&status=eq.SENT&order=sent_at.desc&limit=1`,
  );
  return rows[0]?.sent_at ?? null;
}

async function countRows(path: string) {
  const rows = await supabaseServerRest<Array<{ id: string }>>(path);
  return rows.length;
}

async function getIntegrityWarnings(businessId: string) {
  const [
    negativeProducts,
    negativeVariants,
    expiredActiveReservations,
    committedReservationsOnNonAcceptedOrders,
    activeReservationsOnAcceptedOrders,
    orphanItems,
    orphanReservations,
    duplicateVariantCombinations,
    duplicateProductCodes,
    duplicateVariantSkus,
  ] = await Promise.all([
    countRows(
      `/wa_products?select=id&business_id=eq.${encodeURIComponent(
        businessId,
      )}&stock_quantity=lt.0&limit=51`,
    ),
    countRows(
      `/wa_product_variants?select=id&business_id=eq.${encodeURIComponent(
        businessId,
      )}&stock_quantity=lt.0&limit=51`,
    ),
    countRows(
      `/wa_stock_reservations?select=id&business_id=eq.${encodeURIComponent(
        businessId,
      )}&status=eq.ACTIVE&expires_at=lt.${encodeURIComponent(new Date().toISOString())}&limit=51`,
    ),
    countCommittedReservationsOnNonAcceptedOrders(businessId),
    countActiveReservationsOnAcceptedOrders(businessId),
    countOrphanOrderItems(),
    countOrphanReservations(businessId),
    countDuplicateVariantCombinations(businessId),
    countDuplicateProductCodes(businessId),
    countDuplicateVariantSkus(businessId),
  ]);

  return [
    warning("NEGATIVE_PRODUCT_STOCK", negativeProducts, "Products with negative stock."),
    warning("NEGATIVE_VARIANT_STOCK", negativeVariants, "Variants with negative stock."),
    warning(
      "EXPIRED_ACTIVE_RESERVATIONS",
      expiredActiveReservations,
      "Active reservations past expiry.",
    ),
    warning(
      "COMMITTED_RESERVATION_ON_NON_ACCEPTED_ORDER",
      committedReservationsOnNonAcceptedOrders,
      "Committed reservations linked to non-accepted orders.",
    ),
    warning(
      "ACTIVE_RESERVATION_ON_ACCEPTED_ORDER",
      activeReservationsOnAcceptedOrders,
      "Accepted or later orders still have active reservations.",
    ),
    warning("ORPHAN_ORDER_ITEMS", orphanItems, "Order items without a parent order."),
    warning("ORPHAN_RESERVATIONS", orphanReservations, "Reservations without a parent order."),
    warning(
      "DUPLICATE_VARIANT_COMBINATIONS",
      duplicateVariantCombinations,
      "Duplicate option combinations within one product.",
    ),
    warning("DUPLICATE_PRODUCT_CODES", duplicateProductCodes, "Duplicate product codes."),
    warning("DUPLICATE_VARIANT_SKUS", duplicateVariantSkus, "Duplicate variant SKUs."),
  ].filter((item): item is { code: string; count: number; message: string } => Boolean(item));
}

async function countCommittedReservationsOnNonAcceptedOrders(businessId: string) {
  const orders = await supabaseServerRest<Array<{ id: string }>>(
    `/wa_orders?select=id&business_id=eq.${encodeURIComponent(
      businessId,
    )}&status=in.(PENDING_OWNER_CONFIRMATION,REJECTED,CANCELLED)&limit=1000`,
  );
  if (!orders.length) return 0;
  return countRows(
    `/wa_stock_reservations?select=id&business_id=eq.${encodeURIComponent(
      businessId,
    )}&status=eq.COMMITTED&order_id=in.(${formatInList(orders.map((order) => order.id))})&limit=51`,
  );
}

async function countActiveReservationsOnAcceptedOrders(businessId: string) {
  const orders = await supabaseServerRest<Array<{ id: string }>>(
    `/wa_orders?select=id&business_id=eq.${encodeURIComponent(
      businessId,
    )}&status=in.(ACCEPTED,PREPARING,READY,OUT_FOR_DELIVERY,COMPLETED)&limit=1000`,
  );
  if (!orders.length) return 0;
  return countRows(
    `/wa_stock_reservations?select=id&business_id=eq.${encodeURIComponent(
      businessId,
    )}&status=eq.ACTIVE&order_id=in.(${formatInList(orders.map((order) => order.id))})&limit=51`,
  );
}

async function countOrphanOrderItems() {
  const items = await supabaseServerRest<Array<{ id: string; order_id: string }>>(
    "/wa_order_items?select=id,order_id&limit=1000",
  );
  if (!items.length) return 0;
  const orders = await supabaseServerRest<Array<{ id: string }>>(
    `/wa_orders?select=id&id=in.(${formatInList(items.map((item) => item.order_id))})&limit=1000`,
  );
  const orderIds = new Set(orders.map((order) => order.id));
  return items.filter((item) => !orderIds.has(item.order_id)).length;
}

async function countOrphanReservations(businessId: string) {
  const reservations = await supabaseServerRest<Array<{ id: string; order_id: string }>>(
    `/wa_stock_reservations?select=id,order_id&business_id=eq.${encodeURIComponent(
      businessId,
    )}&limit=1000`,
  );
  if (!reservations.length) return 0;
  const orders = await supabaseServerRest<Array<{ id: string }>>(
    `/wa_orders?select=id&business_id=eq.${encodeURIComponent(
      businessId,
    )}&id=in.(${formatInList(reservations.map((reservation) => reservation.order_id))})&limit=1000`,
  );
  const orderIds = new Set(orders.map((order) => order.id));
  return reservations.filter((reservation) => !orderIds.has(reservation.order_id)).length;
}

async function countDuplicateVariantCombinations(businessId: string) {
  const variants = await supabaseServerRest<
    Array<{ product_id: string; selected_option_value_ids: string[] }>
  >(
    `/wa_product_variants?select=product_id,selected_option_value_ids&business_id=eq.${encodeURIComponent(
      businessId,
    )}&limit=1000`,
  );
  const seen = new Set<string>();
  let duplicates = 0;
  for (const variant of variants) {
    const key = `${variant.product_id}:${[...variant.selected_option_value_ids].sort().join("|")}`;
    if (seen.has(key)) duplicates += 1;
    seen.add(key);
  }
  return duplicates;
}

async function countDuplicateProductCodes(businessId: string) {
  const products = await supabaseServerRest<Array<{ code: string }>>(
    `/wa_products?select=code&business_id=eq.${encodeURIComponent(businessId)}&limit=1000`,
  );
  return countDuplicates(products.map((product) => product.code.trim().toLowerCase()));
}

async function countDuplicateVariantSkus(businessId: string) {
  const variants = await supabaseServerRest<Array<{ sku: string }>>(
    `/wa_product_variants?select=sku&business_id=eq.${encodeURIComponent(businessId)}&limit=1000`,
  );
  return countDuplicates(variants.map((variant) => variant.sku.trim().toLowerCase()));
}

function countDuplicates(values: string[]) {
  const seen = new Set<string>();
  let duplicates = 0;
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) duplicates += 1;
    seen.add(value);
  }
  return duplicates;
}

function warning(code: string, count: number, message: string) {
  return count > 0 ? { code, count, message } : null;
}

function formatInList(values: string[]) {
  return values.map((value) => `"${encodeURIComponent(value)}"`).join(",");
}
