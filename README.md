# Super Scanner

App en español para familias latinoamericanas que escanea etiquetas de productos del súper, organiza listas de compras y pre-compras colaborativas, y muestra historial de gastos.

## Stack

- **Monorepo:** pnpm workspaces
- **Frontend:** React + Vite + TanStack Query + Tailwind + Wouter (router)
- **Backend:** Node.js + Express + TypeScript
- **DB:** PostgreSQL + Drizzle ORM
- **IA:** OpenAI Vision (gpt-4o / gpt-5.x) para reconocer productos en fotos

## Estructura

```
artifacts/
  super-scanner/    → app web (frontend)
  api-server/       → API REST (backend Express)
  mockup-sandbox/   → entorno de prototipado de UI (opcional)
lib/
  db/               → esquema Drizzle + cliente
  api-spec/         → contrato OpenAPI compartido
  api-zod/          → tipos zod generados
  api-client-react/ → cliente HTTP + hooks TanStack Query generados
  integrations/     → utilidades de integración
  integrations-openai-ai-server/ → wrapper de OpenAI (servidor)
  integrations-openai-ai-react/  → wrapper OpenAI (cliente)
```

## Requisitos

- **Node.js 20+**
- **pnpm 9+** (`npm install -g pnpm`)
- **PostgreSQL 14+** (local o un servicio como Neon, Supabase, Railway)
- **OpenAI API key** (https://platform.openai.com/api-keys)

## Variables de entorno

Crear un archivo `.env` en la raíz con:

```bash
DATABASE_URL=postgresql://usuario:password@host:5432/super_scanner
OPENAI_API_KEY=sk-...
```

> **Nota sobre OpenAI:** En el código original (corriendo en Replit), se usa el proxy de "Replit AI Integrations" que provee acceso a OpenAI sin necesidad de tu propia key. Al migrar afuera, vas a tener que reemplazar las llamadas que usan `@workspace/integrations-openai-ai-server` por llamadas directas al SDK oficial de OpenAI. El archivo a tocar es `artifacts/api-server/src/routes/scan.ts`.

## Setup

```bash
# 1. Instalar dependencias
pnpm install

# 2. Crear las tablas en la base de datos
pnpm --filter @workspace/db run db:push

# 3. Correr el backend (puerto 8080 por defecto, configurable via PORT)
pnpm --filter @workspace/api-server run dev

# 4. En otra terminal, correr el frontend (puerto en el output de vite)
pnpm --filter @workspace/super-scanner run dev
```

El frontend espera que el backend esté en la misma URL bajo `/api/...`. En desarrollo, vite proxea las llamadas — revisar `artifacts/super-scanner/vite.config.ts` y ajustar el `proxy.target` al puerto donde corra el backend.

## Funcionalidades clave

- **Escaneo con IA:** sacar foto de la etiqueta del producto → la IA extrae nombre, marca, precio, peso/cantidad. Si el producto ya está en la lista, te ofrece tacharlo en lugar de duplicar.
- **Dos tipos de listas:** "Compras" (lo que vas comprando en el súper) vs "Pre-compras" (lista colaborativa donde la familia anota lo que necesita desde casa).
- **Compartir lista:** generar un link único para que cualquiera del grupo familiar pueda agregar o tachar ítems desde el navegador, sin instalar nada.
- **Subtotales:** en cada lista se muestran tres totales — Por Comprar, En Carrito, y Total general.
- **Historial:** vista `/historial` con gráfico de barras de gasto por lista y evolución de precio por producto a lo largo del tiempo.

## Endpoints principales del API

```
GET    /api/lists                          → listas con totales
POST   /api/lists                          → crear lista (body: { name, type })
GET    /api/lists/:id                      → detalle con ítems y subtotales
DELETE /api/lists/:id                      → eliminar lista
POST   /api/lists/:id/items                → agregar ítem
PATCH  /api/lists/:id/items/:itemId        → actualizar ítem (checked, price, etc.)
DELETE /api/lists/:id/items/:itemId        → eliminar ítem
POST   /api/lists/:id/share                → generar token de compartir
GET    /api/lists/shared/:token            → ver lista compartida
POST   /api/lists/shared/:token/items      → agregar desde lista compartida
PATCH  /api/lists/shared/:token/items/:itemId → tachar/destachar
POST   /api/scan                           → escanear imagen (multipart, campo "image")
GET    /api/reports/history                → datos para el historial
```

## Build de producción

```bash
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/super-scanner run build
```

El frontend se compila a `artifacts/super-scanner/dist/`. El backend se puede correr con `node dist/index.js` o seguir usando `tsx` en producción.
