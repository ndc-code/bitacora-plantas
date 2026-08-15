alter table public.user_collection
  add column if not exists created_at timestamptz not null default now();

create table public.coleccion_cuidados (
  id uuid primary key default gen_random_uuid(),
  coleccion_id uuid not null references public.user_collection (id) on delete cascade,
  tipo public.tipo_cuidado not null,
  fecha timestamptz not null default now(),
  notas text,
  created_at timestamptz not null default now()
);

create index coleccion_cuidados_coleccion_tipo_fecha_idx
  on public.coleccion_cuidados (coleccion_id, tipo, fecha desc);

alter table public.coleccion_cuidados enable row level security;

create policy "coleccion_cuidados_owner_all" on public.coleccion_cuidados
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
