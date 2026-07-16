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
  browse_routes jsonb not null default '[{"key":"categories","source":"categories","label":{"en":"Categories","ar":"\u0627\u0644\u0641\u0626\u0627\u062a"},"active":true,"sortOrder":1}]'::jsonb,
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
  add column if not exists browse_routes jsonb not null default '[{"key":"categories","source":"categories","label":{"en":"Categories","ar":"\u0627\u0644\u0641\u0626\u0627\u062a"},"active":true,"sortOrder":1}]'::jsonb,
  add column if not exists checkout_prompt_overrides jsonb not null default '{}'::jsonb;

alter table public.wa_bot_flow_settings enable row level security;

grant select, insert, update, delete on public.wa_bot_flow_settings to service_role;
