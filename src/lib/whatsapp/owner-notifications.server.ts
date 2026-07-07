import "@tanstack/react-start/server-only";

import { isServerSupabaseConfigured, supabaseServerRest } from "@/lib/supabase/server-rest.server";

import type { WhatsAppOrder } from "./order-store.server";

export type OwnerNotificationType =
  | "NEW_ORDER"
  | "ORDER_UNHANDLED_FIRST_REMINDER"
  | "ORDER_UNHANDLED_SECOND_REMINDER"
  | "ORDER_STATUS_CHANGED";

export type OwnerNotificationChannel = "DASHBOARD" | "BROWSER" | "EMAIL" | "WHATSAPP_TEMPLATE";
export type OwnerNotificationStatus =
  | "PENDING"
  | "SENT"
  | "FAILED"
  | "SKIPPED"
  | "READ"
  | "CANCELLED"
  | "TEMPLATE_REQUIRED";

export type OwnerNotificationSettings = {
  businessId: string;
  enableDashboardAlerts: boolean;
  enableSound: boolean;
  enableBrowserPush: boolean;
  enableEmailAlerts: boolean;
  enableWhatsAppAlerts: boolean;
  ownerEmail: string | null;
  ownerWhatsAppNumber: string | null;
  newOrderReminderMinutes: number;
  secondReminderMinutes: number;
  reminderEscalationEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
};

export type OwnerNotificationRow = {
  id: string;
  business_id: string;
  order_id: string;
  type: OwnerNotificationType;
  channel: OwnerNotificationChannel;
  status: OwnerNotificationStatus;
  recipient: string | null;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  dedupe_key: string;
  error_code: string | null;
  error_message: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
};

type OwnerNotificationSettingsRow = {
  business_id: string;
  enable_dashboard_alerts: boolean;
  enable_sound: boolean;
  enable_browser_push: boolean;
  enable_email_alerts: boolean;
  enable_whatsapp_alerts: boolean;
  owner_email: string | null;
  owner_whatsapp_number: string | null;
  new_order_reminder_minutes: number;
  second_reminder_minutes: number;
  reminder_escalation_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
};

type DashboardNotificationSnapshot = {
  settings: OwnerNotificationSettings;
  notifications: OwnerNotificationRow[];
  unreadCount: number;
};

const inMemoryNotifications = new Map<string, OwnerNotificationRow>();
const inMemoryReadState = new Set<string>();

export async function createOwnerNewOrderNotifications(order: WhatsAppOrder) {
  try {
    const settings = await getOwnerNotificationSettings(order.businessId);
    const title = `New order ${order.orderNumber}`;
    const message = `${order.customerName} placed an order for ${formatMoney(order.total)}.`;

    const dashboard = settings.enableDashboardAlerts
      ? await createOwnerNotification({
          businessId: order.businessId,
          orderId: order.id,
          type: "NEW_ORDER",
          channel: "DASHBOARD",
          status: "SENT",
          recipient: null,
          title,
          message,
          metadata: orderMetadata(order),
          dedupeKey: dedupeKey(order.businessId, order.id, "NEW_ORDER", "DASHBOARD"),
          sentAt: new Date().toISOString(),
        })
      : undefined;

    const email = settings.enableEmailAlerts
      ? await sendOwnerEmailNotification({
          businessId: order.businessId,
          orderId: order.id,
          recipientEmail: settings.ownerEmail,
          subject: title,
          body: buildEmailBody(order),
        })
      : undefined;

    if (settings.enableWhatsAppAlerts) {
      await sendOwnerWhatsAppTemplateNotification({
        businessId: order.businessId,
        orderId: order.id,
        recipient: settings.ownerWhatsAppNumber,
        title,
        message,
      });
    }

    return { dashboard, email };
  } catch (error) {
    console.error("[wa-owner-notifications] new order notification failed", {
      businessId: order.businessId,
      orderId: order.id,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return undefined;
  }
}

export async function getOwnerNotificationsDashboard({
  businessId,
}: {
  businessId: string;
}): Promise<DashboardNotificationSnapshot> {
  await runOwnerReminderCheck({ businessId });
  const settings = await getOwnerNotificationSettings(businessId);
  const notifications = await listOwnerNotifications({ businessId, limit: 20 });
  return {
    settings,
    notifications,
    unreadCount: notifications.filter((notification) => !notification.read_at).length,
  };
}

export async function listOwnerNotificationsForOrder({
  businessId,
  orderId,
}: {
  businessId: string;
  orderId: string;
}) {
  const notifications = await listOwnerNotifications({ businessId, limit: 100 });
  return notifications.filter((notification) => notification.order_id === orderId);
}

export async function markOwnerNotificationRead({
  businessId,
  notificationId,
}: {
  businessId: string;
  notificationId: string;
}) {
  const readAt = new Date().toISOString();
  if (!isServerSupabaseConfigured()) {
    const notification = inMemoryNotifications.get(notificationId);
    if (notification?.business_id === businessId) {
      inMemoryNotifications.set(notificationId, {
        ...notification,
        read_at: readAt,
        status: notification.status === "SENT" ? "READ" : notification.status,
        updated_at: readAt,
      });
      inMemoryReadState.add(notificationId);
    }
    return;
  }

  await supabaseServerRest(
    `/wa_owner_notifications?business_id=eq.${encodeURIComponent(
      businessId,
    )}&id=eq.${encodeURIComponent(notificationId)}`,
    {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ read_at: readAt, status: "READ", updated_at: readAt }),
    },
  );
}

export async function markAllOwnerNotificationsRead({ businessId }: { businessId: string }) {
  const readAt = new Date().toISOString();
  if (!isServerSupabaseConfigured()) {
    for (const [id, notification] of inMemoryNotifications.entries()) {
      if (notification.business_id === businessId && !notification.read_at) {
        inMemoryNotifications.set(id, { ...notification, read_at: readAt, updated_at: readAt });
      }
    }
    return;
  }

  await supabaseServerRest(
    `/wa_owner_notifications?business_id=eq.${encodeURIComponent(businessId)}&read_at=is.null`,
    {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ read_at: readAt, status: "READ", updated_at: readAt }),
    },
  );
}

export async function runOwnerReminderCheck({ businessId }: { businessId: string }) {
  const settings = await getOwnerNotificationSettings(businessId);
  const now = new Date();
  const pendingOrders = await listPendingOrdersForReminders({ businessId });
  let created = 0;

  for (const order of pendingOrders) {
    const ageMs = now.getTime() - new Date(order.created_at).getTime();
    const firstReminderMs = settings.newOrderReminderMinutes * 60 * 1000;
    const secondReminderMs = settings.secondReminderMinutes * 60 * 1000;

    if (ageMs >= firstReminderMs) {
      const notification = await createReminderNotification({
        businessId,
        order,
        type: "ORDER_UNHANDLED_FIRST_REMINDER",
        title: `Order ${order.order_number} is still pending`,
        message: "Customer is waiting. Please accept or reject this order.",
      });
      if (notification) created += 1;
    }

    if (settings.reminderEscalationEnabled && ageMs >= secondReminderMs) {
      const notification = await createReminderNotification({
        businessId,
        order,
        type: "ORDER_UNHANDLED_SECOND_REMINDER",
        title: `Order ${order.order_number} has been waiting`,
        message: "Please accept or reject it.",
      });
      if (notification) created += 1;
    }
  }

  return { created };
}

export async function getOwnerNotificationHealth({ businessId }: { businessId: string }) {
  const settings = await getOwnerNotificationSettings(businessId);
  const [pendingOwnerNotifications, failedOwnerNotifications, latestNewOrder, oldPendingOrders] =
    await Promise.all([
      countOwnerNotifications({ businessId, status: "PENDING" }),
      countOwnerNotifications({ businessId, status: "FAILED" }),
      getLatestOwnerNotification({ businessId, type: "NEW_ORDER" }),
      countPendingOrdersOlderThan({
        businessId,
        minutes: settings.newOrderReminderMinutes,
      }),
    ]);
  const oldSecondReminderOrders = await countPendingOrdersOlderThan({
    businessId,
    minutes: settings.secondReminderMinutes,
  });

  return {
    pendingOwnerNotifications,
    failedOwnerNotifications,
    latestNewOrderNotificationAt: latestNewOrder?.created_at ?? null,
    lastReminderCheckAt: new Date().toISOString(),
    ordersPendingLongerThanFirstReminder: oldPendingOrders,
    ordersPendingLongerThanSecondReminder: oldSecondReminderOrders,
    emailProviderConfigured: isEmailProviderConfigured(),
    browserNotifications: "client-side only",
  };
}

async function getOwnerNotificationSettings(
  businessId: string,
): Promise<OwnerNotificationSettings> {
  if (!isServerSupabaseConfigured()) return defaultSettings(businessId);

  try {
    const rows = await supabaseServerRest<OwnerNotificationSettingsRow[]>(
      `/wa_owner_notification_settings?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&limit=1`,
    );
    return rows[0] ? fromSettingsRow(rows[0]) : defaultSettings(businessId);
  } catch (error) {
    if (isMissingOwnerNotificationTableError(error)) return defaultSettings(businessId);
    throw error;
  }
}

async function createOwnerNotification(input: {
  businessId: string;
  orderId: string;
  type: OwnerNotificationType;
  channel: OwnerNotificationChannel;
  status: OwnerNotificationStatus;
  recipient: string | null;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  dedupeKey: string;
  errorCode?: string;
  errorMessage?: string;
  scheduledFor?: string;
  sentAt?: string;
}) {
  const timestamp = new Date().toISOString();
  const row = {
    business_id: input.businessId,
    order_id: input.orderId,
    type: input.type,
    channel: input.channel,
    status: input.status,
    recipient: input.recipient,
    title: input.title,
    message: input.message,
    metadata: input.metadata,
    dedupe_key: input.dedupeKey,
    error_code: input.errorCode ?? null,
    error_message: input.errorMessage ?? null,
    scheduled_for: input.scheduledFor ?? null,
    sent_at: input.sentAt ?? null,
    updated_at: timestamp,
  };

  if (!isServerSupabaseConfigured()) {
    const existing = [...inMemoryNotifications.values()].find(
      (notification) => notification.dedupe_key === input.dedupeKey,
    );
    if (existing) return undefined;
    const id = `owner-notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const notification = {
      ...row,
      id,
      read_at: null,
      created_at: timestamp,
    } satisfies OwnerNotificationRow;
    inMemoryNotifications.set(id, notification);
    return notification;
  }

  const rows = await supabaseServerRest<OwnerNotificationRow[]>(
    "/wa_owner_notifications?on_conflict=dedupe_key",
    {
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=representation",
      body: JSON.stringify(row),
    },
  );
  return rows[0];
}

async function listOwnerNotifications({
  businessId,
  limit,
}: {
  businessId: string;
  limit: number;
}) {
  if (!isServerSupabaseConfigured()) {
    return [...inMemoryNotifications.values()]
      .filter((notification) => notification.business_id === businessId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }

  try {
    return await supabaseServerRest<OwnerNotificationRow[]>(
      `/wa_owner_notifications?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&order=created_at.desc&limit=${limit}`,
    );
  } catch (error) {
    if (isMissingOwnerNotificationTableError(error)) return [];
    throw error;
  }
}

async function sendOwnerEmailNotification({
  businessId,
  orderId,
  recipientEmail,
  subject,
  body,
}: {
  businessId: string;
  orderId: string;
  recipientEmail: string | null;
  subject: string;
  body: string;
}) {
  if (!recipientEmail || !isEmailProviderConfigured()) {
    return createOwnerNotification({
      businessId,
      orderId,
      type: "NEW_ORDER",
      channel: "EMAIL",
      status: "SKIPPED",
      recipient: recipientEmail,
      title: subject,
      message: body,
      metadata: {},
      dedupeKey: dedupeKey(businessId, orderId, "NEW_ORDER", "EMAIL"),
      errorCode: "EMAIL_NOT_CONFIGURED",
      errorMessage: "Owner email or email provider is not configured.",
    });
  }

  return createOwnerNotification({
    businessId,
    orderId,
    type: "NEW_ORDER",
    channel: "EMAIL",
    status: "SKIPPED",
    recipient: recipientEmail,
    title: subject,
    message: body,
    metadata: {},
    dedupeKey: dedupeKey(businessId, orderId, "NEW_ORDER", "EMAIL"),
    errorCode: "EMAIL_PROVIDER_NOT_IMPLEMENTED",
    errorMessage: "Email provider integration is not configured for this project.",
  });
}

async function sendOwnerWhatsAppTemplateNotification({
  businessId,
  orderId,
  recipient,
  title,
  message,
}: {
  businessId: string;
  orderId: string;
  recipient: string | null;
  title: string;
  message: string;
}) {
  return createOwnerNotification({
    businessId,
    orderId,
    type: "NEW_ORDER",
    channel: "WHATSAPP_TEMPLATE",
    status: "TEMPLATE_REQUIRED",
    recipient,
    title,
    message,
    metadata: {},
    dedupeKey: dedupeKey(businessId, orderId, "NEW_ORDER", "WHATSAPP_TEMPLATE"),
    errorCode: "TEMPLATE_REQUIRED",
    errorMessage: "Owner WhatsApp alerts require an approved template.",
  });
}

async function createReminderNotification({
  businessId,
  order,
  type,
  title,
  message,
}: {
  businessId: string;
  order: ReminderOrderRow;
  type: Extract<
    OwnerNotificationType,
    "ORDER_UNHANDLED_FIRST_REMINDER" | "ORDER_UNHANDLED_SECOND_REMINDER"
  >;
  title: string;
  message: string;
}) {
  const metadata = {
    orderNumber: order.order_number,
    customerName: order.customer_name,
    total: Number(order.total),
    fulfillmentMethod: order.fulfillment_method,
  };
  return createOwnerNotification({
    businessId,
    orderId: order.id,
    type,
    channel: "DASHBOARD",
    status: "SENT",
    recipient: null,
    title,
    message,
    metadata,
    dedupeKey: dedupeKey(businessId, order.id, type, "DASHBOARD"),
    sentAt: new Date().toISOString(),
  });
}

type ReminderOrderRow = {
  id: string;
  business_id: string;
  order_number: string;
  customer_name: string;
  total: number | string;
  fulfillment_method: string;
  status: string;
  created_at: string;
};

async function listPendingOrdersForReminders({ businessId }: { businessId: string }) {
  if (!isServerSupabaseConfigured()) return [] as ReminderOrderRow[];
  return supabaseServerRest<ReminderOrderRow[]>(
    `/wa_orders?select=id,business_id,order_number,customer_name,total,fulfillment_method,status,created_at&business_id=eq.${encodeURIComponent(
      businessId,
    )}&status=eq.PENDING_OWNER_CONFIRMATION&limit=100`,
  );
}

async function countOwnerNotifications({
  businessId,
  status,
}: {
  businessId: string;
  status: OwnerNotificationStatus;
}) {
  const rows = await listOwnerNotifications({ businessId, limit: 100 });
  return rows.filter((row) => row.status === status).length;
}

async function getLatestOwnerNotification({
  businessId,
  type,
}: {
  businessId: string;
  type: OwnerNotificationType;
}) {
  const rows = await listOwnerNotifications({ businessId, limit: 100 });
  return rows.find((row) => row.type === type);
}

async function countPendingOrdersOlderThan({
  businessId,
  minutes,
}: {
  businessId: string;
  minutes: number;
}) {
  const threshold = Date.now() - minutes * 60 * 1000;
  const rows = await listPendingOrdersForReminders({ businessId });
  return rows.filter((order) => new Date(order.created_at).getTime() <= threshold).length;
}

function defaultSettings(businessId: string): OwnerNotificationSettings {
  return {
    businessId,
    enableDashboardAlerts: true,
    enableSound: true,
    enableBrowserPush: true,
    enableEmailAlerts: false,
    enableWhatsAppAlerts: false,
    ownerEmail: null,
    ownerWhatsAppNumber: null,
    newOrderReminderMinutes: 5,
    secondReminderMinutes: 15,
    reminderEscalationEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: null,
    quietHoursEnd: null,
  };
}

function fromSettingsRow(row: OwnerNotificationSettingsRow): OwnerNotificationSettings {
  return {
    businessId: row.business_id,
    enableDashboardAlerts: row.enable_dashboard_alerts,
    enableSound: row.enable_sound,
    enableBrowserPush: row.enable_browser_push,
    enableEmailAlerts: row.enable_email_alerts,
    enableWhatsAppAlerts: row.enable_whatsapp_alerts,
    ownerEmail: row.owner_email,
    ownerWhatsAppNumber: row.owner_whatsapp_number,
    newOrderReminderMinutes: row.new_order_reminder_minutes,
    secondReminderMinutes: row.second_reminder_minutes,
    reminderEscalationEnabled: row.reminder_escalation_enabled,
    quietHoursEnabled: row.quiet_hours_enabled,
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end,
  };
}

function orderMetadata(order: WhatsAppOrder) {
  return {
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    total: order.total,
    fulfillmentMethod: order.fulfillmentMethod,
    paymentMethod: order.paymentMethod,
  };
}

function buildEmailBody(order: WhatsAppOrder) {
  return [
    "New order received.",
    "",
    `Customer: ${order.customerName}`,
    `Phone: ${order.customerPhone}`,
    `Total: ${formatMoney(order.total)}`,
    `Fulfillment: ${order.fulfillmentMethod}`,
    `Payment: ${order.paymentMethod}`,
    "",
    `Open order: ${getPublicBaseUrl()}/dashboard/orders/${order.id}`,
  ].join("\n");
}

function dedupeKey(
  businessId: string,
  orderId: string,
  type: OwnerNotificationType,
  channel: OwnerNotificationChannel,
) {
  return `${businessId}:${orderId}:${type}:${channel}`;
}

function formatMoney(value: number | string) {
  return `$${Number(value).toFixed(2)}`;
}

function getPublicBaseUrl() {
  return process.env.PUBLIC_SITE_URL || process.env.VERCEL_URL || "https://www.doubleacode.com";
}

function isEmailProviderConfigured() {
  return Boolean(process.env.OWNER_EMAIL_PROVIDER_URL && process.env.OWNER_EMAIL_API_KEY);
}

function isMissingOwnerNotificationTableError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("wa_owner_notification");
}
