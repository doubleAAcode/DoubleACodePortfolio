-- Partner / -2 bot flow settings
--
-- This creates the shared SaaS table used by the bot engine, but the seed below
-- is intentionally partner-only. It inserts or updates only:
--   business_id = 'double-a-partner-test-business'
--
-- Do not add main-business seed data to this file.
-- Main business id, intentionally untouched here:
--   double-a-test-business

create table if not exists public.wa_bot_flow_settings (
  business_id text primary key references public.wa_businesses(id) on delete cascade,
  language_selection_enabled boolean not null default true,
  default_language text not null default 'en',
  welcome_message_english text not null default 'How can we help?',
  welcome_message_arabic text not null default U&'\0643\064a\0641 \064a\0645\0643\0646\0646\0627 \0645\0633\0627\0639\062f\062a\0643\061f',
  order_button_english text not null default 'Place an order',
  order_button_arabic text not null default U&'\062a\0642\062f\064a\0645 \0637\0644\0628',
  question_button_english text not null default 'Ask a question',
  question_button_arabic text not null default U&'\0637\0631\062d \0633\0624\0627\0644',
  question_response_english text not null default 'Send us your question here and our team will reply shortly.',
  question_response_arabic text not null default U&'\0627\0631\0633\0644 \0633\0624\0627\0644\0643 \0647\0646\0627 \0648\0633\064a\0631\062f \0641\0631\064a\0642\0646\0627 \0642\0631\064a\0628\0627.',
  info_button_english text not null default 'Store information',
  info_button_arabic text not null default U&'\0645\0639\0644\0648\0645\0627\062a \0627\0644\0645\062a\062c\0631',
  info_response_english text not null default 'We are open daily. Send a message here if you need help.',
  info_response_arabic text not null default U&'\0646\062d\0646 \0645\062a\0627\062d\0648\0646 \064a\0648\0645\064a\0627. \0627\0631\0633\0644 \0631\0633\0627\0644\0629 \0647\0646\0627 \0625\0630\0627 \0627\062d\062a\062c\062a \0645\0633\0627\0639\062f\0629.',
  checkout_prompt_overrides jsonb not null default '{}'::jsonb,
  show_product_details_before_ordering boolean not null default true,
  auto_use_saved_checkout_details boolean not null default false,
  skip_fulfillment_when_single_option boolean not null default true,
  skip_delivery_area_when_single_option boolean not null default true,
  skip_pickup_location_when_single_option boolean not null default true,
  skip_payment_when_single_option boolean not null default true,
  order_notes_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wa_bot_flow_settings
  add column if not exists question_response_english text not null default 'Send us your question here and our team will reply shortly.',
  add column if not exists question_response_arabic text not null default U&'\0627\0631\0633\0644 \0633\0624\0627\0644\0643 \0647\0646\0627 \0648\0633\064a\0631\062f \0641\0631\064a\0642\0646\0627 \0642\0631\064a\0628\0627.',
  add column if not exists info_response_english text not null default 'We are open daily. Send a message here if you need help.',
  add column if not exists info_response_arabic text not null default U&'\0646\062d\0646 \0645\062a\0627\062d\0648\0646 \064a\0648\0645\064a\0627. \0627\0631\0633\0644 \0631\0633\0627\0644\0629 \0647\0646\0627 \0625\0630\0627 \0627\062d\062a\062c\062a \0645\0633\0627\0639\062f\0629.',
  add column if not exists checkout_prompt_overrides jsonb not null default '{}'::jsonb;

alter table public.wa_bot_flow_settings enable row level security;

grant select, insert, update, delete on public.wa_bot_flow_settings to service_role;

-- Partner-only seed for /dashboard-2 and /api/whatsapp/webhook-2.
insert into public.wa_bot_flow_settings (
  business_id,
  language_selection_enabled,
  default_language,
  welcome_message_english,
  welcome_message_arabic,
  order_button_english,
  order_button_arabic,
  question_button_english,
  question_button_arabic,
  question_response_english,
  question_response_arabic,
  info_button_english,
  info_button_arabic,
  info_response_english,
  info_response_arabic,
  checkout_prompt_overrides,
  show_product_details_before_ordering,
  auto_use_saved_checkout_details,
  skip_fulfillment_when_single_option,
  skip_delivery_area_when_single_option,
  skip_pickup_location_when_single_option,
  skip_payment_when_single_option,
  order_notes_enabled
)
values (
  'double-a-partner-test-business',
  false,
  'en',
  'How can we help?',
  U&'\0643\064a\0641 \064a\0645\0643\0646\0646\0627 \0645\0633\0627\0639\062f\062a\0643\061f',
  'Place an order',
  U&'\062a\0642\062f\064a\0645 \0637\0644\0628',
  'Ask a question',
  U&'\0637\0631\062d \0633\0624\0627\0644',
  'Send us your question here and our team will reply shortly.',
  U&'\0627\0631\0633\0644 \0633\0624\0627\0644\0643 \0647\0646\0627 \0648\0633\064a\0631\062f \0641\0631\064a\0642\0646\0627 \0642\0631\064a\0628\0627.',
  'Store information',
  U&'\0645\0639\0644\0648\0645\0627\062a \0627\0644\0645\062a\062c\0631',
  'We are open daily. Send a message here if you need help.',
  U&'\0646\062d\0646 \0645\062a\0627\062d\0648\0646 \064a\0648\0645\064a\0627. \0627\0631\0633\0644 \0631\0633\0627\0644\0629 \0647\0646\0627 \0625\0630\0627 \0627\062d\062a\062c\062a \0645\0633\0627\0639\062f\0629.',
  '{"customerNamePromptEnglish":"What name should we put on the order?","customerNamePromptArabic":"\u0645\u0627 \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0630\u064a \u0646\u0636\u0639\u0647 \u0639\u0644\u0649 \u0627\u0644\u0637\u0644\u0628\u061f","fulfillmentPromptEnglish":"How would you like to receive your order?","fulfillmentPromptArabic":"\u0643\u064a\u0641 \u062a\u0631\u064a\u062f \u0627\u0633\u062a\u0644\u0627\u0645 \u0637\u0644\u0628\u0643\u061f","deliveryAreaPromptEnglish":"Choose your delivery area:","deliveryAreaPromptArabic":"\u0627\u062e\u062a\u0631 \u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u062a\u0648\u0635\u064a\u0644:","pickupLocationPromptEnglish":"Choose a pickup location:","pickupLocationPromptArabic":"\u0627\u062e\u062a\u0631 \u0645\u0643\u0627\u0646 \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645:","deliveryAddressPromptEnglish":"Send the full delivery address. You can also send a WhatsApp location.","deliveryAddressPromptArabic":"\u0623\u0631\u0633\u0644 \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062a\u0648\u0635\u064a\u0644 \u0627\u0644\u0643\u0627\u0645\u0644. \u064a\u0645\u0643\u0646\u0643 \u0623\u064a\u0636\u0627 \u0625\u0631\u0633\u0627\u0644 \u0645\u0648\u0642\u0639 \u0648\u0627\u062a\u0633\u0627\u0628.","paymentMethodPromptEnglish":"Choose a payment method:","paymentMethodPromptArabic":"\u0627\u062e\u062a\u0631 \u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062f\u0641\u0639:","orderNotesPromptEnglish":"Would you like to add any notes?","orderNotesPromptArabic":"\u0647\u0644 \u062a\u0631\u064a\u062f \u0625\u0636\u0627\u0641\u0629 \u0645\u0644\u0627\u062d\u0638\u0627\u062a\u061f","noNotesButtonEnglish":"No notes","noNotesButtonArabic":"\u0628\u062f\u0648\u0646 \u0645\u0644\u0627\u062d\u0638\u0627\u062a"}'::jsonb,
  true,
  false,
  true,
  true,
  true,
  true,
  true
)
on conflict (business_id) do update set
  language_selection_enabled = excluded.language_selection_enabled,
  default_language = excluded.default_language,
  welcome_message_english = excluded.welcome_message_english,
  welcome_message_arabic = excluded.welcome_message_arabic,
  order_button_english = excluded.order_button_english,
  order_button_arabic = excluded.order_button_arabic,
  question_button_english = excluded.question_button_english,
  question_button_arabic = excluded.question_button_arabic,
  question_response_english = excluded.question_response_english,
  question_response_arabic = excluded.question_response_arabic,
  info_button_english = excluded.info_button_english,
  info_button_arabic = excluded.info_button_arabic,
  info_response_english = excluded.info_response_english,
  info_response_arabic = excluded.info_response_arabic,
  checkout_prompt_overrides = excluded.checkout_prompt_overrides,
  show_product_details_before_ordering = excluded.show_product_details_before_ordering,
  auto_use_saved_checkout_details = excluded.auto_use_saved_checkout_details,
  skip_fulfillment_when_single_option = excluded.skip_fulfillment_when_single_option,
  skip_delivery_area_when_single_option = excluded.skip_delivery_area_when_single_option,
  skip_pickup_location_when_single_option = excluded.skip_pickup_location_when_single_option,
  skip_payment_when_single_option = excluded.skip_payment_when_single_option,
  order_notes_enabled = excluded.order_notes_enabled,
  updated_at = now()
where public.wa_bot_flow_settings.business_id = 'double-a-partner-test-business';
