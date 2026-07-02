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




# Milestone 7 — Supabase Catalog and Business Settings

Move all hardcoded data into Supabase:

Categories
Products
Product options
Option values
Variants and stock
Custom product fields
Delivery areas and fees
Pickup locations
Payment methods
Business language/currency/settings

Then update the bot engine so it reads everything dynamically from Supabase.

After that, the next milestones are:

Owner dashboard CRUD
Orders dashboard
Accept/reject orders
Commit or release stock reservations
Customer order-status messages
Owner notifications
Multi-business isolation
Client onboarding
WhatsApp Catalog integration later
AI only in Phase 2


# # Milestone 8 — Owner Dashboard: Catalog and Store Settings

The WhatsApp bot now reads its catalog and checkout settings dynamically from Supabase.

Build a protected owner dashboard inside the existing Double A Code website.

## Goal

Allow the test business owner to manage:

* Categories
* Products
* Product options and values
* Variants, prices and stock
* Product custom fields
* Delivery areas and fees
* Pickup locations
* Payment methods
* General store settings

Changes must affect the WhatsApp bot immediately without redeployment.

## Routes

Use the existing project conventions, preferably:

```text
/dashboard
/dashboard/categories
/dashboard/products
/dashboard/delivery
/dashboard/settings
```

Do not modify the public website design.

## Authentication

* Protect all dashboard routes.
* Use the existing authentication system if available.
* Otherwise add Supabase Auth with email/password.
* Every query and mutation must be scoped using `businessId`.
* Do not rely only on frontend filtering for business isolation.

For this milestone, one seeded test business is enough.

## Dashboard overview

Show:

* Active categories
* Active products
* Low-stock variants
* Unavailable products
* Delivery areas
* Recent configuration changes if available

Do not build order management yet.

## Categories

Allow:

* Create
* Edit English and Arabic names
* Activate/deactivate
* Change display order
* Delete only when safe

Prevent accidental deletion when products still belong to the category.

## Products

Allow:

* Create and edit products
* Select category
* English and Arabic names/descriptions
* Product code
* Base price
* Image
* Active/inactive status
* Available/unavailable status

Product codes must be unique within the business.

## Product images

Use Supabase Storage.

Requirements:

* Upload image
* Preview image
* Replace image
* Remove image
* Validate file type and reasonable file size
* Store only the resulting path/URL in product data

Do not store image files directly in database rows.

## Options and variants

For each product, allow configuration of:

* Option groups such as Size, Color, Material and Length
* English and Arabic option names
* Option values
* Display order
* Optional image URL for option values
* Required/optional status

Allow variant management:

* SKU
* Selected option values
* Price override
* Stock quantity
* Available/unavailable status

Prevent duplicate option combinations.

## Custom fields

Allow product-specific fields:

* Short text
* Long text
* Number
* Yes/no
* Single choice

Configuration must include:

* English and Arabic labels
* Required status
* Validation rules
* Display order
* Choice values where applicable

Examples:

* Engraving name
* Gift message
* Gift wrapping

## Delivery settings

Allow management of:

* Delivery enabled
* Pickup enabled
* Delivery areas
* Delivery fee per area
* Pickup locations
* Minimum order amount
* Currency

## Payment methods

Allow:

* Create and edit payment methods
* English and Arabic labels
* Delivery eligibility
* Pickup eligibility
* Active/inactive status
* Display order

For now, continue supporting cash methods only.

## Bot compatibility

All dashboard writes must use the same Supabase tables and schemas already used by the bot.

After saving changes:

* New categories appear in WhatsApp
* Updated prices appear in WhatsApp
* Unavailable variants cannot be ordered
* Updated delivery fees affect checkout
* Disabled payment methods disappear

Do not duplicate catalog data into frontend-only state.

## Validation

Validate both client-side and server-side:

* Required fields
* Non-negative prices
* Non-negative stock
* Unique product codes
* Unique SKUs
* Unique variant combinations
* Valid delivery fees
* At least one supported language field
* Safe deletion rules

## User experience

Include:

* Loading states
* Empty states
* Confirmation before destructive actions
* Clear success and error messages
* Mobile-friendly dashboard layout
* Arabic field support
* Search and filters for products

## Completion criteria

Milestone 8 is complete when:

1. Owner can log in securely.
2. Categories can be created and edited.
3. Products can be created and edited.
4. Images can be uploaded.
5. Options, variants and stock can be managed.
6. Custom fields can be configured.
7. Delivery areas and fees can be managed.
8. Pickup locations can be managed.
9. Payment methods can be managed.
10. Every query is scoped by `businessId`.
11. Dashboard changes immediately affect the live WhatsApp flow.
12. Existing public website pages remain unchanged.

After implementation, report:

* Files created
* Files modified
* Database changes
* Storage bucket configuration
* Authentication approach
* Business isolation approach
* Manual test instructions
* Known limitations

Stop after catalog and store-settings management works.

Do not build:

* Order management
* Owner notifications
* Client self-onboarding
* Subscription billing
* WhatsApp Catalog synchronization
* AI features


# # Milestone 9 — Orders Dashboard, Accept and Reject

The owner dashboard, catalog management, and business settings are working.

Confirmed WhatsApp orders are already stored in Supabase with:

* Order status `PENDING_OWNER_CONFIRMATION`
* Order items
* Active stock reservations
* Customer and checkout details

Build the owner order-management flow.

## Important rules

* Inspect and reuse the current dashboard architecture.
* Do not modify public website pages.
* Do not deploy.
* Do not push or merge to `main`.
* Keep all sensitive Supabase operations server-side.
* Every query and mutation must be scoped by `businessId`.
* Order acceptance and stock changes must be transactional.
* Repeated clicks or requests must never deduct stock twice.

---

## Goal

Implement:

```text
New WhatsApp order
→ Appears in owner dashboard
→ Owner opens order
→ Owner accepts or rejects
→ Stock reservation is committed or released
→ Customer receives the correct update when possible
```

---

## Routes

Use:

```text
/dashboard/orders
/dashboard/orders/[orderId]
```

---

## 1. Orders list

Show:

* Order number
* Customer name
* Customer phone
* Created time
* Item count
* Fulfillment method
* Total
* Order status
* Reservation status

Add filters for:

* Pending
* Accepted
* Rejected
* All

Default to pending orders.

Add:

* Loading state
* Empty state
* Error state
* New-order badge
* Mobile-friendly layout

Use Supabase Realtime if appropriate so new orders appear without refreshing.

---

## 2. Order details

Show the full saved order snapshot:

### Customer

* Name
* WhatsApp phone
* Alternate phone if present
* Language

### Items

For every item show:

* Product name
* Product code
* Variant/SKU
* Selected options
* Custom-field answers
* Quantity
* Unit price
* Line total

### Fulfillment

* Delivery or pickup
* Delivery area
* Address
* Shared latitude/longitude if available
* Pickup location

### Payment

* Payment method

### Totals

* Subtotal
* Delivery fee
* Final total

### Additional information

* Customer notes
* Order creation time
* Current status
* Stock reservation status and expiration

The dashboard must display the saved order snapshot, not current product names or prices that may have changed later.

---

## 3. Accept order

Add an `Accept order` action only for:

```text
PENDING_OWNER_CONFIRMATION
```

Acceptance must happen through one atomic Supabase RPC/database transaction.

The transaction must:

1. Lock or safely validate the order.
2. Confirm the order still belongs to the current business.
3. Confirm the order is still pending.
4. Confirm all reservations are `ACTIVE`.
5. Confirm reservations have not expired.
6. Confirm sufficient reserved quantities exist.
7. Deduct the reserved quantities from actual variant stock.
8. Change reservation status to `COMMITTED`.
9. Change order status to `ACCEPTED`.
10. Save `acceptedAt`.
11. Prevent the same order from being accepted twice.

If the transaction fails, do not partially change stock or status.

---

## 4. Reject order

Allow the owner to select or type an optional rejection reason.

Examples:

* Item unavailable
* Cannot deliver to area
* Store closed
* Customer request
* Other

Rejection must happen atomically:

1. Confirm the order belongs to the current business.
2. Confirm it is still pending.
3. Change order status to `REJECTED`.
4. Save the reason and `rejectedAt`.
5. Change active reservations to `RELEASED`.
6. Do not deduct actual stock.
7. Prevent repeated rejection actions from changing stock.

---

## 5. Reservation expiration

Implement safe handling for expired reservations.

Requirements:

* Expired reservations cannot be accepted.
* Expired active reservations must become `EXPIRED`.
* Reserved quantities must become available again.
* The order should show that stock reservation expired.
* The owner may reject the order or ask the customer to place it again.

Create an idempotent database function or server process for releasing expired reservations.

Do not build a complex background-worker system unless the project already has one.

---

## 6. Customer WhatsApp update

After acceptance, send:

```text
Your order DA-000001 has been accepted ✅

The store is now preparing your order.
```

After rejection, send:

```text
Unfortunately, order DA-000001 could not be accepted.

Reason: {reason}
```

Arabic versions must be supported.

Rules:

* Send the message only after the database transaction succeeds.
* Notification failure must not undo the order decision.
* Log notification success or failure.
* Do not send duplicate customer updates.
* If a normal message cannot legally be sent because the customer-service window is closed, do not force-send it.
* Record that a template notification is required for a later milestone.

---

## 7. Audit information

Store or log:

* Who accepted or rejected the order
* Previous status
* New status
* Decision timestamp
* Rejection reason
* Customer-notification result

Use the authenticated dashboard user ID where available.

---

## 8. Security

* Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
* Validate authenticated business ownership server-side.
* Do not accept `businessId` from the browser without verifying it.
* Prevent one business from reading or changing another business’s orders.
* Validate every status transition server-side.

---

## 9. User experience

Pending order page:

```text
Order DA-000001
Pending owner confirmation

[Accept order]
[Reject order]
```

After acceptance:

```text
Order accepted ✅
Stock committed
Customer notification sent
```

After rejection:

```text
Order rejected
Stock reservation released
```

Disable buttons while requests are in progress.

Require confirmation before accepting or rejecting.

---

## Completion criteria

Milestone 9 is complete when:

1. New WhatsApp orders appear in `/dashboard/orders`.
2. The owner can view complete order details.
3. Accepting deducts stock exactly once.
4. Accepting changes reservations to `COMMITTED`.
5. Rejecting releases reservations without deducting stock.
6. Repeated actions cannot change stock twice.
7. Expired reservations cannot be accepted.
8. Business isolation is enforced server-side.
9. The customer receives an accepted/rejected update when allowed.
10. Notification failure does not corrupt the order.
11. Arabic and English messages work.
12. New pending orders appear without a manual page refresh where supported.
13. Existing catalog and WhatsApp ordering flows remain working.

After completion, report:

* Files created
* Files modified
* Database migrations
* RPC functions added
* Status-transition logic
* Stock-commit logic
* Reservation-release logic
* Customer-notification behavior
* Manual test cases
* Known limitations

Stop after accept/reject order management works.

Do not implement yet:

* Full preparing/out-for-delivery workflow
* WhatsApp owner notifications
* Client onboarding
* Subscription billing
* Meta Embedded Signup
* WhatsApp Catalog synchronization
* AI features


# # Milestone 10 — Complete Order Lifecycle

The current WhatsApp commerce system already supports:

* Customer checkout and pending-order creation
* Orders visible in the owner dashboard
* Owner acceptance and rejection
* Stock reservation commit/release
* Customer acceptance/rejection messages
* Supabase persistence
* Business-scoped data
* Arabic and English

Implement the complete post-order lifecycle.

## Important rules

* Inspect and reuse the existing order architecture.
* Do not rewrite working checkout or accept/reject behavior unnecessarily.
* Do not modify public website pages.
* Do not deploy.
* Do not push or merge to `main`.
* All status changes must be validated server-side.
* Every query and mutation must be scoped by the authenticated `businessId`.
* Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
* Repeated requests must not create duplicate status changes or messages.

---

## Goal

Support this lifecycle:

```text
PENDING_OWNER_CONFIRMATION
→ ACCEPTED
→ PREPARING
→ READY
→ OUT_FOR_DELIVERY
→ COMPLETED
```

Also support terminal states:

```text
REJECTED
CANCELLED
```

Pickup orders may use:

```text
PENDING_OWNER_CONFIRMATION
→ ACCEPTED
→ PREPARING
→ READY
→ COMPLETED
```

Pickup orders must not require `OUT_FOR_DELIVERY`.

---

## 1. Valid status transitions

Create a single server-side transition map.

Example:

```ts
const allowedTransitions = {
  PENDING_OWNER_CONFIRMATION: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};
```

Additional rules:

* `READY → COMPLETED` is valid for pickup.
* `READY → OUT_FOR_DELIVERY` is valid for delivery.
* `OUT_FOR_DELIVERY` must not be available for pickup orders.
* Terminal states cannot transition again.
* Invalid transitions must return a clear error.
* The browser must not decide whether a transition is valid.

---

## 2. Database fields

Add or confirm these fields on orders:

* status
* acceptedAt
* preparingAt
* readyAt
* outForDeliveryAt
* completedAt
* rejectedAt
* cancelledAt
* rejectionReason
* cancellationReason
* updatedAt

Do not overwrite existing timestamps once set.

---

## 3. Atomic status transition

Create one server-side service or Supabase RPC for post-acceptance transitions.

Suggested interface:

```ts
transitionOrderStatus({
  orderId,
  targetStatus,
  reason?,
  authenticatedUserId,
});
```

The transaction must:

1. Load and lock the order safely.
2. Confirm it belongs to the authenticated business.
3. Confirm the current status.
4. Validate the requested transition.
5. Validate fulfillment-specific rules.
6. Update the status.
7. Set the relevant timestamp.
8. Create an audit record.
9. Return the updated order.
10. Prevent duplicate transitions.

Acceptance and rejection may continue using their existing transactional functions if already reliable.

---

## 4. Order audit log

Create or use an order-status history table.

Suggested model:

### `wa_order_status_history`

* id
* businessId
* orderId
* previousStatus
* newStatus
* reason
* changedByUserId
* source
* createdAt

Supported sources:

```text
OWNER_DASHBOARD
SYSTEM
CUSTOMER
ADMIN
```

Every successful status change must create exactly one history record.

---

## 5. Dashboard order actions

Update the order details page so it shows only valid actions.

Examples:

### Accepted order

```text
Order accepted

[Start preparing]
[Cancel order]
```

### Preparing order

```text
Preparing

[Mark ready]
[Cancel order]
```

### Ready delivery order

```text
Ready

[Out for delivery]
[Cancel order]
```

### Ready pickup order

```text
Ready for pickup

[Mark completed]
[Cancel order]
```

### Out-for-delivery order

```text
Out for delivery

[Mark completed]
[Cancel order]
```

Requirements:

* Disable actions while requests are running.
* Require confirmation for cancellation and completion.
* Require a cancellation reason.
* Show clear success and error messages.
* Refresh the order after successful changes.
* Realtime updates should appear where supported.

---

## 6. Orders list

Update `/dashboard/orders` to support:

* Pending
* Accepted
* Preparing
* Ready
* Out for delivery
* Completed
* Rejected
* Cancelled
* All

Show:

* Order number
* Customer
* Created time
* Fulfillment type
* Total
* Current status
* Last status update

Add clear status badges.

Default view may remain pending orders.

---

## 7. Customer WhatsApp messages

After each successful transition, send the appropriate message when legally allowed.

### Preparing

English:

```text
Your order {orderNumber} is now being prepared.
```

Arabic:

```text
يتم الآن تحضير طلبك {orderNumber}.
```

### Ready for pickup

English:

```text
Your order {orderNumber} is ready for pickup ✅
```

Arabic:

```text
طلبك {orderNumber} جاهز للاستلام ✅
```

### Out for delivery

English:

```text
Your order {orderNumber} is out for delivery 🚚
```

Arabic:

```text
طلبك {orderNumber} أصبح في طريقه إليك 🚚
```

### Completed

English:

```text
Order {orderNumber} has been completed. Thank you for your order.
```

Arabic:

```text
تم إكمال الطلب {orderNumber}. شكرًا لطلبك.
```

### Cancelled

English:

```text
Order {orderNumber} has been cancelled.

Reason: {reason}
```

Arabic:

```text
تم إلغاء الطلب {orderNumber}.

السبب: {reason}
```

---

## 8. WhatsApp 24-hour window handling

Before sending a free-form customer message:

1. Load the conversation session.
2. Check `lastCustomerMessageAt`.
3. Calculate whether the 24-hour service window is still open.
4. Send the normal message only when allowed.

When the window is closed:

* Do not force-send a free-form message.
* Do not fail the status transition.
* Record notification state as `TEMPLATE_REQUIRED`.
* Save the intended notification type for future template support.

Suggested notification statuses:

```text
PENDING
SENT
FAILED
TEMPLATE_REQUIRED
SKIPPED
```

---

## 9. Notification records

Create or use a notification table.

Suggested model:

### `wa_order_notifications`

* id
* businessId
* orderId
* customerPhone
* orderStatus
* messageType
* language
* status
* metaMessageId
* errorCode
* errorMessage
* createdAt
* sentAt

Requirements:

* One notification per order/status/message type.
* Add a database uniqueness constraint where appropriate.
* Duplicate dashboard requests must not send duplicate WhatsApp messages.
* Notification failure must not revert the order status.
* Never store access tokens or secrets.

---

## 10. Cancellation behavior

Owner cancellation must:

* Require a reason.
* Be valid only from configured non-terminal states.
* Not restore stock that was already committed unless the current inventory design explicitly supports returns.
* Record the cancellation in order history.
* Notify the customer when possible.

Important:

Acceptance already commits reserved stock.

Therefore, cancellation after acceptance must not silently increase stock unless an explicit restock action is implemented.

For this milestone:

* Do not automatically restock accepted-order cancellations.
* Clearly record `restockRequired` or equivalent when relevant.
* Show this warning to the owner.

Do not implement returns or refunds yet.

---

## 11. Completed orders

When marking an order completed:

* Require confirmation.
* Save `completedAt`.
* Prevent further transitions.
* Do not change stock again.
* Do not modify the saved order snapshot.
* Create the audit record.
* Send the customer message when allowed.

---

## 12. Order timeline

On the order details page, show a timeline:

```text
Order created
Accepted
Preparing
Ready
Out for delivery
Completed
```

Each entry should show:

* Status
* Timestamp
* User or system that changed it
* Optional reason

Rejected and cancelled orders should show their reason clearly.

---

## 13. Security

Confirm:

* Order ownership is validated server-side.
* Authenticated users can access only their business orders.
* Status cannot be changed directly from the browser database client.
* Service-role operations remain server-side.
* Transition targets are validated against an allowlist.
* Reasons are sanitized and length-limited.
* Meta errors do not expose secrets.

---

## 14. Completion criteria

Milestone 10 is complete when:

1. Accepted orders can move to preparing.
2. Preparing orders can move to ready.
3. Delivery orders can move from ready to out for delivery.
4. Pickup orders can move from ready directly to completed.
5. Out-for-delivery orders can move to completed.
6. Valid cancellations work with a required reason.
7. Invalid transitions are rejected server-side.
8. Terminal orders cannot be modified.
9. Every transition creates one audit-history entry.
10. The dashboard shows a complete order timeline.
11. The customer receives status updates inside the open 24-hour window.
12. Closed-window updates are recorded as `TEMPLATE_REQUIRED`.
13. Notification failures do not revert order status.
14. Duplicate requests do not send duplicate messages.
15. Stock is not deducted more than once.
16. Accepted-order cancellations do not automatically restock.
17. Arabic and English messages both work.
18. Existing checkout, accept/reject, catalog, and dashboard functionality remain working.

After implementation, report:

* Files created
* Files modified
* Database migrations
* RPCs or server actions added
* Valid transition map
* Audit-history implementation
* Notification deduplication approach
* 24-hour window handling
* Cancellation and stock behavior
* Manual test cases
* Known limitations

Stop after the complete order lifecycle works.

Do not implement yet:

* Owner WhatsApp alerts
* Delivery-driver management
* Returns or refunds
* Automatic restocking
* Subscription billing
* Meta Embedded Signup
* WhatsApp Catalog synchronization
* Workflow builder
* AI features



# # Milestone 11 — Reliability, Concurrency and Data Integrity Hardening

The deterministic WhatsApp commerce system is working end to end:

* WhatsApp webhook and replies
* Persistent sessions
* Products, variants and custom fields
* Cart and checkout
* Stock reservations
* Order creation
* Owner dashboard
* Accept/reject
* Complete order lifecycle
* Customer status notifications
* Arabic and English
* Supabase persistence
* Two separate Meta test setups

Do not add new product features in this milestone.

The goal is to prove that the existing system remains correct under simultaneous users, duplicate requests, retries, failures and malicious cross-business access.

## Important rules

* Inspect the existing architecture before changing anything.
* Preserve all working behavior.
* Do not redesign public website pages.
* Do not deploy.
* Do not push or merge to `main`.
* Do not add AI, voice, billing, onboarding or workflow-builder features.
* Do not expose Supabase service-role credentials to the browser.
* Prefer database constraints and transactions over frontend checks.
* Every operation must remain scoped by the authenticated business.
* Do not hide errors with empty catch blocks.

---

## Goal

Prove the following statement:

> Duplicate webhooks, simultaneous customers, repeated owner actions, API failures and server restarts cannot duplicate orders, corrupt stock, leak tenant data or send duplicate notifications.

---

# 1. Automated test foundation

Add automated tests around the critical business services.

Use the testing tools already available in the project. Do not add a large testing framework unless necessary.

Tests should cover:

* Conversation session creation
* Conversation session loading
* Cart updates
* Variant resolution
* Stock validation
* Order total calculation
* Order creation
* Stock reservation
* Order acceptance
* Order rejection
* Status transitions
* Notification deduplication
* Business isolation

Separate:

* Unit tests
* Database/RPC integration tests
* End-to-end simulation tests

Do not require real WhatsApp messages for every automated test.

---

# 2. Concurrent final-stock test

Create a repeatable test for this scenario:

```text
Variant stock: 1

Customer A confirms quantity 1
Customer B confirms quantity 1
Both requests arrive nearly simultaneously
```

Expected result:

* Only one active reservation/order succeeds.
* The other request receives an out-of-stock result.
* Stock never becomes negative.
* Reserved quantity never exceeds available stock.
* No partial order or orphan order item is created.
* The result remains correct across repeated test runs.

The reservation and order creation transaction must use database-level concurrency protection.

Do not rely on:

```text
Read stock
→ Check in application code
→ Update later
```

without database locking or an equivalent atomic strategy.

---

# 3. Multiple simultaneous customers

Test at least two different WhatsApp sender numbers against the same business.

Verify that each customer has an independent:

* Language
* Current conversation step
* Selected category
* Selected product
* Pending item
* Cart
* Checkout data
* Order
* Notification history

One customer must never receive or modify another customer’s state.

Session uniqueness should be based on appropriate identifiers such as:

```text
businessId + customerPhone
```

or the existing equivalent.

---

# 4. Duplicate webhook protection

Meta may deliver the same webhook more than once.

Verify that the same incoming Meta message ID:

* Is processed only once.
* Does not advance the conversation twice.
* Does not add the same item twice.
* Does not confirm two orders.
* Does not send two replies.
* Remains protected after a redeployment or server restart.

Use persistent database-backed idempotency.

Do not depend only on in-memory caches.

Test duplicates for:

* Text messages
* Button replies
* List replies
* Checkout confirmation
* Location messages
* Unsupported message types

---

# 5. Duplicate order confirmation

Test repeated confirmation attempts using:

* Same Meta message ID
* Different requests with the same checkout state
* Double-click or rapid repeated owner/customer action
* Network retry after an unclear response

Expected result:

* One order
* One set of order items
* One set of stock reservations
* One public order number
* One customer confirmation message

Add or verify appropriate database uniqueness constraints and idempotency keys.

---

# 6. Duplicate owner actions

Test repeated owner actions:

* Accept twice
* Reject twice
* Accept and reject simultaneously
* Mark preparing twice
* Mark ready twice
* Mark completed twice
* Send repeated identical API requests

Expected result:

* Stock is committed once.
* Reservations transition once.
* One status-history entry is created per real transition.
* Customer notifications are sent once.
* Invalid repeated transitions return a safe result.
* No order can be both accepted and rejected.

---

# 7. Reservation expiration

Verify expired reservation behavior.

Test:

```text
Order pending
→ Reservation expires
→ Owner attempts to accept
```

Expected result:

* Acceptance is rejected safely.
* Reservation becomes `EXPIRED`.
* Reserved quantity becomes available again.
* Stock is not deducted.
* Order clearly displays expired reservation status.
* Re-running expiration logic causes no duplicate changes.

Create an idempotent expiration function or job-compatible service.

For now, it may be triggered manually or by a safe scheduled endpoint, but the logic itself must be production-ready.

---

# 8. Stock integrity audit

Add a diagnostic service or protected internal report that checks for:

* Negative stock
* Active reservations exceeding stock
* Committed reservations on unaccepted orders
* Accepted orders with active reservations
* Rejected orders with committed reservations
* Orphan reservations
* Orphan order items
* Duplicate variant combinations
* Duplicate product codes or SKUs within one business

The report must be read-only unless an explicit repair action is later implemented.

Do not silently repair production data.

---

# 9. Failure handling

Simulate failures at critical points.

Test failures during:

* Supabase session read
* Session write
* Order transaction
* Reservation creation
* Order acceptance
* Status transition
* WhatsApp send request
* Notification record creation
* Product/catalog loading

Expected behavior:

* No partial financial or stock state.
* No duplicate retry side effects.
* User receives a safe fallback message where possible.
* Errors are logged with correlation information.
* Secrets are never logged.
* Failed WhatsApp notifications do not revert successful order changes.
* Failed order transactions do not clear the customer cart.

---

# 10. WhatsApp API timeout and retry behavior

Harden outgoing WhatsApp sending.

Requirements:

* Use reasonable request timeouts.
* Parse and record Meta error responses safely.
* Do not retry permanent validation errors.
* Allow controlled retries for temporary network or server failures.
* Never send the same logical notification twice.
* Use notification idempotency records.
* Record:

  * pending
  * sent
  * failed
  * retryable
  * template required
  * skipped

Do not implement a complex distributed queue unless the project already uses one.

Create a design that can later move into a queue without rewriting business logic.

---

# 11. Conversation recovery

Verify sessions survive:

* Vercel deployment
* Server restart
* Different serverless instance handling the next message
* Temporary Supabase failure
* Customer returning within 24 hours
* Customer returning after session expiration

Expected behavior:

* Active sessions continue from the correct step.
* Expired sessions start safely.
* Existing confirmed orders remain untouched.
* Cart recovery follows the current intended rules.
* A customer is not returned to an invalid node/state.

Add session-schema validation when loading stored context.

If stored session data is malformed, recover safely and log the issue.

---

# 12. Order snapshot integrity

Verify that changing current catalog data does not modify old orders.

After order creation, change:

* Product name
* Product price
* Product code
* Variant name
* Option labels
* Delivery fee
* Product availability

The old order must continue showing the original saved values.

Order details must use the saved order snapshot, not current catalog data.

---

# 13. Business and tenant isolation

Perform explicit cross-business tests.

Using Business A and Business B:

* Business A user cannot read Business B products.
* Business A user cannot read Business B orders.
* Business A cannot update Business B stock.
* Business A cannot accept or reject Business B orders.
* Business A cannot access Business B sessions.
* Business A cannot access Business B notifications.
* Business A cannot access Business B webhook logs.
* Phone-number IDs map only to their assigned business.

Test both:

* Normal frontend/API access
* Manually crafted requests with another `businessId`

The server must derive or verify the business from authenticated membership and trusted WhatsApp connection mappings.

Never trust a browser-supplied `businessId` by itself.

Review Supabase RLS policies and server-side service-role usage.

---

# 14. Two Meta test setup verification

## Parallel `_2` implementation protection

The project currently contains a separate `_2` implementation used by another developer with:

* A separate Meta developer app
* A separate webhook
* Separate WhatsApp credentials
* Separate business/test IDs
* Shared Supabase infrastructure with isolated records

This parallel implementation is actively being developed.

Rules:

* Do not delete any `_2` file.
* Do not rename any `_2` file.
* Do not merge `_2` files into the primary implementation.
* Do not move shared logic out of `_2` files.
* Do not change the second webhook route.
* Do not change its environment-variable names.
* Do not change its business IDs, phone-number IDs, or Meta configuration.
* Do not apply migrations or refactors that break either implementation.
* Test and harden only the primary implementation unless a shared database constraint requires validation for both.
* Any shared Supabase schema change must remain backward-compatible with both implementations.
* Document any risk discovered in the `_2` setup, but do not fix or refactor it during this milestone.

The `_2` implementation may be consolidated only in a future milestone after both developers explicitly agree.


---

# 15. Database constraints review

Review and add necessary constraints such as:

* Unique processed Meta message identity
* Unique order idempotency key
* Unique business-scoped product code
* Unique business-scoped SKU
* Unique notification per order/status/type
* Non-negative stock
* Non-negative prices
* Non-negative quantities
* Quantity greater than zero
* Valid order statuses
* Valid reservation statuses
* Required business ownership fields
* Foreign-key integrity

Use database constraints as the final line of defence.

Application validation alone is insufficient.

---

# 16. Transaction review

Verify these operations are atomic:

### Order confirmation

```text
Create order
Create order items
Create stock reservations
Assign order number
```

### Accept order

```text
Validate pending order
Validate active reservations
Commit stock deduction
Commit reservations
Update order status
Create status history
```

### Reject order

```text
Update order status
Release reservations
Create status history
```

### Status transition

```text
Validate transition
Update order status
Set timestamp
Create history entry
```

No transaction should leave partial state.

---

# 17. Observability

Add safe structured logging for critical operations.

Include:

* Correlation/request ID
* Meta message ID
* Business ID
* Phone-number ID
* Customer identifier in a safely masked form
* Order ID/order number
* Operation
* Result
* Error code
* Duration

Never log:

* Access tokens
* App secrets
* Supabase service-role key
* Full customer address unnecessarily
* Full payment-sensitive information

Make logs useful for tracing one order from webhook to completion.

---

# 18. Protected health and diagnostics

Add a protected internal diagnostics view or endpoint showing:

* Database connectivity
* Supabase RPC availability
* WhatsApp configuration presence
* Latest webhook received time
* Latest successful outgoing message time
* Failed notifications count
* Expired active reservations count
* Data-integrity warnings
* Current application version/commit when available

Do not expose secrets or raw credentials.

Use existing admin/log protection conventions.

---

# 19. Manual concurrency test plan

Provide a clear manual test plan using two verified WhatsApp numbers.

Required test:

```text
Customer A: English
Customer B: Arabic
→ Separate carts
→ Different products
→ Simultaneous checkout
→ Separate orders
```

Final-stock test:

```text
Set one variant stock to 1
→ Both customers add quantity 1
→ Both confirm as close together as possible
→ Exactly one succeeds
```

Also test:

* Same message delivered twice
* Owner accepts twice
* Owner changes status twice
* Customer restarts during checkout
* Meta send failure
* Reservation expiration
* Product price changed after order creation

---

# 20. Completion criteria

Milestone 11 is complete only when:

1. Two simultaneous customers remain fully isolated.
2. The last unit cannot be reserved by two customers.
3. Stock never becomes negative.
4. Duplicate Meta webhooks do not cause duplicate processing.
5. Duplicate confirmations create one order only.
6. Duplicate owner actions do not commit stock twice.
7. Expired reservations cannot be accepted.
8. Reservation expiration is idempotent.
9. Failed order transactions do not create partial orders.
10. Failed WhatsApp sends do not corrupt order state.
11. Sessions survive deployments and serverless instance changes.
12. Old order snapshots do not change when products are edited.
13. Cross-business access attempts are rejected.
14. Both Meta test setups remain isolated.
15. Critical database constraints are present.
16. All stock-sensitive operations are transactional.
17. Main critical services have automated tests.
18. A repeatable manual two-phone test plan is documented.
19. Logs allow tracing one order without exposing secrets.
20. Existing customer and owner flows remain working.

After implementation, report:

* Files created
* Files modified
* Database migrations
* Constraints added
* RPC changes
* Tests added
* Test commands
* Concurrency strategy
* Idempotency strategy
* Reservation-expiration strategy
* Tenant-isolation review
* Failure scenarios tested
* Manual two-phone test instructions
* Remaining risks
* Recommended work for Milestone 12

Stop after reliability and data-integrity hardening.

Do not begin:

* Client onboarding
* Owner WhatsApp alerts
* Billing
* Workflow builder
* AI
* Voice transcription
* WhatsApp Catalog integration
* Meta Embedded Signup
