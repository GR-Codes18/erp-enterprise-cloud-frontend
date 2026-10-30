# Contrato de API — ERP Enterprise Cloud

Este documento define lo que el frontend espera del backend. Lo que figura como **Por confirmar** aún no está decidido y debe acordarse entre frontend y backend antes de implementarlo.

Todos los datos simulados del frontend (MSW: `src/mocks/utils/crud.ts` para catálogos, `src/mocks/utils/documents.ts` para documentos con estados y handlers propios en Finanzas, Documentos, Configuración y Reportes) responden con los formatos de este documento: paginación, filtros, rango de fechas y errores `{ code, message, errors }`. El módulo **Clientes** (`/customers`) es el ejemplo de referencia.

Las secciones marcadas como **Propuesta del frontend** son las rutas y cuerpos que usan las pantallas y sus mocks; deben revisarse con backend antes de integrar la API real.

## 1. Reglas generales

| Tema | Regla |
|---|---|
| Base URL | `http://localhost:8000/api/v1` en desarrollo (`VITE_API_BASE_URL`) |
| Formato | JSON (`Content-Type: application/json`) en peticiones con cuerpo |
| Nombres de campos | `snake_case` |
| IDs | UUID como texto. El frontend los trata como texto opaco |
| Montos | Texto decimal con punto, hasta 2 decimales: `"5000.00"`. Nunca como número |
| Cálculos | Los oficiales (totales, impuestos, saldos) los hace el backend. El frontend solo muestra vistas previas |
| Fechas | ISO 8601, dos tipos (propuesta del frontend): **fecha de negocio** solo-día `AAAA-MM-DD` (`issue_date`, `due_date`, `valid_until`, `payment_date`...) y **marca de tiempo** fecha-hora UTC con zona (`2026-10-07T14:30:00Z`) para `created_at`, `occurred_at`, `uploaded_at`... El frontend muestra las marcas de tiempo en hora de Lima (`America/Lima`) |
| Moneda | Soles (`PEN`) por defecto. **Por confirmar:** cómo se indica otra moneda en cada documento |
| CORS | Habilitar el origen `http://localhost:5173` en desarrollo |

## 2. Códigos HTTP

| Código | Cuándo |
|---|---|
| 200 | Lectura o actualización correcta (con cuerpo) |
| 201 | Creación correcta (devuelve el recurso creado, con su `id`) |
| 204 | Eliminación correcta (sin cuerpo) |
| 400 | Petición mal formada |
| 401 | Sin sesión o sesión vencida |
| 403 | Sin permiso para la operación |
| 404 | El recurso no existe |
| 409 | Conflicto de negocio (por ejemplo, documento duplicado o cliente con ventas) |
| 422 | Datos con errores de validación |
| 5xx | Error del servidor |

## 3. Formato de errores

Toda respuesta de error tiene este cuerpo:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Revisa los datos ingresados.",
  "errors": [
    { "field": "document_number", "message": "El RUC debe tener 11 dígitos" }
  ]
}
```

- `code`: identificador estable para programas, en `MAYÚSCULAS_CON_GUION_BAJO`.
- `message`: texto **en español y apto para el usuario final**. En 400, 409 y 422 el frontend lo muestra tal cual.
- `errors`: opcional. Cada elemento lleva el nombre del campo (`snake_case`, igual que en el cuerpo de la petición) y su mensaje. El frontend lo muestra junto al campo.

Reglas de seguridad:

- Para 401, 403, 404 y 5xx el frontend **ignora** `message` y muestra un texto genérico. Aun así, no se debe filtrar información sensible (trazas, nombres de tablas, rutas internas).
- No se debe confirmar si un recurso existe a quien no tiene permiso sobre él: en ese caso responder 404 en vez de 403.

## 4. Listados con paginación y búsqueda

`GET /<recurso>?page=1&size=10&search=texto`

| Parámetro | Regla |
|---|---|
| `page` | Entero desde 1. Si es inválido, usar 1 |
| `size` | Entero desde 1. Valor por defecto 20, máximo 100 |
| `search` | Texto libre. Coincidencia parcial, sin distinguir mayúsculas. Opcional |
| `date_from`, `date_to` | Fechas `AAAA-MM-DD`, ambos extremos incluidos, ambos opcionales. Formato inválido: 400. `date_from` mayor que `date_to`: 422. Sobre un campo fecha-hora, el día se interpreta **en hora de Lima**: `2026-03-20T03:00:00Z` pertenece al 19/03 |
| `<campo>` | Filtro exacto por cualquier campo permitido del recurso (`status`, `warehouse_id`, ...). Cada recurso documenta cuáles acepta. Un campo no permitido se ignora |

Respuesta (200):

```json
{
  "items": [],
  "total": 12,
  "page": 1,
  "size": 10,
  "pages": 2
}
```

- `total`: cantidad de registros que cumplen la búsqueda (no solo los de la página).
- `pages`: mínimo 1, aunque no haya registros.
- Una página fuera de rango devuelve `items` vacío con 200.
- **Por confirmar:** orden por defecto (el frontend asume un orden estable, p. ej. por nombre o fecha de creación) y filtros adicionales (`status`, rangos de fecha).

## 5. Operaciones CRUD estándar

| Operación | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| Listar | `GET /<recurso>` | — | 200 con paginación |
| Obtener | `GET /<recurso>/{id}` | — | 200 con el recurso |
| Crear | `POST /<recurso>` | Campos sin `id` | 201 con el recurso |
| Actualizar | `PUT /<recurso>/{id}` | Recurso completo sin `id` | 200 con el recurso |
| Cambiar estado | `PATCH /<recurso>/{id}` | Solo los campos que cambian, p. ej. `{ "status": "inactive" }` | 200 con el recurso |
| Eliminar | `DELETE /<recurso>/{id}` | — | 204 |

- El `id` lo asigna siempre el servidor. Si el cliente envía uno en el cuerpo, se ignora.
- `PUT` reemplaza todos los campos editables. El frontend envía siempre el recurso completo.
- Un `id` con formato inválido debe responder 404, no 500.
- `PATCH` lo usan los catálogos para activar o desactivar sin reenviar todo el recurso. Los campos inmutables (p. ej. `document_number`) se ignoran aunque lleguen.
- Eliminar solo se permite para borradores y registros sin uso. Un registro referenciado por otros (por ejemplo, un cliente con ventas) no se borra: se desactiva (status = inactive), y si se intenta borrar el backend responde **409 `IN_USE`** con un mensaje claro que el frontend muestra en el diálogo "¿Deseas desactivarlo?".
- Un valor duplicado en un campo único responde **409 `DUPLICATE`** con el campo en `errors`.

### 5.1 Acciones de documento (propuesta del frontend)

Los documentos con estados (cotizaciones, pedidos, comprobantes, transferencias, ajustes, órdenes, pagos...) **no cambian de estado con PUT**: cada transición es una acción.

`POST /<recurso>/{id}/<acción>`

| Acción | Uso | Cuerpo |
|---|---|---|
| `send`, `submit`, `confirm`, `issue`, `receive`, `apply`, `approve`, `accept` | Avanzar al siguiente estado | `{}` |
| `convert` (cotización) e `invoice` (pedido) | Crear el documento siguiente; responden **ese documento** (el pedido o el comprobante) | `{}` / `{ "type": "invoice" \| "receipt" }` |
| `cancel`, `void`, `reject` | Cancelar, anular o rechazar | `{ "reason": "texto de 5 a 255 caracteres" }` (obligatorio) |

- Respuesta: **200 con el documento actualizado** (o 204 cuando el documento deja de listarse, como en Documentos).
- Una transición no permitida desde el estado actual responde **409 `INVALID_TRANSITION`**.
- Solo un documento en `draft` se edita con `PUT` o se elimina con `DELETE`; en cualquier otro estado, 409.
- Los efectos (descontar stock, crear la cuenta por cobrar...) los ejecuta el backend en la acción. El frontend no los simula.

## 6. Recurso: Clientes (`/customers`)

Implementado en el frontend. Reglas de validación en `src/modules/maintenance/customers/schema.ts`.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | texto (UUID) | Lo asigna el servidor |
| `document_type` | texto | `DNI`, `RUC` o `CE` |
| `document_number` | texto | DNI: 8 dígitos. RUC: 11 dígitos. CE: 9 a 12 caracteres alfanuméricos |
| `name` | texto | 2 a 120 caracteres |
| `address` | texto | Dirección principal para envíos, máximo 250 caracteres; opcional, se devuelve como `""` si no se registró |
| `email` | texto | Correo válido, o cadena vacía `""` si no tiene |
| `phone` | texto | Máximo 20 caracteres. Cadena vacía si no tiene |
| `credit_limit` | texto decimal | `"0.00"` o mayor, hasta 2 decimales |
| `status` | texto | `active` o `inactive` |

Notas para el backend:

- Los campos opcionales se devuelven como "", nunca como null. (Decidido.)
- `PATCH /customers/{id}` con el único campo `address` puede ejecutarlo una persona con `sales.orders:create` o `sales.orders:edit`, para registrar/actualizar la dirección desde el formulario de venta. Esta excepción no autoriza cambiar ningún otro campo del cliente; los demás cambios requieren `maintenance.customers:edit`.
- La búsqueda `search` debe cubrir `name`, `document_number` y `email`.
- Se espera validar con las mismas reglas de la tabla y devolver 422 con `errors` por campo.
- Un documento duplicado (mismo `document_type` + `document_number`) debe responder 409. **Por confirmar** con la regla de negocio.

Ejemplo (respuesta de `GET /customers/{id}`):

```json
{
  "id": "00000000-0000-4000-8000-000000000001",
  "document_type": "RUC",
  "document_number": "20100000001",
  "name": "Comercial Andina S.A.C.",
  "address": "Dirección de ejemplo 123, Lima",
  "email": "ventas@andina.example",
  "phone": "014000001",
  "credit_limit": "5000.00",
  "status": "active"
}
```

## 7. Autenticación y permisos

Definido y con soporte simulado (MSW) en el frontend, incluido el refresh.

### 7.1 Mecanismo
- **Token de acceso:** el cliente envía la cabecera `Authorization: Bearer <token>` en todas las peticiones a rutas protegidas. Es de vida corta.
- **Manejo en cliente:** el token se guarda **exclusivamente en memoria**. Nunca en `localStorage` ni `sessionStorage`.
- **Refresh token:** lo pone el backend en una cookie `HttpOnly`, `Secure`, `SameSite=Strict`, con `Path=/api/v1/auth`. El frontend nunca la lee; la envía con `credentials: "include"` en todas las peticiones.
- **CORS:** como viaja una cookie, el backend debe responder `Access-Control-Allow-Credentials: true` y un `Access-Control-Allow-Origin` explícito (nunca `*`).
- **Al abrir la app o recargar (F5):** el frontend llama a `POST /auth/refresh`. Con 200 recupera la sesión sin volver a pedir credenciales; con 401 muestra el login.
- **Token vencido (401):** ante un 401 en una ruta protegida, el frontend hace **un solo** `POST /auth/refresh` (compartido aunque fallen varias peticiones a la vez) y repite la petición. Si el refresh también responde 401, limpia la sesión y la caché, y redirige a `/login`. Un 401 en `/auth/*` nunca dispara el refresh.

### 7.2 Rutas de autenticación

| Operación | Ruta | Respuesta |
|---|---|---|
| Iniciar sesión | `POST /auth/login` con `{ "email", "password" }` | 200 `{ token, user }` y pone la cookie de refresh. 401 `INVALID_CREDENTIALS` |
| Renovar sesión | `POST /auth/refresh` (sin cuerpo; usa la cookie) | 200 `{ token, user }` (puede rotar la cookie). 401 si no hay sesión válida |
| Cerrar sesión | `POST /auth/logout` | 204; invalida el refresh token y borra la cookie |

Respuesta de login y refresh:

```json
{
  "token": "cadena-de-token-jwt",
  "user": {
    "id": "00000000-0000-4000-8010-000000000001",
    "name": "Gabriel Romero",
    "email": "admin@enterprise.com",
    "role": "Administrador",
    "permissions": ["*"]
  }
}
```

Credenciales inválidas (401):

```json
{ "code": "INVALID_CREDENTIALS", "message": "Credenciales inválidas." }
```

### 7.3 Permisos

- Cada permiso es `<módulo>.<pantalla>:<acción>`, por ejemplo `inventory.adjustments:approve`.
- Acciones: `view`, `create`, `edit`, `void` (anular o eliminar) y `approve`. Marcar cualquier acción implica `view`.
- `"*"` concede todos los permisos (rol Administrador, de sistema).
- `GET /permissions` devuelve el catálogo de pantallas y sus acciones, agrupado por módulo (`code`, `module`, `module_label`, `label`, `actions`).
- `user.permissions` (en el login) es la lista efectiva del usuario. El frontend solo la usa para **ocultar** acciones y pantallas: el backend responde 403 aunque el frontend no las oculte.

## 8. Mapa de rutas

Todas bajo `/api/v1`. Las secciones 11 a 19 son **propuesta del frontend** (lo que usan las pantallas y sus mocks); el backend las revisa antes de integrar.

| Ruta | Responsabilidad | Sección |
|---|---|---|
| `/auth` | Sesión (login, refresh, logout) | 7 |
| `/customers`, `/suppliers`, `/categories`, `/warehouses`, `/products` | Catálogos de Mantenimiento | 6 y 13 |
| `/users`, `/roles`, `/permissions`, `/audit`, `/settings` | Administración | 14 |
| `/inventory/stock`, `/inventory/kardex`, `/inventory/transfers`, `/inventory/adjustments` | Inventario | 11 y 15 |
| `/sales/quotes`, `/sales/orders`, `/sales/invoices`, `/sales/returns` | Ventas | 16 |
| `/purchases/requests`, `/purchases/orders`, `/purchases/receptions`, `/purchases/invoices`, `/purchases/returns` | Compras | 17 |
| `/finance/receivables`, `/finance/payables`, `/finance/payments`, `/finance/cash/...`, `/finance/bank-accounts`, `/finance/statements` | Finanzas | 18 |
| `/documents` | Documentos (S3) | 12 |
| `/reports/dashboard`, `/reports/...` | Dashboard y reportes | 19 |

## 9. Prefijos de los UUID en los datos simulados

Los mocks usan UUID fijos `00000000-0000-4000-<prefijo>-00000000000N` (tabla completa en el manual de tareas, 4.1). El backend real genera sus propios UUID; los prefijos solo hacen predecibles las pruebas del frontend.

## 10. Lista de decisiones pendientes

| # | Decisión | Quién | Estado |
|---|---|---|---|
| 1 | Formato de fechas por campo | Frontend + backend | Propuesta en la sección 1 |
| 2 | Autenticación y permisos | Frontend + backend | Bearer en memoria y refresh por cookie HttpOnly: sección 7 (falta que backend confirme la cookie) |
| 3 | Orden por defecto y filtros de los listados | Frontend + backend | Filtros documentados por recurso; orden por confirmar |
| 4 | Rutas y campos de los recursos | Backend revisa | Propuesta completa del frontend en las secciones 11 a 19 |
| 5 | Cómo se indica la moneda en documentos | Frontend + backend | Por confirmar |
| 6 | Alta y restablecimiento de contraseñas | Backend | Por definir: el frontend nunca muestra ni guarda contraseñas |
| 7 | Nombres de las acciones de documento | Frontend + backend | Propuesta en la sección 5.1 |
| 8 | Flujo de subida de archivos a S3 | Frontend + backend | Propuesta en la sección 12 |

## 11. Propuesta del frontend: inventario

Las rutas y los cuerpos de esta sección son la propuesta usada por la implementación del frontend y sus mocks. **No son un contrato acordado con el backend**; deben revisarse con el equipo de backend antes de integrar la API real.

### 11.1 Transferencias (`/inventory/transfers`)

| Operación | Ruta | Regla |
|---|---|---|
| Listar | `GET /inventory/transfers` | Paginado; filtros `status`, `origin_warehouse_id`, `destination_warehouse_id`; rango sobre `created_at` |
| Obtener | `GET /inventory/transfers/{id}` | Incluye nombres de almacenes y producto para mostrar el documento |
| Crear | `POST /inventory/transfers` | Crea en estado `draft` |
| Editar | `PUT /inventory/transfers/{id}` | Solo en `draft`; reemplaza el documento completo |
| Enviar | `POST /inventory/transfers/{id}/send` | Solo `draft`; cambia a `in_transit` y descuenta stock del origen |
| Recibir | `POST /inventory/transfers/{id}/receive` | Solo `in_transit`; cambia a `received` y suma stock al destino |
| Cancelar | `POST /inventory/transfers/{id}/cancel` | Solo `draft`; cuerpo `{ "reason" }`; cambia a `cancelled` |
| Eliminar borrador | `DELETE /inventory/transfers/{id}` | Solo `draft` |

Cuerpo de creación/edición:

```json
{
  "origin_warehouse_id": "UUID",
  "destination_warehouse_id": "UUID",
  "items": [{ "product_id": "UUID", "quantity": 3 }]
}
```

Origen y destino deben ser diferentes, cada producto aparece una sola vez y `quantity` es entero positivo que no supera la existencia disponible en origen. El backend vuelve a validar disponibilidad al enviar. El frontend no simula movimientos de stock en sus mocks.

### 11.2 Ajustes (`/inventory/adjustments`)

| Operación | Ruta | Regla |
|---|---|---|
| Listar | `GET /inventory/adjustments` | Paginado; filtros `status`, `warehouse_id`, `reason`; rango sobre `created_at` |
| Obtener | `GET /inventory/adjustments/{id}` | Incluye nombre del almacén y nombres de producto |
| Crear | `POST /inventory/adjustments` | Crea en estado `draft` |
| Editar | `PUT /inventory/adjustments/{id}` | Solo en `draft`; reemplaza el documento completo |
| Aplicar | `POST /inventory/adjustments/{id}/apply` | Requiere permiso `inventory.adjustments:approve`; cambia a `applied` |
| Eliminar borrador | `DELETE /inventory/adjustments/{id}` | Solo `draft` |

Cuerpo de creación/edición:

```json
{
  "warehouse_id": "UUID",
  "items": [{ "product_id": "UUID", "direction": "increase", "quantity": 3 }],
  "reason": "physical_count",
  "notes": ""
}
```

`direction` acepta `increase` o `decrease`; `reason` acepta `physical_count`, `shrinkage`, `damage`, `expiration` u `other`. El motivo es obligatorio, `notes` es opcional como cadena vacía, la cantidad es entero positivo y no se repite producto. Al aplicar, el backend rechaza con 409 si una disminución deja stock negativo. Los mocks solo cambian el estado del ajuste: no modifican stock ni kardex.

Las respuestas de ambos recursos incluyen `id`, `status`, `created_at` y los nombres de almacenes/productos necesarios para lectura. Se recomienda incluir `product_name` en cada línea de respuesta para preservar la etiqueta de productos inactivos en documentos históricos; ese campo no se envía al crear o editar.

Las respuestas de 400, 403, 404, 409 y 422 siguen los formatos generales de las secciones 2 y 3. El backend debe aplicar las reglas de autorización y validación aunque el frontend oculte acciones.

## 12. Propuesta del frontend: documentos (`/documents`)

Repositorio de archivos: el **archivo** vive en S3 y los **metadatos** en la base de datos. El archivo nunca pasa por la API ni se expone con una URL pública o permanente.

### 12.1 Subida en tres pasos

1. `POST /documents` con los metadatos. Responde **201** `{ "id": "UUID", "upload_url": "https://..." }`. El documento queda **pendiente** y no se lista.
2. `PUT <upload_url>` directo a S3 con el archivo y la cabecera `Content-Type` declarada. Es una URL prefirmada y de corta duración: no lleva la cabecera `Authorization` de la API.
3. `POST /documents/{id}/confirm` (cuerpo `{}`). El backend verifica que el archivo exista y coincida en tipo y tamaño. Responde **200** con el documento, que ya se lista.

Si el paso 2 o 3 falla, el documento pendiente no se muestra; el backend lo descarta pasado un tiempo.

Cuerpo del paso 1:

```json
{
  "name": "contrato-proveedor.pdf",
  "category": "contract",
  "entity_type": "purchase",
  "entity_id": "UUID",
  "mime_type": "application/pdf",
  "size": 245760
}
```

| Campo | Regla |
|---|---|
| `name` | Nombre del documento, 2 a 120 caracteres |
| `category` | `invoice`, `contract`, `order`, `receipt` u `other` |
| `entity_type` | `sale`, `purchase`, `transfer`, `adjustment`, `payment` o `""` si no pertenece a una operación |
| `entity_id` | UUID de la operación, o `""` |
| `mime_type` | PDF, PNG, JPG, XLSX o DOCX (valores en `src/modules/documents/files/fileRules.ts`) |
| `size` | Bytes, máximo 10 MB. **Por confirmar** con backend |

El backend vuelve a validar tipo y tamaño (422 con `errors`).

### 12.2 Resto de operaciones

| Operación | Ruta | Respuesta |
|---|---|---|
| Listar | `GET /documents` | Paginado; filtros `category`, `entity_type`, `entity_id`; rango sobre `uploaded_at` |
| Descargar | `GET /documents/{id}/download-url` | 200 `{ "url": "...", "expires_in": 300 }`: enlace temporal firmado |
| Eliminar (lógico) | `POST /documents/{id}/void` con `{ "reason": "..." }` | 204; deja de listarse y queda en auditoría |

Respuesta de lectura: `id`, `name`, `category`, `entity_type`, `entity_id`, `entity_label` (texto para mostrar la operación, p. ej. "Factura F001-123"), `mime_type`, `size`, `uploaded_by`, `uploaded_by_name` y `uploaded_at`.

El permiso sobre un documento sigue al del registro relacionado: quien no puede ver la venta no ve sus documentos (404).

## 13. Propuesta del frontend: catálogos de Mantenimiento

CRUD estándar (sección 5) con `PATCH` para activar/desactivar. Opcionales como `""`. Un catálogo con uso responde 409 `IN_USE` al borrar; un duplicado, 409 `DUPLICATE` con el campo en `errors`.

Los demás catálogos de Maestro usan las rutas `/maintenance/catalogs/{resource}` con los campos `id`, `code`, `name`, `detail`, `status` (`active` | `inactive`) y `value` (cadena, puede ser `""` salvo donde se indica). Recursos: `companies`, `branches`, `brands`, `units`, `unit-conversions`, `transporters`, `sellers`, `zones`, `currencies`, `taxes`, `payment-methods` y `price-lists`. `code` es único; las monedas, unidades y formas de pago también tienen `value` único. Estos catálogos se simulan en memoria con MSW hasta que exista API real.

Integraciones frontend disponibles: Ventas, Compras, Inventario, Finanzas y Reportes ya consumen hooks compartidos de clientes, proveedores, productos, categorías y almacenes. Productos consulta las unidades activas de Maestro (`value` es el código de unidad). Tesorería consulta monedas activas para las cuentas bancarias (`value` es un código de tres letras, como `PEN` o `USD`) y sucursales para asociarlas a cuentas bancarias. Cobros y pagos consultan las formas de pago activas; las opciones compatibles actualmente son `cash`, `transfer` y `card`. Agregar una moneda no realiza conversión de importes; agregar otro medio de pago requiere primero soporte de flujo en Tesorería.

| Recurso | Campos | Únicos e inmutables | Filtros |
|---|---|---|---|
| `/suppliers` | `document_type`, `document_number`, `name`, `email`, `phone`, `credit_days` (entero ≥ 0), `status` | `document_type` + `document_number` únicos e inmutables | `status`, `document_type` |
| `/categories` | `name`, `status` | `name` único (sin distinguir mayúsculas) | `status` |
| `/warehouses` | `code` (mayúsculas, ej. `ALM-001`), `name`, `address` (`""` si no hay), `status` | `code` único e inmutable | `status` |
| `/products` | `sku` (2 a 30 caracteres `A-Z 0-9 _ -`, se guarda en mayúsculas), `name`, `category_id`, `unit` (código activo de `/maintenance/catalogs/units`), `sale_price`, `cost_price` (texto decimal ≥ 0), `min_stock` (entero ≥ 0), `status` | `sku` único e inmutable | `status`, `category_id` |

- Respuesta de productos: además `category_name` y `stock_total` (suma de almacenes, calculada; solo lectura).
- Cambiar `unit` de un producto con movimientos: 409 `UNIT_LOCKED` con el error en `unit`.
- No se borra una categoría con productos ni un almacén con stock; un almacén con stock > 0 no se desactiva (409). Siempre queda al menos un almacén activo (409).
- Un `sale_price` menor que `cost_price` se acepta (el frontend solo advierte).

## 14. Propuesta del frontend: Administración

| Recurso | Operaciones | Notas |
|---|---|---|
| `/users` | Listar (filtros `status`, `role_id`), crear, `PUT` | Sin borrado ni contraseñas. Nadie se desactiva a sí mismo (409 `SELF_DEACTIVATION`). `email` único (409 `DUPLICATE`). 409 `LAST_ADMIN` si se desactiva o se quita el rol al último administrador activo. Nadie se desactiva a sí mismo (409) |
| `/roles` | CRUD | Campos `name` (único), `description`, `permissions[]` (formato de la sección 7.3, cada pantalla con `view`), `is_system`. Un rol nuevo nunca es de sistema. El rol de sistema no se edita ni se borra (409 `SYSTEM_ROLE`). Un rol con usuarios no se borra (409 `IN_USE`) |
| `/permissions` | Listar (filtro `module`) | Catálogo de solo lectura |
| `/audit` | Listar | Solo lectura. Campos `id`, `user_id`, `user_name`, `action`, `module`, `record` (registro afectado), `result` (`success` \| `failure`), `created_at`. Filtros `user_id`, `module`, `action`, `result`; rango sobre `created_at` |
| `/settings` | `GET /settings`, `PUT /settings` (recurso único, sin id en la ruta) | Campos `id`, `company_ruc` (11 dígitos), `company_name`, `company_address`, `igv_rate` (texto, ej. `"18.00"`), `currency` (`PEN` \| `USD`), `invoice_series` y `receipt_series` (4 caracteres, distintas), `block_negative_stock`. Solo con `administration.settings:edit`. Un cambio de IGV aplica solo a documentos nuevos y queda en auditoría |

## 15. Propuesta del frontend: Stock y Kardex

| Ruta | Respuesta | Filtros |
|---|---|---|
| `GET /inventory/stock` | Filas producto × almacén: `product_id`, `product_sku`, `product_name`, `category_id`, `category_name`, `warehouse_id`, `warehouse_name`, `unit`, `quantity`, `min_stock`, `status` (`normal`, `low`, `out`) y `below_min` (`quantity <= min_stock`) calculados | `status`, `warehouse_id`, `category_id`, `product_id`, `below_min=true` |
| `GET /inventory/kardex` | Movimientos con `product_name`, `product_sku`, `occurred_at`, `type` (compra, venta, anulación de venta, transferencia entrada/salida, ajuste, devolución), documento de origen, entrada, salida y `balance` acumulado (lo calcula el backend) | `product_id` (obligatorio en Kardex completo; opcional en Kardex comercial), `warehouse_id`, `type`; `types` opcional, lista separada por comas; rango sobre `occurred_at` (obligatorio) |

La vista **Kardex comercial** envía `types=purchase,sale`; el backend debe filtrar ambos tipos antes de paginar. Por defecto consulta el día actual en hora de Lima sin requerir producto; `product_id` se puede agregar como filtro opcional. `balance` conserva el saldo real del inventario, que puede incluir movimientos no mostrados en esta vista.

Transferencias y ajustes (sección 11) devuelven además `number` (`TR-000004`, `AJ-000004`). Cancelar una transferencia exige `{ "reason" }` (sección 5.1).

## 16. Propuesta del frontend: Ventas

Las líneas de documento son `{ product_id, quantity (entero > 0), unit_price (texto decimal) }`, sin productos repetidos. Las respuestas agregan `product_name` y los totales oficiales `subtotal`, `igv` y `total`; el IGV se calcula una vez sobre el subtotal.

| Recurso | Estados | Acciones | Filtros |
|---|---|---|---|
| `/sales/quotes` | `draft → sent → accepted \| rejected \| expired` | `send`, `accept`, `reject` (motivo), `convert` (responde el pedido creado en borrador) | `status`, `customer_id`; rango sobre `issue_date` |
| `/sales/orders` | `draft → confirmed → invoiced \| cancelled` | `confirm`, `cancel` (motivo, antes de facturar), `invoice` con `{ "type": "invoice" \| "receipt" }` (responde el comprobante) | `status`, `customer_id`, `payment_condition`; rango sobre `created_at` |
| `/sales/invoices` | `issued → partially_paid → paid`, `void` | `void` (motivo; solo sin cobros) | `status`, `type`, `customer_id`; rango sobre `issue_date` |
| `/sales/returns` | `draft → confirmed` | `confirm` | `status`, `invoice_id`; rango sobre `created_at` |

- **Cotización:** `customer_id`, `issue_date`, `valid_until` (≥ emisión), `items`, `notes`. Respuesta: `number` (`COT-…`), `customer_name`, `order_id` (`""` si no se convirtió), `rejection_reason`. `expired` lo marca el backend al pasar `valid_until`.
- **Pedido:** `customer_id` registrado o `""` para comprador ocasional, `buyer_name`, `buyer_document_type` (`DNI`, `RUC`, `CE` o `""`), `buyer_document_number`, `sale_type` (`unit` o `wholesale`), `delivery_method` (`none` para unidad/presencial; `shipping` o `pickup` para mayorista), `quote_id` (`""` si no viene de cotización), `items`, `payment_condition` (`cash` con `credit_days` 0, o `credit` con 1 a 365), `notes`. Un comprador ocasional solo puede tener venta presencial por unidad, al contado y sin cotización; debe proporcionar nombre o tipo y número de documento. No crea una ficha en `/customers` y solo puede recibir boleta. Crédito, venta mayorista, envío/recojo y conversión desde cotización requieren un cliente registrado. Para `shipping`, el backend obtiene `address` del perfil de cliente y lo copia a `delivery_address` en el pedido; rechaza la operación si no hay dirección registrada (422 `DELIVERY_ADDRESS_REQUIRED`). Para `pickup`, no requiere dirección. Al confirmar, el backend valida cliente activo cuando existe cliente registrado, stock (409 `INSUFFICIENT_STOCK` con la lista en `message`) y límite de crédito: saldo pendiente del cliente + total del pedido ≤ `credit_limit` (409 `CREDIT_LIMIT_EXCEEDED`: "Excede el límite de crédito"). Respuesta: `number` (`PED-…`), `customer_id`, `customer_name`, `customer_document_type`, `buyer_name`, `buyer_document_type`, `buyer_document_number`, `quote_number`, `delivery_status`, `delivery_address`, `invoice_id`, `cancel_reason`.
- **Estado de entrega:** inicia como `pending` al crear pedido mayorista; `PATCH /sales/orders/{id}/delivery-status` con `{ "status": "in_transit" | "delivered" | "ready_for_pickup" | "picked_up" }` avanza solo al próximo estado válido. Envío: `pending → in_transit → delivered`. Recojo: `pending → ready_for_pickup → picked_up`. Solo se actualiza en pedidos confirmados/facturados y requiere `sales.orders:edit`; no cambia el estado comercial del pedido.
- **Comprobante:** nace de `POST /sales/orders/{id}/invoice`. Incluye `payment_condition` (`cash` \| `credit`) del pedido. La factura exige cliente registrado con RUC (422 `RUC_REQUIRED`); para comprador ocasional solo se permite boleta (422 `GUEST_RECEIPT_REQUIRED`). La boleta del comprador ocasional guarda el nombre/documento del pedido sin crear un cliente; si solo proporcionó nombre, `customer_document` indica `"Sin documento"`. `series` y `number` los asigna el backend. Al emitir: descuenta stock y, si es a crédito, crea la cuenta por cobrar. Respuesta: `type`, `series`, `number`, `order_id`, `order_number`, `customer_*`, `issue_date`, `due_date` (`""` al contado), `items` con `returned_quantity`, totales, `paid`, `balance`, `status`, `void_reason`. Anular revierte el stock (409 `HAS_PAYMENTS` si tiene cobros).
- **Devolución:** `invoice_id`, `items` `{ product_id, quantity }` y `reason` (5 a 255). Cantidad ≤ vendida − ya devuelta (422 con el error en `items.N.quantity`). Al confirmar: nota de crédito, reingreso de stock y menor deuda. Respuesta: `number` (`DEV-…`), `invoice_code`, `customer_name`, `total` (monto de la nota de crédito).

## 17. Propuesta del frontend: Compras

| Recurso | Estados | Acciones | Filtros |
|---|---|---|---|
| `/purchases/requests` | `draft → pending → approved \| rejected` | `submit`, `approve`, `reject` (motivo) | `status`; rango sobre `created_at` |
| `/purchases/orders` | `draft → issued → partially_received → received \| cancelled` | `issue`, `cancel` (motivo; solo sin recepciones) | `status`, `supplier_id`; rango sobre `created_at` |
| `/purchases/receptions` | `draft → confirmed` | `confirm` | `status`, `order_id`, `warehouse_id`; rango sobre `created_at` |
| `/purchases/invoices` | `registered → paid \| void` | `void` (motivo; solo sin pagos) | `status`, `supplier_id`; rango sobre `issue_date` |
| `/purchases/returns` | `draft → confirmed` | `confirm` | `status`, `reception_id`; rango sobre `created_at` |

- **Solicitud:** `items` `{ product_id, quantity }`, `justification` (10 a 500), `needed_by`. Quien aprueba o rechaza no puede ser quien solicita (409 `SELF_APPROVAL`). Respuesta: `number` (`SOL-…`), `requested_by`, `requested_by_name`, `decided_by_name`, `rejection_reason`.
- **Orden:** `supplier_id`, `request_id` (`""` si no viene de solicitud), `items` con `unit_price` = costo, `expected_date`, `notes`. Respuesta: `number` (`OC-…`), `supplier_name`, `request_number`, `items` con `received_quantity`, totales, `cancel_reason`.
- **Recepción:** `order_id`, `warehouse_id`, `guide_number`, `items` `{ product_id, quantity }` con cantidad ≤ pendiente de la orden (422). Inmutable al confirmar; al confirmar sube el stock y avanza la orden. Respuesta: `number` (`REC-…`), `order_number`, `supplier_name`, `warehouse_name`, `items` con `returned_quantity`.
- **Factura del proveedor:** `supplier_id`, `order_id` (de ese proveedor), `series` (4 caracteres), `number` (hasta 8 dígitos; se guarda con 8), `issue_date`, `due_date` (el frontend propone emisión + `credit_days`), `total` con IGV. Proveedor + serie + número únicos (409 `DUPLICATE`). No se edita: se anula y se registra de nuevo. Respuesta: `received_total` (valor de lo recibido con IGV) y `warning` (texto para el usuario si el total no coincide; `""` si cuadra), `paid`, `balance`. Genera la cuenta por pagar.
- **Devolución al proveedor:** `reception_id`, `items`, `reason`. Cantidad ≤ recibida − ya devuelta. Al confirmar baja el stock y la deuda. Respuesta: `number` (`DVP-…`), `reception_number`, `supplier_name`, `total`.

## 18. Propuesta del frontend: Finanzas

Las pantallas de Cobros y Pagos se separan en la interfaz, aunque comparten el recurso `/finance/payments` y el filtro `type`. Los flujos de instrumentos y tributos que aún no tienen API real se respaldan temporalmente con MSW en el frontend; las rutas siguientes son una propuesta de contrato pendiente de confirmar con backend.

| Ruta | Operación | Notas |
|---|---|---|
| `GET /finance/receivables` | Listar | Filtros `customer_id`, `status`; rango sobre `due_date`. Campos: `invoice_id`, `invoice_code`, `customer_*`, `issue_date`, `due_date`, `total`, `paid`, `balance`, `status` (`pending`, `partially_paid`, `paid`, `overdue`) |
| `GET /finance/payables` | Listar | Igual, con `supplier_*` |
| `GET /finance/payments` | Listar | Filtros `type` (`collection` \| `payment`), `method`, `status` (`registered`, `approved`, `executed`, `void`), `document_id`; rango sobre `payment_date` |
| `POST /finance/payments` | Registrar cobro o pago | Cuerpo: `type`, `document_type` (`sales_invoice` \| `supplier_invoice`), `applications` (`[{ document_id, amount }]`; documentos únicos, del mismo tercero y cada monto > 0 y ≤ saldo disponible), `method` (`cash` \| `transfer` \| `card`), `payment_date` (no futura), `bank_account_id` y `operation_number` (obligatorios con transferencia), `reference`. Crea estado `registered`; no modifica saldos ni movimientos |
| `POST /finance/payments/{id}/approve` | Aprobar | Solo desde `registered`; cambia a `approved` sin aplicar el movimiento |
| `POST /finance/payments/{id}/execute` | Ejecutar | Solo desde `approved`. Valida nuevamente saldo y destino; cambia a `executed`, actualiza el saldo del documento y registra el movimiento en caja o banco. Efectivo sin caja abierta: 409 `CASH_CLOSED` |
| `POST /finance/payments/{id}/void` | Anular | `{ reason }`. Operaciones no ejecutadas liberan el saldo reservado. Si ya se ejecutó, se restituye el saldo y se registra el movimiento inverso (409 si la caja donde entró ya se cerró) |
| `GET /finance/cash/registers` | Cajas | Paginado (formato de la sección 4). `id`, `name`, `kind` (`petty` \| `general`), `branch_id`, `responsible_id`, `assigned_fund`, `open_session_id` (`""` si no hay) |
| `GET /finance/cash/sessions`, `GET /finance/cash/sessions/{id}` | Sesiones | Filtros `status`, `register_id`; rango sobre `opened_at`. Incluyen `movements`, `expected_amount` (calculado), `counted_amount`, `difference`, `closing_note` |
| `POST /finance/cash/sessions` | Abrir | `{ register_id, opening_amount }`. Una sola sesión abierta por caja (409 `SESSION_ALREADY_OPEN`) |
| `POST /finance/cash/sessions/{id}/movements` | Ingreso o egreso | `{ type, concept (obligatorio), amount }`. Sesión cerrada: 409 |
| `POST /finance/cash/sessions/{id}/close` | Cerrar | `{ counted_amount, note }`. La nota es obligatoria si hay diferencia. Responde la sesión con `difference` (+ sobrante, − faltante). Cerrada es solo lectura |
| `/finance/bank-accounts` | Catálogo | `bank`, `number` (único), `currency` (`PEN` \| `USD`), `branch_id` (opcional), `status`; respuesta con `balance` calculado. Filtros `status`, `currency`. Con movimientos no se borra. Los cobros y pagos en soles solo usan cuentas en `PEN` |
| `GET`/`POST /finance/bank-accounts/{id}/movements` | Movimientos | Filtros `type`, `source`; rango sobre `movement_date`. Manual: `{ type, concept, amount, movement_date }`. Los de cobros y pagos por transferencia entran solos (`source: "payment"`) |
| `PATCH /finance/bank-accounts/{id}/movements/{movementId}` | Conciliar | `{ "reconciled": true \| false }` (opcional v1) |
| `GET /finance/statements` | Estado de cuenta | Query `party_type` (`customer` \| `supplier`), `party_id`, `date_from`, `date_to` (obligatorios). Responde `party_name`, `party_document`, `opening_balance`, `lines` (`date`, `type`, `document_code`, `debit`, `credit`, `balance` acumulado) y `closing_balance`. Los saldos los calcula el backend |
| `GET /finance/instruments`, `POST /finance/instruments`, `PATCH /finance/instruments/{id}/status` | Letras, pagarés y cheques | Endpoints temporales de MSW. Campos: `type`, `number`, `third_party`, `amount`, `issue_date`, `due_date`, `status` (`pending`, `paid`, `void`) |
| `GET /finance/taxes`, `POST /finance/taxes`, `PATCH /finance/taxes/{id}/status` | Tributos financieros | Endpoints temporales de MSW. Campos: `tax_type`, `period`, `base`, `amount`, `document_origin`, `status` (`pending`, `paid`) |

## 19. Propuesta del frontend: Dashboard y Reportes

Todos los agregados los calcula el backend. Rango con `date_from` y `date_to` (fechas de negocio, día de Lima).

### 19.1 Definición de indicadores (`GET /reports/dashboard`)

| Campo | Definición |
|---|---|
| `sales` | Suma de comprobantes emitidos del periodo, sin anulados, menos el valor de las devoluciones confirmadas (con IGV) |
| `cost_of_sales` | Estimado con el costo actual del catálogo por unidades vendidas no devueltas; se debe conservar costo histórico por línea antes de tratarlo como cifra contable |
| `purchases` | Suma de facturas de proveedor registradas del periodo, sin anuladas |
| `gross_profit` | Ventas netas sin IGV menos el costo de lo vendido |
| `gross_margin` | `gross_profit` ÷ ventas netas sin IGV, en % con 1 decimal (`"25.0"`); `""` si no hubo ventas |
| `critical_stock_count` | Cantidad de productos con stock total ≤ `min_stock` |
| `receivables.total` / `receivables.overdue` | Saldo total por cobrar / saldo de las cuentas vencidas |
| `payables.total` / `payables.due_soon` | Saldo total por pagar / saldo que vence en los próximos 7 días |
| `inventory_turnover` | Costo de ventas ÷ inventario promedio del periodo, texto con 2 decimales |
| `alerts.low_stock` | Productos bajo mínimo: `product_id`, `product_name`, `unit`, `stock`, `min_stock` |
| `alerts.overdue_receivables` | Cuentas vencidas: `invoice_id`, `invoice_code`, `customer_name`, `balance`, `due_date` |
| `alerts.orders_to_invoice` | Pedidos confirmados pendientes de comprobante: `id`, `number`, `customer_name`, `total` |
| `alerts.pending_deliveries` | Pedidos mayoristas con envío/recojo pendiente: `id`, `number`, `customer_name`, `method`, `status` |
| `alerts.purchase_orders_to_receive` | Órdenes emitidas o parcialmente recibidas con saldo pendiente: `id`, `number`, `supplier_name`, `expected_date`, `status` |

### 19.2 Reportes

| Ruta | Respuesta | Filtros |
|---|---|---|
| `GET /reports/sales` | Paginado de comprobantes (`code`, `type_label`, `issue_date`, `customer_name`, `total`, `status_label`) **más `sum`**: total del resultado completo sin anulados | Rango, `customer_id` |
| `GET /reports/purchases` | Igual con facturas de proveedor (`supplier_name`) | Rango, `supplier_id` |
| `GET /reports/low-stock` | Paginado: `sku`, `product_name`, `unit`, `stock`, `min_stock`, `shortfall`; `sum` vacío | — |
| `GET /reports/analytics/monthly` | Lista `{ month: "2026-09", sales, purchases }`, un punto por mes del rango (también los meses en cero) | Rango |
| `GET /reports/analytics/top-products` | Los 5 productos con más venta neta: `product_id`, `product_name`, `quantity`, `amount` (sin IGV) | Rango |

Los reportes operativos se imprimen desde el navegador. Los gráficos se dibujan en el frontend (SVG propio, sin librería) y siempre tienen una vista de tabla.
