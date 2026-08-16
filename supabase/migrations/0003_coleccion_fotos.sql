create table public.coleccion_fotos (
  id uuid primary key default gen_random_uuid(),
  coleccion_id uuid not null references public.user_collection (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index coleccion_fotos_coleccion_created_idx
  on public.coleccion_fotos (coleccion_id, created_at desc);

alter table public.coleccion_fotos enable row level security;

create policy "coleccion_fotos_owner_all" on public.coleccion_fotos
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_collection c
      where c.id = coleccion_id and c.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.user_collection c
      where c.id = coleccion_id and c.user_id = (select auth.uid())
    )
  );

-- Fotos de usuario en el bucket existente 'plantas-fotos', bajo
-- {user_id}/coleccion/{coleccion_id}/{archivo} para no chocar con las fotos
-- del catálogo admin que usan {user_id}/{planta_id}.{ext}. Las policies del
-- bucket ya restringen por primer segmento de carpeta = auth.uid(), así que
-- alcanza con sumar policies para insert/select/delete en este subpath.
create policy "coleccion_fotos_owner_select" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'plantas-fotos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] = 'coleccion'
  );

create policy "coleccion_fotos_owner_insert" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'plantas-fotos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] = 'coleccion'
  );

create policy "coleccion_fotos_owner_delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'plantas-fotos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] = 'coleccion'
  );
