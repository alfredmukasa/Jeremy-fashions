-- Allow anonymous read of top announcement bar CMS key.

drop policy if exists "site_settings_public_read_content" on public.site_settings;
create policy "site_settings_public_read_content"
  on public.site_settings for select
  using (key in ('hero_slides', 'footer_social', 'top_banner'));
