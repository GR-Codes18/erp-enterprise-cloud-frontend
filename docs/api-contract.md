# Contrato de API — ERP Enterprise Cloud

Este documento define lo que el frontend espera del backend. Lo que figura como **Por confirmar** aún no está decidido y debe acordarse entre frontend y backend antes de implementarlo.

El módulo **Clientes** (`/customers`) ya funciona contra datos simulados con exactamente este formato y sirve de ejemplo de referencia.

## 1. Reglas generales

| Tema | Regla |
|---|---|
| Base URL | `http://localhost:8000/api/v1` en desarrollo (`VITE_API_BASE_URL`) |
| Formato | JSON (`Content-Type: application/json`) en peticiones con cuerpo |
| Nombres de campos | `snake_case` |
| IDs | UUID como texto. El frontend los trata como texto opaco |
| Montos | Texto decimal con punto, hasta 2 decimales: `"5000.00"`. Nunca como número |
| Cálculos | Los oficiales (totales, impuestos, saldos) los hace el backend. El frontend solo muestra vistas previas |
| Fechas | ISO 8601. **Por confirmar:** fecha (`2026-10-07`) vs fecha-hora UTC (`2026-10-07T14:30:00Z`) según cada campo |
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
| Eliminar | `DELETE /<recurso>/{id}` | — | 204 |

- El `id` lo asigna siempre el servidor. Si el cliente envía uno en el cuerpo, se ignora.
- `PUT` reemplaza todos los campos editables. El frontend envía siempre el recurso completo.
- Un `id` con formato inválido debe responder 404, no 500.
- **Por confirmar:** si eliminar es borrado definitivo o desactivación (`status = inactive`). Si el recurso está referenciado (por ejemplo, un cliente con ventas), debe responder 409 con un mensaje claro.

## 6. Recurso: Clientes (`/customers`)

Implementado en el frontend. Reglas de validación en `src/modules/maintenance/customers/schema.ts`.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | texto (UUID) | Lo asigna el servidor |
| `document_type` | texto | `DNI`, `RUC` o `CE` |
| `document_number` | texto | DNI: 8 dígitos. RUC: 11 dígitos. CE: 9 a 12 caracteres alfanuméricos |
| `name` | texto | 2 a 120 caracteres |
| `email` | texto | Correo válido, o cadena vacía `""` si no tiene |
| `phone` | texto | Máximo 20 caracteres. Cadena vacía si no tiene |
| `credit_limit` | texto decimal | `"0.00"` o mayor, hasta 2 decimales |
| `status` | texto | `active` o `inactive` |

Notas para el backend:

- Los campos opcionales se devuelven como `""`, no como `null`. El frontend lo asume así. Si el backend prefiere `null`, hay que acordarlo para ajustar el frontend.
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
  "email": "ventas@andina.example",
  "phone": "014000001",
  "credit_limit": "5000.00",
  "status": "active"
}
```

## 7. Autenticación y permisos — Por confirmar

Aún no está definido. Hay que acordar:

- Mecanismo: token en cabecera `Authorization: Bearer ...` o cookie `HttpOnly`.
- Rutas de login, cierre de sesión y renovación (`/api/v1/auth/...`).
- Duración del token y qué hace el frontend al recibir 401.
- Cómo el frontend conoce los permisos del usuario (en la respuesta de login o en una ruta propia) para ocultar menús y acciones.

El frontend no se apoya en esto para la seguridad: el backend debe comprobar permisos en cada ruta.

## 8. Rutas del documento maestro

Listadas en el documento del proyecto; **su formato aún no está definido** (cada una necesita su tabla de campos como la de Clientes):

| Ruta | Responsabilidad |
|---|---|
| `/api/v1/auth` | Autenticación y sesiones |
| `/api/v1/users` | Usuarios y administración |
| `/api/v1/customers` | Clientes (definido arriba) |
| `/api/v1/suppliers` | Proveedores |
| `/api/v1/products` | Productos |
| `/api/v1/inventory` | Inventario |
| `/api/v1/sales` | Ventas |
| `/api/v1/purchases` | Compras |
| `/api/v1/payments` | Pagos |
| `/api/v1/documents` | Documentos |
| `/api/v1/reports` | Reportes |

## 9. Rutas que el documento maestro no lista — Por definir

Las pantallas existen o se planean, pero falta su ruta:

- Mantenimiento: categorías, almacenes.
- Ventas: cotizaciones, comprobantes, devoluciones.
- Compras: solicitudes, recepciones, facturas, devoluciones.
- Inventario: kardex, transferencias, ajustes.
- Finanzas: cuentas por cobrar, cuentas por pagar, caja, bancos, estados de cuenta.
- Administración: roles, permisos, auditoría, configuración.
- Dashboard: indicadores resumidos.

## 10. Lista de decisiones pendientes

| # | Decisión | Quién |
|---|---|---|
| 1 | Formato de fechas por campo | Frontend + backend |
| 2 | Mecanismo de autenticación y permisos | Frontend + backend |
| 3 | Borrado definitivo vs desactivación | Backend + negocio |
| 4 | `""` o `null` en campos opcionales | Frontend + backend |
| 5 | Orden por defecto y filtros de los listados | Frontend + backend |
| 6 | Rutas y campos de los recursos pendientes | Backend (propuesta) y frontend (revisión) |
| 7 | Cómo se indica la moneda en documentos | Frontend + backend |