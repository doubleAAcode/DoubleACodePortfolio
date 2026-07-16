import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/connect/admin/businesses/$id/checkout")({
  component: CheckoutPage,
});

function Bilingual({ label, en, ar }: { label: string; en: string; ar: string }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="space-y-1">
        <Label className="text-xs">{label} (EN)</Label>
        <Input defaultValue={en} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{label} (AR)</Label>
        <Input dir="rtl" defaultValue={ar} />
      </div>
    </div>
  );
}

function CheckoutPage() {
  const [delivery, setDelivery] = useState(true);
  const [pickup, setPickup] = useState(true);
  const blocked = !delivery && !pickup;
  return (
    <div className="space-y-4">
      {blocked && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Checkout cannot be published because delivery and pickup are both disabled. Enable at least one.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Fulfillment methods</CardTitle>
          <CardDescription>How customers receive their order.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="font-medium text-sm">Delivery</div>
              <div className="text-xs text-muted-foreground">Ask for area + address.</div>
            </div>
            <Switch checked={delivery} onCheckedChange={setDelivery} />
          </label>
          <label className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="font-medium text-sm">Pickup</div>
              <div className="text-xs text-muted-foreground">Customer collects from a store location.</div>
            </div>
            <Switch checked={pickup} onCheckedChange={setPickup} />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Customer information prompts</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Bilingual label="Customer name prompt" en="What name should we put on the order?" ar="ما الاسم الذي نضعه على الطلب؟" />
        </CardContent>
      </Card>

      {delivery && (
        <Card>
          <CardHeader><CardTitle>Delivery prompts</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Bilingual label="Delivery area prompt" en="Which area should we deliver to?" ar="إلى أي منطقة نقوم بالتوصيل؟" />
            <Bilingual label="Delivery address prompt" en="Please share your full address." ar="من فضلك شارك عنوانك بالكامل." />
          </CardContent>
        </Card>
      )}

      {pickup && (
        <Card>
          <CardHeader><CardTitle>Pickup prompts</CardTitle></CardHeader>
          <CardContent>
            <Bilingual label="Pickup location prompt" en="Which store would you like to pick up from?" ar="من أي فرع تود الاستلام؟" />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Payment prompts</CardTitle></CardHeader>
        <CardContent>
          <Bilingual label="Payment method prompt" en="How would you like to pay? Cash / Card / Bank transfer" ar="كيف تود الدفع؟ نقداً / بطاقة / تحويل" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent>
          <Bilingual label="Notes prompt" en="Any special instructions for us?" ar="هل هناك تعليمات خاصة؟" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Order confirmation</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Confirmation message (EN)</Label>
            <Textarea rows={3} defaultValue={`Thanks {{customer_name}}! Your order #{{order_id}} is confirmed. We'll message you shortly with tracking.`} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Confirmation message (AR)</Label>
            <Textarea rows={3} dir="rtl" defaultValue={`شكراً {{customer_name}}! تم تأكيد طلبك #{{order_id}}. سنراسلك قريباً برقم التتبع.`} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button disabled={blocked}>Save checkout settings</Button>
      </div>
    </div>
  );
}
