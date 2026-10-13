-- Customers can read the home page product-section heading.
-- Writes stay admin-only through site_settings_admin_write.

drop policy if exists "site_settings_public_read_content" on public.site_settings;
create policy "site_settings_public_read_content"
  on public.site_settings for select
  using (
    key in (
      'hero_slides',
      'footer_social',
      'top_banner',
      'home_product_header',
      'return_policy',
      'shipping_instructions',
      'privacy_policy',
      'terms_of_service',
      'contact_recipient'
    )
  );
