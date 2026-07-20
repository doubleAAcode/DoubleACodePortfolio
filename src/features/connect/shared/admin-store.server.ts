import "@tanstack/react-start/server-only";

import { isServerSupabaseConfigured, supabaseServerRest } from "@/lib/supabase/server-rest.server";

import { canBusinessProcessMessages, type BusinessOperationalStatus } from "./reliability";
import { getBusinessFlowDetails } from "./flow-template-store.server";
import { validateFlowForEditor } from "./flow-editor";
import {
  getBusinessBotFlowSettings,
  saveBusinessBotFlowSettings,
  type BotFlowSettingsInput,
  type BusinessBotFlowSettings,
} from "./bot-flow-settings.server";
import type {
  WaCatalogGroupRow,
  WaCatalogGroupValueRow,
  WaCategoryRow,
  WaDeliveryAreaRow,
  WaPaymentMethodRow,
  WaPickupLocationRow,
  WaProductCustomFieldRow,
  WaProductGroupValueRow,
  WaProductOptionRow,
  WaProductOptionValueRow,
  WaProductRow,
  WaProductVariantRow,
  SaveCategoryInput,
  SaveCustomFieldInput,
  SaveDeliveryAreaInput,
  SavePaymentMethodInput,
  SavePickupLocationInput,
  SaveOptionInput,
  SaveOptionValueInput,
  SaveProductInput,
  SaveVariantInput,
} from "./dashboard-store.server";
import { applyWaDashboardAction } from "./dashboard-store.server";

export type AdminBusinessStatus = BusinessOperationalStatus;
export type AdminBusinessTemplate =
  | "ecommerce"
  | "restaurant"
  | "greeting_store_info"
  | "standard_online_store"
  | "jewelry_store"
  | "clothing_store"
  | "accessories_store"
  | "custom_products";

export type AdminBusinessRow = {
  id: string;
  name: string;
  legal_name: string | null;
  default_language: "en" | "ar";
  currency: string;
  allow_delivery?: boolean;
  allow_pickup?: boolean;
  minimum_order_amount?: number | string;
  order_confirmation_message_english?: string;
  order_confirmation_message_arabic?: string;
  require_owner_approval?: boolean;
  is_active: boolean;
  status?: AdminBusinessStatus;
  timezone?: string;
  country?: string;
  template_type?: AdminBusinessTemplate;
  created_at: string;
  updated_at: string;
};

export type AdminBusinessUserRow = {
  id: string;
  business_id: string;
  email: string;
  display_name: string | null;
  role: "OWNER" | "MANAGER" | "STAFF" | "VIEWER";
  status: "INVITED" | "ACTIVE" | "REMOVED";
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminConnectionRow = {
  id: string;
  business_id: string;
  provider: string;
  phone_number_id: string;
  business_account_id: string | null;
  display_phone_number: string | null;
  display_name: string | null;
  app_id: string | null;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "DISCONNECTED" | "ERROR";
  is_active: boolean;
  webhook_path: string | null;
  access_token_ref: string | null;
  app_secret_ref: string | null;
  verify_token_ref: string | null;
  config_suffix: string | null;
  last_health_check_at: string | null;
  last_health_status: "OK" | "WARNING" | "ERROR" | null;
  created_at: string;
  updated_at: string;
};

type AdminAuditRow = {
  id: string;
  admin_user_id: string;
  business_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  created_at: string;
};

type AdminOrderRow = {
  id: string;
  business_id: string;
  status: string;
  order_number: string;
  created_at: string;
};

type WebhookLogRow = {
  id: string;
  business_id: string | null;
  connection_id: string | null;
  phone_number_id: string | null;
  sender_mask: string | null;
  result: string;
  error_summary: string | null;
  created_at: string;
};

export type AdminBusinessSummary = AdminBusinessRow & {
  ownerName: string | null;
  ownerEmail: string | null;
  connectionStatus: string;
  displayPhoneNumber: string | null;
  lastOrderAt: string | null;
  healthStatus: "OK" | "WARNING" | "ERROR";
};

export type AdminBusinessDetails = {
  business: AdminBusinessRow;
  users: AdminBusinessUserRow[];
  connections: AdminConnectionRow[];
  catalogCategories: WaCategoryRow[];
  catalogGroups: WaCatalogGroupRow[];
  catalogGroupValues: WaCatalogGroupValueRow[];
  catalogProducts: WaProductRow[];
  productGroupValues: WaProductGroupValueRow[];
  productOptions: WaProductOptionRow[];
  productOptionValues: WaProductOptionValueRow[];
  productVariants: WaProductVariantRow[];
  productCustomFields: WaProductCustomFieldRow[];
  deliveryAreas: WaDeliveryAreaRow[];
  pickupLocations: WaPickupLocationRow[];
  paymentMethods: WaPaymentMethodRow[];
  counts: {
    categories: number;
    products: number;
    orders: number;
    pendingOrders: number;
    failedNotifications: number;
  };
  health: BusinessHealthReport;
  botFlowSettings: BusinessBotFlowSettings;
  checklist: Array<{ label: string; complete: boolean }>;
  recentAudit: AdminAuditRow[];
};

export type AdminCheckoutSettingsInput = {
  business: Pick<
    AdminBusinessRow,
    "allow_delivery" | "allow_pickup" | "minimum_order_amount" | "require_owner_approval"
  >;
  botFlowSettings: BotFlowSettingsInput;
  orderConfirmationMessageEnglish: string;
  orderConfirmationMessageArabic: string;
};

export type AdminDeliveryAreaInput = SaveDeliveryAreaInput;
export type AdminPickupLocationInput = SavePickupLocationInput;
export type AdminPaymentMethodInput = SavePaymentMethodInput;

export type AdminCatalogGroupInput = {
  id?: string;
  nameEnglish: string;
  nameArabic: string;
  slug?: string;
  isActive: boolean;
  sortOrder: number;
};

export type AdminCatalogGroupValueInput = {
  id?: string;
  groupId: string;
  nameEnglish: string;
  nameArabic: string;
  slug?: string;
  isActive: boolean;
  sortOrder: number;
};

export type AdminCatalogValueProductsInput = {
  groupValueId: string;
  productIds: string[];
};

export type AdminProductInput = SaveProductInput;
export type AdminCategoryInput = SaveCategoryInput;
export type AdminProductOptionInput = SaveOptionInput;
export type AdminProductOptionValueInput = SaveOptionValueInput;
export type AdminProductVariantInput = SaveVariantInput;
export type AdminProductCustomFieldInput = SaveCustomFieldInput;

export type BusinessHealthReport = {
  status: "OK" | "WARNING" | "ERROR";
  checks: Array<{
    code: string;
    label: string;
    status: "OK" | "WARNING" | "ERROR";
    message: string;
  }>;
};

export type CreateAdminBusinessInput = {
  name: string;
  legalName?: string;
  ownerEmail: string;
  defaultLanguage: "en" | "ar";
  supportedLanguages?: string[];
  currency: string;
  timezone: string;
  country: string;
  status: AdminBusinessStatus;
  templateType: AdminBusinessTemplate;
  connection?: Partial<{
    provider: string;
    connectionName: string;
    businessAccountId: string;
    phoneNumberId: string;
    displayPhoneNumber: string;
    appId: string;
    status: AdminConnectionRow["status"];
    webhookPath: string;
    accessTokenRef: string;
    appSecretRef: string;
    verifyTokenRef: string;
    configSuffix: string;
  }>;
  seedDefaults?: boolean;
};

export async function getAdminOverview() {
  ensureSupabase();
  const [businesses, connections, ordersToday, failedNotifications, webhookLogs, recentAudit] =
    await Promise.all([
      listBusinesses(),
      listConnections(),
      listOrdersToday(),
      countRows("/wa_owner_notifications?select=id&status=eq.FAILED&limit=1000"),
      listWebhookLogs(100),
      listAuditLogs(8),
    ]);

  const active = businesses.filter((business) => getBusinessStatus(business) === "ACTIVE").length;
  const suspended = businesses.filter((business) =>
    ["SUSPENDED", "PAUSED"].includes(getBusinessStatus(business)),
  ).length;
  const unknownPhoneEvents = webhookLogs.filter((log) =>
    log.result.includes("unknown_phone_number"),
  ).length;

  return {
    totalBusinesses: businesses.length,
    activeBusinesses: active,
    suspendedBusinesses: suspended,
    connectedWhatsAppNumbers: connections.filter((connection) => connection.is_active).length,
    ordersToday: ordersToday.length,
    failedNotifications,
    unknownPhoneEvents,
    businessesWithConfigurationIssues: businesses.filter(
      (business) => getBusinessStatus(business) !== "ACTIVE",
    ).length,
    recentAudit,
  };
}

export async function getAdminBusinesses(): Promise<AdminBusinessSummary[]> {
  ensureSupabase();
  const [businesses, users, connections, orders] = await Promise.all([
    listBusinesses(),
    listBusinessUsers(),
    listConnections(),
    listOrders(),
  ]);

  return businesses.map((business) => {
    const businessUsers = users.filter((user) => user.business_id === business.id);
    const businessConnections = connections.filter(
      (connection) => connection.business_id === business.id,
    );
    const businessOrders = orders.filter((order) => order.business_id === business.id);
    const connection = businessConnections[0];
    return {
      ...business,
      ownerName:
        businessUsers.find((user) => user.role === "OWNER" && user.status !== "REMOVED")
          ?.display_name ?? null,
      ownerEmail:
        businessUsers.find((user) => user.role === "OWNER" && user.status !== "REMOVED")?.email ??
        null,
      connectionStatus: connection?.status ?? "MISSING",
      displayPhoneNumber: connection?.display_phone_number ?? null,
      lastOrderAt: businessOrders.sort(sortCreatedDesc)[0]?.created_at ?? null,
      healthStatus: quickHealthStatus({
        business,
        users: businessUsers,
        connections: businessConnections,
      }),
    };
  });
}

export async function getAdminBusinessDetails(businessId: string): Promise<AdminBusinessDetails> {
  ensureSupabase();
  const [
    businesses,
    users,
    connections,
    categories,
    products,
    orders,
    notifications,
    audit,
    botFlowSettings,
    catalogCategories,
    catalogGroups,
    catalogGroupValues,
    catalogProducts,
    productGroupValues,
    productOptions,
    productOptionValues,
    productVariants,
    productCustomFields,
    deliveryAreas,
    pickupLocations,
    paymentMethods,
  ] = await Promise.all([
    listBusinesses(`id=eq.${encodeURIComponent(businessId)}`),
    listBusinessUsers(businessId),
    listConnections(businessId),
    countRows(
      `/wa_categories?select=id&business_id=eq.${encodeURIComponent(businessId)}&limit=1000`,
    ),
    countRows(`/wa_products?select=id&business_id=eq.${encodeURIComponent(businessId)}&limit=1000`),
    listOrders(businessId),
    countRows(
      `/wa_owner_notifications?select=id&business_id=eq.${encodeURIComponent(
        businessId,
      )}&status=eq.FAILED&limit=1000`,
    ),
    listAuditLogs(12, businessId),
    getBusinessBotFlowSettings(businessId),
    listCatalogCategories(businessId),
    listCatalogGroups(businessId),
    listCatalogGroupValues(businessId),
    listCatalogProducts(businessId),
    listProductGroupValues(businessId),
    listProductOptions(businessId),
    listProductOptionValues(businessId),
    listProductVariants(businessId),
    listProductCustomFields(businessId),
    listDeliveryAreas(businessId),
    listPickupLocations(businessId),
    listPaymentMethods(businessId),
  ]);
  const business = businesses[0];
  if (!business) throw new Error("Business was not found.");

  const health = await getBusinessHealthReport(businessId);
  return {
    business,
    users,
    connections,
    catalogCategories,
    catalogGroups,
    catalogGroupValues,
    catalogProducts,
    productGroupValues,
    productOptions,
    productOptionValues,
    productVariants,
    productCustomFields,
    deliveryAreas,
    pickupLocations,
    paymentMethods,
    counts: {
      categories,
      products,
      orders: orders.length,
      pendingOrders: orders.filter((order) => order.status === "PENDING_OWNER_CONFIRMATION").length,
      failedNotifications: notifications,
    },
    health,
    botFlowSettings,
    checklist: buildChecklist({ business, users, connections, categories, products, orders }),
    recentAudit: audit,
  };
}

export async function saveAdminCatalogGroup({
  businessId,
  input,
  adminUser,
  request,
}: {
  businessId: string;
  input: AdminCatalogGroupInput;
  adminUser: string;
  request: Request;
}) {
  ensureSupabase();
  const slug = normalizeSlug(input.slug || input.nameEnglish, "group");
  const groupId = input.id || makeId("group", slug);
  await supabaseServerRest("/wa_catalog_groups?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify({
      id: groupId,
      business_id: businessId,
      name_english: requiredText(input.nameEnglish, "Route English name"),
      name_arabic: input.nameArabic.trim() || input.nameEnglish.trim(),
      slug,
      source: "custom",
      is_active: input.isActive,
      sort_order: nonNegativeInt(input.sortOrder, "Sort order"),
      updated_at: new Date().toISOString(),
    }),
  });
  await audit({
    adminUser,
    request,
    businessId,
    action: "ADMIN_CATALOG_GROUP_SAVED",
    targetType: "CATALOG_GROUP",
    targetId: groupId,
    newValue: { slug, nameEnglish: input.nameEnglish },
  });
  return getAdminBusinessDetails(businessId);
}

export async function deleteAdminCatalogGroup({
  businessId,
  groupId,
  adminUser,
  request,
}: {
  businessId: string;
  groupId: string;
  adminUser: string;
  request: Request;
}) {
  ensureSupabase();
  const group = (await listCatalogGroups(businessId)).find((entry) => entry.id === groupId);
  if (!group) throw new Error("Route was not found.");
  const routeValues = (await listCatalogGroupValues(businessId)).filter(
    (value) => value.group_id === groupId,
  );
  const routeValueIds = new Set(routeValues.map((value) => value.id));
  const productLinks = await listProductGroupValues(businessId);
  if (productLinks.some((entry) => routeValueIds.has(entry.group_value_id))) {
    throw new Error("Remove this route's values from products before deleting the route.");
  }
  for (const value of routeValues) {
    await applyWaDashboardAction(businessId, {
      type: "deleteCatalogGroupValue",
      payload: { id: value.id },
    });
  }
  await applyWaDashboardAction(businessId, {
    type: "deleteCatalogGroup",
    payload: { id: groupId },
  });
  await audit({
    adminUser,
    request,
    businessId,
    action: "ADMIN_CATALOG_GROUP_DELETED",
    targetType: "CATALOG_GROUP",
    targetId: groupId,
    previousValue: {
      slug: group.slug,
      nameEnglish: group.name_english,
      deletedValueIds: routeValues.map((value) => value.id),
    },
  });
  return getAdminBusinessDetails(businessId);
}

export async function saveAdminCatalogGroupValue({
  businessId,
  input,
  adminUser,
  request,
}: {
  businessId: string;
  input: AdminCatalogGroupValueInput;
  adminUser: string;
  request: Request;
}) {
  ensureSupabase();
  const group = (await listCatalogGroups(businessId)).find((entry) => entry.id === input.groupId);
  if (!group) throw new Error("Create the route group before adding sub-options.");
  const slug = normalizeSlug(input.slug || input.nameEnglish, "value");
  const valueId = input.id || makeId("group-value", `${group.slug}-${slug}`);
  await supabaseServerRest("/wa_catalog_group_values?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify({
      id: valueId,
      business_id: businessId,
      group_id: input.groupId,
      name_english: requiredText(input.nameEnglish, "Sub-option English name"),
      name_arabic: input.nameArabic.trim() || input.nameEnglish.trim(),
      slug,
      source: "custom",
      is_active: input.isActive,
      sort_order: nonNegativeInt(input.sortOrder, "Sort order"),
      updated_at: new Date().toISOString(),
    }),
  });
  await audit({
    adminUser,
    request,
    businessId,
    action: "ADMIN_CATALOG_GROUP_VALUE_SAVED",
    targetType: "CATALOG_GROUP_VALUE",
    targetId: valueId,
    newValue: { groupId: input.groupId, slug, nameEnglish: input.nameEnglish },
  });
  return getAdminBusinessDetails(businessId);
}

export async function deleteAdminCatalogGroupValue({
  businessId,
  valueId,
  adminUser,
  request,
}: {
  businessId: string;
  valueId: string;
  adminUser: string;
  request: Request;
}) {
  ensureSupabase();
  const value = (await listCatalogGroupValues(businessId)).find((entry) => entry.id === valueId);
  if (!value) throw new Error("Route value was not found.");
  const productLinks = await listProductGroupValues(businessId);
  if (productLinks.some((entry) => entry.group_value_id === valueId)) {
    throw new Error("Remove this route value from products before deleting it.");
  }
  await applyWaDashboardAction(businessId, {
    type: "deleteCatalogGroupValue",
    payload: { id: valueId },
  });
  await audit({
    adminUser,
    request,
    businessId,
    action: "ADMIN_CATALOG_GROUP_VALUE_DELETED",
    targetType: "CATALOG_GROUP_VALUE",
    targetId: valueId,
    previousValue: { slug: value.slug, nameEnglish: value.name_english },
  });
  return getAdminBusinessDetails(businessId);
}

export async function saveAdminCategory({
  businessId,
  input,
  adminUser,
  request,
}: {
  businessId: string;
  input: AdminCategoryInput;
  adminUser: string;
  request: Request;
}) {
  await applyWaDashboardAction(businessId, { type: "saveCategory", payload: input });
  await audit({
    adminUser,
    request,
    businessId,
    action: "ADMIN_CATEGORY_SAVED",
    targetType: "CATEGORY",
    targetId: input.id || input.name_english,
    newValue: input,
  });
  return getAdminBusinessDetails(businessId);
}

export async function deleteAdminCategory({
  businessId,
  categoryId,
  adminUser,
  request,
}: {
  businessId: string;
  categoryId: string;
  adminUser: string;
  request: Request;
}) {
  await applyWaDashboardAction(businessId, { type: "deleteCategory", payload: { id: categoryId } });
  await audit({
    adminUser,
    request,
    businessId,
    action: "ADMIN_CATEGORY_DELETED",
    targetType: "CATEGORY",
    targetId: categoryId,
  });
  return getAdminBusinessDetails(businessId);
}

export async function saveAdminProduct({
  businessId,
  input,
  adminUser,
  request,
}: {
  businessId: string;
  input: AdminProductInput;
  adminUser: string;
  request: Request;
}) {
  ensureSupabase();
  const routeValueIds = input.group_value_ids ?? [];
  if (!routeValueIds.length) throw new Error("Choose at least one route value for this product.");
  await applyWaDashboardAction(businessId, {
    type: "saveProduct",
    payload: {
      ...input,
      category_id: input.category_id?.trim() || null,
      group_value_ids: routeValueIds,
    },
  });
  await audit({
    adminUser,
    request,
    businessId,
    action: "ADMIN_PRODUCT_SAVED",
    targetType: "PRODUCT",
    targetId: input.id || input.code,
    newValue: { code: input.code, nameEnglish: input.name_english, routeValueIds },
  });
  return getAdminBusinessDetails(businessId);
}

export async function deleteAdminProduct({
  businessId,
  productId,
  adminUser,
  request,
}: {
  businessId: string;
  productId: string;
  adminUser: string;
  request: Request;
}) {
  ensureSupabase();
  const product = (await listCatalogProducts(businessId)).find((entry) => entry.id === productId);
  if (!product) throw new Error("Product was not found.");
  await applyWaDashboardAction(businessId, { type: "deleteProduct", payload: { id: productId } });
  await audit({
    adminUser,
    request,
    businessId,
    action: "ADMIN_PRODUCT_DELETED",
    targetType: "PRODUCT",
    targetId: productId,
    previousValue: { code: product.code, nameEnglish: product.name_english },
  });
  return getAdminBusinessDetails(businessId);
}

export async function saveAdminCatalogValueProducts({
  businessId,
  input,
  adminUser,
  request,
}: {
  businessId: string;
  input: AdminCatalogValueProductsInput;
  adminUser: string;
  request: Request;
}) {
  ensureSupabase();
  const value = (await listCatalogGroupValues(businessId)).find(
    (entry) => entry.id === input.groupValueId,
  );
  if (!value) throw new Error("Route value was not found.");

  const products = await listCatalogProducts(businessId);
  const productIds = Array.from(new Set(input.productIds));
  const validProductIds = new Set(products.map((product) => product.id));
  const unknownProductId = productIds.find((productId) => !validProductIds.has(productId));
  if (unknownProductId)
    throw new Error(`Product ${unknownProductId} does not belong to this business.`);

  await supabaseServerRest(
    `/wa_product_group_values?business_id=eq.${encodeURIComponent(
      businessId,
    )}&group_value_id=eq.${encodeURIComponent(input.groupValueId)}`,
    {
      method: "DELETE",
      prefer: "return=minimal",
    },
  );

  if (productIds.length) {
    await supabaseServerRest("/wa_product_group_values", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify(
        productIds.map((productId) => ({
          business_id: businessId,
          product_id: productId,
          group_value_id: input.groupValueId,
        })),
      ),
    });
  }

  await audit({
    adminUser,
    request,
    businessId,
    action: "ADMIN_CATALOG_VALUE_PRODUCTS_SAVED",
    targetType: "CATALOG_GROUP_VALUE",
    targetId: input.groupValueId,
    newValue: { productIds },
  });
  return getAdminBusinessDetails(businessId);
}

export async function saveAdminProductOption({
  businessId,
  input,
  adminUser,
  request,
}: {
  businessId: string;
  input: AdminProductOptionInput;
  adminUser: string;
  request: Request;
}) {
  await applyWaDashboardAction(businessId, { type: "saveOption", payload: input });
  await audit({
    adminUser,
    request,
    businessId,
    action: "ADMIN_PRODUCT_OPTION_SAVED",
    targetType: "PRODUCT_OPTION",
    targetId: input.id || input.product_id,
    newValue: { productId: input.product_id, nameEnglish: input.name_english },
  });
  return getAdminBusinessDetails(businessId);
}

export async function deleteAdminProductOption({
  businessId,
  optionId,
  adminUser,
  request,
}: {
  businessId: string;
  optionId: string;
  adminUser: string;
  request: Request;
}) {
  await applyWaDashboardAction(businessId, { type: "deleteOption", payload: { id: optionId } });
  await audit({
    adminUser,
    request,
    businessId,
    action: "ADMIN_PRODUCT_OPTION_DELETED",
    targetType: "PRODUCT_OPTION",
    targetId: optionId,
  });
  return getAdminBusinessDetails(businessId);
}

export async function saveAdminProductOptionValue({
  businessId,
  input,
  adminUser,
  request,
}: {
  businessId: string;
  input: AdminProductOptionValueInput;
  adminUser: string;
  request: Request;
}) {
  await applyWaDashboardAction(businessId, { type: "saveOptionValue", payload: input });
  await audit({
    adminUser,
    request,
    businessId,
    action: "ADMIN_PRODUCT_OPTION_VALUE_SAVED",
    targetType: "PRODUCT_OPTION_VALUE",
    targetId: input.id || input.option_id,
    newValue: { optionId: input.option_id, valueEnglish: input.value_english },
  });
  return getAdminBusinessDetails(businessId);
}

export async function deleteAdminProductOptionValue({
  businessId,
  valueId,
  adminUser,
  request,
}: {
  businessId: string;
  valueId: string;
  adminUser: string;
  request: Request;
}) {
  await applyWaDashboardAction(businessId, { type: "deleteOptionValue", payload: { id: valueId } });
  await audit({
    adminUser,
    request,
    businessId,
    action: "ADMIN_PRODUCT_OPTION_VALUE_DELETED",
    targetType: "PRODUCT_OPTION_VALUE",
    targetId: valueId,
  });
  return getAdminBusinessDetails(businessId);
}

export async function saveAdminProductVariant({
  businessId,
  input,
  adminUser,
  request,
}: {
  businessId: string;
  input: AdminProductVariantInput;
  adminUser: string;
  request: Request;
}) {
  await applyWaDashboardAction(businessId, { type: "saveVariant", payload: input });
  await audit({
    adminUser,
    request,
    businessId,
    action: "ADMIN_PRODUCT_VARIANT_SAVED",
    targetType: "PRODUCT_VARIANT",
    targetId: input.id || input.product_id,
    newValue: { productId: input.product_id, sku: input.sku },
  });
  return getAdminBusinessDetails(businessId);
}

export async function deleteAdminProductVariant({
  businessId,
  variantId,
  adminUser,
  request,
}: {
  businessId: string;
  variantId: string;
  adminUser: string;
  request: Request;
}) {
  await applyWaDashboardAction(businessId, { type: "deleteVariant", payload: { id: variantId } });
  await audit({
    adminUser,
    request,
    businessId,
    action: "ADMIN_PRODUCT_VARIANT_DELETED",
    targetType: "PRODUCT_VARIANT",
    targetId: variantId,
  });
  return getAdminBusinessDetails(businessId);
}

export async function saveAdminProductCustomField({
  businessId,
  input,
  adminUser,
  request,
}: {
  businessId: string;
  input: AdminProductCustomFieldInput;
  adminUser: string;
  request: Request;
}) {
  await applyWaDashboardAction(businessId, { type: "saveCustomField", payload: input });
  await audit({
    adminUser,
    request,
    businessId,
    action: "ADMIN_PRODUCT_CUSTOM_FIELD_SAVED",
    targetType: "PRODUCT_CUSTOM_FIELD",
    targetId: input.id || input.product_id,
    newValue: { productId: input.product_id, labelEnglish: input.label_english },
  });
  return getAdminBusinessDetails(businessId);
}

export async function deleteAdminProductCustomField({
  businessId,
  fieldId,
  adminUser,
  request,
}: {
  businessId: string;
  fieldId: string;
  adminUser: string;
  request: Request;
}) {
  await applyWaDashboardAction(businessId, { type: "deleteCustomField", payload: { id: fieldId } });
  await audit({
    adminUser,
    request,
    businessId,
    action: "ADMIN_PRODUCT_CUSTOM_FIELD_DELETED",
    targetType: "PRODUCT_CUSTOM_FIELD",
    targetId: fieldId,
  });
  return getAdminBusinessDetails(businessId);
}

export async function saveAdminCheckoutSettings({
  businessId,
  input,
  adminUser,
  request,
}: {
  businessId: string;
  input: AdminCheckoutSettingsInput;
  adminUser: string;
  request: Request;
}) {
  const previous = await getAdminBusinessDetails(businessId);
  if (!input.business.allow_delivery && !input.business.allow_pickup) {
    throw new Error("Enable delivery or pickup before saving checkout settings.");
  }
  await applyWaDashboardAction(businessId, {
    type: "saveBusiness",
    payload: {
      name: previous.business.name,
      default_language: previous.business.default_language,
      currency: previous.business.currency,
      allow_delivery: Boolean(input.business.allow_delivery),
      allow_pickup: Boolean(input.business.allow_pickup),
      minimum_order_amount: Number(input.business.minimum_order_amount ?? 0),
      require_owner_approval: Boolean(input.business.require_owner_approval),
      is_active: previous.business.is_active,
    },
  });
  await saveBusinessBotFlowSettings(businessId, input.botFlowSettings);
  await supabaseServerRest(`/wa_businesses?id=eq.${encodeURIComponent(businessId)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({
      order_confirmation_message_english: requiredText(
        input.orderConfirmationMessageEnglish,
        "English confirmation message",
      ),
      order_confirmation_message_arabic: input.orderConfirmationMessageArabic.trim(),
      updated_at: new Date().toISOString(),
    }),
  });
  await audit({
    adminUser,
    request,
    businessId,
    action: "ADMIN_CHECKOUT_SETTINGS_SAVED",
    targetType: "BUSINESS",
    targetId: businessId,
    previousValue: {
      allowDelivery: previous.business.allow_delivery,
      allowPickup: previous.business.allow_pickup,
      minimumOrderAmount: previous.business.minimum_order_amount,
      requireOwnerApproval: previous.business.require_owner_approval,
      botFlowUpdatedAt: previous.botFlowSettings.updatedAt,
      orderConfirmationMessageEnglish: previous.business.order_confirmation_message_english,
      orderConfirmationMessageArabic: previous.business.order_confirmation_message_arabic,
    },
    newValue: {
      business: input.business,
      botFlowSettings: input.botFlowSettings,
      orderConfirmationMessageEnglish: input.orderConfirmationMessageEnglish,
      orderConfirmationMessageArabic: input.orderConfirmationMessageArabic,
    },
  });
  return getAdminBusinessDetails(businessId);
}

export async function saveAdminDeliveryArea({
  businessId,
  input,
  adminUser,
  request,
}: {
  businessId: string;
  input: AdminDeliveryAreaInput;
  adminUser: string;
  request: Request;
}) {
  await applyWaDashboardAction(businessId, { type: "saveDeliveryArea", payload: input });
  await audit({
    adminUser,
    request,
    businessId,
    action: "ADMIN_DELIVERY_AREA_SAVED",
    targetType: "DELIVERY_AREA",
    targetId: input.id,
    newValue: input,
  });
  return getAdminBusinessDetails(businessId);
}

export async function deleteAdminDeliveryArea({
  businessId,
  areaId,
  adminUser,
  request,
}: {
  businessId: string;
  areaId: string;
  adminUser: string;
  request: Request;
}) {
  await applyWaDashboardAction(businessId, { type: "deleteDeliveryArea", payload: { id: areaId } });
  await audit({
    adminUser,
    request,
    businessId,
    action: "ADMIN_DELIVERY_AREA_DELETED",
    targetType: "DELIVERY_AREA",
    targetId: areaId,
  });
  return getAdminBusinessDetails(businessId);
}

export async function saveAdminPickupLocation({
  businessId,
  input,
  adminUser,
  request,
}: {
  businessId: string;
  input: AdminPickupLocationInput;
  adminUser: string;
  request: Request;
}) {
  await applyWaDashboardAction(businessId, { type: "savePickupLocation", payload: input });
  await audit({
    adminUser,
    request,
    businessId,
    action: "ADMIN_PICKUP_LOCATION_SAVED",
    targetType: "PICKUP_LOCATION",
    targetId: input.id,
    newValue: input,
  });
  return getAdminBusinessDetails(businessId);
}

export async function deleteAdminPickupLocation({
  businessId,
  locationId,
  adminUser,
  request,
}: {
  businessId: string;
  locationId: string;
  adminUser: string;
  request: Request;
}) {
  await applyWaDashboardAction(businessId, {
    type: "deletePickupLocation",
    payload: { id: locationId },
  });
  await audit({
    adminUser,
    request,
    businessId,
    action: "ADMIN_PICKUP_LOCATION_DELETED",
    targetType: "PICKUP_LOCATION",
    targetId: locationId,
  });
  return getAdminBusinessDetails(businessId);
}

export async function saveAdminPaymentMethod({
  businessId,
  input,
  adminUser,
  request,
}: {
  businessId: string;
  input: AdminPaymentMethodInput;
  adminUser: string;
  request: Request;
}) {
  await applyWaDashboardAction(businessId, { type: "savePaymentMethod", payload: input });
  await audit({
    adminUser,
    request,
    businessId,
    action: "ADMIN_PAYMENT_METHOD_SAVED",
    targetType: "PAYMENT_METHOD",
    targetId: input.id,
    newValue: input,
  });
  return getAdminBusinessDetails(businessId);
}

export async function deleteAdminPaymentMethod({
  businessId,
  methodId,
  adminUser,
  request,
}: {
  businessId: string;
  methodId: string;
  adminUser: string;
  request: Request;
}) {
  await applyWaDashboardAction(businessId, {
    type: "deletePaymentMethod",
    payload: { id: methodId },
  });
  await audit({
    adminUser,
    request,
    businessId,
    action: "ADMIN_PAYMENT_METHOD_DELETED",
    targetType: "PAYMENT_METHOD",
    targetId: methodId,
  });
  return getAdminBusinessDetails(businessId);
}

export async function createAdminBusiness({
  input,
  adminUser,
  request,
}: {
  input: CreateAdminBusinessInput;
  adminUser: string;
  request: Request;
}) {
  ensureSupabase();
  const businessId = makeBusinessId(input.name);
  const now = new Date().toISOString();
  const status = input.status || "SETUP_INCOMPLETE";

  await supabaseServerRest("/wa_businesses?on_conflict=id", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: JSON.stringify({
      id: businessId,
      name: requiredText(input.name, "Business name"),
      legal_name: input.legalName?.trim() || null,
      default_language: input.defaultLanguage === "ar" ? "ar" : "en",
      currency: requiredText(input.currency, "Currency").toUpperCase(),
      timezone: input.timezone || "Asia/Beirut",
      country: input.country || "LB",
      status,
      template_type: input.templateType,
      is_active: status === "ACTIVE",
      allow_delivery: true,
      allow_pickup: true,
      minimum_order_amount: 0,
      order_confirmation_message_english:
        "Your order has been received and is waiting for confirmation.",
      order_confirmation_message_arabic:
        "\u062a\u0645 \u0627\u0633\u062a\u0644\u0627\u0645 \u0637\u0644\u0628\u0643 \u0648\u0647\u0648 \u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062a\u0623\u0643\u064a\u062f.",
      require_owner_approval: true,
      updated_at: now,
    }),
  });

  await assignBusinessUser({
    businessId,
    email: input.ownerEmail,
    role: "OWNER",
    status: "INVITED",
    adminUser,
    request,
  });

  if (input.connection?.phoneNumberId) {
    await upsertAdminConnection({
      businessId,
      input: input.connection,
      adminUser,
      request,
    });
  }

  if (input.seedDefaults) {
    await seedDefaultBusinessData({
      businessId,
      templateType: input.templateType,
      adminUser,
      request,
    });
  }

  await audit({
    adminUser,
    request,
    businessId,
    action: "BUSINESS_CREATED",
    targetType: "BUSINESS",
    targetId: businessId,
    newValue: {
      name: input.name,
      ownerEmail: input.ownerEmail,
      status,
      templateType: input.templateType,
    },
  });

  return getAdminBusinessDetails(businessId);
}

export async function setAdminBusinessStatus({
  businessId,
  status,
  adminUser,
  request,
}: {
  businessId: string;
  status: AdminBusinessStatus;
  adminUser: string;
  request: Request;
}) {
  const previous = await getAdminBusinessDetails(businessId);
  await supabaseServerRest(`/wa_businesses?id=eq.${encodeURIComponent(businessId)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({
      status,
      is_active: status === "ACTIVE",
      updated_at: new Date().toISOString(),
    }),
  });
  await audit({
    adminUser,
    request,
    businessId,
    action: "BUSINESS_STATUS_CHANGED",
    targetType: "BUSINESS",
    targetId: businessId,
    previousValue: { status: getBusinessStatus(previous.business) },
    newValue: { status },
  });
  return getAdminBusinessDetails(businessId);
}

export async function assignBusinessUser({
  businessId,
  email,
  role,
  status = "INVITED",
  adminUser,
  request,
}: {
  businessId: string;
  email: string;
  role: AdminBusinessUserRow["role"];
  status?: AdminBusinessUserRow["status"];
  adminUser: string;
  request: Request;
}) {
  const cleanEmail = requiredText(email, "Owner email").toLowerCase();
  await supabaseServerRest("/wa_business_users?on_conflict=business_id,email", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify({
      business_id: businessId,
      email: cleanEmail,
      role,
      status,
      updated_at: new Date().toISOString(),
    }),
  });
  await audit({
    adminUser,
    request,
    businessId,
    action: "BUSINESS_USER_ASSIGNED",
    targetType: "BUSINESS_USER",
    targetId: cleanEmail,
    newValue: { email: cleanEmail, role, status },
  });
}

export async function upsertAdminConnection({
  businessId,
  input,
  adminUser,
  request,
}: {
  businessId: string;
  input: CreateAdminBusinessInput["connection"];
  adminUser: string;
  request: Request;
}) {
  if (!input?.phoneNumberId) throw new Error("Phone number ID is required.");
  const id = `conn-${businessId}-${input.phoneNumberId}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  await supabaseServerRest("/wa_whatsapp_connections?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify({
      id,
      business_id: businessId,
      provider: input.provider || "META_CLOUD_API",
      display_name: input.connectionName || "Primary WhatsApp number",
      business_account_id: input.businessAccountId || null,
      phone_number_id: input.phoneNumberId,
      display_phone_number: input.displayPhoneNumber || null,
      app_id: input.appId || null,
      status: input.status || "DRAFT",
      is_active: (input.status || "DRAFT") === "ACTIVE",
      webhook_path: input.webhookPath || "/api/whatsapp/webhook",
      access_token_ref: maskSecretRef(input.accessTokenRef),
      app_secret_ref: maskSecretRef(input.appSecretRef),
      verify_token_ref: maskSecretRef(input.verifyTokenRef),
      config_suffix: input.configSuffix || null,
      updated_at: new Date().toISOString(),
    }),
  });
  await audit({
    adminUser,
    request,
    businessId,
    action: "WHATSAPP_CONNECTION_SAVED",
    targetType: "WHATSAPP_CONNECTION",
    targetId: id,
    newValue: {
      phoneNumberId: input.phoneNumberId,
      status: input.status || "DRAFT",
      hasAccessTokenRef: Boolean(input.accessTokenRef),
      hasAppSecretRef: Boolean(input.appSecretRef),
      hasVerifyTokenRef: Boolean(input.verifyTokenRef),
    },
  });
}

export async function seedDefaultBusinessData({
  businessId,
  templateType,
  adminUser,
  request,
}: {
  businessId: string;
  templateType: AdminBusinessTemplate;
  adminUser: string;
  request: Request;
}) {
  const label = templateLabel(templateType);
  const productId = `${businessId}-prod-sample`;
  const routeId = `${businessId}-route-featured`;
  const routeValueId = `${businessId}-route-featured-value`;
  const areaId = `${businessId}-area-local`;
  const pickupId = `${businessId}-pickup-main`;
  const paymentId = `${businessId}-pay-cash`;

  await Promise.all([
    supabaseServerRest("/wa_catalog_groups?on_conflict=id", {
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=minimal",
      body: JSON.stringify({
        id: routeId,
        business_id: businessId,
        name_english: "Collections",
        name_arabic: "\u0645\u062c\u0645\u0648\u0639\u0627\u062a",
        slug: "collections",
        source: "custom",
        is_active: true,
        sort_order: 1,
      }),
    }),
    supabaseServerRest("/wa_catalog_group_values?on_conflict=id", {
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=minimal",
      body: JSON.stringify({
        id: routeValueId,
        business_id: businessId,
        group_id: routeId,
        name_english: label.category,
        name_arabic: "\u0645\u0646\u062a\u062c\u0627\u062a \u0645\u0645\u064a\u0632\u0629",
        slug: "featured",
        source: "custom",
        is_active: true,
        sort_order: 1,
      }),
    }),
    supabaseServerRest("/wa_delivery_areas?on_conflict=id", {
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=minimal",
      body: JSON.stringify({
        id: areaId,
        business_id: businessId,
        name_english: "Local delivery",
        name_arabic: "\u062a\u0648\u0635\u064a\u0644 \u0645\u062d\u0644\u064a",
        delivery_fee: 3,
      }),
    }),
    supabaseServerRest("/wa_pickup_locations?on_conflict=id", {
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=minimal",
      body: JSON.stringify({
        id: pickupId,
        business_id: businessId,
        name_english: "Main branch",
        name_arabic: "\u0627\u0644\u0641\u0631\u0639 \u0627\u0644\u0631\u0626\u064a\u0633\u064a",
        address_english: "Main branch address",
        address_arabic:
          "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0641\u0631\u0639 \u0627\u0644\u0631\u0626\u064a\u0633\u064a",
      }),
    }),
    supabaseServerRest("/wa_payment_methods?on_conflict=id", {
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=minimal",
      body: JSON.stringify({
        id: paymentId,
        business_id: businessId,
        label_english: "Cash on delivery",
        label_arabic:
          "\u0627\u0644\u062f\u0641\u0639 \u0639\u0646\u062f \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645",
        fulfillment_methods: ["delivery", "pickup"],
      }),
    }),
    supabaseServerRest("/wa_owner_notification_settings?on_conflict=business_id", {
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=minimal",
      body: JSON.stringify({ business_id: businessId }),
    }).catch(ignoreMissingTable),
  ]);

  await supabaseServerRest("/wa_products?on_conflict=id", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: JSON.stringify({
      id: productId,
      business_id: businessId,
      category_id: null,
      code: "SAMPLE-001",
      name_english: label.product,
      name_arabic: "\u0645\u0646\u062a\u062c \u062a\u062c\u0631\u064a\u0628\u064a",
      description_english: "Sample product for onboarding tests.",
      description_arabic:
        "\u0645\u0646\u062a\u062c \u062a\u062c\u0631\u064a\u0628\u064a \u0644\u0627\u062e\u062a\u0628\u0627\u0631 \u0627\u0644\u0625\u0639\u062f\u0627\u062f.",
      price: label.price,
      stock_quantity: 10,
      sort_order: 1,
    }),
  });

  await supabaseServerRest(
    "/wa_product_group_values?on_conflict=business_id,product_id,group_value_id",
    {
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=minimal",
      body: JSON.stringify({
        business_id: businessId,
        product_id: productId,
        group_value_id: routeValueId,
      }),
    },
  );

  await audit({
    adminUser,
    request,
    businessId,
    action: "DEFAULT_CATALOG_SEEDED",
    targetType: "BUSINESS",
    targetId: businessId,
    newValue: { templateType },
  });
  return getAdminBusinessDetails(businessId);
}

export async function getBusinessHealthReport(businessId: string): Promise<BusinessHealthReport> {
  const [details, categories, products, paymentMethods, notifications, logs, businessFlow] =
    await Promise.all([
      getBusinessCore(businessId),
      countRows(
        `/wa_categories?select=id&business_id=eq.${encodeURIComponent(businessId)}&is_active=eq.true&limit=1000`,
      ),
      countRows(
        `/wa_products?select=id&business_id=eq.${encodeURIComponent(businessId)}&is_active=eq.true&limit=1000`,
      ),
      countRows(
        `/wa_payment_methods?select=id&business_id=eq.${encodeURIComponent(businessId)}&is_active=eq.true&limit=1000`,
      ),
      countRows(
        `/wa_owner_notifications?select=id&business_id=eq.${encodeURIComponent(
          businessId,
        )}&status=eq.FAILED&limit=1000`,
      ).catch(() => 0),
      listWebhookLogs(50, businessId),
      getBusinessFlowDetails(businessId).catch(() => ({
        flow: null,
        versions: [],
        activeVersion: null,
      })),
    ]);
  const { business, users, connections } = details;
  const activeConnection = connections.find(
    (connection) => connection.is_active && connection.status === "ACTIVE",
  );
  const publishedFlowValidation = businessFlow.activeVersion
    ? validateFlowForEditor(businessFlow.activeVersion.flow_json)
    : null;
  const draftFlowValidation = businessFlow.versions
    .filter((version) => version.status === "DRAFT")
    .map((version) => validateFlowForEditor(version.flow_json));
  const invalidDraftCount = draftFlowValidation.filter((result) => !result.ok).length;
  const checks: BusinessHealthReport["checks"] = [
    check(
      "BUSINESS_ACTIVE",
      "Business is active",
      canBusinessProcessMessages({ isActive: business.is_active, status: business.status }),
      "Business must be ACTIVE to process WhatsApp messages.",
    ),
    check(
      "ACTIVE_CONNECTION",
      "Active WhatsApp connection",
      Boolean(activeConnection),
      "Add and activate a WhatsApp connection.",
    ),
    check(
      "SECRET_REFS",
      "Secret references configured",
      Boolean(
        activeConnection?.access_token_ref &&
        activeConnection?.app_secret_ref &&
        activeConnection?.verify_token_ref,
      ),
      "Configure server-side secret references.",
    ),
    check(
      "OWNER_ASSIGNED",
      "Owner user assigned",
      users.some((user) => user.role === "OWNER" && user.status !== "REMOVED"),
      "Assign at least one owner.",
    ),
    check(
      "ACTIVE_CATEGORY",
      "Active category exists",
      categories > 0,
      "Seed or create categories.",
    ),
    check("ACTIVE_PRODUCT", "Active product exists", products > 0, "Seed or create products."),
    check(
      "PAYMENT_METHOD",
      "Payment method available",
      paymentMethods > 0,
      "Configure at least one payment method.",
    ),
    check(
      "NOTIFICATION_HEALTH",
      "Owner notifications healthy",
      notifications === 0,
      `${notifications} failed owner notification(s).`,
    ),
    check(
      "WEBHOOK_ERRORS",
      "Recent webhook logs healthy",
      !logs.some((log) => log.error_summary),
      "Recent webhook errors detected.",
    ),
    check(
      "PUBLISHED_FLOW",
      "Published business flow assigned",
      Boolean(
        businessFlow.flow?.status === "PUBLISHED" &&
        businessFlow.activeVersion?.status === "PUBLISHED",
      ),
      "Clone and publish a valid conversation flow for this business.",
    ),
    check(
      "FLOW_VALID",
      "Published flow validates",
      Boolean(publishedFlowValidation?.ok),
      "The active business flow is invalid or missing.",
    ),
    {
      code: "FLOW_DRAFT_VALIDITY",
      label: "Draft flow health",
      status: invalidDraftCount > 0 ? "WARNING" : ("OK" as const),
      message:
        invalidDraftCount > 0
          ? `${invalidDraftCount} draft flow version(s) have validation errors. Published flow can remain active.`
          : "No invalid draft flow versions detected.",
    },
  ];
  return {
    status: checks.some((item) => item.status === "ERROR")
      ? "ERROR"
      : checks.some((item) => item.status === "WARNING")
        ? "WARNING"
        : "OK",
    checks,
  };
}

export async function getAdminLogs({ businessId }: { businessId?: string }) {
  const [webhooks, audit] = await Promise.all([
    listWebhookLogs(100, businessId),
    listAuditLogs(100, businessId),
  ]);
  return { webhooks, audit };
}

export async function recordAdminAuditLog({
  adminUser,
  request,
  businessId,
  action,
  targetType,
  targetId,
  newValue,
}: {
  adminUser: string;
  request: Request;
  businessId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  newValue?: Record<string, unknown>;
}) {
  await audit({
    adminUser,
    request,
    businessId,
    action,
    targetType,
    targetId,
    newValue,
  });
}

async function getBusinessCore(businessId: string) {
  const [businesses, users, connections] = await Promise.all([
    listBusinesses(`id=eq.${encodeURIComponent(businessId)}`),
    listBusinessUsers(businessId),
    listConnections(businessId),
  ]);
  const business = businesses[0];
  if (!business) throw new Error("Business was not found.");
  return { business, users, connections };
}

async function listBusinesses(filter?: string) {
  const query = filter ? `&${filter}` : "";
  return supabaseServerRest<AdminBusinessRow[]>(
    `/wa_businesses?select=*&order=created_at.desc${query}`,
  );
}

async function listBusinessUsers(businessId?: string) {
  const filter = businessId ? `&business_id=eq.${encodeURIComponent(businessId)}` : "";
  return supabaseServerRest<AdminBusinessUserRow[]>(
    `/wa_business_users?select=*&order=created_at.desc${filter}`,
  ).catch((error) => {
    if (isMissingTable(error, "wa_business_users")) return [];
    throw error;
  });
}

async function listConnections(businessId?: string) {
  const filter = businessId ? `&business_id=eq.${encodeURIComponent(businessId)}` : "";
  return supabaseServerRest<AdminConnectionRow[]>(
    `/wa_whatsapp_connections?select=*&order=created_at.desc${filter}`,
  ).catch((error) => {
    if (isMissingTable(error, "wa_whatsapp_connections")) return [];
    throw error;
  });
}

async function listOrders(businessId?: string) {
  const filter = businessId ? `&business_id=eq.${encodeURIComponent(businessId)}` : "";
  return supabaseServerRest<AdminOrderRow[]>(`/wa_orders?select=*&order=created_at.desc${filter}`);
}

async function listOrdersToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return supabaseServerRest<AdminOrderRow[]>(
    `/wa_orders?select=*&created_at=gte.${encodeURIComponent(today.toISOString())}`,
  );
}

async function listWebhookLogs(limit: number, businessId?: string) {
  const filter = businessId ? `&business_id=eq.${encodeURIComponent(businessId)}` : "";
  return supabaseServerRest<WebhookLogRow[]>(
    `/wa_webhook_logs?select=*&order=created_at.desc&limit=${limit}${filter}`,
  ).catch((error) => {
    if (isMissingTable(error, "wa_webhook_logs")) return [];
    throw error;
  });
}

async function listAuditLogs(limit: number, businessId?: string) {
  const filter = businessId ? `&business_id=eq.${encodeURIComponent(businessId)}` : "";
  return supabaseServerRest<AdminAuditRow[]>(
    `/wa_admin_audit_logs?select=id,admin_user_id,business_id,action,target_type,target_id,created_at&order=created_at.desc&limit=${limit}${filter}`,
  ).catch((error) => {
    if (isMissingTable(error, "wa_admin_audit_logs")) return [];
    throw error;
  });
}

async function listCatalogGroups(businessId: string) {
  return supabaseServerRest<WaCatalogGroupRow[]>(
    `/wa_catalog_groups?select=*&business_id=eq.${encodeURIComponent(
      businessId,
    )}&order=sort_order.asc`,
  ).catch((error) => {
    if (isMissingCatalogGroupTable(error)) return [];
    throw error;
  });
}

async function listCatalogGroupValues(businessId: string) {
  return supabaseServerRest<WaCatalogGroupValueRow[]>(
    `/wa_catalog_group_values?select=*&business_id=eq.${encodeURIComponent(
      businessId,
    )}&order=sort_order.asc`,
  ).catch((error) => {
    if (isMissingCatalogGroupTable(error)) return [];
    throw error;
  });
}

async function listCatalogCategories(businessId: string) {
  return supabaseServerRest<WaCategoryRow[]>(
    `/wa_categories?select=*&business_id=eq.${encodeURIComponent(businessId)}&order=sort_order.asc`,
  ).catch((error) => {
    if (isMissingTable(error, "wa_categories")) return [];
    throw error;
  });
}

async function listCatalogProducts(businessId: string) {
  return supabaseServerRest<WaProductRow[]>(
    `/wa_products?select=*&business_id=eq.${encodeURIComponent(businessId)}&order=sort_order.asc`,
  ).catch((error) => {
    if (isMissingTable(error, "wa_products")) return [];
    throw error;
  });
}

async function listProductGroupValues(businessId: string) {
  return supabaseServerRest<WaProductGroupValueRow[]>(
    `/wa_product_group_values?select=*&business_id=eq.${encodeURIComponent(businessId)}`,
  ).catch((error) => {
    if (isMissingCatalogGroupTable(error) || isMissingTable(error, "wa_product_group_values")) {
      return [];
    }
    throw error;
  });
}

async function listProductOptions(businessId: string) {
  return supabaseServerRest<WaProductOptionRow[]>(
    `/wa_product_options?select=*&business_id=eq.${encodeURIComponent(
      businessId,
    )}&order=sort_order.asc`,
  ).catch((error) => {
    if (isMissingTable(error, "wa_product_options")) return [];
    throw error;
  });
}

async function listProductOptionValues(businessId: string) {
  const options = await listProductOptions(businessId);
  const optionIds = options.map((option) => option.id);
  if (!optionIds.length) return [];
  return supabaseServerRest<WaProductOptionValueRow[]>(
    `/wa_product_option_values?select=*&option_id=in.(${optionIds
      .map((id) => `"${encodeURIComponent(id)}"`)
      .join(",")})&order=sort_order.asc`,
  ).catch((error) => {
    if (isMissingTable(error, "wa_product_option_values")) return [];
    throw error;
  });
}

async function listProductVariants(businessId: string) {
  return supabaseServerRest<WaProductVariantRow[]>(
    `/wa_product_variants?select=*&business_id=eq.${encodeURIComponent(businessId)}`,
  ).catch((error) => {
    if (isMissingTable(error, "wa_product_variants")) return [];
    throw error;
  });
}

async function listProductCustomFields(businessId: string) {
  return supabaseServerRest<WaProductCustomFieldRow[]>(
    `/wa_product_custom_fields?select=*&business_id=eq.${encodeURIComponent(
      businessId,
    )}&order=sort_order.asc`,
  ).catch((error) => {
    if (isMissingTable(error, "wa_product_custom_fields")) return [];
    throw error;
  });
}

async function listDeliveryAreas(businessId: string) {
  return supabaseServerRest<WaDeliveryAreaRow[]>(
    `/wa_delivery_areas?select=*&business_id=eq.${encodeURIComponent(
      businessId,
    )}&order=sort_order.asc`,
  ).catch((error) => {
    if (isMissingTable(error, "wa_delivery_areas")) return [];
    throw error;
  });
}

async function listPickupLocations(businessId: string) {
  return supabaseServerRest<WaPickupLocationRow[]>(
    `/wa_pickup_locations?select=*&business_id=eq.${encodeURIComponent(
      businessId,
    )}&order=sort_order.asc`,
  ).catch((error) => {
    if (isMissingTable(error, "wa_pickup_locations")) return [];
    throw error;
  });
}

async function listPaymentMethods(businessId: string) {
  return supabaseServerRest<WaPaymentMethodRow[]>(
    `/wa_payment_methods?select=*&business_id=eq.${encodeURIComponent(
      businessId,
    )}&order=sort_order.asc`,
  ).catch((error) => {
    if (isMissingTable(error, "wa_payment_methods")) return [];
    throw error;
  });
}

async function countRows(path: string) {
  const rows = await supabaseServerRest<Array<{ id: string }>>(path);
  return rows.length;
}

async function audit({
  adminUser,
  request,
  businessId,
  action,
  targetType,
  targetId,
  previousValue,
  newValue,
}: {
  adminUser: string;
  request: Request;
  businessId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}) {
  await supabaseServerRest("/wa_admin_audit_logs", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify({
      admin_user_id: adminUser,
      business_id: businessId ?? null,
      action,
      target_type: targetType,
      target_id: targetId ?? null,
      previous_value: sanitizeAuditValue(previousValue),
      new_value: sanitizeAuditValue(newValue),
      metadata: {},
      ip_address: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      user_agent: request.headers.get("user-agent"),
    }),
  }).catch((error) => {
    if (isMissingTable(error, "wa_admin_audit_logs")) return;
    throw error;
  });
}

function buildChecklist({
  business,
  users,
  connections,
  categories,
  products,
  orders,
}: {
  business: AdminBusinessRow;
  users: AdminBusinessUserRow[];
  connections: AdminConnectionRow[];
  categories: number;
  products: number;
  orders: AdminOrderRow[];
}) {
  return [
    { label: "Business info configured", complete: Boolean(business.name && business.currency) },
    { label: "Owner user assigned", complete: users.some((user) => user.role === "OWNER") },
    { label: "WhatsApp connection configured", complete: connections.length > 0 },
    { label: "Catalog has products", complete: categories > 0 && products > 0 },
    { label: "Checkout settings configured", complete: true },
    { label: "Payment methods configured", complete: true },
    { label: "Owner notifications configured", complete: true },
    { label: "Test message received", complete: false },
    { label: "Test order created", complete: orders.length > 0 },
    {
      label: "Owner accepted test order",
      complete: orders.some((order) => order.status !== "PENDING_OWNER_CONFIRMATION"),
    },
    { label: "Business activated", complete: getBusinessStatus(business) === "ACTIVE" },
  ];
}

function quickHealthStatus({
  business,
  users,
  connections,
}: {
  business: AdminBusinessRow;
  users: AdminBusinessUserRow[];
  connections: AdminConnectionRow[];
}) {
  if (!canBusinessProcessMessages({ isActive: business.is_active, status: business.status })) {
    return "WARNING";
  }
  if (!users.some((user) => user.role === "OWNER" && user.status !== "REMOVED")) return "ERROR";
  if (!connections.some((connection) => connection.status === "ACTIVE" && connection.is_active)) {
    return "ERROR";
  }
  return "OK";
}

function check(
  code: string,
  label: string,
  ok: boolean,
  message: string,
): BusinessHealthReport["checks"][number] {
  return {
    code,
    label,
    status: ok ? ("OK" as const) : ("ERROR" as const),
    message: ok ? "OK" : message,
  };
}

function getBusinessStatus(business: AdminBusinessRow) {
  return business.status ?? (business.is_active ? "ACTIVE" : "SUSPENDED");
}

function makeBusinessId(name: string) {
  const slug = requiredText(name, "Business name")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `biz-${slug || Date.now()}`;
}

function makeId(prefix: string, value: string) {
  const slug =
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "item";
  return `${prefix}-${slug}-${Date.now().toString(36)}`;
}

function normalizeSlug(value: string, fallback: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || fallback
  );
}

function nonNegativeInt(value: number, label: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${label} must be 0 or more.`);
  return Math.floor(number);
}

function requiredText(value: string | undefined, label: string) {
  const clean = value?.trim();
  if (!clean) throw new Error(`${label} is required.`);
  return clean;
}

function isMissingCatalogGroupTable(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    (message.includes("wa_catalog_groups") || message.includes("wa_catalog_group_values")) &&
    (message.includes("does not exist") || message.includes("schema cache"))
  );
}

function maskSecretRef(value?: string) {
  const clean = value?.trim();
  if (!clean) return null;
  return clean.replace(/token|secret|key/gi, (match) => match.toUpperCase()).slice(0, 120);
}

function sanitizeAuditValue(value?: Record<string, unknown>) {
  if (!value) return null;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      /token|secret|key/i.test(key) ? "[redacted]" : entry,
    ]),
  );
}

function templateLabel(templateType: AdminBusinessTemplate) {
  if (templateType === "restaurant") return { category: "Menu", product: "Sample Meal", price: 12 };
  if (templateType === "greeting_store_info")
    return { category: "Information", product: "Store Info", price: 0 };
  if (templateType === "jewelry_store")
    return { category: "Jewelry", product: "Sample Necklace", price: 25 };
  if (templateType === "clothing_store")
    return { category: "Clothing", product: "Sample T-Shirt", price: 20 };
  if (templateType === "accessories_store")
    return { category: "Accessories", product: "Sample Bag", price: 18 };
  if (templateType === "custom_products")
    return { category: "Custom Products", product: "Custom Sample Item", price: 30 };
  return { category: "Featured Products", product: "Sample Product", price: 15 };
}

function sortCreatedDesc(a: { created_at: string }, b: { created_at: string }) {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function ensureSupabase() {
  if (!isServerSupabaseConfigured()) {
    throw new Error("Supabase service-role access is required for internal admin.");
  }
}

function ignoreMissingTable(error: unknown) {
  if (isMissingTable(error, "wa_owner_notification_settings")) return;
  throw error;
}

function isMissingTable(error: unknown, table: string) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes(table.toLowerCase()) || message.includes("relation");
}
