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
