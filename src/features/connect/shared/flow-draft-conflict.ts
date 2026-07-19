export const FLOW_DRAFT_CONFLICT_CODE = "FLOW_DRAFT_CONFLICT";

export class FlowDraftConflictError extends Error {
  readonly code = FLOW_DRAFT_CONFLICT_CODE;

  constructor() {
    super("This draft changed in another session. Your unsaved changes were kept.");
    this.name = "FlowDraftConflictError";
  }
}

export function assertExpectedDraftRevision({
  draftId,
  draftRevision,
  expectedVersionId,
  expectedRevision,
}: {
  draftId: string | undefined;
  draftRevision: number | undefined;
  expectedVersionId: string;
  expectedRevision: number;
}) {
  if (
    draftId !== expectedVersionId ||
    draftRevision !== expectedRevision ||
    !Number.isSafeInteger(expectedRevision) ||
    expectedRevision < 1
  ) {
    throw new FlowDraftConflictError();
  }
}
