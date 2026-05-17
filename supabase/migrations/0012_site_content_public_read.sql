-- Public read for storefront CMS keys; admin write unchanged (0005_admin_panel_schema.sql).

drop policy if exists "site_settings_public_read_content" on public.site_settings;
create policy "site_settings_public_read_content"
  on public.site_settings for select
  using (key in ('hero_slides', 'footer_social'));
