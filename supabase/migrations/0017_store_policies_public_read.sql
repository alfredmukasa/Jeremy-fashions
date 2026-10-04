-- Customers can read published store copy and the public contact address.
-- Writes stay admin-only through the existing site_settings_admin_write policy.

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
      'contact_recipient'
    )
  );
