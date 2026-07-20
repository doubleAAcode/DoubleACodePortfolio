import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CreditCard,
  Loader2,
  MapPin,
  Plus,
  Save,
  Store,
  Trash2,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useBusinessDetails } from "@/features/connect/admin/businesses/business-details-context";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import {
  applyAdminBusinessAction,
  type AdminBusinessDetailsResult,
} from "@/features/connect/shared/admin-client";
import type { BotFlowSettingsInput } from "@/features/connect/shared/bot-flow-settings.server";
import type {
  WaDeliveryAreaRow,
  WaPaymentMethodRow,
  WaPickupLocationRow,
} from "@/features/connect/shared/dashboard-store.server";

export const Route = createFileRoute("/connect/admin/businesses/$id/checkout")({
  component: CheckoutPage,
});

type CheckoutFormState = {
  allowDelivery: boolean;
  allowPickup: boolean;
  minimumOrderAmount: string;
  requireOwnerApproval: boolean;
  orderConfirmationMessageEnglish: string;
  orderConfirmationMessageArabic: string;
  botFlowSettings: BotFlowSettingsInput;
};

type DeliveryAreaFormState = {
  id?: string;
  nameEnglish: string;
  nameArabic: string;
  deliveryFee: string;
  isActive: boolean;
  sortOrder: number;
};

type PickupLocationFormState = {
  id?: string;
  nameEnglish: string;
  nameArabic: string;
  addressEnglish: string;
  addressArabic: string;
  isActive: boolean;
  sortOrder: number;
};

type PaymentMethodFormState = {
  id?: string;
  labelEnglish: string;
  labelArabic: string;
  delivery: boolean;
  pickup: boolean;
  isActive: boolean;
  sortOrder: number;
};

type Notice = { tone: "success" | "destructive"; message: string } | null;

const EMPTY_BOT_FLOW_SETTINGS: BotFlowSettingsInput = {
  languageSelectionEnabled: true,
  defaultLanguage: "en",
  languagePromptEnglish: "Choose your language:",
  languagePromptArabic: "",
  welcomeMessageEnglish: "How can we help?",
  welcomeMessageArabic: "",
  orderButtonEnglish: "Place an order",
  orderButtonArabic: "",
  questionButtonEnglish: "Ask a question",
  questionButtonArabic: "",
  questionResponseEnglish: "Send us your question here and our team will reply shortly.",
  questionResponseArabic: "",
  infoButtonEnglish: "Store information",
  infoButtonArabic: "",
  infoResponseEnglish: "We are open daily. Send a message here if you need help.",
  infoResponseArabic: "",
  browseRoutes: [],
  customerNamePromptEnglish: "What name should we put on the order?",
  customerNamePromptArabic: "",
  fulfillmentPromptEnglish: "How would you like to receive your order?",
  fulfillmentPromptArabic: "",
  deliveryAreaPromptEnglish: "Choose your delivery area:",
  deliveryAreaPromptArabic: "",
  pickupLocationPromptEnglish: "Choose a pickup location:",
  pickupLocationPromptArabic: "",
  deliveryAddressPromptEnglish: "Send the full delivery address.",
  deliveryAddressPromptArabic: "",
  paymentMethodPromptEnglish: "Choose a payment method:",
  paymentMethodPromptArabic: "",
  orderNotesPromptEnglish: "Would you like to add any notes?",
  orderNotesPromptArabic: "",
  noNotesButtonEnglish: "No notes",
  noNotesButtonArabic: "",
  showProductDetailsBeforeOrdering: true,
  autoUseSavedCheckoutDetails: false,
  skipFulfillmentWhenSingleOption: true,
  skipDeliveryAreaWhenSingleOption: true,
  skipPickupLocationWhenSingleOption: true,
  skipPaymentWhenSingleOption: true,
  orderNotesEnabled: true,
};

function CheckoutPage() {
  const { id } = Route.useParams();
  const initialDetails = useBusinessDetails();
  const [details, setDetails] = useState<AdminBusinessDetailsResult | null>(initialDetails);
  const [form, setForm] = useState<CheckoutFormState>(() => toCheckoutForm(initialDetails));
  const [areaForm, setAreaForm] = useState<DeliveryAreaFormState | null>(null);
  const [pickupForm, setPickupForm] = useState<PickupLocationFormState | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentMethodFormState | null>(null);
  const [deleteAreaId, setDeleteAreaId] = useState("");
  const [deletePickupId, setDeletePickupId] = useState("");
  const [deletePaymentId, setDeletePaymentId] = useState("");
  const [savingAction, setSavingAction] = useState("");
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    setDetails(initialDetails);
    if (initialDetails) setForm(toCheckoutForm(initialDetails));
  }, [initialDetails]);

  const deliveryAreas = useMemo(
    () => sortByOrder(details?.deliveryAreas ?? [], "name_english"),
    [details?.deliveryAreas],
  );
  const pickupLocations = useMemo(
    () => sortByOrder(details?.pickupLocations ?? [], "name_english"),
    [details?.pickupLocations],
  );
  const paymentMethods = useMemo(
    () => sortByOrder(details?.paymentMethods ?? [], "label_english"),
    [details?.paymentMethods],
  );

  if (!details) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Live checkout settings require a loaded business session.
        </CardContent>
      </Card>
    );
  }

  const fulfillmentBlocked = !form.allowDelivery && !form.allowPickup;

  async function saveSettings() {
    if (fulfillmentBlocked) {
      setNotice({
        tone: "destructive",
        message: "Enable delivery or pickup before saving checkout settings.",
      });
      return;
    }
    setSavingAction("settings");
    setNotice(null);
    try {
      const nextDetails = await applyAdminBusinessAction(id, {
        action: "save_checkout_settings",
        settings: {
          business: {
            allow_delivery: form.allowDelivery,
            allow_pickup: form.allowPickup,
            minimum_order_amount: Number(form.minimumOrderAmount || 0),
            require_owner_approval: form.requireOwnerApproval,
          },
          botFlowSettings: form.botFlowSettings,
          orderConfirmationMessageEnglish: form.orderConfirmationMessageEnglish,
          orderConfirmationMessageArabic: form.orderConfirmationMessageArabic,
        },
      });
      setDetails(nextDetails);
      setForm(toCheckoutForm(nextDetails));
      setNotice({ tone: "success", message: "Checkout settings saved to the live business." });
    } catch (error) {
      setNotice({ tone: "destructive", message: errorMessage(error) });
    } finally {
      setSavingAction("");
    }
  }

  async function saveArea(nextForm = areaForm) {
    if (!nextForm) return;
    setSavingAction("area");
    setNotice(null);
    try {
      const nextDetails = await applyAdminBusinessAction(id, {
        action: "save_admin_delivery_area",
        area: {
          id: nextForm.id,
          name_english: nextForm.nameEnglish,
          name_arabic: nextForm.nameArabic,
          delivery_fee: Number(nextForm.deliveryFee || 0),
          is_active: nextForm.isActive,
          sort_order: nextForm.sortOrder,
        },
      });
      setDetails(nextDetails);
      setAreaForm(null);
      setNotice({ tone: "success", message: "Delivery area saved." });
    } catch (error) {
      setNotice({ tone: "destructive", message: errorMessage(error) });
    } finally {
      setSavingAction("");
    }
  }

  async function deleteArea(areaId: string) {
    setSavingAction("delete-area");
    setNotice(null);
    try {
      const nextDetails = await applyAdminBusinessAction(id, {
        action: "delete_admin_delivery_area",
        areaId,
      });
      setDetails(nextDetails);
      setDeleteAreaId("");
      setNotice({ tone: "success", message: "Delivery area deleted." });
    } catch (error) {
      setNotice({ tone: "destructive", message: errorMessage(error) });
    } finally {
      setSavingAction("");
    }
  }

  async function savePickup(nextForm = pickupForm) {
    if (!nextForm) return;
    setSavingAction("pickup");
    setNotice(null);
    try {
      const nextDetails = await applyAdminBusinessAction(id, {
        action: "save_admin_pickup_location",
        location: {
          id: nextForm.id,
          name_english: nextForm.nameEnglish,
          name_arabic: nextForm.nameArabic,
          address_english: nextForm.addressEnglish,
          address_arabic: nextForm.addressArabic,
          is_active: nextForm.isActive,
          sort_order: nextForm.sortOrder,
        },
      });
      setDetails(nextDetails);
      setPickupForm(null);
      setNotice({ tone: "success", message: "Pickup location saved." });
    } catch (error) {
      setNotice({ tone: "destructive", message: errorMessage(error) });
    } finally {
      setSavingAction("");
    }
  }

  async function deletePickup(locationId: string) {
    setSavingAction("delete-pickup");
    setNotice(null);
    try {
      const nextDetails = await applyAdminBusinessAction(id, {
        action: "delete_admin_pickup_location",
        locationId,
      });
      setDetails(nextDetails);
      setDeletePickupId("");
      setNotice({ tone: "success", message: "Pickup location deleted." });
    } catch (error) {
      setNotice({ tone: "destructive", message: errorMessage(error) });
    } finally {
      setSavingAction("");
    }
  }

  async function savePayment(nextForm = paymentForm) {
    if (!nextForm) return;
    setSavingAction("payment");
    setNotice(null);
    try {
      const nextDetails = await applyAdminBusinessAction(id, {
        action: "save_admin_payment_method",
        method: {
          id: nextForm.id,
          label_english: nextForm.labelEnglish,
          label_arabic: nextForm.labelArabic,
          fulfillment_methods: [
            ...(nextForm.delivery ? (["delivery"] as const) : []),
            ...(nextForm.pickup ? (["pickup"] as const) : []),
          ],
          is_active: nextForm.isActive,
          sort_order: nextForm.sortOrder,
        },
      });
      setDetails(nextDetails);
      setPaymentForm(null);
      setNotice({ tone: "success", message: "Payment method saved." });
    } catch (error) {
      setNotice({ tone: "destructive", message: errorMessage(error) });
    } finally {
      setSavingAction("");
    }
  }

  async function deletePayment(methodId: string) {
    setSavingAction("delete-payment");
    setNotice(null);
    try {
      const nextDetails = await applyAdminBusinessAction(id, {
        action: "delete_admin_payment_method",
        methodId,
      });
      setDetails(nextDetails);
      setDeletePaymentId("");
      setNotice({ tone: "success", message: "Payment method deleted." });
    } catch (error) {
      setNotice({ tone: "destructive", message: errorMessage(error) });
    } finally {
      setSavingAction("");
    }
  }

  return (
    <div className="space-y-4" data-business-checkout-live="true">
      {notice && (
        <div
          className={`rounded-md border p-3 text-sm ${
            notice.tone === "success"
              ? "border-success/25 bg-success/10 text-success"
              : "border-destructive/25 bg-destructive/10 text-destructive"
          }`}
          data-testid="business-checkout-notice"
        >
          {notice.message}
        </div>
      )}

      {fulfillmentBlocked && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Enable delivery or pickup before saving. The backend will reject a checkout with no
          fulfillment method.
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Checkout policy</CardTitle>
            <CardDescription>These settings affect the active WhatsApp order flow.</CardDescription>
          </div>
          <StatusBadge tone="info">Live data</StatusBadge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <TogglePanel
              title="Delivery"
              description="Ask customers for area and address."
              icon={<Truck className="h-4 w-4" />}
              checked={form.allowDelivery}
              onCheckedChange={(checked) =>
                setForm((current) => ({ ...current, allowDelivery: checked }))
              }
            />
            <TogglePanel
              title="Pickup"
              description="Let customers choose a pickup branch."
              icon={<Store className="h-4 w-4" />}
              checked={form.allowPickup}
              onCheckedChange={(checked) =>
                setForm((current) => ({ ...current, allowPickup: checked }))
              }
            />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Minimum order amount">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.minimumOrderAmount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    minimumOrderAmount: event.target.value,
                  }))
                }
              />
            </Field>
            <TogglePanel
              title="Require owner approval"
              description="Orders wait for the business owner before customer confirmation."
              checked={form.requireOwnerApproval}
              onCheckedChange={(checked) =>
                setForm((current) => ({ ...current, requireOwnerApproval: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer flow prompts</CardTitle>
          <CardDescription>
            Text used by the runtime while collecting checkout details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PromptPair
            label="Customer name"
            english={form.botFlowSettings.customerNamePromptEnglish}
            arabic={form.botFlowSettings.customerNamePromptArabic}
            onEnglishChange={(value) => updateBotPrompt("customerNamePromptEnglish", value)}
            onArabicChange={(value) => updateBotPrompt("customerNamePromptArabic", value)}
          />
          <PromptPair
            label="Fulfillment"
            english={form.botFlowSettings.fulfillmentPromptEnglish}
            arabic={form.botFlowSettings.fulfillmentPromptArabic}
            onEnglishChange={(value) => updateBotPrompt("fulfillmentPromptEnglish", value)}
            onArabicChange={(value) => updateBotPrompt("fulfillmentPromptArabic", value)}
          />
          <PromptPair
            label="Delivery area"
            english={form.botFlowSettings.deliveryAreaPromptEnglish}
            arabic={form.botFlowSettings.deliveryAreaPromptArabic}
            onEnglishChange={(value) => updateBotPrompt("deliveryAreaPromptEnglish", value)}
            onArabicChange={(value) => updateBotPrompt("deliveryAreaPromptArabic", value)}
          />
          <PromptPair
            label="Delivery address"
            english={form.botFlowSettings.deliveryAddressPromptEnglish}
            arabic={form.botFlowSettings.deliveryAddressPromptArabic}
            onEnglishChange={(value) => updateBotPrompt("deliveryAddressPromptEnglish", value)}
            onArabicChange={(value) => updateBotPrompt("deliveryAddressPromptArabic", value)}
          />
          <PromptPair
            label="Pickup location"
            english={form.botFlowSettings.pickupLocationPromptEnglish}
            arabic={form.botFlowSettings.pickupLocationPromptArabic}
            onEnglishChange={(value) => updateBotPrompt("pickupLocationPromptEnglish", value)}
            onArabicChange={(value) => updateBotPrompt("pickupLocationPromptArabic", value)}
          />
          <PromptPair
            label="Payment method"
            english={form.botFlowSettings.paymentMethodPromptEnglish}
            arabic={form.botFlowSettings.paymentMethodPromptArabic}
            onEnglishChange={(value) => updateBotPrompt("paymentMethodPromptEnglish", value)}
            onArabicChange={(value) => updateBotPrompt("paymentMethodPromptArabic", value)}
          />
          <PromptPair
            label="Order notes"
            english={form.botFlowSettings.orderNotesPromptEnglish}
            arabic={form.botFlowSettings.orderNotesPromptArabic}
            onEnglishChange={(value) => updateBotPrompt("orderNotesPromptEnglish", value)}
            onArabicChange={(value) => updateBotPrompt("orderNotesPromptArabic", value)}
          />
          <PromptPair
            label="No notes button"
            english={form.botFlowSettings.noNotesButtonEnglish}
            arabic={form.botFlowSettings.noNotesButtonArabic}
            onEnglishChange={(value) => updateBotPrompt("noNotesButtonEnglish", value)}
            onArabicChange={(value) => updateBotPrompt("noNotesButtonArabic", value)}
          />
          <PromptPair
            label="Order confirmation"
            english={form.orderConfirmationMessageEnglish}
            arabic={form.orderConfirmationMessageArabic}
            textarea
            onEnglishChange={(value) =>
              setForm((current) => ({ ...current, orderConfirmationMessageEnglish: value }))
            }
            onArabicChange={(value) =>
              setForm((current) => ({ ...current, orderConfirmationMessageArabic: value }))
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checkout behavior</CardTitle>
          <CardDescription>
            Keep the flow short when there is only one valid choice.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          <TogglePanel
            title="Reuse saved customer details"
            description="Skip repeated checkout questions when a customer already has saved details."
            checked={form.botFlowSettings.autoUseSavedCheckoutDetails}
            onCheckedChange={(checked) => updateBotFlag("autoUseSavedCheckoutDetails", checked)}
          />
          <TogglePanel
            title="Show product details before ordering"
            description="Send details before the customer confirms a product."
            checked={form.botFlowSettings.showProductDetailsBeforeOrdering}
            onCheckedChange={(checked) =>
              updateBotFlag("showProductDetailsBeforeOrdering", checked)
            }
          />
          <TogglePanel
            title="Skip fulfillment when only one option"
            description="Avoid asking delivery or pickup when only one method is active."
            checked={form.botFlowSettings.skipFulfillmentWhenSingleOption}
            onCheckedChange={(checked) => updateBotFlag("skipFulfillmentWhenSingleOption", checked)}
          />
          <TogglePanel
            title="Skip delivery area when only one"
            description="Use the only active delivery area automatically."
            checked={form.botFlowSettings.skipDeliveryAreaWhenSingleOption}
            onCheckedChange={(checked) =>
              updateBotFlag("skipDeliveryAreaWhenSingleOption", checked)
            }
          />
          <TogglePanel
            title="Skip pickup location when only one"
            description="Use the only active pickup branch automatically."
            checked={form.botFlowSettings.skipPickupLocationWhenSingleOption}
            onCheckedChange={(checked) =>
              updateBotFlag("skipPickupLocationWhenSingleOption", checked)
            }
          />
          <TogglePanel
            title="Skip payment when only one method"
            description="Use the only active payment method automatically."
            checked={form.botFlowSettings.skipPaymentWhenSingleOption}
            onCheckedChange={(checked) => updateBotFlag("skipPaymentWhenSingleOption", checked)}
          />
          <TogglePanel
            title="Ask for order notes"
            description="Let customers add optional instructions."
            checked={form.botFlowSettings.orderNotesEnabled}
            onCheckedChange={(checked) => updateBotFlag("orderNotesEnabled", checked)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChoiceCard
          title="Delivery areas"
          description="Areas and fees customers can choose."
          icon={<MapPin className="h-4 w-4" />}
          empty="No delivery areas yet."
          actionLabel="Add area"
          count={deliveryAreas.length}
          onCreate={() => setAreaForm(emptyDeliveryAreaForm(nextSortOrder(deliveryAreas)))}
        >
          {deliveryAreas.map((area) => (
            <ChoiceRow
              key={area.id}
              title={area.name_english}
              detail={`${area.delivery_fee} ${details.business.currency}`}
              active={area.is_active}
              onEdit={() => setAreaForm(toDeliveryAreaForm(area))}
              deleteOpen={deleteAreaId === area.id}
              onDeleteOpen={() => setDeleteAreaId(area.id)}
              onDeleteCancel={() => setDeleteAreaId("")}
              onDeleteConfirm={() => deleteArea(area.id)}
              deleting={savingAction === "delete-area"}
            />
          ))}
          {areaForm && (
            <DeliveryAreaEditor
              form={areaForm}
              saving={savingAction === "area"}
              onChange={setAreaForm}
              onCancel={() => setAreaForm(null)}
              onSave={saveArea}
            />
          )}
        </ChoiceCard>

        <ChoiceCard
          title="Pickup locations"
          description="Branches customers can collect from."
          icon={<Store className="h-4 w-4" />}
          empty="No pickup locations yet."
          actionLabel="Add location"
          count={pickupLocations.length}
          onCreate={() => setPickupForm(emptyPickupLocationForm(nextSortOrder(pickupLocations)))}
        >
          {pickupLocations.map((location) => (
            <ChoiceRow
              key={location.id}
              title={location.name_english}
              detail={location.address_english}
              active={location.is_active}
              onEdit={() => setPickupForm(toPickupLocationForm(location))}
              deleteOpen={deletePickupId === location.id}
              onDeleteOpen={() => setDeletePickupId(location.id)}
              onDeleteCancel={() => setDeletePickupId("")}
              onDeleteConfirm={() => deletePickup(location.id)}
              deleting={savingAction === "delete-pickup"}
            />
          ))}
          {pickupForm && (
            <PickupLocationEditor
              form={pickupForm}
              saving={savingAction === "pickup"}
              onChange={setPickupForm}
              onCancel={() => setPickupForm(null)}
              onSave={savePickup}
            />
          )}
        </ChoiceCard>

        <ChoiceCard
          title="Payment methods"
          description="Payment options exposed during checkout."
          icon={<CreditCard className="h-4 w-4" />}
          empty="No payment methods yet."
          actionLabel="Add method"
          count={paymentMethods.length}
          onCreate={() => setPaymentForm(emptyPaymentMethodForm(nextSortOrder(paymentMethods)))}
        >
          {paymentMethods.map((method) => (
            <ChoiceRow
              key={method.id}
              title={method.label_english}
              detail={method.fulfillment_methods.join(" + ")}
              active={method.is_active}
              onEdit={() => setPaymentForm(toPaymentMethodForm(method))}
              deleteOpen={deletePaymentId === method.id}
              onDeleteOpen={() => setDeletePaymentId(method.id)}
              onDeleteCancel={() => setDeletePaymentId("")}
              onDeleteConfirm={() => deletePayment(method.id)}
              deleting={savingAction === "delete-payment"}
            />
          ))}
          {paymentForm && (
            <PaymentMethodEditor
              form={paymentForm}
              saving={savingAction === "payment"}
              onChange={setPaymentForm}
              onCancel={() => setPaymentForm(null)}
              onSave={savePayment}
            />
          )}
        </ChoiceCard>
      </div>

      <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-background/95 py-3 backdrop-blur">
        <Button variant="outline" onClick={() => setForm(toCheckoutForm(details))}>
          Reset unsaved settings
        </Button>
        <Button
          onClick={saveSettings}
          disabled={savingAction === "settings"}
          data-testid="business-checkout-save"
          data-flow-manager-live-action
        >
          {savingAction === "settings" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save checkout settings
        </Button>
      </div>
    </div>
  );

  function updateBotPrompt(key: keyof BotFlowSettingsInput, value: string) {
    setForm((current) => ({
      ...current,
      botFlowSettings: { ...current.botFlowSettings, [key]: value },
    }));
  }

  function updateBotFlag(key: keyof BotFlowSettingsInput, value: boolean) {
    setForm((current) => ({
      ...current,
      botFlowSettings: { ...current.botFlowSettings, [key]: value },
    }));
  }
}

function TogglePanel({
  title,
  description,
  checked,
  onCheckedChange,
  icon,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  icon?: ReactNode;
}) {
  return (
    <label className="flex min-h-20 items-center justify-between gap-3 rounded-md border p-3">
      <span className="flex items-start gap-3">
        {icon && <span className="rounded-md bg-muted p-2 text-muted-foreground">{icon}</span>}
        <span>
          <span className="block text-sm font-medium">{title}</span>
          <span className="block text-xs text-muted-foreground">{description}</span>
        </span>
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function PromptPair({
  label,
  english,
  arabic,
  textarea = false,
  onEnglishChange,
  onArabicChange,
}: {
  label: string;
  english: string;
  arabic: string;
  textarea?: boolean;
  onEnglishChange: (value: string) => void;
  onArabicChange: (value: string) => void;
}) {
  const Control = textarea ? Textarea : Input;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Field label={`${label} (EN)`}>
        <Control
          rows={textarea ? 3 : undefined}
          value={english}
          onChange={(event) => onEnglishChange(event.target.value)}
        />
      </Field>
      <Field label={`${label} (AR)`}>
        <Control
          dir="rtl"
          rows={textarea ? 3 : undefined}
          value={arabic}
          onChange={(event) => onArabicChange(event.target.value)}
        />
      </Field>
    </div>
  );
}

function ChoiceCard({
  title,
  description,
  icon,
  empty,
  actionLabel,
  count,
  onCreate,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  empty: string;
  actionLabel: string;
  count: number;
  onCreate: () => void;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="rounded-md bg-muted p-2 text-muted-foreground">{icon}</span>
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onCreate}>
            <Plus className="h-4 w-4" />
            {actionLabel}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {count === 0 && (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            {empty}
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

function ChoiceRow({
  title,
  detail,
  active,
  onEdit,
  deleteOpen,
  onDeleteOpen,
  onDeleteCancel,
  onDeleteConfirm,
  deleting,
}: {
  title: string;
  detail: string;
  active: boolean;
  onEdit: () => void;
  deleteOpen: boolean;
  onDeleteOpen: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
  deleting: boolean;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{title}</div>
          <div className="truncate text-xs text-muted-foreground">{detail}</div>
        </div>
        <StatusBadge tone={active ? "success" : "neutral"}>
          {active ? "Active" : "Inactive"}
        </StatusBadge>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onDeleteOpen}
          aria-label={`Delete ${title}`}
          data-flow-manager-live-action
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {deleteOpen && (
        <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
          <div className="font-medium text-destructive">Delete this checkout choice?</div>
          <div className="mt-1 text-muted-foreground">
            This removes it from future WhatsApp checkouts.
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onDeleteCancel}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onDeleteConfirm}
              disabled={deleting}
              data-flow-manager-live-action
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DeliveryAreaEditor({
  form,
  saving,
  onChange,
  onCancel,
  onSave,
}: {
  form: DeliveryAreaFormState;
  saving: boolean;
  onChange: (form: DeliveryAreaFormState) => void;
  onCancel: () => void;
  onSave: (form: DeliveryAreaFormState) => void;
}) {
  return (
    <form
      className="space-y-3 rounded-md border bg-muted/30 p-3"
      data-testid="business-checkout-delivery-area-editor"
      data-flow-manager-live-action
      onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
      }}
    >
      <BilingualInputs
        label="Area name"
        english={form.nameEnglish}
        arabic={form.nameArabic}
        onEnglishChange={(value) => onChange({ ...form, nameEnglish: value })}
        onArabicChange={(value) => onChange({ ...form, nameArabic: value })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Delivery fee">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.deliveryFee}
            onChange={(event) => onChange({ ...form, deliveryFee: event.target.value })}
          />
        </Field>
        <Field label="Sort order">
          <Input
            type="number"
            min="0"
            value={form.sortOrder}
            onChange={(event) => onChange({ ...form, sortOrder: Number(event.target.value) })}
          />
        </Field>
      </div>
      <FormActions
        active={form.isActive}
        saving={saving}
        onActiveChange={(checked) => onChange({ ...form, isActive: checked })}
        onCancel={onCancel}
      />
    </form>
  );
}

function PickupLocationEditor({
  form,
  saving,
  onChange,
  onCancel,
  onSave,
}: {
  form: PickupLocationFormState;
  saving: boolean;
  onChange: (form: PickupLocationFormState) => void;
  onCancel: () => void;
  onSave: (form: PickupLocationFormState) => void;
}) {
  return (
    <form
      className="space-y-3 rounded-md border bg-muted/30 p-3"
      data-testid="business-checkout-pickup-location-editor"
      data-flow-manager-live-action
      onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
      }}
    >
      <BilingualInputs
        label="Location name"
        english={form.nameEnglish}
        arabic={form.nameArabic}
        onEnglishChange={(value) => onChange({ ...form, nameEnglish: value })}
        onArabicChange={(value) => onChange({ ...form, nameArabic: value })}
      />
      <BilingualInputs
        label="Address"
        english={form.addressEnglish}
        arabic={form.addressArabic}
        onEnglishChange={(value) => onChange({ ...form, addressEnglish: value })}
        onArabicChange={(value) => onChange({ ...form, addressArabic: value })}
      />
      <Field label="Sort order">
        <Input
          type="number"
          min="0"
          value={form.sortOrder}
          onChange={(event) => onChange({ ...form, sortOrder: Number(event.target.value) })}
        />
      </Field>
      <FormActions
        active={form.isActive}
        saving={saving}
        onActiveChange={(checked) => onChange({ ...form, isActive: checked })}
        onCancel={onCancel}
      />
    </form>
  );
}

function PaymentMethodEditor({
  form,
  saving,
  onChange,
  onCancel,
  onSave,
}: {
  form: PaymentMethodFormState;
  saving: boolean;
  onChange: (form: PaymentMethodFormState) => void;
  onCancel: () => void;
  onSave: (form: PaymentMethodFormState) => void;
}) {
  return (
    <form
      className="space-y-3 rounded-md border bg-muted/30 p-3"
      data-testid="business-checkout-payment-method-editor"
      data-flow-manager-live-action
      onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
      }}
    >
      <BilingualInputs
        label="Payment label"
        english={form.labelEnglish}
        arabic={form.labelArabic}
        onEnglishChange={(value) => onChange({ ...form, labelEnglish: value })}
        onArabicChange={(value) => onChange({ ...form, labelArabic: value })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <TogglePanel
          title="Delivery"
          description="Available for delivery orders."
          checked={form.delivery}
          onCheckedChange={(checked) => onChange({ ...form, delivery: checked })}
        />
        <TogglePanel
          title="Pickup"
          description="Available for pickup orders."
          checked={form.pickup}
          onCheckedChange={(checked) => onChange({ ...form, pickup: checked })}
        />
      </div>
      <Field label="Sort order">
        <Input
          type="number"
          min="0"
          value={form.sortOrder}
          onChange={(event) => onChange({ ...form, sortOrder: Number(event.target.value) })}
        />
      </Field>
      <FormActions
        active={form.isActive}
        saving={saving}
        onActiveChange={(checked) => onChange({ ...form, isActive: checked })}
        onCancel={onCancel}
      />
    </form>
  );
}

function BilingualInputs({
  label,
  english,
  arabic,
  onEnglishChange,
  onArabicChange,
}: {
  label: string;
  english: string;
  arabic: string;
  onEnglishChange: (value: string) => void;
  onArabicChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={`${label} (EN)`}>
        <Input value={english} onChange={(event) => onEnglishChange(event.target.value)} />
      </Field>
      <Field label={`${label} (AR)`}>
        <Input dir="rtl" value={arabic} onChange={(event) => onArabicChange(event.target.value)} />
      </Field>
    </div>
  );
}

function FormActions({
  active,
  saving,
  onActiveChange,
  onCancel,
}: {
  active: boolean;
  saving: boolean;
  onActiveChange: (checked: boolean) => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={active} onCheckedChange={onActiveChange} />
        Active
      </label>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving} data-flow-manager-live-action>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </div>
    </div>
  );
}

function toCheckoutForm(details: AdminBusinessDetailsResult | null): CheckoutFormState {
  if (!details) {
    return {
      allowDelivery: true,
      allowPickup: true,
      minimumOrderAmount: "0",
      requireOwnerApproval: false,
      orderConfirmationMessageEnglish:
        "Thanks {{customer_name}}! Your order #{{order_id}} is confirmed.",
      orderConfirmationMessageArabic: "",
      botFlowSettings: EMPTY_BOT_FLOW_SETTINGS,
    };
  }

  return {
    allowDelivery: Boolean(details.business.allow_delivery ?? true),
    allowPickup: Boolean(details.business.allow_pickup ?? true),
    minimumOrderAmount: String(details.business.minimum_order_amount ?? 0),
    requireOwnerApproval: Boolean(details.business.require_owner_approval ?? false),
    orderConfirmationMessageEnglish:
      details.business.order_confirmation_message_english ||
      "Thanks {{customer_name}}! Your order #{{order_id}} is confirmed.",
    orderConfirmationMessageArabic: details.business.order_confirmation_message_arabic || "",
    botFlowSettings: toBotFlowInput(details.botFlowSettings),
  };
}

function toBotFlowInput(
  settings: AdminBusinessDetailsResult["botFlowSettings"],
): BotFlowSettingsInput {
  const { businessId: _businessId, updatedAt: _updatedAt, ...input } = settings;
  return input;
}

function emptyDeliveryAreaForm(sortOrder: number): DeliveryAreaFormState {
  return {
    nameEnglish: "",
    nameArabic: "",
    deliveryFee: "0",
    isActive: true,
    sortOrder,
  };
}

function toDeliveryAreaForm(area: WaDeliveryAreaRow): DeliveryAreaFormState {
  return {
    id: area.id,
    nameEnglish: area.name_english,
    nameArabic: area.name_arabic,
    deliveryFee: String(area.delivery_fee),
    isActive: area.is_active,
    sortOrder: area.sort_order,
  };
}

function emptyPickupLocationForm(sortOrder: number): PickupLocationFormState {
  return {
    nameEnglish: "",
    nameArabic: "",
    addressEnglish: "",
    addressArabic: "",
    isActive: true,
    sortOrder,
  };
}

function toPickupLocationForm(location: WaPickupLocationRow): PickupLocationFormState {
  return {
    id: location.id,
    nameEnglish: location.name_english,
    nameArabic: location.name_arabic,
    addressEnglish: location.address_english,
    addressArabic: location.address_arabic,
    isActive: location.is_active,
    sortOrder: location.sort_order,
  };
}

function emptyPaymentMethodForm(sortOrder: number): PaymentMethodFormState {
  return {
    labelEnglish: "",
    labelArabic: "",
    delivery: true,
    pickup: true,
    isActive: true,
    sortOrder,
  };
}

function toPaymentMethodForm(method: WaPaymentMethodRow): PaymentMethodFormState {
  return {
    id: method.id,
    labelEnglish: method.label_english,
    labelArabic: method.label_arabic,
    delivery: method.fulfillment_methods.includes("delivery"),
    pickup: method.fulfillment_methods.includes("pickup"),
    isActive: method.is_active,
    sortOrder: method.sort_order,
  };
}

function sortByOrder<T extends { sort_order: number }>(rows: T[], labelKey: keyof T) {
  return [...rows].sort((left, right) => {
    const order = left.sort_order - right.sort_order;
    if (order !== 0) return order;
    return String(left[labelKey]).localeCompare(String(right[labelKey]));
  });
}

function nextSortOrder(rows: Array<{ sort_order: number }>) {
  return rows.reduce((max, row) => Math.max(max, row.sort_order), 0) + 1;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}
