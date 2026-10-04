-- Customers can read published privacy and terms copy.
-- Writes and deletes stay admin-only through site_settings_admin_write.

drop policy if exists "site_settings_public_read_content" on public.site_settings;
create policy "site_settings_public_read_content"
  on public.site_settings for select
  using (
    key in (
      'hero_slides',
      'footer_social',
      'top_banner',
      'return_policy',
      'shipping_instructions',
      'privacy_policy',
      'terms_of_service',
      'contact_recipient'
    )
  );
