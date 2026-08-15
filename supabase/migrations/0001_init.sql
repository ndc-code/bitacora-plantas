-- Enum shared by cuidado_config and cuidados
create type public.tipo_cuidado as enum ('regar', 'fertilizar', 'trasplantar', 'podar', 'otro');

create table public.plantas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nombre text not null,
  especie text,
  ubicacion text,
  foto_url text,
  fecha_adquisicion date,
  notas text,
  created_at timestamptz not null default now()
);

create table public.cuidado_config (
  id uuid primary key default gen_random_uuid(),
  planta_id uuid not null references public.plantas (id) on delete cascade,
  tipo public.tipo_cuidado not null,
  frecuencia_dias integer,
  unique (planta_id, tipo)
);

create table public.cuidados (
  id uuid primary key default gen_random_uuid(),
  planta_id uuid not null references public.plantas (id) on delete cascade,
  tipo public.tipo_cuidado not null,
  fecha timestamptz not null default now(),
  notas text,
  created_at timestamptz not null default now()
);

-- Índices para los accesos del cliente: plantas por usuario, config por planta,
-- y el último cuidado por (planta, tipo) que usa el cálculo de estados.
create index on public.plantas (user_id);
create index on public.cuidado_config (planta_id);
create index on public.cuidados (planta_id, tipo, fecha desc);

alter table public.plantas enable row level security;
alter table public.cuidado_config enable row level security;
alter table public.cuidados enable row level security;

-- `(select auth.uid())` en vez de `auth.uid()`: permite a Postgres cachear el
-- valor una vez por consulta en lugar de reevaluarlo por fila.
create policy "plantas_owner_all" on public.plantas
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "cuidado_config_owner_all" on public.cuidado_config
  for all
  to authenticated
  using (exists (select 1 from public.plantas p where p.id = planta_id and p.user_id = (select auth.uid())))
  with check (exists (select 1 from public.plantas p where p.id = planta_id and p.user_id = (select auth.uid())));

create policy "cuidados_owner_all" on public.cuidados
  for all
  to authenticated
  using (exists (select 1 from public.plantas p where p.id = planta_id and p.user_id = (select auth.uid())))
  with check (exists (select 1 from public.plantas p where p.id = planta_id and p.user_id = (select auth.uid())));

-- Storage: private bucket for plant photos, one folder per user
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'plantas-fotos',
  'plantas-fotos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

create policy "plantas_fotos_owner_select" on storage.objects
  for select
  to authenticated
  using (bucket_id = 'plantas-fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "plantas_fotos_owner_insert" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'plantas-fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "plantas_fotos_owner_update" on storage.objects
  for update
  to authenticated
  using (bucket_id = 'plantas-fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "plantas_fotos_owner_delete" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'plantas-fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
