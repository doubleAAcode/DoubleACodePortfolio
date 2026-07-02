# WhatsApp Bot Reliability Test Plan

Use this plan after deploying the milestone 11 code and running `supabase/wa_reliability_hardening.sql`.

## Two-Customer Isolation

1. Use two verified WhatsApp numbers.
2. Customer A starts in English.
3. Customer B starts in Arabic.
4. Customer A selects one category/product and adds it to cart.
5. Customer B selects a different category/product and adds it to cart.
6. Continue checkout on both phones in parallel.
7. Confirm that language, cart, checkout details, order number, and replies never cross between customers.

Expected result: two independent `wa_conversation_sessions`, two independent orders, and no shared cart state.

## Final-Stock Concurrency

1. In the dashboard, set one product variant stock to `1`.
2. On Customer A and Customer B, add quantity `1` of that same variant.
3. On both phones, send the final checkout confirmation as close together as possible.
4. Open Supabase and check:
   - `wa_orders`
   - `wa_order_items`
   - `wa_stock_reservations`

Expected result: exactly one order/reservation succeeds. The second customer receives an unavailable/out-of-stock response. Stock never becomes negative and active reservations never exceed stock.

## Duplicate Webhook

1. Re-send the same Meta webhook payload with the same message ID.
2. Repeat for text, button, list, location, and checkout confirmation payloads.

Expected result: `wa_processed_messages` accepts the first message only. Duplicate payloads do not advance the session, add cart items, create orders, or send duplicate logical notifications.

## Duplicate Owner Actions

1. Open one pending order in two browser tabs.
2. Accept from both tabs quickly.
3. Repeat with reject, preparing, ready, out-for-delivery, completed, and cancel actions.

Expected result: only one real transition is recorded per status. Stock is committed once. Duplicate notification records are skipped by the uniqueness constraint.

## Reservation Expiration

1. Create a pending order with an active reservation.
2. Manually set the reservation `expires_at` in the past.
3. Try to accept the order.
4. Refresh the order page.

Expected result: acceptance fails safely, reservation becomes `EXPIRED`, stock is not deducted, and re-running expiration remains idempotent.

## Snapshot Integrity

1. Create an order.
2. Change the product name, code, price, option labels, and availability.
3. Re-open the old order.

Expected result: the old order still shows the saved order item snapshot, not the current catalog values.

## Diagnostics

1. Log in to the dashboard.
2. Request `/api/wa-dashboard/diagnostics`.
3. For partner setup, request `/api/wa-dashboard-2/diagnostics`.

Expected result: the endpoint returns sanitized status, counts, and integrity warnings only after dashboard authentication. It must not expose tokens, app secrets, service-role keys, full addresses, or raw credentials.
