import "@tanstack/react-start/server-only";

import process from "node:process";

import { supabaseServerRest } from "@/lib/supabase/server-rest.server";

import { getWhatsAppServerConfig } from "./config.server";
import { getBusinessCheckoutSettings } from "./checkout-settings.server";
import { getActiveConversationSession } from "./conversation-store.server";
import { sendWhatsAppText, type SendResult } from "./sender.server";

const PARTNER_TEST_BUSINESS_ID = "double-a-partner-test-business";
const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type DashboardOrderStatus =
  | "PENDING_OWNER_CONFIRMATION"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export type DashboardReservationStatus = "ACTIVE" | "COMMITTED" | "RELEASED" | "EXPIRED";

export type DashboardLifecycleAction =
  | "start_preparing"
  | "mark_ready"
  | "out_for_delivery"
  | "complete"
  | "cancel";

export const allowedOrderTransitions: Record<DashboardOrderStatus, DashboardOrderStatus[]> = {
  PENDING_OWNER_CONFIRMATION: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

export type DashboardOrderRow = {
  id: string;
  business_id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  alternate_phone: string | null;
  language: "en" | "ar";
  status: DashboardOrderStatus;
  fulfillment_method: "delivery" | "pickup";
  delivery_area_id: string | null;
  delivery_address: string | null;
  delivery_latitude: number | string | null;
  delivery_longitude: number | string | null;
  pickup_location_id: string | null;
  payment_method: string;
  notes: string | null;
  subtotal: number | string;
  delivery_fee: number | string;
  total: number | string;
  accepted_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  out_for_delivery_at: string | null;
  completed_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  restock_required: boolean;
  decided_by: string | null;
  customer_notification_status: string;
  customer_notification_error: string | null;
  customer_notified_at: string | null;
  template_notification_required: boolean;
  created_at: string;
  updated_at: string;
};

export type DashboardOrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_code: string;
  product_name: string;
  selected_options: Array<{ label: string; value: string }>;
  custom_field_answers: Array<{ label: string; value: string }>;
  quantity: number;
  unit_price: number | string;
  line_total: number | string;
  created_at: string;
};

export type DashboardReservationRow = {
  id: string;
  business_id: string;
  order_id: string;
  product_variant_id: string;
  quantity: number;
  status: DashboardReservationStatus;
  expires_at: string;
  created_at: string;
};

export type DashboardOrderStatusHistoryRow = {
  id: string;
  business_id: string;
  order_id: string;
  previous_status: DashboardOrderStatus | null;
  new_status: DashboardOrderStatus;
  reason: string | null;
  changed_by_user_id: string | null;
  source: "OWNER_DASHBOARD" | "SYSTEM" | "CUSTOMER" | "ADMIN";
  created_at: string;
};

export type DashboardOrderNotificationRow = {
  id: string;
  business_id: string;
  order_id: string;
  customer_phone: string;
  order_status: DashboardOrderStatus;
  message_type: string;
  language: "en" | "ar";
  status: "PENDING" | "SENT" | "FAILED" | "TEMPLATE_REQUIRED" | "SKIPPED";
  meta_message_id: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
};

export type DashboardOrderSummary = DashboardOrderRow & {
  item_count: number;
  reservation_status: DashboardReservationStatus | "NONE" | "MIXED";
  reservation_expires_at: string | null;
};

export type DashboardOrderDetails = DashboardOrderRow & {
  items: DashboardOrderItemRow[];
  reservations: DashboardReservationRow[];
  history: DashboardOrderStatusHistoryRow[];
  notifications: DashboardOrderNotificationRow[];
  delivery_area_label?: string;
  pickup_location_label?: string;
  payment_method_label?: string;
};

type DecisionRpcRow = {
  id: string;
  order_number: string;
  customer_phone: string;
  language: "en" | "ar";
  status: DashboardOrderStatus;
  customer_notification_status: string;
};

type TransitionRpcRow = DecisionRpcRow & {
  previous_status: DashboardOrderStatus;
  fulfillment_method: "delivery" | "pickup";
};

type OrderNotificationType =
  | "accepted"
  | "rejected"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

export async function listDashboardOrders({
  businessId,
  status,
}: {
  businessId: string;
  status: DashboardOrderStatus | "ALL";
}) {
  await expireReservations(businessId);
  const statusFilter = status === "ALL" ? "" : `&status=eq.${encodeURIComponent(status)}`;
  const orders = await supabaseServerRest<DashboardOrderRow[]>(
    `/wa_orders?select=*&business_id=eq.${encodeURIComponent(
      businessId,
    )}${statusFilter}&order=updated_at.desc&limit=100`,
  );
  const orderIds = orders.map((order) => order.id);
  const [items, reservations] = orderIds.length
    ? await Promise.all([
        supabaseServerRest<Array<{ order_id: string; quantity: number }>>(
          `/wa_order_items?select=order_id,quantity&order_id=in.(${formatInList(orderIds)})`,
        ),
        supabaseServerRest<DashboardReservationRow[]>(
          `/wa_stock_reservations?select=*&business_id=eq.${encodeURIComponent(
            businessId,
          )}&order_id=in.(${formatInList(orderIds)})`,
        ),
      ])
    : [[], []];

  return orders.map((order): DashboardOrderSummary => {
    const orderItems = items.filter((item) => item.order_id === order.id);
    const orderReservations = reservations.filter(
      (reservation) => reservation.order_id === order.id,
    );
    return {
      ...order,
      item_count: orderItems.reduce((sum, item) => sum + Number(item.quantity), 0),
      reservation_status: summarizeReservationStatus(orderReservations),
      reservation_expires_at: getEarliestReservationExpiry(orderReservations),
    };
  });
}

export async function getDashboardOrderDetails({
  businessId,
  orderId,
}: {
  businessId: string;
  orderId: string;
}) {
  await expireReservations(businessId);
  const rows = await supabaseServerRest<DashboardOrderRow[]>(
    `/wa_orders?select=*&business_id=eq.${encodeURIComponent(
      businessId,
    )}&id=eq.${encodeURIComponent(orderId)}&limit=1`,
  );
  const order = rows[0];
  if (!order) throw new Error("Order was not found.");

  const [items, reservations, history, notifications, settings] = await Promise.all([
    supabaseServerRest<DashboardOrderItemRow[]>(
      `/wa_order_items?select=*&order_id=eq.${encodeURIComponent(orderId)}&order=created_at.asc`,
    ),
    supabaseServerRest<DashboardReservationRow[]>(
      `/wa_stock_reservations?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&order_id=eq.${encodeURIComponent(orderId)}&order=created_at.asc`,
    ),
    supabaseServerRest<DashboardOrderStatusHistoryRow[]>(
      `/wa_order_status_history?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&order_id=eq.${encodeURIComponent(orderId)}&order=created_at.asc`,
    ),
    supabaseServerRest<DashboardOrderNotificationRow[]>(
      `/wa_order_notifications?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&order_id=eq.${encodeURIComponent(orderId)}&order=created_at.desc`,
    ),
    getBusinessCheckoutSettings(businessId),
  ]);

  const deliveryArea = settings?.deliveryAreas.find((area) => area.id === order.delivery_area_id);
  const pickupLocation = settings?.pickupLocations.find(
    (location) => location.id === order.pickup_location_id,
  );
  const paymentMethod = settings?.paymentMethods.find(
    (method) => method.id === order.payment_method,
  );

  return {
    ...order,
    items,
    reservations,
    history,
    notifications,
    delivery_area_label: deliveryArea?.nameEnglish,
    pickup_location_label: pickupLocation?.nameEnglish,
    payment_method_label: paymentMethod?.labelEnglish,
  } satisfies DashboardOrderDetails;
}

export async function acceptDashboardOrder({
  businessId,
  orderId,
  actor,
}: {
  businessId: string;
  orderId: string;
  actor: string;
}) {
  const rows = await supabaseServerRest<DecisionRpcRow[]>("/rpc/wa_accept_order", {
    method: "POST",
    body: JSON.stringify({
      p_business_id: businessId,
      p_order_id: orderId,
      p_decided_by: actor,
    }),
  });
  const decision = rows[0];
  if (!decision) throw new Error("Order acceptance did not return a result.");

  await ensureDecisionHistory({
    businessId,
    orderId,
    previousStatus: "PENDING_OWNER_CONFIRMATION",
    newStatus: "ACCEPTED",
    actor,
  });

  const notification = await notifyCustomer({
    businessId,
    orderId,
    orderNumber: decision.order_number,
    customerPhone: decision.customer_phone,
    language: decision.language,
    type: "accepted",
  });

  return {
    order: await getDashboardOrderDetails({ businessId, orderId }),
    notification,
  };
}

export async function rejectDashboardOrder({
  businessId,
  orderId,
  reason,
  actor,
}: {
  businessId: string;
  orderId: string;
  reason?: string;
  actor: string;
}) {
  const cleanReason = sanitizeReason(reason);
  const rows = await supabaseServerRest<DecisionRpcRow[]>("/rpc/wa_reject_order", {
    method: "POST",
    body: JSON.stringify({
      p_business_id: businessId,
      p_order_id: orderId,
      p_reason: cleanReason,
      p_decided_by: actor,
    }),
  });
  const decision = rows[0];
  if (!decision) throw new Error("Order rejection did not return a result.");

  await ensureDecisionHistory({
    businessId,
    orderId,
    previousStatus: "PENDING_OWNER_CONFIRMATION",
    newStatus: "REJECTED",
    actor,
    reason: cleanReason,
  });

  const notification = await notifyCustomer({
    businessId,
    orderId,
    orderNumber: decision.order_number,
    customerPhone: decision.customer_phone,
    language: decision.language,
    type: "rejected",
    reason: cleanReason,
  });

  return {
    order: await getDashboardOrderDetails({ businessId, orderId }),
    notification,
  };
}

export async function transitionDashboardOrder({
  businessId,
  orderId,
  action,
  reason,
  actor,
}: {
  businessId: string;
  orderId: string;
  action: DashboardLifecycleAction;
  reason?: string;
  actor: string;
}) {
  const targetStatus = lifecycleActionToStatus(action);
  const cleanReason = sanitizeReason(reason);
  if (targetStatus === "CANCELLED" && !cleanReason) {
    throw new Error("Cancellation reason is required.");
  }

  const rows = await supabaseServerRest<TransitionRpcRow[]>("/rpc/wa_transition_order_status", {
    method: "POST",
    body: JSON.stringify({
      p_business_id: businessId,
      p_order_id: orderId,
      p_target_status: targetStatus,
      p_reason: cleanReason,
      p_changed_by: actor,
      p_source: "OWNER_DASHBOARD",
    }),
  });
  const transition = rows[0];
  if (!transition) throw new Error("Order transition did not return a result.");

  const notification = await notifyCustomer({
    businessId,
    orderId,
    orderNumber: transition.order_number,
    customerPhone: transition.customer_phone,
    language: transition.language,
    type: statusToNotificationType(transition.status),
    reason: cleanReason,
    fulfillmentMethod: transition.fulfillment_method,
  });

  return {
    order: await getDashboardOrderDetails({ businessId, orderId }),
    notification,
  };
}

async function expireReservations(businessId: string) {
  await supabaseServerRest<number>("/rpc/wa_expire_stock_reservations", {
    method: "POST",
    body: JSON.stringify({ p_business_id: businessId }),
  });
}

async function ensureDecisionHistory({
  businessId,
  orderId,
  previousStatus,
  newStatus,
  actor,
  reason,
}: {
  businessId: string;
  orderId: string;
  previousStatus: DashboardOrderStatus;
  newStatus: DashboardOrderStatus;
  actor: string;
  reason?: string;
}) {
  const existing = await supabaseServerRest<Array<{ id: string }>>(
    `/wa_order_status_history?select=id&business_id=eq.${encodeURIComponent(
      businessId,
    )}&order_id=eq.${encodeURIComponent(orderId)}&new_status=eq.${encodeURIComponent(
      newStatus,
    )}&limit=1`,
  );
  if (existing.length) return;

  await supabaseServerRest("/wa_order_status_history", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify({
      business_id: businessId,
      order_id: orderId,
      previous_status: previousStatus,
      new_status: newStatus,
      reason: reason || null,
      changed_by_user_id: actor || null,
      source: "OWNER_DASHBOARD",
    }),
  });
}

async function notifyCustomer({
  businessId,
  orderId,
  orderNumber,
  customerPhone,
  language,
  type,
  reason,
  fulfillmentMethod,
}: {
  businessId: string;
  orderId: string;
  orderNumber: string;
  customerPhone: string;
  language: "en" | "ar";
  type: OrderNotificationType;
  reason?: string;
  fulfillmentMethod?: "delivery" | "pickup";
}) {
  const claimedNotification = await claimNotification({
    businessId,
    orderId,
    orderStatus: notificationTypeToStatus(type),
    messageType: type,
    customerPhone,
    language,
  });

  if (!claimedNotification) {
    return { ok: true, messageId: "duplicate-skipped" } satisfies SendResult;
  }

  const serviceWindowOpen = await isCustomerServiceWindowOpen({ businessId, customerPhone });
  if (!serviceWindowOpen) {
    const result = {
      ok: false,
      status: 470,
      errorCode: "TEMPLATE_REQUIRED",
      errorMessage: "Customer service window is closed. Template message is required.",
    } satisfies SendResult;
    await updateNotification({
      businessId,
      notificationId: claimedNotification.id,
      status: "TEMPLATE_REQUIRED",
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
    });
    await recordNotificationResult({ businessId, orderId, result });
    return result;
  }

  const config = getWhatsAppServerConfig(getWhatsAppConfigSuffixForBusiness(businessId));
  const result = config.phoneNumberId
    ? await sendWhatsAppText({
        phoneNumberId: config.phoneNumberId,
        recipient: customerPhone,
        message: buildCustomerNotificationMessage({
          orderNumber,
          language,
          type,
          reason,
          fulfillmentMethod,
        }),
        config,
      })
    : ({
        ok: false,
        status: 500,
        errorMessage: "WHATSAPP_PHONE_NUMBER_ID is not configured.",
      } satisfies SendResult);

  await updateNotification({
    businessId,
    notificationId: claimedNotification.id,
    status: result.ok ? "SENT" : "FAILED",
    metaMessageId: result.ok ? result.messageId : undefined,
    errorCode: result.ok ? undefined : result.errorCode,
    errorMessage: result.ok ? undefined : result.errorMessage,
  });
  await recordNotificationResult({ businessId, orderId, result });
  return result;
}

function lifecycleActionToStatus(action: DashboardLifecycleAction): DashboardOrderStatus {
  if (action === "start_preparing") return "PREPARING";
  if (action === "mark_ready") return "READY";
  if (action === "out_for_delivery") return "OUT_FOR_DELIVERY";
  if (action === "complete") return "COMPLETED";
  return "CANCELLED";
}

function statusToNotificationType(status: DashboardOrderStatus): OrderNotificationType {
  if (status === "PREPARING") return "preparing";
  if (status === "READY") return "ready";
  if (status === "OUT_FOR_DELIVERY") return "out_for_delivery";
  if (status === "COMPLETED") return "completed";
  if (status === "CANCELLED") return "cancelled";
  throw new Error(`No customer notification is configured for ${status}.`);
}

function notificationTypeToStatus(type: OrderNotificationType): DashboardOrderStatus {
  if (type === "accepted") return "ACCEPTED";
  if (type === "rejected") return "REJECTED";
  if (type === "preparing") return "PREPARING";
  if (type === "ready") return "READY";
  if (type === "out_for_delivery") return "OUT_FOR_DELIVERY";
  if (type === "completed") return "COMPLETED";
  return "CANCELLED";
}

function sanitizeReason(reason?: string) {
  return reason?.trim().replace(/\s+/g, " ").slice(0, 500) ?? "";
}

function buildCustomerNotificationMessage({
  orderNumber,
  language,
  type,
  reason,
  fulfillmentMethod,
}: {
  orderNumber: string;
  language: "en" | "ar";
  type: OrderNotificationType;
  reason?: string;
  fulfillmentMethod?: "delivery" | "pickup";
}) {
  const cleanReason = sanitizeReason(reason);
  const readyMessage =
    fulfillmentMethod === "delivery"
      ? {
          en: `Your order ${orderNumber} is ready and will be sent out soon.`,
          ar: `طلبك ${orderNumber} جاهز وسيتم إرساله قريبا.`,
        }
      : {
          en: `Your order ${orderNumber} is ready for pickup.`,
          ar: `طلبك ${orderNumber} جاهز للاستلام.`,
        };
  const messages: Record<OrderNotificationType, { en: string; ar: string }> = {
    accepted: {
      en: `Your order ${orderNumber} has been accepted.\n\nThe store is now preparing your order.`,
      ar: `تم قبول طلبك ${orderNumber}.\n\nالمتجر يجهز طلبك الآن.`,
    },
    rejected: {
      en: [
        `Unfortunately, order ${orderNumber} could not be accepted.`,
        cleanReason ? `Reason: ${cleanReason}` : undefined,
      ]
        .filter(Boolean)
        .join("\n\n"),
      ar: [
        `للأسف، لا يمكن قبول الطلب ${orderNumber}.`,
        cleanReason ? `السبب: ${cleanReason}` : undefined,
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
    preparing: {
      en: `Your order ${orderNumber} is now being prepared.`,
      ar: `يتم الآن تحضير طلبك ${orderNumber}.`,
    },
    ready: readyMessage,
    out_for_delivery: {
      en: `Your order ${orderNumber} is out for delivery.`,
      ar: `طلبك ${orderNumber} أصبح في طريقه إليك.`,
    },
    completed: {
      en: `Order ${orderNumber} has been completed. Thank you for your order.`,
      ar: `تم إكمال الطلب ${orderNumber}. شكرا لطلبك.`,
    },
    cancelled: {
      en: [`Order ${orderNumber} has been cancelled.`, cleanReason ? `Reason: ${cleanReason}` : ""]
        .filter(Boolean)
        .join("\n\n"),
      ar: [`تم إلغاء الطلب ${orderNumber}.`, cleanReason ? `السبب: ${cleanReason}` : ""]
        .filter(Boolean)
        .join("\n\n"),
    },
  };

  return messages[type][language];
}

async function isCustomerServiceWindowOpen({
  businessId,
  customerPhone,
}: {
  businessId: string;
  customerPhone: string;
}) {
  const session = await getActiveConversationSession({ businessId, customerPhone });
  if (!session) return false;
  return Date.now() - new Date(session.lastCustomerMessageAt).getTime() <= SERVICE_WINDOW_MS;
}

async function claimNotification({
  businessId,
  orderId,
  orderStatus,
  messageType,
  customerPhone,
  language,
}: {
  businessId: string;
  orderId: string;
  orderStatus: DashboardOrderStatus;
  messageType: OrderNotificationType;
  customerPhone: string;
  language: "en" | "ar";
}) {
  const rows = await supabaseServerRest<DashboardOrderNotificationRow[]>(
    "/wa_order_notifications?on_conflict=business_id,order_id,order_status,message_type",
    {
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=representation",
      body: JSON.stringify({
        business_id: businessId,
        order_id: orderId,
        customer_phone: customerPhone,
        order_status: orderStatus,
        message_type: messageType,
        language,
        status: "PENDING",
      }),
    },
  );

  return rows[0];
}

async function updateNotification({
  businessId,
  notificationId,
  status,
  metaMessageId,
  errorCode,
  errorMessage,
}: {
  businessId: string;
  notificationId: string;
  status: DashboardOrderNotificationRow["status"];
  metaMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
}) {
  await supabaseServerRest(
    `/wa_order_notifications?business_id=eq.${encodeURIComponent(
      businessId,
    )}&id=eq.${encodeURIComponent(notificationId)}`,
    {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({
        status,
        meta_message_id: metaMessageId ?? null,
        error_code: errorCode ?? null,
        error_message: errorMessage ?? null,
        sent_at: status === "SENT" ? new Date().toISOString() : null,
      }),
    },
  );
}

function getWhatsAppConfigSuffixForBusiness(businessId: string) {
  const partnerBusinessId = process.env.WA_DASHBOARD_BUSINESS_ID_2 || PARTNER_TEST_BUSINESS_ID;
  return businessId === partnerBusinessId ? "2" : "";
}

async function recordNotificationResult({
  businessId,
  orderId,
  result,
}: {
  businessId: string;
  orderId: string;
  result: SendResult;
}) {
  const templateRequired = !result.ok && result.errorCode === "TEMPLATE_REQUIRED";
  await supabaseServerRest(
    `/wa_orders?business_id=eq.${encodeURIComponent(businessId)}&id=eq.${encodeURIComponent(
      orderId,
    )}`,
    {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({
        customer_notification_status: result.ok
          ? "SENT"
          : templateRequired
            ? "TEMPLATE_REQUIRED"
            : "FAILED",
        customer_notification_error: result.ok ? null : result.errorMessage,
        customer_notified_at: result.ok ? new Date().toISOString() : null,
        template_notification_required:
          templateRequired || (!result.ok && result.errorCode === "131047"),
        updated_at: new Date().toISOString(),
      }),
    },
  );
}

function summarizeReservationStatus(reservations: DashboardReservationRow[]) {
  if (!reservations.length) return "NONE";
  const statuses = new Set(reservations.map((reservation) => reservation.status));
  return statuses.size === 1 ? [...statuses][0] : "MIXED";
}

function getEarliestReservationExpiry(reservations: DashboardReservationRow[]) {
  const timestamps = reservations
    .filter((reservation) => reservation.status === "ACTIVE")
    .map((reservation) => reservation.expires_at)
    .sort();
  return timestamps[0] ?? null;
}

function formatInList(values: string[]) {
  return values.map((value) => `"${encodeURIComponent(value)}"`).join(",");
}
