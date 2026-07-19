import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, GitBranch, Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/features/connect/flow-manager-ui/components/status-badge";
import {
  applyAdminBusinessAction,
  getFlowTemplates,
  type AdminBusinessDetailsResult,
} from "@/features/connect/shared/admin-client";
import type { FlowTemplateRow } from "@/features/connect/shared/flow-template-store.server";

export function BusinessTemplatePicker({
  businessId,
  sourceTemplateId,
  onApplied,
}: {
  businessId: string;
  sourceTemplateId?: string | null;
  onApplied?: (details: AdminBusinessDetailsResult) => void | Promise<void>;
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(sourceTemplateId ?? "");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [actionError, setActionError] = useState("");

  const templatesQuery = useQuery({
    queryKey: ["connect", "admin", "flow-templates"],
    queryFn: getFlowTemplates,
  });

  const publishedTemplates = useMemo(
    () => (templatesQuery.data ?? []).filter((template) => template.status === "PUBLISHED"),
    [templatesQuery.data],
  );
  const selectedTemplate = publishedTemplates.find(
    (template) => template.id === selectedTemplateId,
  );

  async function applyTemplate() {
    if (!selectedTemplate) return;
    setApplying(true);
    setActionError("");
    try {
      const details = await applyAdminBusinessAction(businessId, {
        action: "clone_flow_template",
        templateId: selectedTemplate.id,
      });
      await onApplied?.(details);
      setConfirmOpen(false);
      toast.success("Template draft created", {
        description: "Review the draft, then publish it when it is ready for new chats.",
      });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not create a draft from this template.",
      );
    } finally {
      setApplying(false);
    }
  }

  return (
    <Card data-business-template-picker>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Choose flow template
            </CardTitle>
            <CardDescription>
              Start or replace this business draft from an approved WhatsApp flow template.
            </CardDescription>
          </div>
          {sourceTemplateId ? <StatusBadge tone="success">Template selected</StatusBadge> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {templatesQuery.isLoading ? (
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading templates...
          </div>
        ) : templatesQuery.error ? (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {templatesQuery.error.message}
          </div>
        ) : publishedTemplates.length === 0 ? (
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            No published flow templates are available yet.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="space-y-2">
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger aria-label="Business flow template">
                  <SelectValue placeholder="Select a published flow template" />
                </SelectTrigger>
                <SelectContent>
                  {publishedTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate ? <TemplateSummary template={selectedTemplate} /> : null}
            </div>
            <Button
              type="button"
              disabled={!selectedTemplate || applying}
              onClick={() => setConfirmOpen(true)}
            >
              {applying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GitBranch className="h-4 w-4" />
              )}
              Use template
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Applying a template creates a new editable draft. The current live flow stays active until
          you publish the new draft.
        </p>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !applying && setConfirmOpen(open)}>
        <AlertDialogContent className="border-slate-200 bg-white text-slate-950 shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Create draft from template?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              This archives the current draft for this business and creates a new draft from{" "}
              {selectedTemplate?.name ?? "the selected template"}. The live published flow does not
              change until you publish.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {actionError ? (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-950"
            >
              {actionError}
            </div>
          ) : null}
          {applying ? (
            <div
              role="status"
              className="flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950"
            >
              <Loader2 className="h-4 w-4 animate-spin text-sky-700" />
              Creating a new draft from the template...
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
              disabled={applying}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              disabled={applying || !selectedTemplate}
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => void applyTemplate()}
            >
              {applying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GitBranch className="h-4 w-4" />
              )}
              {applying ? "Creating draft..." : "Create draft"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function TemplateSummary({ template }: { template: FlowTemplateRow }) {
  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{template.name}</span>
        <StatusBadge tone="neutral">{template.category}</StatusBadge>
      </div>
      {template.description ? (
        <p className="mt-1 text-xs text-muted-foreground">{template.description}</p>
      ) : null}
    </div>
  );
}
