# Bitácora de Plantas — MVP (Fase 1) — Design

## Objetivo

Una bitácora web donde cada usuario registra las plantas que tiene, lleva un
historial de los cuidados que les da (regar, fertilizar, trasplantar, podar)
y ve de un vistazo qué planta necesita atención.

## Alcance

**Incluido en este spec (Fase 1 / MVP):**
- Registro e inicio de sesión de usuarios (multi-usuario, cada uno con su
  propia bitácora privada).
- CRUD de plantas, con foto principal opcional.
- Configuración de frecuencia de cuidado por tipo, por planta.
- Bitácora (log) de eventos de cuidado por planta.
- Indicador visual en el dashboard de qué planta necesita cuidado
  (vencido / próximo / al día).

**Explícitamente fuera de alcance (Fase 2, spec separado):**
- Notificaciones por email cuando toca un cuidado (Edge Function + cron en
  Supabase). El MVP solo muestra el estado visualmente en el dashboard.
- Tipos de cuidado personalizados por el usuario — la lista es fija y
  acotada (ver Modelo de datos).

## Arquitectura

- **Frontend**: HTML/CSS/JS plano, sin framework ni build tool. Tres
  páginas ya scaffoldeadas mapean 1:1 con las pantallas:
  - `index.html` — login / registro
  - `dashboard.html` — listado de plantas del usuario
  - `planta.html` — detalle de una planta + su bitácora
- Cliente `supabase-js` cargado vía CDN (`js/config.js` inicializa el
  cliente con URL + anon key del proyecto).
- **Backend**: Supabase — Auth (email/password), Postgres con Row Level
  Security, Storage para fotos.
- **Deploy**: hosting estático (Netlify/Vercel/GitHub Pages), sin paso de
  build.

Se eligió esta arquitectura (en vez de agregar Vite o un framework SPA)
porque el objetivo explícito es una app sencilla, y ya existía un scaffold
de páginas y servicios apuntando en esta dirección.

## Modelo de datos (Postgres)

```
plantas
  id                 uuid, pk, default gen_random_uuid()
  user_id            uuid, fk -> auth.users, not null
  nombre             text, not null
  especie            text, null
  ubicacion          text, null
  foto_url           text, null            -- path en Supabase Storage
  fecha_adquisicion  date, null
  notas              text, null
  created_at         timestamptz, default now()

cuidado_config
  id                 uuid, pk, default gen_random_uuid()
  planta_id          uuid, fk -> plantas, not null, on delete cascade
  tipo               enum('regar','fertilizar','trasplantar','podar','otro')
  frecuencia_dias    integer, null         -- null = no se trackea ese tipo
  unique(planta_id, tipo)

cuidados                                   -- bitácora / log de eventos
  id                 uuid, pk, default gen_random_uuid()
  planta_id          uuid, fk -> plantas, not null, on delete cascade
  tipo               enum('regar','fertilizar','trasplantar','podar','otro')
  fecha              timestamptz, not null, default now()
  notas              text, null
  created_at         timestamptz, default now()
```

- Tipo `tipo_cuidado` es un enum de Postgres compartido por `cuidado_config`
  y `cuidados`: `regar | fertilizar | trasplantar | podar | otro`.
- **RLS**: en las tres tablas, policy que restringe a
  `user_id = auth.uid()` (en `cuidado_config` y `cuidados`, vía join a
  `plantas.user_id`, ya que no tienen `user_id` propio).
- **Storage**: bucket `plantas-fotos`, con paths `{user_id}/{planta_id}.ext`;
  policy que solo permite al dueño leer/escribir dentro de su propia
  carpeta.

## Lógica de recordatorio (próximo vencimiento)

Para cada `(planta, tipo)` con `frecuencia_dias` configurado:

- Si existe algún registro en `cuidados` de ese tipo para esa planta:
  `próximo_vencimiento = fecha del último registro + frecuencia_dias`.
- Si nunca se registró ese tipo de cuidado:
  `próximo_vencimiento = (fecha_adquisicion || created_at de la planta) + frecuencia_dias`.

El estado de una planta en el dashboard es el más urgente entre todos sus
`(tipo, próximo_vencimiento)` configurados:

- **Vencido** — `próximo_vencimiento` en el pasado.
- **Próximo** — `próximo_vencimiento` dentro de los próximos 2 días.
- **Al día** — `próximo_vencimiento` a más de 2 días.
- **Sin registrar** — la planta no tiene ningún `cuidado_config` con
  frecuencia configurada.

`DESIGN.md` prohíbe los indicadores de estado tipo semáforo ("avoid status
color bloat"; solo `#FF0000` está reservado para estados de alerta). El
badge se resuelve con tipografía, no con un color por estado:
- Vencido: texto en `#FF0000` (el único color de estado permitido), en
  mayúsculas.
- Próximo: acento terracota `#FF6B35` (uso puntual, consistente con "usar
  acentos con moderación").
- Al día / Sin registrar: texto negro/gris estándar, sin énfasis especial.

Este cálculo se implementa como función pura en `js/utils/recordatorios.js`
(entrada: fechas y config; salida: estado + fecha), separada de la UI y del
acceso a datos, para poder revisarla/probarla de forma aislada.

## Páginas y flujo

**`index.html` — login / registro**
- Formulario único con toggle entre "Iniciar sesión" y "Crear cuenta".
- Si ya hay sesión activa (`supabase.auth.getSession()`), redirige
  directamente a `dashboard.html`.
- Errores de Auth (credenciales inválidas, email ya registrado, etc.) se
  muestran inline debajo del formulario.

**`dashboard.html` — listado de plantas**
- Guard de sesión: sin sesión → redirect a `index.html`.
- Grilla de tarjetas, una por planta: foto (o placeholder), nombre,
  especie, badge de estado (ver sección anterior).
- Botón "Agregar planta" → formulario/modal de alta.
- Click en tarjeta → `planta.html?id={planta_id}`.
- Botón de logout.

**`planta.html` — detalle de planta**
- Guard de sesión, igual que el dashboard.
- Datos de la planta, editables in-place.
- Configuración de frecuencia por tipo de cuidado (input numérico de días,
  o "no trackear" si se deja vacío).
- Acción "Registrar cuidado": elegir tipo (de la lista fija), fecha
  (default hoy), notas opcionales.
- Historial de la bitácora de esa planta, ordenado por fecha descendente.

## Manejo de errores

- Páginas protegidas (`dashboard.html`, `planta.html`) verifican sesión al
  cargar antes de pedir datos.
- Errores de Supabase (red, validación, RLS) se muestran como mensaje
  inline junto a la acción que falló — sin `alert()`.
- Si falla la subida de foto al crear/editar una planta, la planta se
  guarda igual sin foto (o conservando la anterior si es edición) y se
  avisa al usuario del fallo puntual; no bloquea el resto del flujo.

## Verificación

No hay test runner en este proyecto (consistente con mantenerlo simple).
La verificación de este MVP es manual, contra un proyecto Supabase real,
siguiendo este checklist:

1. Crear cuenta nueva → queda logueado y ve el dashboard vacío.
2. Cerrar sesión → login con la misma cuenta → vuelve al dashboard.
3. Agregar una planta con foto → aparece en el dashboard.
4. Configurar frecuencia de "regar" en esa planta.
5. Sin registrar ningún cuidado todavía → el badge refleja el estado
   calculado desde `fecha_adquisicion`/`created_at`.
6. Registrar un cuidado de "regar" → el badge y el próximo vencimiento se
   actualizan según la nueva fecha.
7. Editar los datos de la planta → los cambios persisten tras recargar.
8. Ver el historial de bitácora de la planta, ordenado por fecha.
9. Con otra cuenta de usuario, verificar que no se ven las plantas de la
   primera cuenta (RLS).

La función de cálculo de vencimiento (`js/utils/recordatorios.js`) se
revisa con casos manuales (sin registro previo, con registro reciente, con
registro vencido) antes de integrarla a la UI.

## Estructura de código

```
index.html
dashboard.html
planta.html
css/styles.css
js/
  config.js                 -- init cliente supabase-js
  services/
    auth.js                 -- signUp, signIn, signOut, getSession
    plantas.js               -- CRUD plantas + subida de foto
    cuidados.js               -- CRUD cuidado_config + cuidados (bitácora)
  pages/
    login.js                 -- wiring de index.html
    dashboard.js              -- wiring de dashboard.html
    planta.js                 -- wiring de planta.html
  utils/
    dom.js                    -- helpers de DOM
    recordatorios.js           -- cálculo de próximo vencimiento / estado
```

El look & feel sigue el sistema de diseño ya definido en `DESIGN.md`
(paleta, tipografía y estilos de componentes).
