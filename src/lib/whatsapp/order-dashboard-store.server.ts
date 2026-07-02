import "@tanstack/react-start/server-only";

import process from "node:process";

import { supabaseServerRest } from "@/lib/supabase/server-rest.server";

import { getWhatsAppServerConfig } from "./config.server";
import { getBusinessCheckoutSettings } from "./checkout-settings.server";
import { sendWhatsAppText, type SendResult } from "./sender.server";

const PARTNER_TEST_BUSINESS_ID = "double-a-partner-test-business";

export type DashboardOrderStatus = "PENDING_OWNER_CONFIRMATION" | "ACCEPTED" | "REJECTED";

export type DashboardReservationStatus = "ACTIVE" | "COMMITTED" | "RELEASED" | "EXPIRED";

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
  rejected_at: string | null;
  rejection_reason: string | null;
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

export type DashboardOrderSummary = DashboardOrderRow & {
  item_count: number;
  reservation_status: DashboardReservationStatus | "NONE" | "MIXED";
  reservation_expires_at: string | null;
};

export type DashboardOrderDetails = DashboardOrderRow & {
  items: DashboardOrderItemRow[];
  reservations: DashboardReservationRow[];
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
    )}${statusFilter}&order=created_at.desc&limit=100`,
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

  const [items, reservations, settings] = await Promise.all([
    supabaseServerRest<DashboardOrderItemRow[]>(
      `/wa_order_items?select=*&order_id=eq.${encodeURIComponent(orderId)}&order=created_at.asc`,
    ),
    supabaseServerRest<DashboardReservationRow[]>(
      `/wa_stock_reservations?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&order_id=eq.${encodeURIComponent(orderId)}&order=created_at.asc`,
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
  const rows = await supabaseServerRest<DecisionRpcRow[]>("/rpc/wa_reject_order", {
    method: "POST",
    body: JSON.stringify({
      p_business_id: businessId,
      p_order_id: orderId,
      p_reason: reason?.trim() ?? "",
      p_decided_by: actor,
    }),
  });
  const decision = rows[0];
  if (!decision) throw new Error("Order rejection did not return a result.");

  const notification = await notifyCustomer({
    businessId,
    orderId,
    orderNumber: decision.order_number,
    customerPhone: decision.customer_phone,
    language: decision.language,
    type: "rejected",
    reason,
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

async function notifyCustomer({
  businessId,
  orderId,
  orderNumber,
  customerPhone,
  language,
  type,
  reason,
}: {
  businessId: string;
  orderId: string;
  orderNumber: string;
  customerPhone: string;
  language: "en" | "ar";
  type: "accepted" | "rejected";
  reason?: string;
}) {
  const config = getWhatsAppServerConfig(getWhatsAppConfigSuffixForBusiness(businessId));
  const message =
    type === "accepted"
      ? language === "ar"
        ? `تم قبول طلبك ${orderNumber}.\n\nالمتجر يجهز طلبك الآن.`
        : `Your order ${orderNumber} has been accepted.\n\nThe store is now preparing your order.`
      : language === "ar"
        ? [
            `للأسف، لا يمكن قبول الطلب ${orderNumber}.`,
            reason?.trim() ? `السبب: ${reason.trim()}` : undefined,
          ]
            .filter(Boolean)
            .join("\n\n")
        : [
            `Unfortunately, order ${orderNumber} could not be accepted.`,
            reason?.trim() ? `Reason: ${reason.trim()}` : undefined,
          ]
            .filter(Boolean)
            .join("\n\n");

  const result = config.phoneNumberId
    ? await sendWhatsAppText({
        phoneNumberId: config.phoneNumberId,
        recipient: customerPhone,
        message,
      })
    : ({
        ok: false,
        status: 500,
        errorMessage: "WHATSAPP_PHONE_NUMBER_ID is not configured.",
      } satisfies SendResult);

  await recordNotificationResult({ businessId, orderId, result });
  return result;
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
  await supabaseServerRest(
    `/wa_orders?business_id=eq.${encodeURIComponent(businessId)}&id=eq.${encodeURIComponent(
      orderId,
    )}`,
    {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({
        customer_notification_status: result.ok ? "SENT" : "FAILED",
        customer_notification_error: result.ok ? null : result.errorMessage,
        customer_notified_at: result.ok ? new Date().toISOString() : null,
        template_notification_required: !result.ok && result.errorCode === "131047",
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
