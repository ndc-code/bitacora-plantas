create table public.user_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text,
  snapshot jsonb not null,
  photo_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index on public.user_backups (user_id, created_at desc);

alter table public.user_backups enable row level security;

-- `(select auth.uid())` para que Postgres cachee el valor una vez por consulta.
create policy "user_backups_owner_all" on public.user_backups
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Nota: los binarios de las copias van a {user_id}/backups/... en el bucket
-- 'plantas-fotos'. Las policies plantas_fotos_owner_* de 0001_init.sql chequean
-- solo el primer segmento de carpeta = auth.uid(), así que ya cubren ese path.
