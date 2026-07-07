import test from "node:test";
import assert from "node:assert/strict";

import { parseWhatsAppMessageStatuses } from "../../src/lib/whatsapp/parser.server.ts";

test("parses WhatsApp delivery status webhooks", () => {
  const statuses = parseWhatsAppMessageStatuses({
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: "12345" },
              statuses: [
                {
                  id: "wamid.demo",
                  status: "failed",
                  timestamp: "1780000000",
                  recipient_id: "96171255749",
                  errors: [
                    {
                      code: 131026,
                      title: "Message undeliverable",
                      message: "Message failed to deliver.",
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
  });

  assert.equal(statuses.length, 1);
  assert.equal(statuses[0].messageId, "wamid.demo");
  assert.equal(statuses[0].phoneNumberId, "12345");
  assert.equal(statuses[0].recipient, "96171255749");
  assert.equal(statuses[0].status, "failed");
  assert.equal(statuses[0].errorCode, "131026");
  assert.equal(statuses[0].errorMessage, "Message failed to deliver.");
});
