# ERP Enterprise Cloud — Frontend

Frontend del ERP Enterprise Cloud: aplicación web modular con React + TypeScript + Vite. Consume una API REST (Python + FastAPI) y está preparada para desplegarse en AWS.

Mientras el backend no exista, la app funciona con datos simulados (MSW) que respetan el contrato de la API: ver [`docs/api-contract.md`](docs/api-contract.md).

## Requisitos

- **Node.js 24** (versión exacta en `.nvmrc`; `package.json` la exige en `engines`).
- **npm** (viene con Node).
- Git.

## Puesta en marcha

```bash
git clone <url-del-repositorio>
cd erp-enterprise-cloud-frontend
npm install
cp .env.example .env     # en CMD: copy .env.example .env
npm run dev
```

La app queda en `http://localhost:5173` y pide iniciar sesión. Con datos simulados (`VITE_ENABLE_MOCKS=true`) usa:

| Correo | Contraseña |
|---|---|
| `admin@enterprise.com` | `admin123` |
| `almacen@enterprise.com` | `almacen123` (almacenero: solo Inventario y recepciones, para probar permisos y la página 403) |

Son credenciales de prueba que solo existen en los mocks. La pantalla de referencia está en `/maintenance/customers`.

## Variables de entorno

Se definen en `.env` (nunca se sube a Git). La plantilla es `.env.example`.

| Variable | Valor de ejemplo | Para qué sirve |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | URL base de la API. Incluye `/api/v1` y no lleva barra final |
| `VITE_ENABLE_MOCKS` | `true` | `true` = datos simulados con MSW (solo en desarrollo). `false` = backend real |

- Todo lo que empieza con `VITE_` llega al navegador: **nunca** pongas contraseñas, tokens ni claves.
- Si cambias `.env`, reinicia `npm run dev` y recarga la pestaña con F5.
- Si agregas una variable nueva, añádela también a `.env.example` (sin valores reales).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Revisa tipos (`tsc -b`) y genera el build de producción |
| `npm run lint` | Revisa el código con ESLint |
| `npm test` | Ejecuta las pruebas una vez (Vitest) |
| `npm run test:watch` | Pruebas en modo continuo, para desarrollo |
| `npm run preview` | Sirve localmente el build de producción |

Antes de abrir un PR deben pasar `npm test`, `npm run build` y `npm run lint`.

## Stack

| Pieza | Tecnología |
|---|---|
| Base | Vite 8, React 19, TypeScript 6.0 |
| Rutas | React Router 8 (`RouterProvider` desde `react-router`) |
| Datos del servidor | TanStack Query 5 |
| Estilos | Tailwind 4 + shadcn/ui (Radix) + fuente Inter |
| Formularios | react-hook-form + Zod 4 (`@hookform/resolvers`) |
| Datos simulados | MSW 2.15 |
| Pruebas | Vitest 4 |

### Versiones fijadas a propósito

No las cambies sin un PR propio que lo explique:

- **TypeScript `~6.0`:** `typescript-eslint` exige una versión menor que 6.1.
- **MSW 2.x:** la 3.x cambia imports y no se ha evaluado.
- **Vitest 4.x:** la 5.x es reciente; se evaluará más adelante.

## Arquitectura

### Capas

```
Pantalla  ->  hook (TanStack Query)  ->  servicio  ->  api (fetch)
```

- **Pantalla:** dibuja y maneja estado de interfaz. No hace peticiones directas.
- **Hook:** caché, carga e invalidación. No dibuja nada.
- **Servicio:** sabe qué ruta de la API llamar. No conoce React.
- **`shared/lib/api`:** cliente HTTP único, errores tipados y mensajes seguros para el usuario.

Si algo se puede reutilizar, se extrae a una función o servicio propio: no se duplica lógica.

### Carpetas

```
src/
├── app/          Arranque: providers, router, App
├── config/       Variables de entorno y registro de módulos
├── mocks/        MSW: fábrica de CRUD simulado y lista de handlers
├── modules/      Un módulo por dominio del ERP
│   └── <módulo>/
│       ├── index.ts      Declara el módulo (menú y pantallas)
│       ├── pages/        Pantallas
│       └── <recurso>/    schema, service, hooks, mocks, components
└── shared/       Código común (lo mantiene Gabriel)
    ├── components/   Componentes del ERP (DataTable, Pagination, ...)
    │   └── ui/       Primitivas de shadcn
    ├── hooks/
    ├── layouts/
    ├── lib/          api/, money.ts, dates.ts (hora de Lima), tax.ts (IGV), utilidades
    ├── pages/
    └── types/
```

Reglas de módulos:

- Carpetas y rutas en inglés; etiquetas visibles en español.
- Un módulo **no importa archivos internos de otro**; solo su `index.ts` (`@/modules/<id>`).
- El `index.ts` publica solo **tipos y hooks de consulta** (ej. `useCustomerOptions`, `useAuth`). Nunca componentes, pantallas, servicios ni lógica de formularios. Única excepción: `DocumentsPanel` de Documentos, para adjuntar archivos en los detalles de otros módulos.
- Cada módulo se declara con `AppModule` en `modules/<id>/index.ts`. Una pantalla se conecta con `page: () => import('./pages/X')` (la pantalla usa `export default`).
- Módulos: Dashboard, Ventas (`sales`), Compras (`purchases`), Inventario (`inventory`), Finanzas (`finance`), Documentos, Reportes, Mantenimiento (`maintenance`) y Administración.
- Pagos y cobros viven en Finanzas; Ventas y Compras solo los muestran en lectura.

### Módulo de referencia: Clientes

Todo módulo nuevo debe seguir la estructura de `src/modules/maintenance/customers/` y `pages/CustomersPage.tsx`:

| Archivo | Responsabilidad |
|---|---|
| `schema.ts` | Schema de Zod: única fuente de tipos y validación |
| `service.ts` | Llamadas a la API |
| `hooks.ts` | Consultas y mutaciones con TanStack Query |
| `mocks.ts` | Datos semilla y handlers de MSW |
| `components/CustomerFormDialog.tsx` | Formulario en modal (crear y editar) |
| `pages/CustomersPage.tsx` | Tabla, búsqueda, paginación y borrado |

### Convenciones de datos

- **IDs:** UUID como texto opaco. Nunca se convierten a número ni se asume su formato.
- **Dinero:** texto decimal (`"5000.00"`). Para vistas previas se usa `src/shared/lib/money.ts` (centavos enteros). Los cálculos oficiales son del backend.
- **IGV:** nunca se escribe `0.18` en una pantalla; se usa `src/shared/lib/tax.ts`.
- **Fechas:** se muestran en hora de Lima con `src/shared/lib/dates.ts`; nunca se formatean a mano.
- **Campos** en `snake_case`, igual que la API.
- **Colores:** solo variables de `src/index.css`. Ningún componente escribe hex. Los estados se comunican con texto, no solo con color.
- **Mensajes de error:** al usuario siempre le llega `getErrorMessage(error)`, nunca un error técnico.

## Datos simulados (MSW)

- Solo funcionan en desarrollo y con `VITE_ENABLE_MOCKS=true`.
- Viven en memoria: al recargar, los datos vuelven a los iniciales.
- Cada módulo registra sus handlers en `src/mocks/handlers.ts`, con dos fábricas que responden con el formato del contrato:
  - `src/mocks/utils/crud.ts`: catálogos (paginación, filtros, rango de fechas, únicos, inmutables, registros en uso, reglas propias con `validate`).
  - `src/mocks/utils/documents.ts`: documentos con estados (borrador editable y una ruta por acción: `/confirm`, `/cancel`...).
- `src/mocks/refs.ts` tiene los datos semilla de Mantenimiento que usan los mocks de Ventas, Compras y Finanzas, para que todos hablen de los mismos clientes, proveedores y productos.
- Los efectos entre módulos (una venta que descuenta stock, un cobro que cambia el estado del comprobante) los hace el backend: los mocks no los simulan.
- Los datos semilla usan UUID fijos y legibles (`00000000-0000-4000-8000-000000000001`, ...) para que las pruebas sean predecibles. Cada recurso tiene su prefijo propio en el cuarto grupo (tabla en el manual de tareas, sección 4.1).

## Problemas conocidos del entorno de desarrollo

1. **"No se pudo cargar la información" con `ERR_CONNECTION_REFUSED` a `localhost:8000`.** El service worker de MSW se desconectó de la pestaña (suele pasar tras reiniciar Vite o cambiar `.env`). Solución: recarga con **F5** y cierra pestañas viejas de `localhost:5173`.
2. **Brave:** el ahorro de memoria puede dormir la pestaña y provocar el problema anterior. Agrega `localhost` a "Mantener siempre activos estos sitios" en `brave://settings/system`.
3. **Aviso `FetchEvent ... Failed to fetch` en la consola al recargar (F5).** Es ruido conocido: aparece en Brave y Edge, la pantalla carga bien y no existe con el backend real. Solo se investiga si la pantalla queda en blanco.
4. **`crypto.randomUUID()` solo existe en contextos seguros.** `http://localhost:5173` lo es; abrir la app por IP de red local (`http://192.168.x.x:5173`) rompe la creación de registros simulados.
5. **Sesión al recargar (F5).** El token vive solo en memoria; la sesión se recupera con `POST /auth/refresh` y la cookie HttpOnly del backend. En los mocks esa cookie se simula con una cookie normal (`erp_mock_refresh`): si borras las cookies del sitio, vuelve a iniciar sesión.
6. **`npm audit` muestra 7 vulnerabilidades altas.** Vienen de la herramienta shadcn y solo afectan al desarrollo; `npm audit --omit=dev` debe dar 0. **Nunca** uses `npm audit fix --force`.

## Flujo de trabajo con Git

- **Ramas permanentes:** `main` (estable) y `development` (integración).
- **Cada tarea:** una rama pequeña desde `development`, con prefijo `feat/`, `fix/`, `chore/` o `docs/`.
- **PR** de la tarea hacia `development` con **squash merge**.
- **`development` -> `main`:** con **merge commit** (nunca squash).
- **Commits:** `feat(scope): ...`, `fix: ...`, `chore: ...`, `docs: ...`, `test: ...`. Cada commit es una unidad lógica.
- Antes de `git add`, revisa con `git status` qué entra. Nunca subas `.env` ni secretos.
- Tras fusionar un PR: `git switch development`, `git pull` y `git branch -D <rama>`.

## Seguridad

- No pongas secretos en el código, en Git ni en logs.
- Valida siempre la entrada con Zod.
- Maneja los errores de cada llamada que pueda fallar.
- El control de acceso real lo hace el backend; el frontend solo oculta lo que el usuario no debe ver.