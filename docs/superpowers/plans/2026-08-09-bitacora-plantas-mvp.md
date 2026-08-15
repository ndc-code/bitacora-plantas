# Bitácora de Plantas — MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working multi-user plant-care journal: sign up/log in, register plants with a photo, configure a care frequency per care type, log care events, and see at a glance on the dashboard which plants need attention.

**Architecture:** Plain HTML/CSS/JS (ES modules, no bundler), `supabase-js` loaded via CDN as a classic script that exposes `window.supabase`. Supabase provides Auth, Postgres (with RLS), and Storage. No build step; deploy as a static site.

**Tech Stack:** HTML5, CSS3, vanilla JS (ES modules), Supabase (`@supabase/supabase-js@2` via jsDelivr CDN), Node.js built-in test runner (`node --test`) for pure-logic unit tests only.

## Global Constraints

- No framework, no bundler, no npm dependencies for the app itself — plain HTML/CSS/JS only.
- No browser test framework — the only automated tests are Node-built-in (`node --test`) tests for pure functions in `js/utils/recordatorios.js`. Everything else is verified manually against the real Supabase project.
- Care types are a fixed, closed list: `regar | fertilizar | trasplantar | podar | otro`. No user-defined types.
- Every table (`plantas`, `cuidado_config`, `cuidados`) must be restricted by RLS to `auth.uid()` — a user must never see another user's data.
- Storage bucket `plantas-fotos` is private; photos are read via `createSignedUrl`, not public URLs.
- Visual design follows `DESIGN.md` exactly: sharp corners (`border-radius: 0`), `1px solid #DFDFDF` borders, PP Neue Montreal for headings / Arial for body, `4px`-based spacing scale, minimum `44px` touch targets.
- Status badges do NOT use a red/orange/green traffic-light scheme (`DESIGN.md` explicitly forbids status color bloat). Use: `#FF0000` text for "vencido", `#FF6B35` accent for "próximo", plain black/gray for "al día" / "sin registrar" — see Task 9.
- Supabase project already exists: `https://ehtqmxtleaclzljaizjy.supabase.co` (dashboard: https://supabase.com/dashboard/project/ehtqmxtleaclzljaizjy). The Supabase MCP tool is not authenticated in this environment, so schema changes and key retrieval in Task 1/2 are done manually by the user through the Supabase dashboard, following exact instructions given in those tasks.

---

### Task 1: Database schema, RLS, and Storage setup

**Files:**
- Create: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Produces: Postgres tables `public.plantas`, `public.cuidado_config`, `public.cuidados`; enum `public.tipo_cuidado`; storage bucket `plantas-fotos`. All later tasks query these exact table/column names.

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/0001_init.sql`:

```sql
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

alter table public.plantas enable row level security;
alter table public.cuidado_config enable row level security;
alter table public.cuidados enable row level security;

create policy "plantas_owner_all" on public.plantas
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "cuidado_config_owner_all" on public.cuidado_config
  for all
  using (exists (select 1 from public.plantas p where p.id = planta_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.plantas p where p.id = planta_id and p.user_id = auth.uid()));

create policy "cuidados_owner_all" on public.cuidados
  for all
  using (exists (select 1 from public.plantas p where p.id = planta_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.plantas p where p.id = planta_id and p.user_id = auth.uid()));

-- Storage: private bucket for plant photos, one folder per user
insert into storage.buckets (id, name, public)
values ('plantas-fotos', 'plantas-fotos', false);

create policy "plantas_fotos_owner_select" on storage.objects
  for select
  using (bucket_id = 'plantas-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "plantas_fotos_owner_insert" on storage.objects
  for insert
  with check (bucket_id = 'plantas-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "plantas_fotos_owner_update" on storage.objects
  for update
  using (bucket_id = 'plantas-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "plantas_fotos_owner_delete" on storage.objects
  for delete
  using (bucket_id = 'plantas-fotos' and (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Step 2: Apply the migration**

The Supabase MCP is not authenticated in this environment. Apply it yourself:
1. Open https://supabase.com/dashboard/project/ehtqmxtleaclzljaizjy/sql/new
2. Paste the full contents of `supabase/migrations/0001_init.sql`
3. Run it.

Expected: "Success. No rows returned."

- [ ] **Step 3: Verify**

In the same SQL editor, run:

```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('plantas', 'cuidado_config', 'cuidados');

select id, public from storage.buckets where id = 'plantas-fotos';
```

Expected: first query returns all 3 table names; second returns one row with `public = false`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat: add initial Supabase schema, RLS, and storage bucket"
```

---

### Task 2: Supabase client config + pure due-date logic

**Files:**
- Create: `js/config.js`
- Create: `js/utils/recordatorios.js`
- Create: `js/utils/recordatorios.test.js`

**Interfaces:**
- Consumes: nothing (first app code).
- Produces:
  - `js/config.js` exports `supabase` (initialized client instance) and `TIPOS_CUIDADO` re-export is NOT here — `TIPOS_CUIDADO` lives in `recordatorios.js`.
  - `js/utils/recordatorios.js` exports:
    - `TIPOS_CUIDADO: string[]` — `['regar', 'fertilizar', 'trasplantar', 'podar', 'otro']`
    - `calcularProximoVencimiento({ ultimaFecha, fechaAlta, frecuenciaDias }): Date | null`
    - `calcularEstadoPlanta(vencimientos: (Date|null)[], ahora?: Date): 'vencido' | 'proximo' | 'al_dia' | 'sin_registrar'`

- [ ] **Step 1: Write the failing test**

Create `js/utils/recordatorios.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularProximoVencimiento, calcularEstadoPlanta } from './recordatorios.js';

test('calcularProximoVencimiento usa la última fecha registrada si existe', () => {
  const resultado = calcularProximoVencimiento({
    ultimaFecha: '2026-08-01T00:00:00.000Z',
    fechaAlta: '2026-01-01T00:00:00.000Z',
    frecuenciaDias: 5,
  });
  assert.equal(resultado.toISOString(), new Date('2026-08-06T00:00:00.000Z').toISOString());
});

test('calcularProximoVencimiento usa fechaAlta si nunca se registró ese cuidado', () => {
  const resultado = calcularProximoVencimiento({
    ultimaFecha: null,
    fechaAlta: '2026-08-01T00:00:00.000Z',
    frecuenciaDias: 5,
  });
  assert.equal(resultado.toISOString(), new Date('2026-08-06T00:00:00.000Z').toISOString());
});

test('calcularProximoVencimiento devuelve null si no hay frecuencia configurada', () => {
  const resultado = calcularProximoVencimiento({
    ultimaFecha: '2026-08-01T00:00:00.000Z',
    fechaAlta: '2026-01-01T00:00:00.000Z',
    frecuenciaDias: null,
  });
  assert.equal(resultado, null);
});

test('calcularEstadoPlanta devuelve sin_registrar si no hay vencimientos', () => {
  assert.equal(calcularEstadoPlanta([]), 'sin_registrar');
  assert.equal(calcularEstadoPlanta([null, null]), 'sin_registrar');
});

test('calcularEstadoPlanta devuelve vencido si el más próximo ya pasó', () => {
  const ahora = new Date('2026-08-09T00:00:00.000Z');
  const vencimientos = [new Date('2026-08-05T00:00:00.000Z'), new Date('2026-09-01T00:00:00.000Z')];
  assert.equal(calcularEstadoPlanta(vencimientos, ahora), 'vencido');
});

test('calcularEstadoPlanta devuelve proximo si vence dentro de 2 días', () => {
  const ahora = new Date('2026-08-09T00:00:00.000Z');
  const vencimientos = [new Date('2026-08-10T12:00:00.000Z')];
  assert.equal(calcularEstadoPlanta(vencimientos, ahora), 'proximo');
});

test('calcularEstadoPlanta devuelve al_dia si vence en más de 2 días', () => {
  const ahora = new Date('2026-08-09T00:00:00.000Z');
  const vencimientos = [new Date('2026-08-20T00:00:00.000Z')];
  assert.equal(calcularEstadoPlanta(vencimientos, ahora), 'al_dia');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test js/utils/recordatorios.test.js`
Expected: FAIL — `recordatorios.js` does not exist yet (module not found).

- [ ] **Step 3: Write the minimal implementation**

Create `js/utils/recordatorios.js`:

```js
export const TIPOS_CUIDADO = ['regar', 'fertilizar', 'trasplantar', 'podar', 'otro'];

const DIA_MS = 1000 * 60 * 60 * 24;
const UMBRAL_PROXIMO_DIAS = 2;

export function calcularProximoVencimiento({ ultimaFecha, fechaAlta, frecuenciaDias }) {
  if (frecuenciaDias == null) return null;
  const base = new Date(ultimaFecha ?? fechaAlta);
  return new Date(base.getTime() + frecuenciaDias * DIA_MS);
}

export function calcularEstadoPlanta(vencimientos, ahora = new Date()) {
  const fechas = vencimientos.filter((v) => v != null);
  if (fechas.length === 0) return 'sin_registrar';

  const masUrgente = fechas.reduce((a, b) => (a < b ? a : b));
  const diffDias = (masUrgente.getTime() - ahora.getTime()) / DIA_MS;

  if (diffDias < 0) return 'vencido';
  if (diffDias <= UMBRAL_PROXIMO_DIAS) return 'proximo';
  return 'al_dia';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test js/utils/recordatorios.test.js`
Expected: PASS, 7 tests passing.

- [ ] **Step 5: Get the Supabase anon key**

1. Open https://supabase.com/dashboard/project/ehtqmxtleaclzljaizjy/settings/api
2. Copy the value under "Project API keys" → `anon` `public`.

- [ ] **Step 6: Write the Supabase client config**

Create `js/config.js` (replace `PASTE_ANON_KEY_HERE` with the key copied in Step 5):

```js
const SUPABASE_URL = 'https://ehtqmxtleaclzljaizjy.supabase.co';
const SUPABASE_ANON_KEY = 'PASTE_ANON_KEY_HERE';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

Note: `window.supabase` is provided by the CDN script tag added to each HTML page in later tasks (`<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>`, loaded before any `type="module"` script that imports `config.js`).

- [ ] **Step 7: Commit**

```bash
git add js/config.js js/utils/recordatorios.js js/utils/recordatorios.test.js
git commit -m "feat: add supabase client config and due-date calculation logic"
```

---

### Task 3: Global styles from DESIGN.md

**Files:**
- Create: `css/styles.css`

**Interfaces:**
- Produces: CSS custom properties (`--color-*`, `--font-*`, `--space-*`) and classes `.btn`, `.btn-primary`, `.btn-secondary`, `.card`, `.input`, `.field`, `.field-error`, `.badge-vencido`, `.badge-proximo`, `.badge-neutral`, `.topbar`, `.container` used by every page task from here on.

- [ ] **Step 1: Write the stylesheet**

Create `css/styles.css`:

```css
:root {
  --color-black: #000000;
  --color-white: #ffffff;
  --color-navy: #1f2e3d;
  --color-terracotta: #ff6b35;
  --color-brown: #b4742d;
  --color-cream: #fbe9d0;
  --color-charcoal: #404040;
  --color-gray-mid: #808080;
  --color-gray-light: #a0a0a0;
  --color-border: #dfdfdf;
  --color-placeholder: #a3a3a3;
  --color-error: #ff0000;

  --font-heading: 'PP Neue Montreal', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-body: Arial, sans-serif;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-15: 60px;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: var(--font-body);
  font-size: 20px;
  color: var(--color-black);
  background: var(--color-white);
}

h1, h2, h3, h4 {
  font-family: var(--font-heading);
  font-weight: 400;
  margin: 0 0 var(--space-4) 0;
}

h1 { font-size: 70px; line-height: 76px; }
h2 { font-size: 40px; line-height: 44px; }
h3 { font-size: 20px; line-height: 26px; }

.container {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 var(--space-10);
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-6) var(--space-10);
  border-bottom: 1px solid var(--color-border);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 52px;
  min-width: 44px;
  padding: 14px 24px;
  font-family: var(--font-body);
  font-size: 18px;
  border: 0;
  border-radius: 0;
  cursor: pointer;
}

.btn-primary {
  background: var(--color-black);
  color: var(--color-white);
}

.btn-primary:hover { opacity: 0.8; }
.btn-primary:active { opacity: 0.6; }

.btn-secondary {
  background: transparent;
  color: var(--color-black);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover { text-decoration: underline; }

.card {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: 0;
  padding: var(--space-6);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.field label {
  font-size: 18px;
}

.input, textarea.input, select.input {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: 0;
  padding: 12px 16px;
  font-family: var(--font-body);
  font-size: 18px;
  color: var(--color-black);
}

.input:focus {
  outline: none;
  border-color: var(--color-black);
}

.input::placeholder {
  color: var(--color-placeholder);
}

.field-error {
  color: var(--color-error);
  font-size: 16px;
}
.field-error[hidden] {
  display: none;
}

.badge-vencido {
  color: var(--color-error);
  font-weight: 400;
  text-transform: uppercase;
}

.badge-proximo {
  color: var(--color-terracotta);
  font-weight: 400;
}

.badge-neutral {
  color: var(--color-gray-mid);
  font-weight: 400;
}

.grid-plantas {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-5);
  padding: var(--space-10) 0;
}

.planta-card {
  display: block;
  text-decoration: none;
  color: inherit;
}

.planta-card img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border: 1px solid var(--color-border);
}

.planta-card .placeholder-foto {
  width: 100%;
  aspect-ratio: 1 / 1;
  background: var(--color-cream);
  border: 1px solid var(--color-border);
}

@media (max-width: 599px) {
  .container { padding: 0 var(--space-4); }
  h1 { font-size: 40px; line-height: 44px; }
  h2 { font-size: 28px; line-height: 32px; }
  .topbar { padding: var(--space-4); flex-direction: column; align-items: flex-start; gap: var(--space-3); }
}
```

- [ ] **Step 2: Verify in isolation**

Open the file in a browser devtools "New Style Sandbox" or just visually confirm no syntax errors by running:

Run: `node -e "require('fs').readFileSync('css/styles.css','utf8')" && echo OK`
Expected: `OK` (this only checks the file is readable; full visual verification happens once pages consume it in later tasks).

- [ ] **Step 3: Commit**

```bash
git add css/styles.css
git commit -m "feat: add global stylesheet per DESIGN.md"
```

---

### Task 4: Auth service

**Files:**
- Create: `js/services/auth.js`

**Interfaces:**
- Consumes: `supabase` from `js/config.js`.
- Produces:
  - `signUp(email: string, password: string): Promise<{ user, session }>`
  - `signIn(email: string, password: string): Promise<{ user, session }>`
  - `signOut(): Promise<void>`
  - `getSession(): Promise<Session | null>`

- [ ] **Step 1: Write the service**

Create `js/services/auth.js`:

```js
import { supabase } from '../config.js';

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
```

- [ ] **Step 2: Commit**

No isolated test here — this module is exercised end-to-end in Task 5 (login page), which is where it gets its testable deliverable per the plan's task boundaries.

```bash
git add js/services/auth.js
git commit -m "feat: add auth service wrapping supabase auth"
```

---

### Task 5: Login / signup page

**Files:**
- Create: `js/utils/dom.js`
- Create: `js/pages/login.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: `signUp`, `signIn`, `getSession` from `js/services/auth.js`.
- Produces: `js/utils/dom.js` exports `qs(selector, root?)`, `qsa(selector, root?)`, `showError(el, message)`, `clearError(el)` — reused by every later page task.

- [ ] **Step 1: Write the DOM helpers**

Create `js/utils/dom.js`:

```js
export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function showError(el, message) {
  el.textContent = message;
  el.hidden = false;
}

export function clearError(el) {
  el.textContent = '';
  el.hidden = true;
}
```

- [ ] **Step 2: Write `index.html`**

Replace the contents of `index.html`:

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Bitácora de Plantas</title>
  <link rel="stylesheet" href="css/styles.css" />
</head>
<body>
  <main class="container" style="max-width: 480px; padding-top: 80px;">
    <h1 id="titulo-form">Iniciar sesión</h1>

    <form id="form-auth">
      <div class="field">
        <label for="email">Email</label>
        <input class="input" type="email" id="email" required />
      </div>
      <div class="field">
        <label for="password">Contraseña</label>
        <input class="input" type="password" id="password" minlength="6" required />
      </div>
      <p class="field-error" id="error-auth" hidden></p>
      <button class="btn btn-primary" type="submit" id="btn-submit">Iniciar sesión</button>
    </form>

    <p style="margin-top: var(--space-6);">
      <button class="btn-secondary btn" type="button" id="btn-toggle">¿No tenés cuenta? Creá una</button>
    </p>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script type="module" src="js/pages/login.js"></script>
</body>
</html>
```

- [ ] **Step 3: Write `js/pages/login.js`**

```js
import { signIn, signUp, getSession } from '../services/auth.js';
import { qs, showError, clearError } from '../utils/dom.js';

const form = qs('#form-auth');
const errorEl = qs('#error-auth');
const toggleBtn = qs('#btn-toggle');
const submitBtn = qs('#btn-submit');
const titulo = qs('#titulo-form');

let modo = 'login';

function actualizarModo() {
  if (modo === 'login') {
    titulo.textContent = 'Iniciar sesión';
    submitBtn.textContent = 'Iniciar sesión';
    toggleBtn.textContent = '¿No tenés cuenta? Creá una';
  } else {
    titulo.textContent = 'Crear cuenta';
    submitBtn.textContent = 'Crear cuenta';
    toggleBtn.textContent = '¿Ya tenés cuenta? Iniciá sesión';
  }
}

toggleBtn.addEventListener('click', () => {
  modo = modo === 'login' ? 'signup' : 'login';
  clearError(errorEl);
  actualizarModo();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError(errorEl);
  const email = qs('#email').value;
  const password = qs('#password').value;

  try {
    if (modo === 'login') {
      await signIn(email, password);
    } else {
      await signUp(email, password);
    }
    window.location.href = 'dashboard.html';
  } catch (err) {
    showError(errorEl, err.message);
  }
});

(async function redirigirSiYaHaySesion() {
  const session = await getSession();
  if (session) {
    window.location.href = 'dashboard.html';
  }
})();
```

- [ ] **Step 4: Manual verification**

Serve the project locally (e.g. `npx serve .` or any static server) and open `index.html` in a browser:
1. Click "¿No tenés cuenta? Creá una", fill a real email + password (6+ chars), submit.
2. Expected: redirected to `dashboard.html` (will 404 or show blank until Task 8 — that's fine, confirms the redirect happened via the URL bar).
3. Go back to `index.html`, and in Supabase dashboard → Authentication → Users, confirm the new user exists.
4. Reload `index.html` directly: expected immediate redirect to `dashboard.html` since a session now exists.
5. In a private/incognito window, submit wrong credentials: expected inline error message, no redirect.

- [ ] **Step 5: Commit**

```bash
git add js/utils/dom.js js/pages/login.js index.html
git commit -m "feat: add login/signup page"
```

---

### Task 6: Plantas service (CRUD + photo upload)

**Files:**
- Create: `js/services/plantas.js`

**Interfaces:**
- Consumes: `supabase` from `js/config.js`.
- Produces:
  - `listarPlantas(): Promise<Planta[]>`
  - `obtenerPlanta(id: string): Promise<Planta>`
  - `crearPlanta({ nombre, especie?, ubicacion?, fecha_adquisicion?, notas? }): Promise<Planta>`
  - `actualizarPlanta(id: string, cambios: Partial<Planta>): Promise<Planta>`
  - `subirFotoPlanta(userId: string, plantaId: string, file: File): Promise<string>` — returns the storage path (not a URL)
  - `obtenerUrlFoto(fotoPath: string | null): Promise<string | null>` — returns a signed URL valid 1 hour, or `null` if `fotoPath` is null

  Where `Planta = { id, user_id, nombre, especie, ubicacion, foto_url, fecha_adquisicion, notas, created_at }`.

- [ ] **Step 1: Write the service**

Create `js/services/plantas.js`:

```js
import { supabase } from '../config.js';

export async function listarPlantas() {
  const { data, error } = await supabase
    .from('plantas')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function obtenerPlanta(id) {
  const { data, error } = await supabase.from('plantas').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function crearPlanta(planta) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session.user.id;

  const { data, error } = await supabase
    .from('plantas')
    .insert({ ...planta, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function actualizarPlanta(id, cambios) {
  const { data, error } = await supabase
    .from('plantas')
    .update(cambios)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function subirFotoPlanta(userId, plantaId, file) {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${plantaId}.${ext}`;
  const { error } = await supabase.storage
    .from('plantas-fotos')
    .upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

export async function obtenerUrlFoto(fotoPath) {
  if (!fotoPath) return null;
  const { data, error } = await supabase.storage
    .from('plantas-fotos')
    .createSignedUrl(fotoPath, 3600);
  if (error) throw error;
  return data.signedUrl;
}
```

- [ ] **Step 2: Commit**

This service is verified end-to-end in Task 8 (dashboard, where plants are created and listed) and Task 9 (planta detail, where they're edited).

```bash
git add js/services/plantas.js
git commit -m "feat: add plantas service with CRUD and photo upload"
```

---

### Task 7: Cuidados service (frequency config, log, status calculation)

**Files:**
- Create: `js/services/cuidados.js`

**Interfaces:**
- Consumes: `supabase` from `js/config.js`; `calcularProximoVencimiento`, `calcularEstadoPlanta` from `js/utils/recordatorios.js`.
- Produces:
  - `listarConfig(plantaId: string): Promise<CuidadoConfig[]>` where `CuidadoConfig = { id, planta_id, tipo, frecuencia_dias }`
  - `guardarConfig(plantaId: string, tipo: string, frecuenciaDias: number|null): Promise<CuidadoConfig>`
  - `listarBitacora(plantaId: string): Promise<Cuidado[]>` where `Cuidado = { id, planta_id, tipo, fecha, notas, created_at }`, ordered by `fecha` descending
  - `registrarCuidado(plantaId: string, tipo: string, fecha: string, notas: string|null): Promise<Cuidado>`
  - `calcularEstadoDePlanta(planta: Planta): Promise<'vencido'|'proximo'|'al_dia'|'sin_registrar'>`

- [ ] **Step 1: Write the service**

Create `js/services/cuidados.js`:

```js
import { supabase } from '../config.js';
import { calcularProximoVencimiento, calcularEstadoPlanta } from '../utils/recordatorios.js';

export async function listarConfig(plantaId) {
  const { data, error } = await supabase
    .from('cuidado_config')
    .select('*')
    .eq('planta_id', plantaId);
  if (error) throw error;
  return data;
}

export async function guardarConfig(plantaId, tipo, frecuenciaDias) {
  const { data, error } = await supabase
    .from('cuidado_config')
    .upsert({ planta_id: plantaId, tipo, frecuencia_dias: frecuenciaDias }, { onConflict: 'planta_id,tipo' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listarBitacora(plantaId) {
  const { data, error } = await supabase
    .from('cuidados')
    .select('*')
    .eq('planta_id', plantaId)
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data;
}

export async function registrarCuidado(plantaId, tipo, fecha, notas) {
  const { data, error } = await supabase
    .from('cuidados')
    .insert({ planta_id: plantaId, tipo, fecha, notas })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function calcularEstadoDePlanta(planta) {
  const configs = await listarConfig(planta.id);
  const vencimientos = [];

  for (const cfg of configs) {
    if (cfg.frecuencia_dias == null) continue;

    const { data: ultimos, error } = await supabase
      .from('cuidados')
      .select('fecha')
      .eq('planta_id', planta.id)
      .eq('tipo', cfg.tipo)
      .order('fecha', { ascending: false })
      .limit(1);
    if (error) throw error;

    const ultimaFecha = ultimos[0]?.fecha ?? null;
    vencimientos.push(
      calcularProximoVencimiento({
        ultimaFecha,
        fechaAlta: planta.fecha_adquisicion ?? planta.created_at,
        frecuenciaDias: cfg.frecuencia_dias,
      })
    );
  }

  return calcularEstadoPlanta(vencimientos);
}
```

- [ ] **Step 2: Commit**

Verified end-to-end in Task 8 (dashboard status badges) and Task 9 (config + logging UI).

```bash
git add js/services/cuidados.js
git commit -m "feat: add cuidados service with logging, config, and status calculation"
```

---

### Task 8: Dashboard page

**Files:**
- Create: `js/pages/dashboard.js`
- Modify: `dashboard.html`

**Interfaces:**
- Consumes: `getSession`, `signOut` from `js/services/auth.js`; `listarPlantas`, `crearPlanta`, `subirFotoPlanta`, `actualizarPlanta`, `obtenerUrlFoto` from `js/services/plantas.js`; `calcularEstadoDePlanta` from `js/services/cuidados.js`; `qs`, `qsa`, `showError`, `clearError` from `js/utils/dom.js`.
- Produces: nothing consumed by later tasks (leaf page), except that Task 9 links here for "volver al dashboard".

- [ ] **Step 1: Write `dashboard.html`**

Replace the contents of `dashboard.html`:

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mis plantas — Bitácora de Plantas</title>
  <link rel="stylesheet" href="css/styles.css" />
</head>
<body>
  <header class="topbar">
    <h3 style="margin:0;">Bitácora de Plantas</h3>
    <button class="btn btn-secondary" id="btn-logout">Cerrar sesión</button>
  </header>

  <main class="container">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-top: var(--space-8);">
      <h1>Mis plantas</h1>
      <button class="btn btn-primary" id="btn-nueva-planta">Agregar planta</button>
    </div>

    <section id="grid-plantas" class="grid-plantas"></section>
    <p id="mensaje-vacio" hidden>Todavía no tenés plantas. Agregá la primera.</p>
  </main>

  <dialog id="dialog-nueva-planta" class="card" style="width: 100%; max-width: 420px; border: 1px solid var(--color-border);">
    <h2>Agregar planta</h2>
    <form id="form-nueva-planta">
      <div class="field">
        <label for="nombre">Nombre</label>
        <input class="input" id="nombre" required />
      </div>
      <div class="field">
        <label for="especie">Especie</label>
        <input class="input" id="especie" />
      </div>
      <div class="field">
        <label for="ubicacion">Ubicación</label>
        <input class="input" id="ubicacion" />
      </div>
      <div class="field">
        <label for="fecha_adquisicion">Fecha de adquisición</label>
        <input class="input" type="date" id="fecha_adquisicion" />
      </div>
      <div class="field">
        <label for="foto">Foto</label>
        <input type="file" id="foto" accept="image/*" />
      </div>
      <p class="field-error" id="error-nueva-planta" hidden></p>
      <div style="display:flex; gap: var(--space-3); margin-top: var(--space-4);">
        <button type="submit" class="btn btn-primary">Guardar</button>
        <button type="button" class="btn btn-secondary" id="btn-cancelar-planta">Cancelar</button>
      </div>
    </form>
  </dialog>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script type="module" src="js/pages/dashboard.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `js/pages/dashboard.js`**

```js
import { getSession, signOut } from '../services/auth.js';
import { listarPlantas, crearPlanta, subirFotoPlanta, actualizarPlanta, obtenerUrlFoto } from '../services/plantas.js';
import { calcularEstadoDePlanta } from '../services/cuidados.js';
import { qs, showError, clearError } from '../utils/dom.js';

const ETIQUETAS_ESTADO = {
  vencido: { texto: 'Vencido', clase: 'badge-vencido' },
  proximo: { texto: 'Próximo', clase: 'badge-proximo' },
  al_dia: { texto: 'Al día', clase: 'badge-neutral' },
  sin_registrar: { texto: 'Sin registrar', clase: 'badge-neutral' },
};

async function requerirSesion() {
  const session = await getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  return session;
}

async function renderPlantas() {
  const grid = qs('#grid-plantas');
  const mensajeVacio = qs('#mensaje-vacio');
  grid.innerHTML = '';

  const plantas = await listarPlantas();
  if (plantas.length === 0) {
    mensajeVacio.hidden = false;
    return;
  }
  mensajeVacio.hidden = true;

  for (const planta of plantas) {
    const [estado, fotoUrl] = await Promise.all([
      calcularEstadoDePlanta(planta),
      obtenerUrlFoto(planta.foto_url),
    ]);

    const etiqueta = ETIQUETAS_ESTADO[estado];
    const card = document.createElement('a');
    card.href = `planta.html?id=${planta.id}`;
    card.className = 'planta-card';
    card.innerHTML = `
      ${fotoUrl ? `<img src="${fotoUrl}" alt="${planta.nombre}" />` : `<div class="placeholder-foto"></div>`}
      <h3>${planta.nombre}</h3>
      <p>${planta.especie ?? ''}</p>
      <p class="${etiqueta.clase}">${etiqueta.texto}</p>
    `;
    grid.appendChild(card);
  }
}

function wireLogout() {
  qs('#btn-logout').addEventListener('click', async () => {
    await signOut();
    window.location.href = 'index.html';
  });
}

function wireNuevaPlanta() {
  const dialog = qs('#dialog-nueva-planta');
  const form = qs('#form-nueva-planta');
  const errorEl = qs('#error-nueva-planta');

  qs('#btn-nueva-planta').addEventListener('click', () => dialog.showModal());
  qs('#btn-cancelar-planta').addEventListener('click', () => dialog.close());

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError(errorEl);

    const datos = {
      nombre: qs('#nombre').value,
      especie: qs('#especie').value || null,
      ubicacion: qs('#ubicacion').value || null,
      fecha_adquisicion: qs('#fecha_adquisicion').value || null,
    };
    const archivoFoto = qs('#foto').files[0];

    try {
      const planta = await crearPlanta(datos);
      let advertenciaFoto = null;

      if (archivoFoto) {
        try {
          const path = await subirFotoPlanta(planta.user_id, planta.id, archivoFoto);
          await actualizarPlanta(planta.id, { foto_url: path });
        } catch (fotoError) {
          advertenciaFoto = `Planta guardada, pero la foto no se pudo subir: ${fotoError.message}`;
        }
      }

      await renderPlantas();

      if (advertenciaFoto) {
        // Dejamos el diálogo abierto para que el usuario vea la advertencia.
        showError(errorEl, advertenciaFoto);
      } else {
        form.reset();
        dialog.close();
      }
    } catch (err) {
      showError(errorEl, err.message);
    }
  });
}

(async function init() {
  const session = await requerirSesion();
  if (!session) return;

  wireLogout();
  wireNuevaPlanta();
  await renderPlantas();
})();
```

- [ ] **Step 3: Manual verification**

With the project served locally and logged in (from Task 5):
1. Dashboard loads, shows "Todavía no tenés plantas."
2. Click "Agregar planta", fill nombre + especie + a photo, submit.
3. Expected: dialog closes, card appears with the photo, nombre, especie, and badge "Sin registrar" in gray.
4. Reload the page: the plant persists (fetched from Supabase).
5. Click "Cerrar sesión": expected redirect to `index.html`, and reloading `dashboard.html` directly redirects back to `index.html` (no session).
6. Open Supabase Table Editor → confirm the row in `plantas` and the object in the `plantas-fotos` bucket.

- [ ] **Step 4: Commit**

```bash
git add dashboard.html js/pages/dashboard.js
git commit -m "feat: add dashboard page with plant list, creation, and status badges"
```

---

### Task 9: Planta detail page

**Files:**
- Create: `js/pages/planta.js`
- Modify: `planta.html`

**Interfaces:**
- Consumes: `getSession` from `js/services/auth.js`; `obtenerPlanta`, `actualizarPlanta`, `subirFotoPlanta`, `obtenerUrlFoto` from `js/services/plantas.js`; `listarConfig`, `guardarConfig`, `listarBitacora`, `registrarCuidado` from `js/services/cuidados.js`; `TIPOS_CUIDADO` from `js/utils/recordatorios.js`; `qs`, `qsa`, `showError`, `clearError` from `js/utils/dom.js`.
- Produces: nothing (leaf page).

- [ ] **Step 1: Write `planta.html`**

Replace the contents of `planta.html`:

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Detalle de planta — Bitácora de Plantas</title>
  <link rel="stylesheet" href="css/styles.css" />
</head>
<body>
  <header class="topbar">
    <h3 style="margin:0;">Bitácora de Plantas</h3>
    <a class="btn btn-secondary" href="dashboard.html">Volver</a>
  </header>

  <main class="container" style="max-width: 720px;">
    <div id="foto-container" style="margin-top: var(--space-8);"></div>

    <form id="form-planta">
      <div class="field">
        <label for="nombre">Nombre</label>
        <input class="input" id="nombre" required />
      </div>
      <div class="field">
        <label for="especie">Especie</label>
        <input class="input" id="especie" />
      </div>
      <div class="field">
        <label for="ubicacion">Ubicación</label>
        <input class="input" id="ubicacion" />
      </div>
      <div class="field">
        <label for="fecha_adquisicion">Fecha de adquisición</label>
        <input class="input" type="date" id="fecha_adquisicion" />
      </div>
      <div class="field">
        <label for="notas">Notas</label>
        <textarea class="input" id="notas" rows="3"></textarea>
      </div>
      <div class="field">
        <label for="foto">Cambiar foto</label>
        <input type="file" id="foto" accept="image/*" />
      </div>
      <p class="field-error" id="error-planta" hidden></p>
      <button type="submit" class="btn btn-primary">Guardar cambios</button>
    </form>

    <h2 style="margin-top: var(--space-15);">Frecuencia de cuidados</h2>
    <div id="config-cuidados"></div>

    <h2 style="margin-top: var(--space-15);">Registrar cuidado</h2>
    <form id="form-cuidado">
      <div class="field">
        <label for="tipo-cuidado">Tipo</label>
        <select class="input" id="tipo-cuidado"></select>
      </div>
      <div class="field">
        <label for="fecha-cuidado">Fecha</label>
        <input class="input" type="date" id="fecha-cuidado" required />
      </div>
      <div class="field">
        <label for="notas-cuidado">Notas</label>
        <input class="input" id="notas-cuidado" />
      </div>
      <p class="field-error" id="error-cuidado" hidden></p>
      <button type="submit" class="btn btn-primary">Registrar</button>
    </form>

    <h2 style="margin-top: var(--space-15);">Bitácora</h2>
    <ul id="lista-bitacora" style="list-style:none; padding:0;"></ul>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script type="module" src="js/pages/planta.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `js/pages/planta.js`**

```js
import { getSession } from '../services/auth.js';
import { obtenerPlanta, actualizarPlanta, subirFotoPlanta, obtenerUrlFoto } from '../services/plantas.js';
import { listarConfig, guardarConfig, listarBitacora, registrarCuidado } from '../services/cuidados.js';
import { TIPOS_CUIDADO } from '../utils/recordatorios.js';
import { qs, qsa, showError, clearError } from '../utils/dom.js';

const ETIQUETAS_TIPO = {
  regar: 'Regar',
  fertilizar: 'Fertilizar',
  trasplantar: 'Trasplantar',
  podar: 'Podar',
  otro: 'Otro',
};

const plantaId = new URLSearchParams(window.location.search).get('id');

async function requerirSesion() {
  const session = await getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  return session;
}

async function renderFoto(planta) {
  const url = await obtenerUrlFoto(planta.foto_url);
  const container = qs('#foto-container');
  container.innerHTML = url
    ? `<img src="${url}" alt="${planta.nombre}" style="width:100%; max-width:320px; aspect-ratio:1/1; object-fit:cover; border:1px solid var(--color-border);" />`
    : '';
}

function rellenarFormPlanta(planta) {
  qs('#nombre').value = planta.nombre ?? '';
  qs('#especie').value = planta.especie ?? '';
  qs('#ubicacion').value = planta.ubicacion ?? '';
  qs('#fecha_adquisicion').value = planta.fecha_adquisicion ?? '';
  qs('#notas').value = planta.notas ?? '';
}

function wireFormPlanta(planta) {
  const form = qs('#form-planta');
  const errorEl = qs('#error-planta');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError(errorEl);

    const cambios = {
      nombre: qs('#nombre').value,
      especie: qs('#especie').value || null,
      ubicacion: qs('#ubicacion').value || null,
      fecha_adquisicion: qs('#fecha_adquisicion').value || null,
      notas: qs('#notas').value || null,
    };
    const archivoFoto = qs('#foto').files[0];

    try {
      if (archivoFoto) {
        try {
          const path = await subirFotoPlanta(planta.user_id, planta.id, archivoFoto);
          cambios.foto_url = path;
        } catch (fotoError) {
          showError(errorEl, `Los datos se guardarán, pero la foto no se pudo subir: ${fotoError.message}`);
        }
      }
      const actualizada = await actualizarPlanta(planta.id, cambios);
      await renderFoto(actualizada);
    } catch (err) {
      showError(errorEl, err.message);
    }
  });
}

async function renderConfigCuidados(plantaId) {
  const container = qs('#config-cuidados');
  const configs = await listarConfig(plantaId);
  const porTipo = Object.fromEntries(configs.map((c) => [c.tipo, c.frecuencia_dias]));

  container.innerHTML = TIPOS_CUIDADO.map(
    (tipo) => `
      <div class="field" style="flex-direction: row; align-items: center; gap: var(--space-3);">
        <label style="min-width: 140px;" for="frecuencia-${tipo}">${ETIQUETAS_TIPO[tipo]}</label>
        <input class="input" style="max-width: 100px;" type="number" min="1" id="frecuencia-${tipo}"
          value="${porTipo[tipo] ?? ''}" placeholder="días" />
      </div>
    `
  ).join('');

  qsa('#config-cuidados input').forEach((input) => {
    input.addEventListener('change', async () => {
      const tipo = input.id.replace('frecuencia-', '');
      const valor = input.value ? Number(input.value) : null;
      await guardarConfig(plantaId, tipo, valor);
    });
  });
}

function poblarSelectTipos() {
  const select = qs('#tipo-cuidado');
  select.innerHTML = TIPOS_CUIDADO.map((tipo) => `<option value="${tipo}">${ETIQUETAS_TIPO[tipo]}</option>`).join('');
}

function wireFormCuidado(plantaId) {
  const form = qs('#form-cuidado');
  const errorEl = qs('#error-cuidado');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError(errorEl);

    const tipo = qs('#tipo-cuidado').value;
    const fecha = qs('#fecha-cuidado').value;
    const notas = qs('#notas-cuidado').value || null;

    try {
      await registrarCuidado(plantaId, tipo, new Date(fecha).toISOString(), notas);
      form.reset();
      await renderBitacora(plantaId);
    } catch (err) {
      showError(errorEl, err.message);
    }
  });
}

async function renderBitacora(plantaId) {
  const lista = qs('#lista-bitacora');
  const eventos = await listarBitacora(plantaId);

  lista.innerHTML = eventos
    .map(
      (evento) => `
        <li class="card" style="margin-bottom: var(--space-3);">
          <strong>${ETIQUETAS_TIPO[evento.tipo]}</strong> — ${new Date(evento.fecha).toLocaleDateString('es')}
          ${evento.notas ? `<p style="margin: var(--space-2) 0 0 0;">${evento.notas}</p>` : ''}
        </li>
      `
    )
    .join('');
}

(async function init() {
  const session = await requerirSesion();
  if (!session) return;

  if (!plantaId) {
    window.location.href = 'dashboard.html';
    return;
  }

  const planta = await obtenerPlanta(plantaId);
  rellenarFormPlanta(planta);
  await renderFoto(planta);
  wireFormPlanta(planta);

  poblarSelectTipos();
  qs('#fecha-cuidado').valueAsDate = new Date();

  await renderConfigCuidados(plantaId);
  wireFormCuidado(plantaId);
  await renderBitacora(plantaId);
})();
```

- [ ] **Step 3: Manual verification**

With the project served locally, logged in, and at least one plant created (from Task 8):
1. Click a plant card from the dashboard → lands on `planta.html?id=...` with fields pre-filled.
2. Set "Regar" frequency to `5` days, leave others blank → confirm in Supabase Table Editor that `cuidado_config` has one row for that plant/tipo with `frecuencia_dias = 5`.
3. Go back to the dashboard: badge should now reflect a computed vencimiento based on `fecha_adquisicion`/`created_at` + 5 días (likely "Próximo" or "Vencido" if that date is already past).
4. Back on the plant page, register a "Regar" cuidado with today's date → appears at the top of the bitácora list.
5. Return to dashboard: badge should now be "Al día" (5 days out from today) shown in plain black/gray, not colored.
6. Edit the plant's nombre and save → reload the page, confirm the change persisted.
7. Try accessing `planta.html?id=<uuid-de-otro-usuario>` while logged in as a different account → expect the query to return no row / throw (RLS blocks it), not another user's data.

- [ ] **Step 4: Commit**

```bash
git add planta.html js/pages/planta.js
git commit -m "feat: add plant detail page with care config, logging, and history"
```

---

## Post-plan

Once all 9 tasks are done and verified, run the full manual checklist from the spec's "Verificación" section end-to-end as a final smoke test before considering the MVP complete. Phase 2 (email notifications via Supabase Edge Function + cron) is a separate spec/plan, started only after this MVP is confirmed working.
