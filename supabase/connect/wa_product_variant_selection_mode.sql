alter table public.wa_products
  add column if not exists variant_selection_mode text not null default 'step_by_step';

do $$
begin
  alter table public.wa_products
    add constraint wa_products_variant_selection_mode_check
    check (variant_selection_mode in ('step_by_step', 'variant_list'));
exception
  when duplicate_object then null;
end $$;
