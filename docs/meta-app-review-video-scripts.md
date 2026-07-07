# Meta App Review Video Scripts

## Video 1 - `whatsapp_business_messaging`

### Recording Steps

1. Open `/admin/app-review-demo`.
2. Sign in with the internal admin account if prompted.
3. Select an active WhatsApp connection.
4. Confirm the page shows the business, connection, phone number ID, WABA ID, status, and configured secrets.
5. Enter the test recipient WhatsApp number in E.164 format.
6. Type a clear demo message, for example: `Hello from our WhatsApp SaaS review demo.`
7. Click **Send WhatsApp message**.
8. Show the Meta success response and message ID on the page.
9. Show the recipient phone receiving the WhatsApp message.
10. Reply from the recipient phone with a readable message, for example: `Hello, I received this.`
11. Return to `/admin/app-review-demo`.
12. Click **Refresh**, or enable auto-refresh.
13. Show the inbound message event with the readable customer reply.
14. Show the latest webhook log for the same connection if useful.

### Narration

This demonstrates that our SaaS sends WhatsApp messages through the WhatsApp Cloud API, receives replies through the configured webhook, stores readable message events, and displays the activity in our internal dashboard for the connected business.

## Video 2 - `whatsapp_business_management`

### Recording Steps

1. Open `/admin/whatsapp-templates`.
2. Sign in with the internal admin account if prompted.
3. Select an active WABA connection.
4. Confirm the page shows the business, WABA ID, phone number ID, connection status, and configured secrets.
5. Enter a utility template name, or use the generated default.
6. Keep language as `en_US`.
7. Keep category as `UTILITY`.
8. Enter body text, for example: `Hello {{1}}, your order update from our demo platform is ready.`
9. Click **Create template in Meta**.
10. Show the sanitized Meta response and local stored template record.
11. Click **Fetch from Meta** if the access token can list templates.
12. Show the returned template list or the local submission list with status and Meta template ID.

### Narration

This demonstrates that our SaaS manages WhatsApp Business Platform assets for connected businesses by submitting WhatsApp message templates to Meta through the Graph API and storing the resulting template status in our platform.

## Pre-Recording Checklist

- `WHATSAPP_ACCESS_TOKEN` is configured for the selected connection suffix.
- `WHATSAPP_PHONE_NUMBER_ID` is configured for the selected connection suffix.
- `WHATSAPP_BUSINESS_ACCOUNT_ID` is configured for the selected connection suffix or stored on the connection.
- `WHATSAPP_VERIFY_TOKEN` is configured.
- `WHATSAPP_APP_SECRET` is configured.
- `SUPABASE_URL` is configured.
- `SUPABASE_SERVICE_ROLE_KEY` is configured.
- `WA_INTERNAL_ADMIN_PASSWORD` is configured.
- `WA_INTERNAL_ADMIN_SESSION_SECRET` is configured.
- `supabase/wa_meta_app_review_schema.sql` has been applied.
- The selected connection status is `ACTIVE`.
- The selected business is active.
