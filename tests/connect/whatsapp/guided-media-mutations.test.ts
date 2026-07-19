import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  GUIDED_IMAGE_MAX_BYTES,
  updateGuidedImageMedia,
  validateGuidedImageFile,
} from "../../../src/features/connect/flow-manager-ui/guided-flow-draft.ts";
import type { CanonicalFlowDocument } from "../../../src/features/connect/shared/flow-document.ts";

test("Guided image replacement validates provider files and preserves canonical identity", () => {
  assert.equal(validateGuidedImageFile({ type: "image/png", size: 1024 }), undefined);
  assert.equal(
    validateGuidedImageFile({ type: "image/gif", size: 1024 }),
    "Upload a JPG, PNG, or WebP image.",
  );
  assert.equal(
    validateGuidedImageFile({ type: "image/webp", size: GUIDED_IMAGE_MAX_BYTES + 1 }),
    "Image must be 3 MB or smaller.",
  );
  assert.equal(
    validateGuidedImageFile({ type: "image/jpeg", size: 0 }),
    "The selected image is empty.",
  );

  const document = fixture();
  const replaced = updateGuidedImageMedia(
    document,
    "image",
    " https://example.com/flow-image.png ",
  );
  assert.equal(
    replaced.nodes.find((node) => node.id === "image")?.mediaUrl,
    "https://example.com/flow-image.png",
  );
  assert.deepEqual(replaced.edges, document.edges);
  assert.equal(
    document.nodes.find((node) => node.id === "image")?.mediaUrl,
    "https://example.com/original.png",
  );

  const removed = updateGuidedImageMedia(replaced, "image", undefined);
  assert.equal(removed.nodes.find((node) => node.id === "image")?.mediaUrl, undefined);
  assert.deepEqual(removed.nodes.find((node) => node.id === "image")?.mediaCaption, {
    en: "Saved caption",
  });
  assert.throws(
    () => updateGuidedImageMedia(document, "message", "https://example.com/no.png"),
    /Image message step/,
  );
  assert.throws(
    () => updateGuidedImageMedia(document, "image", "data:image/png;base64,abc"),
    /not public/,
  );
});

test("Guided media UI uses authenticated audience adapters and no Future upload action", async () => {
  const [
    editor,
    workspace,
    adminRoute,
    clientRoute,
    clientAdapter,
    dashboardHandlers,
    dashboardStore,
    routeOne,
    routeTwo,
  ] = await Promise.all([
    readFile("src/features/connect/flow-manager-ui/guided-flow-editor.tsx", "utf8"),
    readFile("src/features/connect/flow-manager-ui/guided-flow-workspace.tsx", "utf8"),
    readFile("src/routes/connect.admin.businesses.$id.flow-builder.tsx", "utf8"),
    readFile("src/routes/connect/client/automations.tsx", "utf8"),
    readFile("src/features/connect/shared/dashboard-client.ts", "utf8"),
    readFile("src/features/connect/shared/dashboard-api-handlers.server.ts", "utf8"),
    readFile("src/features/connect/shared/dashboard-store.server.ts", "utf8"),
    readFile("src/routes/api.connect.dashboard.flow-image.ts", "utf8"),
    readFile("src/routes/api.connect.dashboard-2.flow-image.ts", "utf8"),
  ]);

  assert.match(editor, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(editor, /Replace image/);
  assert.match(editor, /aria-label="Remove image"/);
  assert.doesNotMatch(editor, /Upload image <FutureLabel/);
  assert.match(workspace, /validateGuidedImageFile/);
  assert.match(workspace, /Image was not uploaded/);
  assert.match(workspace, /Save the draft to keep this image in the flow/);
  assert.match(adminRoute, /uploadAdminFlowImage/);
  assert.match(clientRoute, /uploadWaDashboardFlowImage/);
  assert.match(clientAdapter, /uploadWaDashboardImageTo\("\/flow-image", file\)/);
  assert.match(dashboardHandlers, /createDashboardFlowImageUploadHandlers/);
  assert.match(dashboardHandlers, /uploadWaFlowImage/);
  assert.match(dashboardStore, /file\.size <= 0/);
  assert.match(dashboardStore, /Image upload failed\. Try again\./);
  assert.doesNotMatch(dashboardStore, /const text = await response\.text\(\)/);
  assert.match(routeOne, /createDashboardFlowImageUploadHandlers\(\)/);
  assert.match(routeTwo, /createDashboardFlowImageUploadHandlers\("2"\)/);
});

function fixture(): CanonicalFlowDocument {
  return {
    schemaVersion: 2,
    startNodeId: "image",
    nodes: [
      {
        id: "image",
        type: "IMAGE_MESSAGE",
        title: "Product photo",
        messages: { en: "Photo" },
        mediaUrl: "https://example.com/original.png",
        mediaCaption: { en: "Saved caption" },
      },
      { id: "message", type: "MESSAGE", title: "Details", messages: { en: "Details" } },
    ],
    edges: [{ id: "edge-next", from: "image", to: "message" }],
  };
}
