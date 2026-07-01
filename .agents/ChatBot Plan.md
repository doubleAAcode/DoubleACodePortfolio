# Milestone 1 — Store Bot Local Sandbox

We are building a multi-tenant WhatsApp ordering SaaS inside the existing Double A Code website.

Do not integrate Meta or WhatsApp yet. Create a local simulation that lets us build and test the ordering engine before API access is available.

## Important rules

* First inspect the existing project structure and stack.
* Reuse the current design system, components, authentication, database, and coding conventions where possible.
* Do not redesign or break the existing public website.
* Keep the SaaS dashboard isolated from the public portfolio.
* Do not run the development server.
* Do not deploy.
* Do not change DNS.
* Do not push or merge to `main`.
* Do not install unnecessary dependencies.
* Explain any required database migration before applying it.

## Goal

Create an internal test area where one test business can:

1. Manage categories.
2. Manage products.
3. Manage product variants.
4. Manage stock availability.
5. Simulate a customer WhatsApp conversation.
6. Complete a test order.
7. See the confirmed order in the dashboard.

## Routes

Use routes appropriate for the existing framework, preferably:

* `/dashboard`
* `/dashboard/categories`
* `/dashboard/products`
* `/dashboard/orders`
* `/dashboard/simulator`

Protect these routes if authentication already exists. Otherwise, use a temporary development-only guard and clearly mark it for replacement.

## Initial data models

### Business

* id
* name
* defaultLanguage
* supportedLanguages
* currency
* createdAt

### Category

* id
* businessId
* nameEnglish
* nameArabic
* isActive
* sortOrder

### Product

* id
* businessId
* categoryId
* code
* nameEnglish
* nameArabic
* descriptionEnglish
* descriptionArabic
* price
* imageUrl
* isActive

### ProductVariant

* id
* businessId
* productId
* variantType
* valueEnglish
* valueArabic
* stockQuantity
* isAvailable

### Order

* id
* businessId
* customerName
* customerPhone
* language
* status
* subtotal
* deliveryFee
* total
* deliveryAddress
* notes
* createdAt

### OrderItem

* id
* orderId
* productId
* productName
* selectedVariants
* quantity
* unitPrice
* totalPrice

### ConversationSession

* id
* businessId
* customerPhone
* language
* currentStep
* cart
* context
* lastCustomerMessageAt
* expiresAt

Every business-owned table must include `businessId`, even though Milestone 1 uses only one test business.

## Conversation simulator

Create a two-column simulator:

### Customer side

* Chat message history
* Text input
* Buttons representing WhatsApp reply options
* Reset conversation button

### Debug side

Show:

* Current conversation step
* Selected language
* Selected category
* Selected product
* Selected variants
* Cart
* Session expiration
* Raw state object

## Initial conversation flow

Implement this deterministic state machine:

```text
START
→ SELECT_LANGUAGE
→ MAIN_MENU
→ SELECT_CATEGORY
→ SELECT_PRODUCT
→ SELECT_VARIANTS
→ SELECT_QUANTITY
→ ADD_MORE_OR_CHECKOUT
→ COLLECT_CUSTOMER_NAME
→ COLLECT_PHONE
→ COLLECT_DELIVERY_ADDRESS
→ ORDER_SUMMARY
→ CONFIRM_ORDER
→ ORDER_CREATED
```

Requirements:

* Skip the variant step when a product has no variants.
* Never allow quantities above available stock.
* Support back, restart, main menu, and cancel commands.
* Recalculate prices and stock before order confirmation.
* Do not permanently reduce stock until the order is confirmed.
* Prevent duplicate order creation.
* Keep the engine separate from the simulator UI so Meta webhooks can use the same engine later.

Create a service interface similar to:

```ts
processIncomingMessage({
  businessId,
  customerPhone,
  message,
}): Promise<BotResponse>
```

The simulator must call this exact engine instead of containing conversation logic in the UI.

## Seed data

Create one test business with:

* English and Arabic enabled
* At least three categories
* At least six products
* Products with and without variants
* Size and colour examples
* One unavailable product
* One low-stock product

## Completion criteria

Milestone 1 is complete only when:

1. Products and categories can be added and edited.
2. The simulator reads live product data.
3. A full test order can be completed.
4. The confirmed order appears under `/dashboard/orders`.
5. Stock is reduced exactly once.
6. Restarting a conversation clears its temporary state.
7. Conversation logic is independent of WhatsApp and the simulator UI.
8. Existing website pages remain unchanged.

After completing the work, provide:

* Files created
* Files modified
* Database changes
* Architecture explanation
* Manual test instructions
* Known limitations

Stop after Milestone 1. Do not begin Meta integration or multi-tenant onboarding.



# Milestone 2 — WhatsApp Webhook Echo Test

We have an existing, deployed Double A Code website.

The goal of this milestone is only to connect Meta’s WhatsApp Cloud API test number to the existing website and prove that incoming messages can be received and answered.

## Important rules

* Inspect the existing project and framework first.
* Reuse the existing API/server structure.
* Do not redesign or modify public website pages.
* Do not hard-code secrets.
* Do not expose access tokens to the frontend.
* Do not push or merge to `main`.
* Do not begin the ordering engine yet.
* Do not add unnecessary dependencies.

## Environment variables

Use:

```env
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_VERIFY_TOKEN=
```

These will be added manually to local and hosting environment settings.

## Webhook route

Create a public route such as:

```text
/api/whatsapp/webhook
```

It must support:

### GET — Meta verification

Read:

* `hub.mode`
* `hub.verify_token`
* `hub.challenge`

When:

* `hub.mode === "subscribe"`
* `hub.verify_token` matches `WHATSAPP_VERIFY_TOKEN`

Return `hub.challenge` with HTTP 200.

Otherwise return HTTP 403.

### POST — Incoming events

* Accept WhatsApp webhook payloads.
* Immediately return HTTP 200.
* Safely handle payloads containing no message.
* Extract incoming text messages.
* Extract:

  * Meta message ID
  * sender WhatsApp number
  * phone number ID
  * message text
  * timestamp
* Log a sanitized development representation.
* Prevent duplicate processing using the Meta message ID.

## Echo response

When a customer sends a text message, send this reply through Meta’s Messages API:

```text
Received: {customer message}
```

Use:

```text
POST https://graph.facebook.com/{GRAPH_API_VERSION}/{WHATSAPP_PHONE_NUMBER_ID}/messages
```

Authorization:

```text
Bearer WHATSAPP_ACCESS_TOKEN
```

Do not expose the token in logs or error messages.

## Structure

Keep these responsibilities separate:

* Webhook verification
* Webhook payload parsing
* Duplicate-message protection
* WhatsApp message sending
* Future conversation engine integration

Create a reusable sending service similar to:

```ts
sendWhatsAppText({
  phoneNumberId,
  recipient,
  message,
}): Promise<SendResult>
```

## Completion checklist

The milestone is complete when:

1. Meta successfully verifies the callback URL.
2. The app is subscribed to the WhatsApp `messages` webhook field.
3. I send `Hello` to Meta’s test number.
4. The deployed website receives the webhook.
5. WhatsApp replies with `Received: Hello`.
6. Duplicate webhook delivery does not send duplicate replies.
7. No access token appears in source code, browser code, or logs.

After implementation, report:

* Files created
* Files modified
* Environment variables required
* Exact deployment steps
* Exact Meta dashboard configuration steps
* Manual test procedure

Stop after completing the echo test. Do not start the product ordering flow.


# Milestone 3 — Conversation Session, Language and Main Menu

The live WhatsApp echo test is working.

Replace the echo response with the first deterministic conversation flow.

## Goal

Implement:

```text
START
→ SELECT_LANGUAGE
→ MAIN_MENU
```

Do not build products, categories, cart, or ordering yet.

## Requirements

### 1. Conversation sessions

Create persistent conversation sessions containing:

* businessId
* customerPhone
* currentStep
* language
* context
* lastCustomerMessageAt
* expiresAt
* createdAt
* updatedAt

For now, use one seeded Double A test business.

Identify the customer using their WhatsApp sender number.

### 2. Session expiration

Set:

```text
expiresAt = lastCustomerMessageAt + 24 hours
```

Every customer message refreshes the expiration time.

When no active session exists, begin at `SELECT_LANGUAGE`.

### 3. Language selection

Send WhatsApp interactive buttons:

```text
Choose your language:

[English]
[العربية]
```

Accept:

* Button selections
* `English`
* `Arabic`
* `العربية`
* `1`
* `2`

Save the selected language in the session.

### 4. Main menu

After language selection, send:

English:

```text
How can we help?

[Place an order]
[Ask a question]
[Store information]
```

Arabic:

```text
كيف يمكننا مساعدتك؟

[تقديم طلب]
[طرح سؤال]
[معلومات المتجر]
```

Use WhatsApp interactive buttons where supported.

### 5. Global commands

Support at every step:

* `restart`
* `start`
* `menu`
* `إعادة`
* `القائمة`

`restart` clears the session and returns to language selection.

`menu` returns to the main menu while keeping the selected language.

### 6. Message handling

The engine must support:

* Text messages
* Interactive button replies
* Unknown message types without crashing
* Duplicate webhook events without duplicate replies

Keep WhatsApp parsing separate from the conversation engine.

Use an interface similar to:

```ts
processIncomingMessage({
  businessId,
  customerPhone,
  messageId,
  input: {
    type: "text" | "button",
    value: string,
  },
}): Promise<BotResponse[]>
```

### 7. Unknown input

If the response is invalid, repeat the current options.

Do not move the session to the next step until the input is valid.

### 8. Completion criteria

This milestone is complete when:

1. Sending `Hello` starts language selection.
2. Selecting English shows the English menu.
3. Selecting Arabic shows the Arabic menu.
4. The selected language survives later messages.
5. `restart` returns to language selection.
6. `menu` returns to the main menu.
7. Invalid text repeats the correct current question.
8. Duplicate webhook delivery does not create duplicate responses.
9. The public Double A website remains unchanged.

After implementation, report:

* Files changed
* Database changes
* Session storage approach
* Manual testing instructions
* Known limitations

Stop after the main menu works. Do not begin the product ordering flow.
