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



# Milestone 11 — Reliability, Concurrency, and Data Integrity Hardening

The WhatsApp commerce system is now in a clean independent project.

Current completed features:

* WhatsApp webhook and replies
* Persistent sessions
* Duplicate webhook protection
* English and Arabic
* Categories, products and product details
* Product options, variants and custom fields
* Cart management
* Checkout
* Stock reservations
* Pending order creation
* Owner dashboard
* Dynamic Supabase-managed catalog/settings
* Accept/reject orders
* Complete order lifecycle
* Customer status notifications
* Supabase persistence

Do not add new product features in this milestone.

The goal is to make the current system reliable, safe and production-minded before we build onboarding, AI, voice, billing, or workflow builders.

---

## Important rules

* Inspect the existing architecture before changing anything.
* Preserve all working behavior.
* Do not redesign public website pages.
* Do not deploy.
* Do not push or merge to `main`.
* Do not add AI, voice, billing, onboarding, WhatsApp Catalog, or workflow-builder features.
* Do not expose Supabase service-role credentials to the browser.
* Prefer database constraints and transactions over frontend-only checks.
* Every operation must remain scoped by authenticated business ownership.
* Do not hide errors with empty catch blocks.
* Keep the code scalable and maintainable.

---

## Goal

Prove this statement:

```text
Duplicate webhooks, simultaneous customers, repeated owner actions, API failures and server restarts cannot duplicate orders, corrupt stock, leak tenant data or send duplicate notifications.
```

---

## 1. Automated test foundation

Add automated tests for the critical business services.

Cover:

* Conversation session creation/loading
* Cart updates
* Variant resolution
* Custom-field validation
* Stock validation
* Order total calculation
* Order creation
* Stock reservation
* Order acceptance
* Order rejection
* Status transitions
* Notification deduplication
* Business isolation

Separate where appropriate:

* Unit tests
* Database/RPC integration tests
* End-to-end simulation tests

Do not require real WhatsApp messages for every automated test.

---

## 2. Concurrent final-stock test

Create a repeatable test for:

```text
Variant stock: 1

Customer A confirms quantity 1
Customer B confirms quantity 1
Both requests arrive nearly simultaneously
```

Expected result:

* Only one order/reservation succeeds.
* The other request receives an out-of-stock result.
* Stock never becomes negative.
* Reserved quantity never exceeds available stock.
* No partial order or orphan order item is created.
* The test remains correct across repeated runs.

Use database-level concurrency protection, locking, atomic updates, or an equivalent safe strategy.

Do not rely only on:

```text
Read stock
→ Check in app code
→ Update later
```

---

## 3. Multiple simultaneous customers

Test two different WhatsApp sender numbers against the same business.

Each customer must have independent:

* Language
* Current conversation step
* Selected category
* Selected product
* Pending item
* Cart
* Checkout data
* Order
* Notification history

Session uniqueness should be based on:

```text
businessId + customerPhone
```

or the existing equivalent.

One customer must never receive or modify another customer’s state.

---

## 4. Duplicate webhook protection

Meta may deliver the same webhook more than once.

Verify that the same incoming Meta message ID:

* Is processed only once.
* Does not advance the conversation twice.
* Does not add the same item twice.
* Does not confirm two orders.
* Does not send two replies.
* Remains protected after redeployment or server restart.

Use persistent database-backed idempotency.

Test duplicates for:

* Text messages
* Button replies
* List replies
* Checkout confirmation
* Location messages
* Unsupported message types

---

## 5. Duplicate order confirmation

Test repeated confirmation attempts using:

* Same Meta message ID
* Same checkout state
* Rapid repeated customer message
* Network retry after unclear response

Expected result:

* One order
* One set of order items
* One set of stock reservations
* One public order number
* One customer confirmation message

Add or verify database uniqueness constraints and idempotency keys.

---

## 6. Duplicate owner actions

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
* Invalid repeated transitions return safe errors.
* No order can be both accepted and rejected.

---

## 7. Reservation expiration

Verify expired reservation behavior.

Scenario:

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

Create an idempotent expiration function or service.

For now, it may be triggered manually or by a protected scheduled endpoint, but the logic itself must be production-ready.

---

## 8. Stock integrity audit

Add a protected internal diagnostic report that checks for:

* Negative stock
* Active reservations exceeding available stock
* Committed reservations on unaccepted orders
* Accepted orders with active reservations
* Rejected orders with committed reservations
* Orphan reservations
* Orphan order items
* Duplicate variant combinations
* Duplicate product codes within one business
* Duplicate SKUs within one business

This report must be read-only.

Do not silently repair production data.

---

## 9. Failure handling

Simulate failures during:

* Supabase session read
* Supabase session write
* Catalog loading
* Order transaction
* Reservation creation
* Order acceptance
* Order rejection
* Status transition
* WhatsApp send request
* Notification record creation

Expected behavior:

* No partial financial or stock state.
* No duplicate retry side effects.
* User receives a safe fallback message where possible.
* Errors are logged with correlation information.
* Secrets are never logged.
* Failed WhatsApp notifications do not revert successful order changes.
* Failed order transactions do not clear the customer cart.

---

## 10. WhatsApp API timeout and retry behavior

Harden outgoing WhatsApp sending.

Requirements:

* Use reasonable request timeouts.
* Parse and record Meta error responses safely.
* Do not retry permanent validation errors.
* Allow controlled retries for temporary network/server failures.
* Never send the same logical notification twice.
* Use notification idempotency records.

Track notification states such as:

```text
PENDING
SENT
FAILED
RETRYABLE
TEMPLATE_REQUIRED
SKIPPED
```

Do not build a complex queue unless the project already has one.

Design the service so it can later move into a queue without rewriting business logic.

---

## 11. Conversation recovery

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
* Cart recovery follows current intended rules.
* Customer is not returned to an invalid state.

Add session-context validation when loading stored session data.

If stored session data is malformed, recover safely and log the issue.

---

## 12. Order snapshot integrity

Verify old orders do not change when current catalog data changes.

After order creation, edit:

* Product name
* Product price
* Product code
* Variant name
* Option labels
* Delivery fee
* Product availability

The old order must continue showing the saved values from order time.

Order details must use saved order snapshots, not current catalog data.

---

## 13. Business and tenant isolation

Perform explicit cross-business tests.

Using Business A and Business B:

* Business A user cannot read Business B products.
* Business A user cannot read Business B orders.
* Business A cannot update Business B stock.
* Business A cannot accept/reject Business B orders.
* Business A cannot access Business B sessions.
* Business A cannot access Business B notifications.
* Business A cannot access Business B webhook logs.
* Phone-number IDs map only to their assigned business.

Test both:

* Normal frontend/API access
* Manually crafted requests with another `businessId`

The server must derive or verify business access from authenticated membership and trusted WhatsApp connection mappings.

Never trust browser-supplied `businessId` by itself.

Review Supabase RLS policies and server-side service-role usage.

---

## 14. Database constraints review

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

Database constraints are the final line of defense.

Application validation alone is not enough.

---

## 15. Transaction review

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
Create notification record
```

No transaction should leave partial state.

---

## 16. Observability

Add safe structured logging for critical operations.

Include:

* Correlation/request ID
* Meta message ID
* Business ID
* Phone-number ID
* Masked customer identifier
* Order ID/order number
* Operation name
* Result
* Error code
* Duration

Never log:

* Access tokens
* App secrets
* Supabase service-role key
* Full customer address unnecessarily
* Sensitive payment details

Logs should allow tracing one order from webhook to completion.

---

## 17. Protected health and diagnostics

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

Use the existing admin/log protection conventions.

---

## 18. Manual two-phone test plan

Provide a manual test plan using two verified WhatsApp numbers.

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

## 19. Completion criteria

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
14. Critical database constraints are present.
15. All stock-sensitive operations are transactional.
16. Main critical services have automated tests.
17. A repeatable manual two-phone test plan is documented.
18. Logs allow tracing one order without exposing secrets.
19. Existing customer and owner flows remain working.
20. No new product features were added.

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


# Milestone 12 — Multi-Business WhatsApp Connection Architecture

Milestone 11 is complete. The system is now reliability-hardened.

Current system supports:

* WhatsApp webhook
* Persistent sessions
* Dynamic Supabase catalog/settings
* Cart and checkout
* Stock reservations
* Order creation
* Owner dashboard
* Full order lifecycle
* Customer notifications
* Reliability and concurrency hardening

Now prepare the architecture so one shared engine can support multiple businesses and multiple WhatsApp numbers.

Do not build public client onboarding yet.

---

## Important rules

* Inspect the current project structure first.
* Preserve all working behavior.
* Do not redesign public website pages.
* Do not deploy.
* Do not push or merge to `main`.
* Do not add AI.
* Do not add voice.
* Do not add billing.
* Do not add WhatsApp Catalog sync.
* Do not add Meta Embedded Signup.
* Do not add workflow templates yet.
* Do not create client self-onboarding.
* Keep all sensitive credentials server-side.
* Never expose access tokens or app secrets to the browser.
* Every database query must be business-scoped.

---

## Goal

Implement this routing architecture:

```text
Incoming WhatsApp webhook
        ↓
Extract phone_number_id
        ↓
Find active WhatsApp connection
        ↓
Resolve business_id
        ↓
Load that business's catalog/settings/session
        ↓
Run the existing shared bot engine
        ↓
Send reply using that connection's WhatsApp credentials
```

The engine should no longer depend on one hardcoded business, one hardcoded phone number, or one global WhatsApp config.

---

## 1. WhatsApp connection model

Create or confirm a table similar to:

### `wa_whatsapp_connections`

Fields:

* id
* businessId
* provider
* connectionName
* wabaId
* phoneNumberId
* displayPhoneNumber
* businessPhoneName
* appId
* appSecretRef
* accessTokenRef
* verifyToken
* webhookPath
* status
* isDefault
* createdAt
* updatedAt

Suggested statuses:

```text
ACTIVE
PAUSED
DISCONNECTED
ERROR
```

For now:

```text
provider = META_CLOUD_API
```

Important:

* `phoneNumberId` must be unique.
* A connection belongs to exactly one business.
* A business may eventually have more than one connection.
* Only active connections should process customer messages.

---

## 2. Credential handling

Do not expose WhatsApp access tokens or app secrets to the frontend.

Preferred approach:

* Store non-secret connection metadata in `wa_whatsapp_connections`.
* Store sensitive secrets in a server-only mechanism.

If the project already has secure secret storage, use it.

If not, implement a temporary server-only abstraction such as:

```ts
getWhatsAppConnectionSecrets(connectionId)
```

This function must be used only on the server.

Acceptable temporary options:

1. Environment variable mapping for test connections.
2. Supabase server-only table accessed only with service role.
3. Supabase Vault if already available.

Document which approach was used and what must change before production.

Never log:

* Access tokens
* App secrets
* Secret references
* Service role keys

---

## 3. Webhook verification per connection

The existing webhook GET verification must support connection-specific verify tokens.

When Meta calls:

```text
/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
```

The system should verify against a configured connection or webhook configuration.

For this milestone, if only one public webhook route is used, support one of these safe strategies:

### Strategy A — Shared webhook verify token

Use one server-side verify token for all current test connections.

### Strategy B — Per-connection verify tokens

Look up the verify token in `wa_whatsapp_connections`.

If using Strategy B, ensure the lookup does not require a `phone_number_id`, because GET verification does not include it.

Document the chosen approach.

Keep the existing working verification behavior.

---

## 4. Incoming POST routing

For webhook POST events:

1. Parse the payload.
2. Extract `phone_number_id` from WhatsApp metadata.
3. Find the active `wa_whatsapp_connections` row.
4. Resolve the `businessId`.
5. Reject or ignore events for unknown/inactive phone numbers.
6. Pass `businessId` and `connectionId` into the existing bot engine.
7. Use the connection’s credentials when sending replies.

Expected mapping:

```text
metadata.phone_number_id
→ wa_whatsapp_connections.phoneNumberId
→ businessId
```

Do not use a global `WHATSAPP_PHONE_NUMBER_ID` as the source of truth for incoming messages anymore.

It may remain as a local fallback only if documented and not used for multi-business routing.

---

## 5. Sending WhatsApp messages

Refactor the sending service so it accepts a connection context.

Suggested interface:

```ts
sendWhatsAppText({
  connectionId,
  phoneNumberId,
  recipient,
  message,
})
```

or:

```ts
sendWhatsAppMessage({
  connection,
  recipient,
  payload,
})
```

The sender must:

* Use the correct `phoneNumberId`.
* Use the correct access token for that connection.
* Log safely.
* Record notification status.
* Preserve existing idempotency behavior.
* Continue supporting customer replies and order-status messages.

Do not break existing customer notification logic.

---

## 6. Sessions must be connection-aware

Conversation sessions should be uniquely scoped by:

```text
businessId + connectionId + customerPhone
```

or an equivalent safe key.

This prevents issues if the same customer talks to two different businesses using the platform.

Review and update session lookups, inserts, and constraints accordingly.

---

## 7. Processed message idempotency

Processed WhatsApp message IDs should be scoped safely.

Use a uniqueness strategy such as:

```text
connectionId + metaMessageId
```

or:

```text
businessId + phoneNumberId + metaMessageId
```

Do not rely on Meta message ID alone if there is any chance of collision across connections.

---

## 8. Orders and notifications

Orders already belong to a business.

Confirm or update:

* Orders know which connection/customer session created them if useful.
* Customer notifications use the same connection that received the original order.
* Order status updates are sent from the correct WhatsApp number.
* Notification deduplication includes connection context where needed.

A customer who ordered from Business A must never receive a message from Business B’s WhatsApp number.

---

## 9. Dashboard business context

The owner dashboard must continue to load only the authenticated user’s business data.

If the project currently assumes one test business globally, refactor it so the active business is resolved through a reliable server-side business membership approach.

Do not build a full admin panel yet.

Minimum requirement:

* The dashboard can operate for Business A.
* The dashboard can operate for Business B.
* Authenticated access is scoped correctly.
* No browser-supplied `businessId` is trusted without verification.

If multiple businesses per user are supported, add a safe business selector.

If not, assign one default business per user for now.

Document the approach.

---

## 10. Seed two test businesses

Create or document seed data for two separate test businesses:

### Business A

* WhatsApp connection A
* Categories
* Products
* Settings
* Owner user

### Business B

* WhatsApp connection B
* Categories
* Products
* Settings
* Owner user

The businesses should have visibly different product names so routing mistakes are obvious.

Example:

```text
Business A: Jewelry store
Business B: Clothing store
```

---

## 11. Manual configuration

Because we do not have Meta Tech Provider access yet, onboarding is manual.

Create a safe internal setup path or documented SQL/admin process for adding:

* Business
* Owner user membership
* WhatsApp connection metadata
* Secret references or environment mapping
* Catalog/settings seed

Do not build public self-service onboarding.

Do not implement Embedded Signup.

---

## 12. Webhook logs

Webhook logs should include:

* connectionId
* businessId
* phoneNumberId
* masked customer phone
* Meta message ID
* event type
* result
* error code where relevant

Webhook logs must remain business-scoped.

If there is a logs dashboard, ensure:

* Business users see only their business logs.
* Internal admin logs remain protected.
* Secrets are never shown.

---

## 13. Diagnostics

Update protected diagnostics to show:

* Active WhatsApp connections count
* Unknown phone_number_id events
* Last webhook received per connection
* Last outgoing message per connection
* Failed notifications per connection
* Connection status

Do not expose tokens or app secrets.

---

## 14. Backward compatibility

Existing single-business behavior must continue working.

After migration:

* Current test WhatsApp number still works.
* Current dashboard still works.
* Current order flow still works.
* Current notifications still work.
* Existing orders remain readable.
* Existing sessions either migrate safely or expire gracefully.

If a migration is needed, document it clearly.

---

## 15. Testing

Add tests for:

* phone_number_id resolves correct business
* unknown phone_number_id is ignored safely
* inactive connection does not process messages
* Business A customer gets Business A catalog
* Business B customer gets Business B catalog
* same customer phone can have separate sessions with two businesses
* duplicate message protection is connection-scoped
* notifications send from correct connection
* dashboard business isolation

Manual test:

```text
Meta test number A
→ Customer sends Hello
→ Sees Business A language/menu/catalog

Meta test number B
→ Same customer sends Hello
→ Sees Business B language/menu/catalog
```

Then verify:

* Separate sessions
* Separate carts
* Separate orders
* Separate dashboard views
* Correct outgoing WhatsApp number
* Correct logs

---

## 16. Completion criteria

Milestone 12 is complete when:

1. Incoming webhook POSTs resolve business by `phone_number_id`.
2. Unknown phone numbers are ignored or rejected safely.
3. Active/inactive connection status is respected.
4. The bot loads the correct business catalog/settings.
5. Sessions are scoped by business/connection/customer.
6. Duplicate protection is scoped by connection.
7. Replies are sent using the correct WhatsApp credentials.
8. Order notifications use the original business connection.
9. Dashboard data remains business-isolated.
10. Two test businesses can run through the same shared engine.
11. The same customer phone can talk to both businesses independently.
12. Webhook logs include connection and business context.
13. Diagnostics show connection health without secrets.
14. Existing single-business flow remains working.
15. No Tech Provider or Embedded Signup functionality was added.

After implementation, report:

* Files created
* Files modified
* Database migrations
* Tables added/changed
* Secret-handling approach
* Business resolution approach
* Session-scope changes
* Idempotency-scope changes
* Dashboard business-context approach
* Manual setup instructions
* Manual two-business test instructions
* Remaining risks
* Recommended work for Milestone 13

Stop after multi-business WhatsApp connection architecture works.

Do not begin:

* Public client onboarding
* Meta Embedded Signup
* Owner WhatsApp alerts
* Billing
* Workflow templates
* Flow builder
* AI
* Voice
* WhatsApp Catalog sync



# Milestone 13 — Owner Notifications, Reminders, and New-Order Alerts

Milestone 12 is complete or in progress with multi-business WhatsApp connection architecture.

The system already supports:

* Multi-business WhatsApp connection routing
* Dynamic catalog/settings from Supabase
* Customer checkout
* Pending order creation
* Owner order dashboard
* Accept/reject orders
* Complete order lifecycle
* Customer status messages
* Reliability, idempotency, and data-integrity hardening

Now implement owner-side notifications and reminders.

Do not build public onboarding, billing, AI, voice, WhatsApp Catalog sync, or flow templates yet.

---

## Goal

When a new order is created, the business owner should know immediately.

Implement:

```text
Customer confirms order
→ Order is saved
→ Dashboard updates in realtime
→ Owner receives visible alert
→ Owner receives optional browser/email alert
→ If order is not handled after X minutes, reminders are triggered
```

The dashboard remains the source of truth.

---

## Important rules

* Inspect the existing dashboard and notification architecture first.
* Preserve all working order and WhatsApp flows.
* Do not modify public website pages.
* Do not deploy.
* Do not push or merge to `main`.
* Every notification must be scoped by `businessId`.
* Do not expose service-role keys, WhatsApp tokens, email secrets, or app secrets.
* Notification failure must never corrupt order state.
* Duplicate reminders must not be sent.
* Do not implement AI, voice, billing, client onboarding, workflow templates, or WhatsApp Catalog sync.

---

## 1. Notification types

Support these notification channels:

### Required now

* Realtime dashboard notification
* Dashboard sound alert
* Browser notification if permission is granted
* In-dashboard unread badge/count

### Optional but recommended now

* Email notification to owner

### Prepare for later, but do not fully depend on it

* WhatsApp owner notification via approved template

For this milestone, owner WhatsApp alerts may be implemented as a configurable placeholder or internal test-only path, because production owner alerts may require approved templates and real client setup later.

---

## 2. Notification settings

Add business-level settings for owner notifications.

Suggested table:

### `wa_owner_notification_settings`

Fields:

* id
* businessId
* enableDashboardAlerts
* enableSound
* enableBrowserPush
* enableEmailAlerts
* enableWhatsAppAlerts
* ownerEmail
* ownerWhatsAppNumber
* newOrderReminderMinutes
* secondReminderMinutes
* reminderEscalationEnabled
* quietHoursEnabled
* quietHoursStart
* quietHoursEnd
* createdAt
* updatedAt

Defaults:

```text
dashboard alerts: enabled
sound: enabled
browser: enabled
email: disabled until configured
WhatsApp: disabled until configured
first reminder: 5 minutes
second reminder: 15 minutes
```

All settings must be business-scoped.

---

## 3. Notification records

Create or reuse a notification table.

Suggested table:

### `wa_owner_notifications`

Fields:

* id
* businessId
* orderId
* type
* channel
* status
* recipient
* title
* message
* metadata
* dedupeKey
* errorCode
* errorMessage
* scheduledFor
* sentAt
* readAt
* createdAt
* updatedAt

Types:

```text
NEW_ORDER
ORDER_UNHANDLED_FIRST_REMINDER
ORDER_UNHANDLED_SECOND_REMINDER
ORDER_STATUS_CHANGED
```

Channels:

```text
DASHBOARD
BROWSER
EMAIL
WHATSAPP_TEMPLATE
```

Statuses:

```text
PENDING
SENT
FAILED
SKIPPED
READ
CANCELLED
TEMPLATE_REQUIRED
```

Requirements:

* Use unique `dedupeKey`.
* Prevent duplicate notifications for the same order/type/channel.
* Never store secrets in metadata.

---

## 4. Realtime dashboard alerts

When a new order is created:

* `/dashboard/orders` should update without manual refresh where supported.
* Pending-order count should increase.
* A notification badge should appear.
* A toast/banner should appear.
* A sound should play if enabled.
* The dashboard should show the newest pending order clearly.

Example:

```text
🛍️ New order received

Order: DA-000042
Customer: Ahmad
Total: $47
Fulfillment: Delivery

[View order]
```

The alert must appear only to users belonging to the same business.

---

## 5. Browser notifications

Add browser notification support.

Requirements:

* Ask permission from the owner from the dashboard, not automatically on page load.
* Show a clear button such as:

```text
Enable browser notifications
```

* If permission is denied, show instructions or a soft warning.
* If permission is granted, show browser notification for new orders.

Example notification:

```text
New order DA-000042
Ahmad placed an order for $47
```

Clicking the notification should open the order details page where possible.

Do not build full mobile push infrastructure yet unless the project already supports it.

---

## 6. Sound alert

Add a short dashboard sound alert for new orders.

Requirements:

* Respect the business/user notification setting.
* Do not autoplay before the user has interacted with the page if the browser blocks it.
* Provide mute/unmute.
* Do not loop forever.
* Avoid annoying repeated sounds for the same order.

---

## 7. Email alert

If email infrastructure already exists, reuse it.

If not, add a clean abstraction:

```ts
sendOwnerEmailNotification({
  businessId,
  orderId,
  recipientEmail,
  subject,
  body,
})
```

Use environment variables for provider credentials.

Email content:

```text
Subject: New order DA-000042

New order received.

Customer: Ahmad
Phone: +961...
Total: $47
Fulfillment: Delivery
Payment: Cash on delivery

Open order:
https://www.doubleacode.com/dashboard/orders/{orderId}
```

Requirements:

* Email failures must be logged.
* Email failures must not affect order creation.
* Email should not expose private admin tokens.
* Send only one email per order unless reminders require another.

If no email provider is configured, record the notification as `SKIPPED` with a clear reason.

---

## 8. Reminder system

If an order remains:

```text
PENDING_OWNER_CONFIRMATION
```

for more than the configured reminder time, create/send a reminder.

Example first reminder:

```text
⚠️ Order DA-000042 is still pending

Customer is waiting.
Total: $47

[Open order]
```

Rules:

* Do not send reminder if order is already accepted, rejected, cancelled, or expired.
* Do not send duplicate reminders.
* Reminder timing must be configurable per business.
* Reminder logic must be idempotent.
* Reminder checks may be triggered by:

  * protected admin endpoint,
  * scheduled Vercel cron-compatible endpoint,
  * dashboard polling,
  * or existing background mechanism.

Do not build a complex worker system unless the project already has one.

---

## 9. Reminder escalation

Add support for second reminder.

Example:

```text
Order DA-000042 has been waiting for 15 minutes.

Please accept or reject it.
```

For now:

* First reminder: owner dashboard/browser/email
* Second reminder: owner dashboard/browser/email
* Future: backup manager or WhatsApp template

Do not implement full team escalation yet.

---

## 10. Notification read/unread state

In the dashboard:

* Show unread notification count.
* Show recent notifications.
* Mark a notification as read when opened.
* Mark all as read.
* Opening an order may mark related new-order notification as read.

Unread count must be scoped by business.

---

## 11. Order details integration

On the order details page, show notification state:

* New-order notification sent/failed/skipped
* Reminder sent/failed/skipped
* Customer status notification state if already available

Do not clutter the UI, but make debugging possible.

---

## 12. Owner WhatsApp alert preparation

Do not rely on this as the main notification channel yet.

Prepare the architecture for later WhatsApp owner alerts:

* Store owner WhatsApp number in settings.
* Add `WHATSAPP_TEMPLATE` channel type.
* Add `TEMPLATE_REQUIRED` status where appropriate.
* Add placeholder function:

```ts
sendOwnerWhatsAppTemplateNotification(...)
```

For now, this function may:

* return `TEMPLATE_REQUIRED`,
* or support internal test-only sending if explicitly configured.

Do not send unauthorized production template messages.

---

## 13. Multi-business safety

With two businesses:

* Business A owners receive only Business A notifications.
* Business B owners receive only Business B notifications.
* Business A cannot read Business B notification records.
* Business A cannot mark Business B notifications as read.
* Reminder checks must process each business independently.
* Notification URLs must point to the correct business/order context.

---

## 14. Diagnostics

Update protected diagnostics to include:

* Pending owner notifications count
* Failed owner notifications count
* Last new-order notification time
* Last reminder check time
* Orders pending longer than first reminder
* Orders pending longer than second reminder
* Email provider configured: yes/no
* Browser notification support: client-side only

Do not expose secrets.

---

## 15. Tests

Add tests for:

* New order creates owner notification record.
* Duplicate order event does not create duplicate notification.
* Realtime notification is business-scoped.
* Email notification is skipped if email not configured.
* Reminder is created only for pending orders.
* Reminder is not created for accepted/rejected/cancelled orders.
* First reminder is not duplicated.
* Second reminder is not duplicated.
* Mark-as-read affects only the correct business.
* Cross-business notification access is rejected.

Manual tests:

```text
Create order
→ Dashboard receives new-order alert
→ Sound plays
→ Browser notification appears if enabled
→ Email is sent or skipped with reason
→ Do not accept order
→ Reminder appears after configured minutes
→ Accept order
→ No further reminders
```

---

## 16. Completion criteria

Milestone 13 is complete when:

1. New orders appear in the owner dashboard immediately.
2. Pending-order badge/count updates correctly.
3. Dashboard alert/toast appears for new orders.
4. Sound alert works and can be muted.
5. Browser notification can be enabled and works.
6. Email notification works or is cleanly skipped when not configured.
7. Reminder is triggered for unhandled pending orders.
8. Reminder is not triggered for handled orders.
9. Duplicate notifications are prevented.
10. Notification read/unread state works.
11. Notification settings are business-scoped.
12. Business A cannot see or receive Business B notifications.
13. Notification failures do not affect order creation or status changes.
14. Diagnostics show notification health without secrets.
15. Owner WhatsApp alert architecture is prepared but not required for production.
16. Existing customer ordering and order lifecycle remain working.

After implementation, report:

* Files created
* Files modified
* Database migrations
* Notification tables/settings added
* Realtime strategy
* Browser notification behavior
* Email provider approach
* Reminder strategy
* Deduplication strategy
* Business isolation approach
* Manual test instructions
* Known limitations
* Recommended work for Milestone 14

Stop after owner notifications and reminders work.

Do not begin:

* Public client onboarding
* Billing
* AI
* Voice
* Workflow templates
* Flow builder
* WhatsApp Catalog sync
* Meta Embedded Signup


# Milestone 14 — Double A Internal Admin Panel and Manual Client Onboarding

Milestone 13 is complete or in progress.

The system currently supports:

* Multi-business WhatsApp connection architecture
* Dynamic Supabase catalog and settings
* Owner dashboard
* Customer ordering flow
* Checkout and order creation
* Stock reservations
* Full order lifecycle
* Owner notifications and reminders
* Business-scoped data
* Reliability and data-integrity hardening

Now build the internal Double A admin area so we can manually onboard and manage businesses before Meta Tech Provider / Embedded Signup is available.

Do not build public self-service onboarding yet.

---

## Goal

Create an internal admin panel where Double A can:

```text
Create business
→ Create/assign owner user
→ Configure WhatsApp connection manually
→ Seed default catalog/settings
→ Select starting template type manually
→ Activate/suspend business
→ View health, logs, usage and configuration
```

This is for Double A admins only, not store owners.

---

## Important rules

* Inspect the existing dashboard/admin/auth architecture first.
* Preserve all working owner dashboard and WhatsApp bot behavior.
* Do not modify public website pages.
* Do not deploy.
* Do not push or merge to `main`.
* Do not add AI.
* Do not add voice.
* Do not add billing.
* Do not add Meta Embedded Signup.
* Do not add WhatsApp Catalog sync.
* Do not add workflow builder yet.
* Keep all credentials server-side.
* Never expose WhatsApp tokens, app secrets, Supabase service-role key, or email provider secrets.
* Every admin action must be audited.
* Store owners must never access this internal admin area.

---

## 1. Internal admin access

Create protected internal admin routes, preferably:

```text
/admin
/admin/businesses
/admin/businesses/new
/admin/businesses/[businessId]
/admin/businesses/[businessId]/connections
/admin/businesses/[businessId]/users
/admin/businesses/[businessId]/health
/admin/logs
```

Access rules:

* Only Double A internal admin users can access `/admin`.
* Store owners cannot access `/admin`.
* Use existing auth if available.
* Add an `is_internal_admin` flag, admin role table, or equivalent secure mechanism.
* Do not rely only on frontend route hiding.
* Validate admin access server-side for every admin API/action.

---

## 2. Admin overview

The `/admin` page should show:

* Total businesses
* Active businesses
* Suspended businesses
* Connected WhatsApp numbers
* Orders today
* Failed notifications
* Unknown webhook phone-number events
* Businesses with configuration issues
* Recent onboarding activity

Do not expose secrets.

---

## 3. Businesses list

Create `/admin/businesses`.

Show:

* Business name
* Status
* Owner email
* WhatsApp display phone number
* Connection status
* Created date
* Last order date
* Health status

Filters:

* Active
* Suspended
* Setup incomplete
* Connection error
* All

Actions:

* View business
* Suspend
* Reactivate
* Open owner dashboard as support view if already safe to do so

Do not implement unsafe impersonation unless the project already has a secure pattern.

---

## 4. Create business wizard

Create `/admin/businesses/new`.

Steps:

### Step 1 — Business info

Fields:

* Business name
* Legal/store name if different
* Default language
* Supported languages
* Currency
* Timezone
* Country
* Status: setup/draft/active

### Step 2 — Owner user

Allow:

* Assign existing user by email
* Or create invited owner user if auth supports it

Business-user role:

```text
OWNER
MANAGER
STAFF
```

For this milestone, at minimum support `OWNER`.

### Step 3 — Starting configuration

Allow selecting a starting type:

```text
Standard online store
Jewelry store
Clothing store
Accessories store
Custom products
```

For now, this can seed default settings and sample structures.

Do not build full workflow templates yet.

### Step 4 — WhatsApp connection

Manually enter non-secret metadata:

* Provider: `META_CLOUD_API`
* Connection name
* WABA ID
* Phone number ID
* Display phone number
* Business phone display name
* App ID if needed
* Connection status
* Webhook path if applicable

Secret configuration:

* Access token reference
* App secret reference
* Verify token reference or server-side mapping key

Do not show raw secret values in the browser after saving.

### Step 5 — Review and create

Show a safe summary and create all required records.

Creation should be transactional where possible.

---

## 5. Business detail page

Create `/admin/businesses/[businessId]`.

Show:

* Business info
* Status
* Owner users
* WhatsApp connection status
* Catalog counts
* Orders count
* Pending orders
* Failed notifications
* Last webhook received
* Last outgoing WhatsApp message
* Health warnings

Actions:

* Edit business info
* Suspend business
* Reactivate business
* Open owner dashboard
* Open logs filtered by business
* Run health check
* Seed default catalog/settings if empty

---

## 6. Business status behavior

Support statuses:

```text
DRAFT
SETUP_INCOMPLETE
ACTIVE
PAUSED
SUSPENDED
ERROR
```

Rules:

* Only `ACTIVE` businesses should process customer WhatsApp messages.
* Suspended businesses should not process new customer conversations.
* Suspended businesses should keep historical orders readable.
* Owner dashboard should show a clear suspended/setup message.
* Admin can reactivate business.
* Status changes must be audited.

---

## 7. Manual WhatsApp connection management

Create `/admin/businesses/[businessId]/connections`.

Allow admin to:

* View connection metadata
* Create connection
* Update connection metadata
* Pause connection
* Reactivate connection
* Mark disconnected
* Run connection health check

The connection health check should verify:

* Required metadata exists
* Secret references are configured
* Phone-number ID is unique
* Business is active
* Latest webhook time
* Latest outgoing message time
* Recent Meta errors

Do not expose token values.

---

## 8. Secret reference strategy

Use the existing Milestone 12 secret-handling approach.

Admin UI may allow entering a secret once, but after saving:

* Show only masked value or reference name
* Never return raw secret to browser
* Never log raw secret
* Never store raw secrets in frontend state longer than necessary
* Prefer server-side encrypted storage or environment/Vault references

Document the current approach and production upgrade needed.

---

## 9. Owner user management

Create `/admin/businesses/[businessId]/users`.

Allow internal admin to:

* View business users
* Add owner/manager/staff user if roles exist
* Remove user from business
* Change role
* Resend invitation if supported

Rules:

* Do not delete global auth users unless explicitly safe.
* Removing user from business should only remove membership.
* Prevent leaving an active business with no owner unless admin confirms.

---

## 10. Seed default catalog and settings

Add admin action:

```text
Seed default store data
```

It should create:

* Basic categories
* Sample products
* Sample variants
* Sample custom fields
* Default checkout settings
* Delivery areas
* Pickup locations
* Payment methods
* Owner notification settings

Rules:

* Must be business-scoped.
* Must not duplicate data if run twice.
* Should be idempotent or clearly warn before reseeding.
* Should create visibly different sample data based on selected starting type.

---

## 11. Admin logs

Create or improve `/admin/logs`.

Admin should filter logs by:

* Business
* WhatsApp connection
* Customer phone masked
* Order number
* Event type
* Error only
* Date range

Show:

* Webhook received
* Bot response sent
* Order created
* Owner action
* Notification sent/failed
* Connection error
* Unknown phone-number ID

Never show:

* Access tokens
* App secrets
* Supabase service-role key
* Full sensitive payloads unless explicitly sanitized

---

## 12. Admin audit log

Create or reuse admin audit table.

Suggested table:

### `wa_admin_audit_logs`

Fields:

* id
* adminUserId
* businessId
* action
* targetType
* targetId
* previousValue
* newValue
* metadata
* ipAddress if available
* userAgent if available
* createdAt

Audit these actions:

* Business created
* Business edited
* Business suspended/reactivated
* User assigned/removed
* Role changed
* WhatsApp connection created/edited/paused
* Secret reference changed
* Default catalog seeded
* Health check run

Do not store raw secrets in audit logs.

---

## 13. Business health check

Create protected health-check action per business.

Check:

* Business is active
* At least one active WhatsApp connection
* Phone-number ID unique
* Required secrets configured
* At least one owner user
* At least one active category
* At least one active product
* Checkout settings valid
* Delivery/pickup method available
* Payment method available
* Owner notification settings valid
* Recent webhook errors
* Recent notification failures
* Data-integrity warnings from Milestone 11

Return:

```text
OK
WARNING
ERROR
```

with clear messages.

---

## 14. Manual onboarding checklist

On the business detail page, show an onboarding checklist:

```text
Business info configured
Owner user assigned
WhatsApp connection configured
Catalog has products
Checkout settings configured
Payment methods configured
Owner notifications configured
Test message received
Test order created
Owner accepted test order
Business activated
```

Each item should show complete/incomplete.

This gives Double A a repeatable onboarding process before public self-service exists.

---

## 15. Dashboard support link

From admin business detail, add safe links to:

* Owner dashboard for that business
* Orders
* Products
* Settings
* Logs
* Diagnostics

Do not bypass authorization unsafely.

If support-view access is needed, implement it explicitly and audit it.

---

## 16. Multi-business safety

With at least two businesses:

* Admin can see both.
* Business owner A sees only Business A dashboard.
* Business owner B sees only Business B dashboard.
* Admin actions on Business A do not affect Business B.
* WhatsApp connection A routes to Business A.
* WhatsApp connection B routes to Business B.

Server-side checks must enforce this.

---

## 17. Tests

Add tests for:

* Internal admin access allowed only for admins.
* Store owner cannot access `/admin`.
* Business creation creates required records.
* Business status affects message processing.
* Suspended business does not process incoming messages.
* User membership is business-scoped.
* WhatsApp connection phone-number ID uniqueness.
* Seed action is idempotent or safely guarded.
* Admin audit log is created.
* Cross-business admin/owner isolation.
* Business health check returns expected warnings.

Manual tests:

```text
Create Business A
Assign Owner A
Configure connection A
Seed data
Activate
Send WhatsApp message
Confirm Business A catalog appears
Create order
Owner A sees order
```

Repeat with Business B and verify full isolation.

---

## 18. Completion criteria

Milestone 14 is complete when:

1. `/admin` is accessible only to internal Double A admins.
2. Admin can create a business manually.
3. Admin can assign an owner user.
4. Admin can configure WhatsApp connection metadata.
5. Secrets are handled server-side and never exposed after saving.
6. Admin can seed default catalog/settings.
7. Admin can activate, pause, suspend, and reactivate a business.
8. Suspended businesses do not process new WhatsApp messages.
9. Business detail page shows health and onboarding checklist.
10. Admin can view safe business-scoped logs.
11. Admin audit logs are recorded for sensitive actions.
12. Two businesses can be manually configured and isolated.
13. Owner users can access only their own business dashboard.
14. Existing customer ordering and owner order lifecycle remain working.
15. No public onboarding or Meta Embedded Signup was added.

After implementation, report:

* Files created
* Files modified
* Database migrations
* Admin auth approach
* Business creation flow
* Secret-handling approach
* Audit-log implementation
* Health-check implementation
* Manual onboarding instructions
* Manual two-business test instructions
* Known limitations
* Recommended work for Milestone 15

Stop after internal admin/manual onboarding works.

Do not begin:

* Public client onboarding
* Billing
* AI
* Voice
* Workflow templates
* Flow builder
* WhatsApp Catalog sync
* Meta Embedded Signup

# Milestone 15 — Flow Template System

Milestone 14 is complete.

The system currently supports:

* Multi-business WhatsApp routing
* Dynamic catalog/settings from Supabase
* Customer ordering flow
* Checkout and order creation
* Stock reservations
* Full owner order lifecycle
* Owner notifications and reminders
* Internal Double A admin panel
* Manual business onboarding
* Business health checks
* Business-scoped logs and audit logs

Now build the foundation for reusable deterministic conversation templates.

Do not build a full visual drag-and-drop builder yet.

---

## Goal

Create a flow-template system where Double A admins can:

```text
Create reusable flow template
→ Version it
→ Publish it
→ Assign/clone it to a business
→ Customize the business copy
→ Publish business-specific flow
→ Bot uses the published flow
```

For this milestone, the existing online-store flow should be represented as a configurable flow template, while still preserving all working behavior.

---

## Important rules

* Inspect the existing bot engine before changing it.
* Preserve the current working customer flow.
* Do not redesign public website pages.
* Do not deploy.
* Do not push or merge to `main`.
* Do not add AI.
* Do not add voice.
* Do not add billing.
* Do not add WhatsApp Catalog sync.
* Do not add Meta Embedded Signup.
* Do not build a complex visual flow builder yet.
* Keep stock, pricing, cart, checkout, and order creation protected server-side.
* Flow configuration must never allow unsafe price/stock/order manipulation.
* Every flow must be business-scoped or template-scoped correctly.
* Existing businesses must continue working after migration.

---

## 1. Concept

The flow template should control conversation routing and text, not sensitive business logic.

Flow can control:

* Messages
* Step order
* Button/list labels
* Enabled/disabled optional steps
* Custom questions
* Human-handoff points
* Delivery/pickup toggles where safe
* Language-specific copy

Flow must not directly control:

* Product prices
* Stock deduction
* Stock reservation
* Order totals
* Order creation transaction
* Payment validation
* Owner status transitions

Those remain controlled by backend services.

---

## 2. Data model

Create tables similar to:

### `wa_flow_templates`

* id
* name
* description
* category
* status
* createdByAdminUserId
* createdAt
* updatedAt

Example categories:

```text
STANDARD_ONLINE_STORE
JEWELRY
CLOTHING
ACCESSORIES
CUSTOM_PRODUCTS
```

Statuses:

```text
DRAFT
PUBLISHED
ARCHIVED
```

### `wa_flow_template_versions`

* id
* templateId
* versionNumber
* status
* flowJson
* createdByAdminUserId
* publishedAt
* createdAt

Statuses:

```text
DRAFT
PUBLISHED
ARCHIVED
```

### `wa_business_flows`

* id
* businessId
* sourceTemplateId
* name
* status
* activeVersionId
* createdAt
* updatedAt

Statuses:

```text
DRAFT
PUBLISHED
ARCHIVED
```

### `wa_business_flow_versions`

* id
* businessFlowId
* versionNumber
* status
* flowJson
* createdByUserId
* publishedAt
* createdAt

Statuses:

```text
DRAFT
PUBLISHED
ARCHIVED
```

Add any needed foreign keys and business isolation constraints.

---

## 3. Flow JSON shape

Create a validated JSON schema for flows.

Suggested structure:

```json
{
  "id": "standard_online_store",
  "name": "Standard Online Store",
  "startNodeId": "start",
  "supportedLanguages": ["en", "ar"],
  "nodes": [
    {
      "id": "start",
      "type": "message",
      "messages": {
        "en": "Welcome",
        "ar": "أهلاً وسهلاً"
      },
      "next": "select_language"
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "from": "start",
      "to": "select_language",
      "condition": null
    }
  ],
  "settings": {
    "allowHumanHandoff": true,
    "allowRestart": true,
    "allowBack": true
  }
}
```

The exact structure can differ if the current architecture requires it, but it must be explicit, validated, versioned, and documented.

---

## 4. Supported node types for this milestone

Implement only the node types needed to represent the current deterministic store flow.

Required node types:

```text
MESSAGE
LANGUAGE_SELECT
MAIN_MENU
CATEGORY_SELECT
PRODUCT_SELECT
PRODUCT_DETAILS
PRODUCT_OPTIONS
CUSTOM_FIELDS
QUANTITY
CART_MENU
CHECKOUT
ORDER_REVIEW
ORDER_CONFIRMATION
HUMAN_HANDOFF
END
```

These can map to existing backend services.

Important:

* `CATEGORY_SELECT` must use the business catalog service.
* `PRODUCT_SELECT` must use the business catalog service.
* `PRODUCT_OPTIONS` must use the variant/option services.
* `CUSTOM_FIELDS` must use product custom fields.
* `QUANTITY` must use stock validation.
* `CART_MENU` must use the cart service.
* `CHECKOUT` must use existing checkout logic.
* `ORDER_CONFIRMATION` must use the existing safe order transaction.

Do not duplicate cart/checkout logic inside flow JSON.

---

## 5. Flow interpreter

Create a flow interpreter layer.

Suggested interface:

```ts
processFlowMessage({
  businessId,
  connectionId,
  customerPhone,
  session,
  input
}): Promise<BotResponse[]>
```

The interpreter should:

1. Load the business’s active published flow version.
2. Load the session’s current node.
3. Validate the incoming input for that node.
4. Save variables/context if needed.
5. Call existing services for product/cart/checkout actions.
6. Determine the next node.
7. Return bot responses.
8. Persist the updated session.

The existing state machine can remain as fallback during migration, but the goal is for the active business to run through the published flow.

---

## 6. Session flow versioning

Update conversation sessions to store:

* businessFlowId
* flowVersionId
* currentNodeId
* flowVariables/context

Important:

* New conversations use the latest published business flow.
* Existing conversations continue with the flow version they started on.
* Publishing a new flow must not break active conversations.
* If a session references a missing/archived flow version, recover safely and log a warning.

---

## 7. Template creation in admin panel

Add internal admin pages:

```text
/admin/flow-templates
/admin/flow-templates/new
/admin/flow-templates/[templateId]
/admin/flow-templates/[templateId]/versions/[versionId]
```

Admins should be able to:

* View templates
* Create template
* Edit draft template JSON/configuration
* Validate template
* Publish template version
* Archive template
* Clone existing template

For now, editing can be form-based or JSON-based with validation.

Do not build drag-and-drop yet.

---

## 8. Business flow assignment

In `/admin/businesses/[businessId]`, add a flow section.

Admin can:

* Select a published flow template.
* Clone it into a business-specific flow.
* View assigned business flow.
* Edit the business flow draft.
* Validate the business flow.
* Publish the business flow.
* Roll back to previous published version if feasible.

Important:

* A business should have one active published flow for customer conversations.
* Do not let a business run an invalid draft flow.
* If no flow is assigned, use a safe fallback or mark health check incomplete.

---

## 9. Business-specific customization

Allow editing the business copy without affecting the original template.

For this milestone, customization may be JSON/form-based.

Supported customizations:

* Button labels
* Message text in English and Arabic
* Enable/disable optional notes step
* Enable/disable pickup if business settings allow
* Enable/disable delivery if business settings allow
* Enable/disable human handoff
* Add simple custom question node before checkout
* Reorder safe optional steps where possible

Do not allow business-specific customization to bypass:

* Stock validation
* Price validation
* Order review
* Confirm order
* Backend transaction

---

## 10. Flow validation

Create a validator that runs before publishing.

Validation must check:

* Flow has one start node.
* Start node exists.
* Every reachable node exists.
* Required node config is valid.
* No broken edges.
* No unsupported node types.
* Required language text exists or has fallback.
* Checkout cannot happen before cart exists.
* Order confirmation cannot happen before review.
* Product/order nodes call protected services.
* No infinite loops unless explicitly allowed and safe.
* WhatsApp button/list limits are respected.
* Arabic/English labels fit WhatsApp practical limits.
* Flow has a safe global fallback for unknown input.
* Flow has restart/menu support if enabled.

Invalid flows must not be publishable.

---

## 11. Seed default templates

Create initial published templates:

### Standard Online Store

Current existing flow.

### Jewelry Store

Based on standard flow, but includes:

* Engraving text support
* Gift wrapping question if product/custom field supports it

### Clothing Store

Based on standard flow, with emphasis on:

* Size
* Color
* Stock/variant selection

These can initially share the same core structure with different default text/settings.

Do not overbuild.

---

## 12. Business health check update

Update business health check to include:

* Business has assigned published flow
* Active flow version exists
* Flow validates successfully
* Flow supported languages match business supported languages
* Flow required settings are compatible with business checkout settings
* No draft-only flow is being used in production

---

## 13. Logs and audit

Add audit logs for:

* Flow template created
* Flow template edited
* Flow template version published
* Template cloned to business
* Business flow edited
* Business flow published
* Business flow rollback if supported
* Business flow archived

Log:

* Admin user
* Template/business flow ID
* Version number
* Timestamp
* Validation result

Do not log secrets.

---

## 14. Migration from current hardcoded flow

Preserve current behavior.

Migration should:

1. Create Standard Online Store template from current flow.
2. Create a business flow for existing test business.
3. Assign published flow to business.
4. Ensure current WhatsApp conversations either:

   * continue with old fallback safely, or
   * migrate safely to the new flow if appropriate.

Do not break active sessions.

Document migration behavior clearly.

---

## 15. Testing

Add tests for:

* Template validation success
* Template validation failure
* Publishing valid template
* Rejecting invalid template
* Cloning template to business
* Editing business flow without changing template
* Publishing business flow
* New session uses published business flow
* Existing session keeps original flow version
* Business without published flow fails health check
* Business A cannot use Business B flow
* Bot behavior remains same for Standard Online Store flow

Manual test:

```text
Assign Standard Online Store template
→ Send WhatsApp restart
→ Complete full order
→ Verify behavior matches previous flow
```

Then:

```text
Clone template for Business A
→ Change welcome/main menu text
→ Publish
→ Send restart
→ Verify new text appears
```

Then:

```text
Business B remains unchanged
```

---

## 16. Completion criteria

Milestone 15 is complete when:

1. Flow templates can be created in internal admin.
2. Flow template versions can be validated and published.
3. Published template can be cloned to a business.
4. Business-specific flow can be edited without changing the template.
5. Business-specific flow can be published.
6. New conversations use the business’s published flow version.
7. Existing conversations are not broken by publishing a new version.
8. The current full store-ordering flow works through the flow system.
9. Flow validation prevents invalid/broken flows from publishing.
10. Business health check detects missing/invalid flow.
11. Audit logs record template and business-flow changes.
12. Standard Online Store template is seeded and working.
13. Jewelry and Clothing starter templates exist at a basic level.
14. Stock, pricing, cart, checkout, and order transactions remain protected backend logic.
15. Existing catalog, dashboard, notifications, and order lifecycle remain working.
16. No visual drag-and-drop builder was added.
17. No AI or voice functionality was added.

After implementation, report:

* Files created
* Files modified
* Database migrations
* Flow JSON schema
* Node types supported
* Flow interpreter approach
* Flow validation rules
* Template seeding approach
* Session versioning approach
* Migration behavior
* Manual test instructions
* Known limitations
* Recommended work for Milestone 16

Stop after the template system and business-specific published flows work.

Do not begin:

* Visual flow builder
* Public client-side flow editor
* Billing
* AI
* Voice
* WhatsApp Catalog sync
* Meta Embedded Signup


# Milestone 16 — Safe Internal Flow Editor

Milestone 15 is complete.

Current flow-template system supports:

* Flow templates
* Template versions
* Business-specific cloned flows
* Published/draft/archived versions
* Raw JSON editing
* Publishing selected business flow versions
* Bot uses the published business flow

Now improve the internal admin experience so Double A can edit common flow behavior safely without manually editing raw JSON every time.

Do not build a visual drag-and-drop builder yet.

---

## Goal

Create a safe internal flow editor inside the admin panel.

The editor should allow Double A admins to edit the most common flow settings using forms, toggles, and preview tools:

```text
Business flow
→ Edit welcome/main-menu copy
→ Edit button labels
→ Edit store-info response
→ Enable/disable safe optional steps
→ Add/edit simple custom questions
→ Preview flow
→ Validate
→ Save draft
→ Publish
```

Raw JSON editing can remain available as an advanced/debug mode, but it should no longer be the primary editing method.

---

## Important rules

* Inspect the existing Milestone 15 flow-template implementation first.
* Preserve all working WhatsApp bot behavior.
* Do not modify public website pages.
* Do not deploy.
* Do not push or merge to `main`.
* Do not add AI.
* Do not add voice.
* Do not add billing.
* Do not add WhatsApp Catalog sync.
* Do not add Meta Embedded Signup.
* Do not build drag-and-drop.
* Do not allow the editor to bypass protected backend services.
* Stock, price, cart, checkout, order creation, reservation, and status transitions must remain protected server-side.
* Every admin change must be audited.
* Invalid flows must not be publishable.

---

## 1. Editor location

Extend the existing admin flow area.

Preferred routes:

```text
/admin/flow-templates/[templateId]/versions/[versionId]
/admin/businesses/[businessId]/flow
/admin/businesses/[businessId]/flow/versions/[versionId]
```

At minimum, business-specific flows must be editable through a structured UI.

The admin should be able to:

* View active published version
* Create/edit draft version
* Validate draft
* Preview draft
* Publish draft
* Archive old versions
* View version history

---

## 2. Main editor sections

Create a tabbed or sectioned editor:

```text
General
Languages
Main Menu
Store Information
Ordering Flow
Checkout
Custom Questions
Human Handoff
Preview
Advanced JSON
```

The exact UI can differ if the existing design suggests a better structure.

---

## 3. General settings

Allow editing:

* Flow name
* Description
* Supported languages
* Default language
* Enable restart command
* Enable menu command
* Enable back command
* Enable cart command
* Enable human handoff

Validation:

* At least one supported language required.
* Default language must be included in supported languages.
* Existing businesses using Arabic/English should remain compatible.

---

## 4. Language and welcome copy

Allow editing English and Arabic text for:

* Welcome message
* Language selection prompt
* Invalid language response
* Restart response
* Main menu intro

Example fields:

```text
Welcome message EN
Welcome message AR
Choose language EN
Choose language AR
Invalid input EN
Invalid input AR
```

Validation:

* Required text must exist for all enabled languages.
* Text should respect WhatsApp practical length limits.
* Arabic fields should remain RTL-friendly in the UI.

---

## 5. Main menu editor

Allow editing:

* Main menu message
* Place order button label
* Ask question button label
* Store information button label
* Optional human support button label

The editor should show a preview like:

```text
How can we help?

[Place an order]
[Ask a question]
[Store information]
```

Arabic preview too.

Validation:

* Button labels cannot be empty.
* Button labels must respect WhatsApp button length limits.
* No duplicate button labels in the same language where that would cause ambiguity.
* Required system actions must remain mapped to internal action IDs, not visible text.

Important:

The label may change, but the action must remain stable.

Example:

```json
{
  "action": "PLACE_ORDER",
  "label": {
    "en": "Place an order",
    "ar": "تقديم طلب"
  }
}
```

---

## 6. Store information response

Allow editing the response shown when customer selects store information.

Fields:

* Store info message EN
* Store info message AR
* Optional opening hours text
* Optional location text
* Optional contact text

This should update the flow JSON safely.

---

## 7. Ordering flow settings

Allow safe toggles for:

* Show product code
* Show product description
* Show product price
* Allow direct product-code lookup
* Allow unavailable products to be shown
* Allow unavailable products to be ordered: must remain false for now unless backend supports it
* Show product image if available
* Ask quantity with quick buttons
* Allow add another item
* Allow view cart

Do not allow disabling essential safety steps:

* Stock validation
* Server-side total calculation
* Order review
* Confirm order

---

## 8. Checkout settings inside flow

Allow safe flow-level toggles only when compatible with business settings:

* Ask customer name
* Ask alternate phone
* Ask delivery/pickup choice
* Ask notes
* Show final review
* Require final confirmation

Rules:

* Final review cannot be disabled.
* Final confirmation cannot be disabled.
* If business settings disable pickup, the flow cannot enable pickup.
* If business settings disable delivery, the flow cannot enable delivery.
* If both delivery and pickup are disabled, validation must fail.
* Flow editor must explain compatibility errors clearly.

Business checkout settings remain the source of truth for fees, payment methods, pickup locations, and delivery areas.

---

## 9. Custom question editor

Add an internal form for safe custom questions.

For this milestone, support business-flow-level custom questions that can appear:

* Before checkout
* During checkout notes section
* After cart before review

Supported types:

```text
short_text
long_text
number
yes_no
single_choice
```

Fields:

* Internal key
* Label EN
* Label AR
* Help text EN
* Help text AR
* Required yes/no
* Type
* Validation rules
* Choice values if single_choice
* Sort order
* Active/inactive

Validation:

* Internal key must be unique within the flow.
* Required fields need labels.
* Number fields need valid min/max if provided.
* Choice questions need at least two choices.
* Customer answers must be saved into checkout/order metadata.
* Product-specific custom fields should remain product-level; do not replace them.

Do not overbuild conditional custom questions yet.

---

## 10. Human handoff settings

Allow editing:

* Enable human handoff
* Handoff button label EN/AR
* Handoff response EN/AR
* Max invalid attempts before offering handoff
* Store owner support note

Example:

```text
A team member will help you shortly.
```

For now, handoff can mark the conversation status as requiring human support.

Do not build a full team inbox in this milestone.

---

## 11. Preview mode

Add a non-WhatsApp preview/simulator inside the admin editor.

The preview should allow Double A admin to test:

```text
Welcome
→ Language
→ Main menu
→ Store info
→ Place order
```

At minimum, preview should show the configured copy and buttons.

Better if it can run the existing simulator against the draft flow.

Important:

* Preview must not send real WhatsApp messages.
* Preview must not create real orders unless explicitly using a test/simulation mode.
* Preview should clearly label whether it is testing draft or published flow.

---

## 12. Validation panel

Add a validation panel that shows:

```text
✅ Valid
⚠ Warning
❌ Error
```

Validation should run before saving/publishing.

Errors block publish.

Warnings allow publish but should be visible.

Examples of errors:

* Missing start node
* Missing main menu labels
* Unsupported node type
* Checkout disabled final review
* Delivery enabled in flow but disabled in business settings
* Broken edge
* Missing required Arabic text while Arabic is enabled

Examples of warnings:

* Very long message text
* Human handoff disabled
* Store info response empty
* Optional notes disabled

---

## 13. Draft and publish behavior

Editing should not affect the live bot until published.

Required behavior:

```text
Published version active
→ Admin edits
→ Draft version created/updated
→ Admin validates draft
→ Admin publishes draft
→ New conversations use new version
→ Existing conversations remain on their original version
```

Do not overwrite published versions directly.

Version history should remain visible.

---

## 14. Advanced JSON mode

Keep the raw JSON editor as an advanced mode.

Requirements:

* Clearly label it as advanced.
* Validate JSON syntax.
* Validate against flow schema.
* Show diff or warning before publishing if practical.
* Do not allow invalid JSON to be saved as published.
* Form editor and JSON editor should not silently overwrite each other.

A simple approach is acceptable:

```text
Basic editor updates known config sections.
Advanced JSON exposes full flowJson.
Switching modes requires saving/reloading.
```

Document limitations.

---

## 15. Audit logs

Add audit entries for:

* Draft created
* Draft edited from form editor
* Draft edited from JSON editor
* Validation run
* Publish attempted
* Publish succeeded
* Publish failed
* Flow archived
* Flow restored/rolled back if supported

Audit log should include:

* Admin user
* Business ID
* Flow ID
* Version ID
* Action
* Timestamp
* Validation result

Do not log large full flow JSON unless already sanitized and intentional.

---

## 16. Business health check update

Update health checks to include:

* Business has published flow
* Published flow validates
* Draft flow exists with warnings/errors, if applicable
* Flow languages compatible with business languages
* Flow checkout settings compatible with business checkout settings

Business can be active with a valid published flow even if it has an invalid draft.

---

## 17. Tests

Add tests for:

* Editing welcome copy creates or updates draft
* Publishing valid draft works
* Publishing invalid draft fails
* Button label changes preserve internal actions
* Store info response changes appear in bot flow
* Required language text validation
* Delivery/pickup compatibility validation
* Custom question validation
* Existing published version remains active until publish
* New conversation uses newly published version
* Existing conversation remains on old version
* Advanced JSON invalid syntax rejected
* Business A cannot edit Business B flow
* Audit log created for edits and publishing

Manual tests:

```text
Open Business A flow editor
→ Change welcome text
→ Save draft
→ Preview draft
→ Publish
→ Send WhatsApp restart
→ Verify new welcome text appears
```

Then:

```text
Start a conversation
→ Publish a new version while conversation is active
→ Continue old conversation
→ Verify it does not break
→ Restart
→ Verify new flow version is used
```

---

## 18. Completion criteria

Milestone 16 is complete when:

1. Admin can edit common flow copy without raw JSON.
2. Admin can edit main menu labels safely.
3. Internal action mapping survives label changes.
4. Admin can edit store-information response.
5. Admin can toggle safe ordering/checkout settings.
6. Admin can add simple flow-level custom questions.
7. Admin can configure human handoff text/settings.
8. Admin can preview the draft flow without WhatsApp.
9. Validation panel clearly shows errors and warnings.
10. Invalid drafts cannot be published.
11. Draft changes do not affect live bot until published.
12. Version history remains intact.
13. Existing conversations keep their original flow version.
14. New conversations use the latest published version.
15. Advanced JSON mode remains available and validated.
16. Business health check includes flow validity.
17. Audit logs record flow edits and publishes.
18. Business isolation is enforced.
19. Existing ordering, checkout, orders, notifications and lifecycle still work.
20. No drag-and-drop builder, AI, voice, billing, Catalog sync, or Embedded Signup was added.

After completion, report:

* Files created
* Files modified
* Database migrations
* Editor UI sections added
* Validation rules added
* Draft/publish behavior
* Preview behavior
* Advanced JSON limitations
* Audit-log behavior
* Manual test instructions
* Known limitations
* Recommended work for Milestone 17

Stop after safe internal flow editing works.

Do not begin:

* Visual drag-and-drop builder
* Client-facing flow editor
* Billing
* AI
* Voice
* WhatsApp Catalog sync
* Meta Embedded Signup


# Milestone 17 — Internal Drag-and-Drop Flow Builder

We already have:

* Multi-business architecture
* WhatsApp deterministic bot
* Dynamic catalog/settings
* Owner dashboard
* Double A admin panel
* Flow templates
* Flow versions
* Safe text/copy editor
* Preview/validation/advanced JSON tabs
* Published/draft/archive flow versions

The current flow editor is form-based. This milestone upgrades it into an internal admin-only visual drag-and-drop flow builder.

This is not client-facing yet.

---

## Goal

Allow Double A admins to visually build, edit, validate, preview, and publish WhatsApp conversation flows using approved flow blocks.

The builder should support:

```text
Flow template → clone to business → edit visually → save draft → validate → preview → publish → bot uses published flow
```

The system must remain deterministic and safe.

---

## Important rules

* Do not make this client-facing.
* Do not add AI.
* Do not add voice.
* Do not add billing.
* Do not add Meta Embedded Signup.
* Do not add WhatsApp Catalog sync.
* Do not break the existing working published flows.
* Do not remove Advanced JSON.
* Do not let invalid flows be published.
* Do not execute arbitrary admin-entered code.
* Do not let flow edits bypass catalog, stock, pricing, checkout, or order safety.
* Preserve existing flow versioning.
* Preserve business-specific cloned flows.
* Preserve archived versions.
* Preserve current bot behavior unless a new valid published flow intentionally changes it.

---

## 1. Builder layout

Create a visual builder inside the existing admin conversation flow section.

Recommended layout:

```text
Left panel: block palette
Center: drag-and-drop canvas
Right panel: selected block settings
Top/bottom actions: Save draft, Validate, Preview, Publish selected
```

The UI should support:

* Add block from palette
* Drag block position
* Connect block to another block
* Select block
* Edit block settings
* Delete block
* Duplicate block
* Reorder/adjust blocks visually
* Show validation errors visually
* Save draft
* Publish only valid flow
* Preview draft before publishing

---

## 2. Supported block types

Start with approved block types only.

Required blocks:

```text
START
SEND_MESSAGE
LANGUAGE_SELECTION
MAIN_MENU
STORE_INFO
CATEGORY_SELECTION
PRODUCT_SELECTION
PRODUCT_DETAILS
QUESTION
CONDITION
CART_REVIEW
CHECKOUT_CUSTOMER_NAME
CHECKOUT_FULFILLMENT
CHECKOUT_DELIVERY_DETAILS
CHECKOUT_PAYMENT_METHOD
CHECKOUT_NOTES
ORDER_REVIEW
ORDER_CONFIRMATION
HUMAN_HANDOFF
GO_TO_MAIN_MENU
END
```

Do not build unlimited custom logic yet.

---

## 3. Block data model

Each block should have:

```ts
id
type
title
position: { x, y }
config
edges
createdAt
updatedAt
```

Each edge should have:

```ts
id
sourceNodeId
sourceHandle
targetNodeId
label
condition
sortOrder
```

The full draft flow may be stored as one JSON document inside the flow version, or normalized into nodes/edges if the current architecture supports that better.

Do not break the existing versioning system.

---

## 4. Visual flow JSON

A draft flow should store something like:

```ts
{
  "version": 1,
  "nodes": [],
  "edges": [],
  "metadata": {
    "name": "",
    "languageSupport": ["en", "ar"],
    "defaultLanguage": "en"
  }
}
```

Published flows should store both:

```text
visualFlowJson
compiledRuntimeFlowJson
```

The bot should use the compiled runtime flow, not the raw visual canvas directly.

---

## 5. Compiler

Create a flow compiler:

```ts
compileVisualFlowToRuntimeFlow(visualFlow): CompiledFlow
```

The compiler should convert visual nodes/edges into the existing runtime format used by the bot.

If the existing bot engine needs gradual migration, create a compatibility layer instead of rewriting everything at once.

The compiler must:

* Preserve multilingual copy
* Preserve menu options
* Preserve checkout logic
* Preserve question definitions
* Preserve handoff rules
* Preserve fallback behavior
* Preserve store info behavior
* Preserve order/cart safety
* Produce deterministic runtime config

---

## 6. Validation

Before publishing, validate the visual flow.

Validation must catch:

* Missing START node
* More than one START node
* Missing required language copy
* Empty menu options
* Broken edges
* Unreachable nodes
* Dead-end nodes without END or valid next step
* Invalid condition references
* Invalid question config
* Duplicate option keys
* Missing fallback path
* Checkout flow missing required steps
* Handoff block missing message/settings
* Loops without escape/fallback
* Nodes connected to incompatible targets
* Product/category/cart/checkout blocks used incorrectly
* Runtime compile failure

Validation output should show:

```text
Errors: must fix before publishing
Warnings: allowed but should review
```

Invalid drafts can be saved, but cannot be published.

---

## 7. Node settings

When selecting a node, show editable settings in the right panel.

### SEND_MESSAGE

Fields:

```text
Title
Message EN
Message AR
Next block
```

### MAIN_MENU

Fields:

```text
Intro EN
Intro AR
Menu options
Each option label EN/AR
Each option target block
Fallback message EN/AR
```

### QUESTION

Fields:

```text
Question key
Question text EN
Question text AR
Type: short_text / long_text / number / yes_no / single_choice
Required
Choices if single_choice
Validation rules
Save answer to: customer / item / cart / order
Next block
Fallback message
```

### CONDITION

Fields:

```text
Condition source
Rules
Target for each rule
Fallback target
```

### HUMAN_HANDOFF

Fields:

```text
Handoff prompt EN
Handoff prompt AR
Owner alert enabled
Pause bot: true/false
After handoff behavior
```

### CHECKOUT blocks

Fields should stay controlled. Admin may edit copy/toggles but cannot break order creation logic.

---

## 8. Preview simulator

Add or improve the Preview tab.

The preview should allow admin to test a draft flow without sending real WhatsApp messages.

Simulator should show:

```text
Customer message
Bot reply
Current node
Current collected answers
Cart/order simulation state
Validation warnings
```

It should support:

* English
* Arabic
* Menu choices
* Questions
* Conditions
* Handoff path
* Checkout path
* Back/main menu/restart if supported

No real order should be created unless explicitly using a simulation flag.

---

## 9. Advanced JSON

Keep Advanced JSON.

But make it clear whether the JSON represents:

```text
Visual flow JSON
Compiled runtime JSON
```

Admin should be able to inspect both if useful.

If editing raw JSON is allowed, it must still go through validation before publish.

---

## 10. Versioning

Preserve current version behavior:

```text
Draft
Published
Archived
```

Rules:

* Editing a published version creates a draft.
* Publishing a valid draft archives the previous published version.
* Archived versions are read-only.
* Admin can clone an archived version into a new draft.
* Admin can preview any version.
* Admin can compare current draft against published version if practical.

---

## 11. Templates

The builder must work for both:

```text
Global templates
Business-specific cloned flows
```

Admin should be able to:

* Edit a template visually
* Publish template version
* Clone template to business
* Edit business-specific copy/blocks
* Publish business-specific version

Do not automatically overwrite business-customized flows when a base template changes.

---

## 12. Runtime safety

The bot runtime must remain safe.

Rules:

* Published flow must be validated.
* Bot should load the active published compiled flow.
* If compiled flow is missing or invalid, use safe fallback.
* If a node fails at runtime, log error and send safe fallback message.
* Never lose cart/order/session because of flow rendering error.
* Do not allow flow blocks to directly modify stock/prices.
* Product/category/order data must still come from trusted database tables, not flow JSON.

---

## 13. Admin permissions

Only Double A admins can use this builder.

Owners/clients should not see this yet.

Add permission checks to all APIs:

* Read flow
* Save draft
* Validate
* Publish
* Archive
* Clone
* Edit JSON

Audit important actions:

```text
FLOW_DRAFT_CREATED
FLOW_DRAFT_UPDATED
FLOW_VALIDATED
FLOW_PUBLISHED
FLOW_ARCHIVED
FLOW_CLONED
FLOW_JSON_EDITED
```

---

## 14. UI quality

The builder should feel clean and professional.

Requirements:

* Dark theme consistent with current admin panel
* Clear node labels
* Icons or colors per block type if available
* Visible connection handles
* Validation badges
* Unsaved changes indicator
* Empty state for new flow
* Confirmation before deleting node
* Confirmation before publishing
* Clear errors beside problematic nodes
* Responsive enough for laptop screens

Do not over-polish animations at the cost of stability.

---

## 15. Tests

Add tests for:

* Creating visual draft
* Adding nodes
* Connecting nodes
* Editing node settings
* Saving draft
* Validating valid flow
* Rejecting invalid flow
* Preventing publish with errors
* Publishing valid draft
* Archiving previous published version
* Loading published compiled flow in bot runtime
* Runtime fallback if flow missing
* Question node answer storage
* Condition node routing
* Handoff node routing
* Main menu node routing
* Checkout nodes preserve order creation safety
* Admin-only access
* Owner cannot access builder APIs

Manual QA:

```text
Create a simple flow:
START → LANGUAGE_SELECTION → MAIN_MENU → STORE_INFO → END
Validate
Preview
Publish
Test in bot
```

Then:

```text
Create order flow:
START → LANGUAGE_SELECTION → MAIN_MENU → CATEGORY_SELECTION → PRODUCT_SELECTION → QUESTION → CART_REVIEW → CHECKOUT → ORDER_CONFIRMATION
Validate
Preview
Publish
Test in bot
```

Then:

```text
Create handoff flow:
MAIN_MENU → HUMAN_HANDOFF
Validate
Preview
Publish
Confirm bot routes correctly
```

---

## 16. Completion criteria

Milestone is complete when:

1. Admin can visually create/edit flow blocks.
2. Admin can drag blocks on a canvas.
3. Admin can connect blocks.
4. Admin can edit selected block settings.
5. Admin can save a draft visual flow.
6. Admin can validate a draft.
7. Invalid drafts cannot be published.
8. Admin can preview a draft.
9. Admin can publish a valid flow.
10. Previous published version is archived.
11. Bot loads the active compiled published flow.
12. Existing catalog/cart/checkout/order safety is preserved.
13. Questions can be added visually.
14. Conditions can route between blocks.
15. Handoff block exists.
16. Advanced JSON remains available.
17. Global templates and business-specific flows still work.
18. Flow builder is admin-only.
19. Audit logs record important flow actions.
20. Existing current published flow still works.

After implementation, report:

* Files created
* Files modified
* Database changes
* Flow JSON structure
* Compiler approach
* Validation rules
* Runtime integration
* UI changes
* Tests added
* Known limitations
* Recommended next milestone

Stop after the internal drag-and-drop flow builder works.

Do not begin human inbox, AI, voice, billing, Embedded Signup, or WhatsApp Catalog sync.
