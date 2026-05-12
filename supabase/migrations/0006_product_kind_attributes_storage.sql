-- =============================================================================
-- Category-aware catalog: product_kind, flexible attributes, public image bucket
-- =============================================================================

alter table public.categories
  add column if not exists product_kind text not null default 'apparel'
    check (product_kind in ('apparel', 'footwear', 'accessories'));

update public.categories
set product_kind = 'footwear'
where slug in ('sneakers', 'shoes', 'footwear');

update public.categories
set product_kind = 'accessories'
where slug = 'accessories';

alter table public.products
  add column if not exists attributes jsonb not null default '{}'::jsonb;

create index if not exists products_attributes_idx on public.products using gin (attributes);

-- -----------------------------------------------------------------------------
-- Product images bucket (public read, admin write)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update"
  on storage.objects for update
  using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_admin());
