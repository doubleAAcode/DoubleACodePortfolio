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


# Milestone 4 — Categories and Product Selection

The WhatsApp language selection, persistent session, and main menu are working.

Implement the first part of the ordering flow using seeded store data.

## Goal

Implement:

```text
MAIN_MENU
→ SELECT_CATEGORY
→ SELECT_PRODUCT
→ PRODUCT_DETAILS
```

Do not implement variants, quantity, cart, checkout, or dashboard management yet.

## Requirements

### 1. Seeded store data

Create one test business with at least:

* 3 categories
* 6 products
* English and Arabic names
* Product codes
* Prices
* Descriptions
* Active/inactive status
* Product images if supported
* One unavailable product

Example categories:

* Accessories
* Clothing
* Gifts

### 2. Main menu routing

When the customer selects:

```text
Place an order
```

or:

```text
تقديم طلب
```

move the session to `SELECT_CATEGORY`.

### 3. Category selection

Load active categories for the current business.

Send them using a WhatsApp list message when possible.

Include:

* Category name
* Category ID as the internal reply value
* Back to main menu option

Do not identify categories only by visible text.

### 4. Product selection

After category selection:

* Load active products in that category
* Show product name
* Show price
* Show product code
* Hide inactive products

Use a WhatsApp list message if the category contains multiple products.

### 5. Product details

After selecting a product, show:

* Product name
* Product code
* Description
* Price
* Availability

Example:

```text
Gold Necklace

Code: NCK-001
Price: $25
Available

A simple gold-plated necklace.

[Order this item]
[Back to products]
[Main menu]
```

Arabic content must use the Arabic product fields.

### 6. Unavailable products

If a product is unavailable:

* Clearly show that it is unavailable
* Do not show the order button
* Allow returning to products or the main menu

### 7. Session context

Store:

```ts
selectedCategoryId
selectedProductId
```

inside the session context.

Do not store only product or category names.

### 8. Input handling

Support:

* Interactive list replies
* Interactive button replies
* Product codes typed manually
* Category names typed manually
* `back`
* `menu`
* `restart`
* Arabic equivalents

Manual product-code matching must be case-insensitive.

### 9. WhatsApp limits

Handle categories or products exceeding WhatsApp list limits.

For now, implement simple pagination:

```text
Next page
Previous page
```

Do not silently hide products.

### 10. Separation of concerns

Keep separate:

* WhatsApp payload parsing
* Conversation state machine
* Product/category repository
* WhatsApp response formatting

The conversation engine must load products dynamically from the repository. Do not hard-code product names inside conversation logic.

### Completion criteria

This milestone is complete when:

1. “Place an order” shows categories.
2. Selecting a category shows its products.
3. Selecting a product shows its details.
4. Arabic mode shows Arabic category and product data.
5. Product codes can be typed manually.
6. Inactive products are hidden.
7. Unavailable products cannot proceed to ordering.
8. Back, menu, and restart work correctly.
9. Selected IDs persist in the session.
10. Duplicate webhook events do not cause duplicate replies.

After implementation, report:

* Files changed
* Database or seed changes
* Conversation states added
* Manual testing instructions
* Known limitations

Stop after product details work. Do not implement variants, quantity, cart, checkout, or dashboard CRUD.


# Milestone 5 — Product Options, Custom Fields, Quantity and Cart

Milestones 1–4 are working:

* Live WhatsApp webhook
* Persistent sessions
* English and Arabic
* Main menu
* Categories
* Products
* Product details

Implement the next ordering stage.

## Goal

Build this flow:

```text
PRODUCT_DETAILS
→ SELECT_PRODUCT_OPTIONS
→ COLLECT_CUSTOM_FIELDS
→ SELECT_QUANTITY
→ ADD_TO_CART
→ CART_MENU
```

Do not implement customer details, delivery, payment, final order creation, owner notifications, or stock deduction yet.

---

## 1. Product options

Products may have selectable options such as:

* Size
* Color
* Material
* Length

Options must be configured from data, not hard-coded in the conversation engine.

Suggested models:

### ProductOption

* id
* businessId
* productId
* nameEnglish
* nameArabic
* sortOrder
* isRequired

### ProductOptionValue

* id
* optionId
* valueEnglish
* valueArabic
* sortOrder

### ProductVariant

Represents the actual purchasable SKU combination.

* id
* businessId
* productId
* sku
* selectedOptionValueIds
* price
* stockQuantity
* isAvailable

Example:

```text
Product: T-Shirt

Options:
- Size: Small, Medium, Large
- Color: Black, White

Variant:
- Medium + Black
- SKU: SHIRT-M-BLK
- Price: $20
- Stock: 3
```

The engine must ask options in their configured order and resolve the final matching variant.

---

## 2. Custom product fields

Custom fields do not define stock.

Examples:

* Engraving text
* Gift message
* Special instructions
* Custom number

Suggested model:

### ProductCustomField

* id
* businessId
* productId
* type
* labelEnglish
* labelArabic
* placeholderEnglish
* placeholderArabic
* isRequired
* minimumLength
* maximumLength
* minimumValue
* maximumValue
* sortOrder

Initially support:

* `short_text`
* `long_text`
* `number`
* `yes_no`
* `single_choice`

Example:

```text
What name would you like engraved?

Customer:
Sarah
```

Save the answer against the cart item, not against the product.

---

## 3. Conversation states

Add states similar to:

```text
SELECT_PRODUCT_OPTION
COLLECT_CUSTOM_FIELD
SELECT_QUANTITY
CART_MENU
EDIT_CART_ITEM
REMOVE_CART_ITEM
```

Store temporary configuration inside the session context:

```ts
pendingItem: {
  productId,
  selectedOptionValueIds,
  resolvedVariantId,
  customFieldAnswers,
  quantity
}
```

Clear `pendingItem` after successfully adding it to the cart.

---

## 4. Dynamic question order

After the customer selects “Order this item”:

1. Load the product’s required options.
2. Ask each option in configured order.
3. Resolve the matching variant.
4. Check availability.
5. Ask configured custom fields.
6. Ask quantity.
7. Add the completed item to the cart.

Skip sections that do not apply.

Examples:

```text
Phone charger
→ Cable type
→ Quantity
```

```text
Custom necklace
→ Material
→ Chain length
→ Engraving text
→ Quantity
```

```text
Simple product
→ Quantity
```

---

## 5. Variant validation

After all options are selected:

* Resolve the exact variant.
* Confirm it exists.
* Confirm it is active.
* Confirm it is available.
* Confirm stock is greater than zero.
* Use the variant price when provided.
* Never trust prices supplied by WhatsApp input or session state.

If the selected combination is unavailable:

```text
That combination is currently unavailable.

[Choose different options]
[Back to product]
[Main menu]
```

---

## 6. Quantity handling

Allow quantity through buttons where practical and manual numeric input.

Validate:

* Integer only
* Minimum 1
* Cannot exceed current stock
* Cannot exceed a configurable per-order limit

If available stock is 3, quantity 4 must be rejected.

Do not permanently reduce stock during this milestone.

---

## 7. Cart structure

Each cart item must include:

```ts
{
  id,
  productId,
  variantId,
  productCode,
  productName,
  selectedOptions,
  customFieldAnswers,
  quantity,
  unitPrice,
  lineTotal
}
```

All totals must be calculated server-side.

Support multiple cart items.

---

## 8. Cart menu

After adding an item:

```text
Added to cart ✅

Gold Necklace
Material: Gold
Length: 45 cm
Engraving: Sarah
Quantity: 1
Total: $25

[Add another item]
[View cart]
[Checkout]
```

For this milestone, `Checkout` may move to a placeholder state and reply:

```text
Checkout will be implemented in the next milestone.
```

Do not collect delivery information yet.

---

## 9. View and manage cart

The customer must be able to:

* View all cart items
* See quantities and line totals
* See cart subtotal
* Remove an item
* Change an item’s quantity
* Clear the cart
* Continue shopping

When changing quantity, validate stock again.

Cart item actions must use internal IDs, not product names.

---

## 10. Navigation

Support:

* `back`
* `menu`
* `restart`
* `cart`
* `cancel`
* Arabic equivalents

Expected behavior:

* `back` returns to the previous option or question where possible.
* `cart` opens the cart.
* `restart` clears session and cart.
* `menu` returns to the main menu but preserves the cart.
* `cancel` cancels the current unfinished item but preserves existing cart items.

---

## 11. Arabic and English

All option names, values, custom-field labels, validation errors, cart summaries, and buttons must use the session language.

Customer-entered custom text must be preserved exactly as entered.

---

## 12. Separation of concerns

Keep separate:

* Conversation state machine
* Product option repository
* Variant resolver
* Custom-field validation
* Cart service
* WhatsApp response formatting

The engine must remain independent from WhatsApp-specific payload structures.

Suggested services:

```ts
resolveVariant(productId, selectedOptionValueIds)
validateCustomField(field, value)
addItemToCart(sessionId, pendingItem)
calculateCart(cart)
```

---

## Completion criteria

Milestone 5 is complete when:

1. A product with no options can be added to the cart.
2. A product with multiple options resolves the correct SKU.
3. Unavailable combinations are rejected.
4. Required custom text such as engraving is collected.
5. Invalid custom-field input is rejected.
6. Quantity cannot exceed available stock.
7. Multiple products can be added.
8. Cart totals are calculated correctly.
9. Items can be edited and removed.
10. Arabic and English flows both work.
11. Restart clears the cart.
12. Menu preserves the cart.
13. Duplicate webhook events do not add an item twice.
14. Stock is not permanently reduced yet.

After implementation, report:

* Files changed
* Database changes
* New conversation states
* How variants are resolved
* How custom fields are validated
* Manual test cases
* Known limitations

Stop after cart management works. Do not implement checkout or final order creation.



# Milestone 6 — Checkout and Order Creation

Milestones 1–5 are working:

* WhatsApp webhook
* Persistent sessions
* English and Arabic
* Categories and products
* Product options and custom fields
* Quantity and cart management

Implement checkout and final order creation.

## Goal

Implement:

```text
CART_MENU
→ CHECKOUT
→ COLLECT_CUSTOMER_NAME
→ SELECT_FULFILLMENT_METHOD
→ SELECT_DELIVERY_AREA
→ COLLECT_DELIVERY_ADDRESS
→ SELECT_PAYMENT_METHOD
→ COLLECT_ORDER_NOTES
→ REVIEW_ORDER
→ CONFIRM_ORDER
→ ORDER_CREATED
```

Do not build the owner dashboard or owner notifications yet.

---

## 1. Business checkout settings

Create configurable business settings for:

* Currency
* Allow delivery
* Allow pickup
* Pickup locations
* Delivery areas
* Delivery fee per area
* Minimum order amount
* Supported payment methods
* Order confirmation message
* Require owner approval

Do not hard-code these rules inside the conversation engine.

For the test business, support:

* Delivery
* Pickup
* Cash on delivery
* Cash on pickup

---

## 2. Customer details

Collect:

* Customer name
* WhatsApp phone number from the sender
* Optional alternate phone number
* Preferred language

Validate required fields before continuing.

Do not ask for the WhatsApp number again unless an alternate contact number is needed.

---

## 3. Fulfillment method

Ask:

```text
How would you like to receive your order?

[Delivery]
[Pickup]
```

Arabic:

```text
كيف تريد استلام طلبك؟

[توصيل]
[استلام من المتجر]
```

If pickup is selected:

* Show configured pickup locations
* Skip delivery area and address questions

If delivery is selected:

* Ask for delivery area
* Calculate the configured delivery fee
* Ask for the full address

---

## 4. Delivery address

Initially support:

* Manual text address
* WhatsApp location message when received

Store both when available:

```ts
deliveryAddress
deliveryLatitude
deliveryLongitude
```

If the message type is unsupported, repeat the address request without crashing.

---

## 5. Payment method

Load payment methods from business settings.

Initially support:

* Cash on delivery
* Cash on pickup

Only show payment methods valid for the selected fulfillment method.

Do not implement online payments yet.

---

## 6. Order notes

Ask for optional order notes:

```text
Would you like to add any notes?

[No notes]
```

Also accept free text.

Examples:

* Call before delivery
* Gift packaging
* Deliver after 5 PM

Product-specific custom fields such as engraving must remain attached to their cart items, not placed only in general order notes.

---

## 7. Final order review

Before confirmation, reload and validate all cart data from the database.

Display:

* Each item
* Selected options
* Custom-field answers
* Quantity
* Unit price
* Line total
* Subtotal
* Delivery fee
* Final total
* Customer name
* Fulfillment method
* Address or pickup location
* Payment method
* Notes

Provide:

```text
[Confirm order]
[Edit cart]
[Cancel checkout]
```

Never trust prices or totals stored only in session state.

---

## 8. Stock reservation

Do not permanently reduce stock when checkout starts.

When the customer confirms:

1. Recheck every variant’s current stock.
2. Create the order and stock reservations in one database transaction.
3. Reserve the ordered quantities.
4. Prevent other customers from ordering reserved stock.
5. Do not permanently deduct stock yet.
6. Final deduction will happen when the owner accepts the order in a later milestone.

Suggested model:

### StockReservation

* id
* businessId
* orderId
* productVariantId
* quantity
* status
* expiresAt
* createdAt

Statuses:

```text
ACTIVE
COMMITTED
RELEASED
EXPIRED
```

If stock changed before confirmation, explain which item is unavailable and return the customer to the cart.

---

## 9. Order model

Create or complete these models:

### Order

* id
* businessId
* orderNumber
* customerName
* customerPhone
* alternatePhone
* language
* status
* fulfillmentMethod
* deliveryAreaId
* deliveryAddress
* deliveryLatitude
* deliveryLongitude
* pickupLocationId
* paymentMethod
* notes
* subtotal
* deliveryFee
* total
* createdAt
* updatedAt

### OrderItem

* id
* orderId
* productId
* variantId
* productCode
* productName
* selectedOptions
* customFieldAnswers
* quantity
* unitPrice
* lineTotal

Initial order status:

```text
PENDING_OWNER_CONFIRMATION
```

Generate a human-readable order number such as:

```text
DA-000001
```

The database ID and public order number must be separate.

---

## 10. Idempotency

The same WhatsApp webhook or confirmation action must never create two orders.

Use:

* Incoming Meta message ID
* Session checkout state
* Database uniqueness or idempotency key

Order creation, order items, and stock reservations must happen atomically.

---

## 11. Confirmation response

After successful creation:

```text
Order received ✅

Order: DA-000001
Total: $42

The store will review and confirm your order shortly.
```

Arabic content must be localized.

After order creation:

* Clear the cart
* Clear pending checkout data
* Preserve language
* Return the session to a completed-order state
* Allow starting another order

Do not say that the order is accepted yet.

---

## 12. Cancellation behavior

Before confirmation:

* `cancel` exits checkout
* Cart remains available

After confirmation:

* Do not delete the order through normal restart/menu commands
* Tell the customer that cancellation support will be added later
* Preserve the created order

---

## 13. Conversation states

Add states similar to:

```text
COLLECT_CUSTOMER_NAME
SELECT_FULFILLMENT_METHOD
SELECT_DELIVERY_AREA
SELECT_PICKUP_LOCATION
COLLECT_DELIVERY_ADDRESS
SELECT_PAYMENT_METHOD
COLLECT_ORDER_NOTES
REVIEW_ORDER
CONFIRM_ORDER
ORDER_CREATED
```

Store temporary checkout information under:

```ts
checkout: {
  customerName,
  alternatePhone,
  fulfillmentMethod,
  deliveryAreaId,
  deliveryAddress,
  deliveryLatitude,
  deliveryLongitude,
  pickupLocationId,
  paymentMethod,
  notes
}
```

---

## 14. Completion criteria

Milestone 6 is complete when:

1. A cart can proceed to checkout.
2. Delivery and pickup follow different routes.
3. Delivery fees are loaded from business settings.
4. Customer details are stored correctly.
5. Cash payment options work.
6. Final totals are recalculated server-side.
7. Out-of-stock changes are caught before confirmation.
8. One confirmation creates exactly one order.
9. Stock is reserved but not permanently deducted.
10. The customer receives an order number.
11. The cart is cleared only after successful order creation.
12. Arabic and English checkout both work.
13. Cancel checkout preserves the cart.
14. Duplicate webhook delivery cannot duplicate the order.

After implementation, report:

* Files changed
* Database migrations
* Conversation states added
* Checkout validation approach
* Stock reservation approach
* Order idempotency approach
* Manual test cases
* Known limitations

Stop after the customer can create a pending order. Do not build the owner dashboard, notifications, or order acceptance yet.
