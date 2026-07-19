import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listGuidedInboundReferences,
  type GuidedDeleteRepair,
  type GuidedNewStepType,
} from "@/features/connect/flow-manager-ui/guided-flow-draft";
import type { GuidedFlowModel } from "@/features/connect/flow-manager-ui/guided-flow-model";

const stepTypes: Array<{
  value: GuidedNewStepType;
  label: string;
  defaultTitle: string;
  description: string;
}> = [
  {
    value: "MESSAGE",
    label: "Text message",
    defaultTitle: "New message",
    description: "Send text, ask a question, or provide information.",
  },
  {
    value: "IMAGE_MESSAGE",
    label: "Image message",
    defaultTitle: "New image",
    description: "Send an image with optional English and Arabic captions.",
  },
  {
    value: "MAIN_MENU",
    label: "Reply menu",
    defaultTitle: "New reply menu",
    description: "Create a message that can branch through up to three WhatsApp replies.",
  },
  {
    value: "HUMAN_HANDOFF",
    label: "Human handoff",
    defaultTitle: "Human handoff",
    description: "Pause automation and move the conversation to the team.",
  },
  {
    value: "END",
    label: "End conversation",
    defaultTitle: "End conversation",
    description: "Finish this conversation path without another destination.",
  },
];

export function GuidedCreateStepDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: { type: GuidedNewStepType; title: string }) => void;
}) {
  const [type, setType] = useState<GuidedNewStepType>("MESSAGE");
  const [title, setTitle] = useState("New message");
  const selectedType = stepTypes.find((item) => item.value === type)!;

  useEffect(() => {
    if (!open) return;
    setType("MESSAGE");
    setTitle("New message");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a flow step</DialogTitle>
          <DialogDescription>
            The new step receives a stable ID and starts unconnected until you route a choice to it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="guided-new-step-type">Step type</Label>
            <Select
              value={type}
              onValueChange={(value) => {
                const nextType = value as GuidedNewStepType;
                const previousDefault = selectedType.defaultTitle;
                const nextDefault = stepTypes.find((item) => item.value === nextType)!.defaultTitle;
                setType(nextType);
                setTitle((current) => (current === previousDefault ? nextDefault : current));
              }}
            >
              <SelectTrigger id="guided-new-step-type" aria-label="New step type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stepTypes.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{selectedType.description}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="guided-new-step-title">Admin title</Label>
            <Input
              id="guided-new-step-title"
              aria-label="New step admin title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={80}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!title.trim()}
            onClick={() => {
              onCreate({ type, title: title.trim() });
              onOpenChange(false);
            }}
          >
            Add step
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GuidedDeleteStepDialog({
  model,
  stepId,
  onClose,
  onDelete,
}: {
  model: GuidedFlowModel;
  stepId?: string;
  onClose: () => void;
  onDelete: (stepId: string, repair?: GuidedDeleteRepair) => void;
}) {
  const [repairValue, setRepairValue] = useState("");
  const [deleteError, setDeleteError] = useState<string>();
  const step = model.steps.find((candidate) => candidate.id === stepId);
  const inbound = useMemo(
    () =>
      stepId
        ? listGuidedInboundReferences(model.document, stepId).filter(
            (reference) => reference.sourceNodeId !== stepId,
          )
        : [],
    [model.document, stepId],
  );

  useEffect(() => {
    setRepairValue("");
    setDeleteError(undefined);
  }, [stepId]);

  return (
    <Dialog open={Boolean(stepId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {step?.title ?? "this step"}?</DialogTitle>
          <DialogDescription>
            The step and every route leaving it will be removed. Stable IDs on all other steps stay
            unchanged.
          </DialogDescription>
        </DialogHeader>

        {inbound.length ? (
          <div className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-950">
            <div>
              <div className="text-sm font-semibold">
                Repair {inbound.length} incoming {inbound.length === 1 ? "route" : "routes"}
              </div>
              <p className="mt-0.5 text-xs">
                Choose one replacement for every route below, or explicitly remove their
                destinations.
              </p>
            </div>
            <ul className="max-h-32 space-y-1 overflow-y-auto text-xs">
              {inbound.map((reference) => {
                const source = model.steps.find(
                  (candidate) => candidate.id === reference.sourceNodeId,
                );
                return (
                  <li
                    key={
                      reference.kind === "option"
                        ? `option-${reference.sourceNodeId}-${reference.optionKey}`
                        : reference.edgeId
                    }
                  >
                    {source?.title ?? reference.sourceNodeId}:{" "}
                    {reference.kind === "option"
                      ? `choice ${reference.optionKey}`
                      : "automatic continuation"}
                  </li>
                );
              })}
            </ul>
            <div className="space-y-2">
              <Label htmlFor="guided-delete-repair">Repair incoming routes</Label>
              <Select value={repairValue} onValueChange={setRepairValue}>
                <SelectTrigger id="guided-delete-repair" aria-label="Repair incoming routes">
                  <SelectValue placeholder="Choose a repair" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remove">Remove their destinations</SelectItem>
                  {model.steps
                    .filter((candidate) => candidate.id !== stepId)
                    .map((candidate) => (
                      <SelectItem key={candidate.id} value={`replace:${candidate.id}`}>
                        Redirect to {candidate.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            No other step points here, so no route repair is required.
          </p>
        )}

        {deleteError ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {deleteError}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Keep step
          </Button>
          <Button
            variant="destructive"
            aria-label="Confirm delete step"
            disabled={Boolean(inbound.length && !repairValue)}
            onClick={() => {
              if (!stepId) return;
              try {
                const repair = parseRepair(repairValue);
                onDelete(stepId, repair);
                onClose();
              } catch (error) {
                setDeleteError(
                  error instanceof Error ? error.message : "The step could not be deleted.",
                );
              }
            }}
          >
            Delete step
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function parseRepair(value: string): GuidedDeleteRepair | undefined {
  if (value === "remove") return { mode: "remove" };
  if (value.startsWith("replace:")) {
    return { mode: "replace", replacementNodeId: value.slice("replace:".length) };
  }
  return undefined;
}
