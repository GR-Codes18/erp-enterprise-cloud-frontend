# Guía sencilla: cómo funciona el ERP Enterprise Cloud

Guía para la exposición. Está escrita en palabras simples y desde el punto de vista de quien usa el sistema.

---

## 1. ¿Qué es el sistema?

Es una página web donde una empresa maneja en un solo lugar:

- **Ventas** (lo que le vende a sus clientes)
- **Compras** (lo que le compra a sus proveedores)
- **Inventario** (los productos que tiene guardados)
- **Finanzas** (el dinero que entra y sale)
- **Documentos** (archivos como facturas y contratos)

**Lo más importante:** los módulos están conectados. Lo que pasa en uno afecta a los otros.

- Una venta baja el stock y crea una deuda por cobrar.
- Una compra sube el stock y crea una deuda con el proveedor.

> **Aviso para la exposición:** por ahora el sistema usa **datos de prueba**. Si se recarga la página (F5), los datos vuelven al inicio. El sistema real con base de datos aún no existe.

---

## 2. Los usuarios de prueba

| Correo | Contraseña | Rol | Qué puede hacer |
|---|---|---|---|
| `admin@enterprise.com` | `admin123` | **Administrador** | Todo |
| `almacen@enterprise.com` | `almacen123` | **Almacenero** | Inventario (Stock, Kardex, Transferencias, Ajustes sin aprobar) y Compras > Recepciones |

**Regla de seguridad:** cada usuario ve en el menú solo lo que su rol permite. Los botones sin permiso ni aparecen.

### Resumen rápido: ¿quién puede qué?

| Módulo | Administrador | Almacenero |
|---|---|---|
| Dashboard | ✅ | ❌ |
| Ventas | ✅ | ❌ |
| Compras | ✅ (todo) | ✅ solo Recepciones |
| Inventario | ✅ | ✅ (no puede aplicar ajustes) |
| Finanzas | ✅ | ❌ |
| Documentos | ✅ | ❌ |
| Reportes | ✅ | ❌ |
| Mantenimiento | ✅ | ❌ |
| Administración | ✅ | ❌ |

---

## 3. Entrar y salir del sistema

**Pasos:**

1. Abre la página de inicio de sesión.
2. Escribe tu **correo** y **contraseña**.
3. Presiona **"Iniciar sesión"**.

**¿A dónde llegas?**

- Administrador → **Dashboard**
- Almacenero → **Compras > Recepciones**

**Si algo falla:**

- Correo o contraseña vacíos → el sistema te avisa qué falta.
- Datos incorrectos → sale **"Credenciales inválidas"**.

**Para salir:** botón **"Cerrar sesión"** arriba a la derecha.

**Si intentas entrar a una pantalla sin permiso:** sale la página **403 – Acceso denegado**.

---

## 4. Reglas generales (aplican a casi todo)

Estas reglas se repiten en todos los módulos. Si las explican bien, ya explicaron la mitad del sistema.

1. **Todo documento empieza como "Borrador".** Solo en ese estado se puede editar o eliminar.
2. **Después de confirmarlo, ya no se edita.** Si hay un error, se **anula con un motivo** (mínimo 5 letras).
3. **Nada se borra a escondidas.** Todo queda registrado para saber quién hizo qué.
4. **Cada documento tiene un número automático:** COT-000001, PED-000001, OC-000001, etc.
5. **Si algo falla,** el sistema muestra un recuadro rojo con el mensaje de lo que pasó.
6. **En las listas** hay buscador, filtros, y paginación (10 por página).

---

## 5. Dashboard (solo Administrador)

Es la pantalla de resumen de la empresa.

**Pasos:**

1. Entra a **Dashboard**.
2. Elige el periodo: **Este mes**, **Últimos 90 días** o **Este año**.
3. Mira las tarjetas.

**Las 7 tarjetas:**

| Tarjeta | Qué te dice |
|---|---|
| Ventas | Cuánto se vendió |
| Compras | Cuánto se compró |
| Utilidad bruta | Cuánto se ganó |
| Rotación de inventario | Qué tan rápido se mueven los productos |
| Cuentas por cobrar | Lo que nos deben los clientes |
| Cuentas por pagar | Lo que debemos a los proveedores |
| Stock crítico | Cuántos productos están por acabarse |

**Alertas abajo:**

- Productos con poco stock.
- Clientes con deudas vencidas.

---

## 6. Ventas (solo Administrador)

### El camino completo

```
Cotización → Pedido → Comprobante → Cobro (en Finanzas)
                          ↓
                     Devolución (si el cliente devuelve)
```

La cotización es opcional: para una venta directa, ve a **Ventas > Pedidos > Nueva venta** y registra el pedido sin crear una cotización primero.

### Paso 1: Cotización (la propuesta de precio)

Una cotización es una oferta al cliente. **No reserva stock ni compromete nada.**

1. Ve a **Ventas > Cotizaciones**.
2. Presiona **"Nueva cotización"**.
3. Elige el **cliente** y agrega los **productos** con sus cantidades.
4. Guarda. Queda en estado **Borrador**.
5. Presiona **"Enviar al cliente"** → pasa a **Enviada**.
6. Según lo que responda el cliente:
   - Aceptó → **"Marcar aceptada"**
   - No aceptó → **"Marcar rechazada"** (pide un motivo)

### Paso 2: Pedido (la venta comprometida)

1. En la cotización aceptada, presiona **"Convertir en pedido"**. Se copian cliente y productos.
2. Puedes guardar el pedido como borrador para revisarlo o usar **"Guardar y confirmar"**. Esta opción conserva la validación de cliente, stock y crédito y permite completar el paso sin salir primero al detalle.
3. Indica el **tipo de venta**:
   - **Por unidad / presencial**: no requiere datos de entrega.
   - **Al por mayor**: elige **Envío** o **Recojo**. Envío viene seleccionado.
   - Para envío, la dirección aparece en el mismo formulario. Puedes agregarla o corregirla ahí; se guarda en el perfil del cliente para reutilizarla en próximas ventas.
4. Elige la **condición de pago**:
   - **Contado**
   - **Crédito** (indicando cuántos días)
5. Si guardaste el borrador, desde el pedido presiona **"Confirmar pedido"**.

**El sistema revisa tres cosas antes de confirmar:**

- Que el cliente esté **activo**.
- Que haya **stock suficiente**.
- Que, si es a crédito, el cliente **no se pase de su límite de crédito**.

Si algo falla, te lo dice (ejemplo: "Stock insuficiente").

> Nota: el pedido siempre nace "al contado". Si es a crédito, hay que cambiarlo antes de confirmar.

### Paso 3: Comprobante (la factura o boleta)

1. En el pedido confirmado, presiona **"Emitir comprobante"**.
2. Elige **Factura** o **Boleta**.
   - La **factura** solo se puede si el cliente tiene **RUC**.
3. Confirma. El pedido queda como **Facturado**.

Al emitirlo:

- Se descuenta el stock.
- Si era a crédito, nace una **cuenta por cobrar**.

> El comprobante **no se edita**. Si hay error, se anula o se hace una devolución.

### Paso 4: Devolución (si el cliente devuelve productos)

1. En el comprobante, presiona **"Registrar devolución"**.
2. Elige los productos y cantidades a devolver (no puedes devolver más de lo vendido).
3. Escribe el **motivo**.
4. Guarda y presiona **"Confirmar devolución"**.

Al confirmar, se emite una nota de crédito y el stock vuelve a entrar.

### Anular un comprobante

- Se puede anular **solo si no tiene cobros**.
- Pide un motivo.

---

## 7. Compras

### El camino completo

```
Solicitud → Orden de compra → Recepción → Factura del proveedor → Pago (en Finanzas)
                                  ↓
                        Devolución al proveedor (si llegó malo)
```

### Paso 1: Solicitud de compra (Administrador)

Es cuando alguien de la empresa dice "necesitamos comprar esto".

1. Ve a **Compras > Solicitudes** y presiona **"Nueva solicitud"**.
2. Agrega productos y cantidades (sin precios).
3. Indica **para cuándo se necesita** y la **justificación** (mínimo 10 letras).
4. Guarda (Borrador) y presiona **"Enviar a aprobación"**.
5. **Otra persona** la revisa y presiona **"Aprobar"** o **"Rechazar"** (con motivo).

> **Regla clave:** **nadie puede aprobar su propia solicitud.** Si lo intentas, sale: *"Tú hiciste esta solicitud: la debe aprobar otra persona."*

### Paso 2: Orden de compra (Administrador)

1. En la solicitud aprobada, presiona **"Crear orden de compra"**.
2. Elige el **proveedor** y revisa los **costos**.
3. Guarda y presiona **"Emitir al proveedor"**.

### Paso 3: Recepción (Administrador y Almacenero)

Es cuando la mercadería llega al almacén. **Este es el paso principal del almacenero.**

1. Ve a **Compras > Recepciones** y presiona **"Nueva recepción"**.
2. Elige la **orden de compra**, el **almacén** y escribe el número de **guía de remisión**.
3. Revisa las cantidades que llegaron (no puedes recibir más de lo pedido).
4. Guarda y presiona **"Confirmar recepción"**.

Al confirmar, el **stock sube**. Si llegó solo una parte, la orden queda en "Recepción parcial".

### Paso 4: Factura del proveedor (Administrador)

1. En la orden, presiona **"Registrar factura"**.
2. Llena **serie, número, fechas y total**.
3. Guarda.

Si el total no coincide con lo recibido, el sistema **avisa** (pero deja registrarla).

### Paso 5: Devolución al proveedor (Administrador)

1. En la recepción, presiona **"Devolver al proveedor"**.
2. Elige productos, cantidades y escribe el motivo.
3. Presiona **"Confirmar devolución"**.

---

## 8. Inventario (Administrador y Almacenero)

### Stock

- **Solo se consulta.** No se puede editar a mano.
- Muestra cuánto hay de cada producto en cada almacén.
- Estados: **Normal**, **Bajo** o **Sin stock**.
- Hay una casilla **"Solo bajo mínimo"** para ver lo urgente.

### Kardex

Es el **historial de entradas y salidas** de un producto.

1. Ve a **Inventario > Kardex**.
2. Elige el **producto** y el rango de **fechas** (obligatorios).
3. Verás cada movimiento con entrada, salida y saldo.

### Kardex comercial

En **Inventario > Kardex comercial** aparecen directamente las **compras** (entradas) y **ventas** (salidas) del día actual, sin tener que elegir un producto. Si hace falta, se puede filtrar por producto, almacén o cambiar el rango de fechas. Los ajustes, devoluciones y transferencias siguen apareciendo en el Kardex completo y en sus pantallas correspondientes.

En un pedido mayorista confirmado, el estado de la entrega se actualiza desde el detalle: **Pendiente de envío → En camino → Entregado**, o **Pendiente de recojo → Listo para recojo → Recogido**.

### Transferencias (mover productos entre almacenes)

1. Ve a **Inventario > Transferencias** y presiona **"Nueva transferencia"**.
2. Elige **almacén de origen** y **almacén de destino** (deben ser distintos).
3. Agrega los productos (no puedes mandar más de lo que hay).
4. Guarda (Borrador) y presiona **"Enviar"** → sale del origen, queda **En tránsito**.
5. Cuando llega, presiona **"Recibir"** → entra al destino. Listo.

Solo se puede cancelar mientras está en Borrador.

### Ajustes (corregir diferencias del conteo físico)

Sirven para corregir el stock por conteo, merma, daño o vencimiento.

1. Ve a **Inventario > Ajustes** y presiona **"Nuevo ajuste"**.
2. Elige **almacén** y **motivo** (Conteo físico, Merma, Daño, Vencimiento u Otro).
3. Agrega productos marcando si es **Aumento** o **Disminución**.
4. Guarda (Borrador).
5. Alguien con **permiso de aprobación** presiona **"Aplicar ajuste"**.

> **Diferencia por rol:**
> - **Administrador:** puede crear y aplicar.
> - **Almacenero:** puede crear, pero **no aplicar**. Verá el mensaje *"Necesitas el permiso de aprobación para aplicar este ajuste."*

---

## 9. Finanzas (solo Administrador)

### Cuentas por cobrar

- Es lo que **los clientes nos deben**.
- Nacen solas de las ventas a crédito.
- Estados: Pendiente, Pago parcial, Pagada y **Vencida**.
- Desde aquí presionas **"Registrar cobro"**.

### Cuentas por pagar

- Es lo que **nosotros debemos a los proveedores**.
- Nacen de las facturas de proveedor.
- Desde aquí presionas **"Registrar pago"**.

### Registrar un cobro o un pago

1. Elige el **documento** (comprobante o factura).
2. Escribe el **monto** (no puede ser mayor al saldo).
3. Elige la **fecha** (hasta hoy) y el **medio de pago**:

| Medio | Qué necesita |
|---|---|
| **Efectivo** | Una **caja abierta** |
| **Transferencia** | Una **cuenta bancaria** y el **número de operación** |
| **Tarjeta** | Nada más |

4. Guarda. El saldo del documento baja.

**Si te equivocas:** un pago **no se edita**, se **anula con motivo** y el saldo se restituye.

### Caja (el efectivo del día)

1. **Abrir caja:** pones un **monto inicial**.
2. **Durante el día:** los cobros y pagos en efectivo se registran solos. También puedes agregar movimientos manuales (ingreso o egreso).
3. **Cerrar caja:** cuentas el efectivo real y lo escribes.
   - Si **cuadra**, se cierra sin problemas.
   - Si **sobra o falta** dinero, debes **explicar la diferencia**.
4. Una caja cerrada queda solo para consulta.

### Bancos

- Aquí se registran las **cuentas bancarias** de la empresa.
- Se ven los movimientos (los cobros por transferencia aparecen solos).
- Cada movimiento se puede marcar como **conciliado** (revisado contra el banco).
- El saldo **no se edita**: lo calculan los movimientos.

### Estado de cuenta

1. Elige **Cliente** o **Proveedor**.
2. Elige a quién y el rango de fechas.
3. Presiona **"Consultar"**.
4. Verás el saldo inicial, cada movimiento y el saldo final. Se puede **imprimir**.

---

## 10. Documentos (solo Administrador)

Es el **archivero digital** de la empresa.

### Subir un documento

1. Ve a **Documentos > Archivos** y presiona **"Subir"**.
2. Elige el **archivo** (PDF, PNG, JPG, Excel o Word, **máximo 10 MB**).
3. Escribe un **nombre** y elige la **categoría** (Factura, Contrato, Orden, Comprobante u Otro).
4. Guarda. Ya aparece en la lista.

### Otras acciones

- **Descargar:** baja el archivo.
- **Eliminar:** pide un motivo y el documento deja de estar disponible.

### Adjuntar a una operación

Dentro de una cotización, pedido, comprobante, orden de compra, recepción, factura, transferencia o ajuste hay un panel **"Documentos adjuntos"**. Ahí presionas **"Adjuntar documento"** y queda ligado a esa operación.

---

## 11. Reportes (solo Administrador)

### Operativos

Tres pestañas con listas que se pueden **imprimir**:

- Ventas del periodo
- Compras del periodo
- Stock bajo mínimo

### Analíticos

Gráficos:

- **Ventas y compras por mes**
- **Los 5 productos más vendidos**

Hay un botón **"Ver como tabla"** para ver los mismos datos en lista.

---

## 12. Mantenimiento (solo Administrador)

Aquí se crean los **datos base** que usan todos los demás módulos:

- **Clientes**
- **Proveedores**
- **Productos**
- **Categorías**
- **Almacenes**

### Crear un registro

1. Entra a la sección (por ejemplo, Clientes).
2. Presiona **"Nuevo"**.
3. Llena el formulario en la ventana emergente.
4. Guarda. Aparece primero en la lista.

### Datos importantes de cada uno

| Registro | Datos principales |
|---|---|
| Cliente | Tipo y número de documento (DNI, RUC o CE), nombre, correo, teléfono, **límite de crédito** |
| Proveedor | Igual que cliente, pero con **días de crédito** |
| Producto | SKU, nombre, categoría, unidad, precio de venta, costo, stock mínimo |
| Categoría | Solo el nombre |
| Almacén | Código, nombre, dirección |

### ¿Qué pasa si quiero eliminar algo?

- Si **nunca se usó** → se elimina.
- Si **ya tiene operaciones** → el sistema ofrece **"Desactivar"**. Así deja de aparecer en documentos nuevos, pero **se conserva el historial**.

> El **stock del producto no se edita aquí**. Nace en 0 y solo cambia con movimientos (compras, ventas, transferencias, ajustes).

---

## 13. Administración (solo Administrador)

### Usuarios

1. Ve a **Administración > Usuarios** y presiona **"Nuevo usuario"**.
2. Escribe **nombre**, **correo** y elige un **rol**.
3. Guarda.

**Reglas:**

- Los usuarios **no se borran**, se **desactivan**.
- **No puedes desactivarte a ti mismo.**
- **Siempre debe quedar al menos un administrador activo.**

### Roles

Un rol es un conjunto de permisos (por ejemplo, "Almacenero").

1. Ve a **Roles** y presiona **"Nuevo rol"**.
2. Escribe nombre y descripción.
3. En la **tabla de permisos**, marca lo que puede hacer en cada pantalla:
   **Ver, Crear, Editar, Anular/Eliminar, Aprobar.**
4. Guarda.

**Reglas:**

- Al marcar cualquier acción, se marca **"Ver"** automáticamente.
- El rol **Administrador** es de sistema: no se puede modificar.
- Un rol con usuarios asignados no se puede eliminar.

### Permisos

Es una lista de **solo consulta** con todas las pantallas del sistema.

### Auditoría

Registro de **quién hizo qué, cuándo y con qué resultado** (Éxito o Fallo). Es de solo lectura. Se puede filtrar por usuario, módulo, acción y fechas.

### Parámetros

Configuración general de la empresa:

- Datos de la empresa (RUC, razón social, dirección)
- **IGV** (18 %) y moneda
- Series de facturas y boletas

Los cambios de IGV solo afectan a los documentos **nuevos**.

---

## 14. Ejemplos completos (para explicar en la exposición)

### Ejemplo A: Una venta a crédito, de principio a fin

1. **Mantenimiento:** existe el cliente, los productos y el almacén.
2. **Ventas:** se crea y envía la **cotización** → el cliente acepta.
3. Se convierte en **pedido** → se elige **crédito a 30 días** → se **confirma**.
4. Se **emite la factura**.
5. **Finanzas > Cuentas por cobrar:** aparece la deuda.
6. El cliente paga → **Registrar cobro** → la factura queda **Pagada**.

### Ejemplo B: Una compra completa

1. Alguien crea la **solicitud** y la envía.
2. **Otra persona** la **aprueba**.
3. Se crea la **orden de compra** y se **emite** al proveedor.
4. La mercadería llega → el **almacenero** registra y **confirma la recepción** → **sube el stock**.
5. Se **registra la factura** del proveedor.
6. **Finanzas > Cuentas por pagar:** se **registra el pago**.

### Ejemplo C: Mover productos entre almacenes

1. El almacenero crea la **transferencia** (origen, destino, productos).
2. Presiona **"Enviar"** → queda en tránsito.
3. Cuando llega, presiona **"Recibir"**.
4. Se consulta el resultado en **Stock** y **Kardex**.

### Ejemplo D: El día de la caja

1. Se **abre la caja** con S/ 100 de monto inicial.
2. Se registran cobros en efectivo durante el día.
3. Al final se **cuenta el efectivo** y se **cierra la caja**.
4. Si hay diferencia, se explica en una nota.

---

## 15. Ideas clave para memorizar

1. **Todo empieza como borrador.** Solo ahí se edita; después se confirma o aprueba.
2. **Nada se borra, se anula con motivo.** Así hay trazabilidad.
3. **Cada rol ve solo lo suyo.** Esa es la seguridad básica.
4. **Los módulos se conectan:** venta → baja stock y crea deuda; compra → sube stock y crea deuda.
5. **Quien pide no aprueba.** En compras, otra persona debe aprobar la solicitud.
6. **El dinero se controla:** efectivo pasa por caja, transferencias por bancos.
7. **Todo queda registrado** en Auditoría.

---

## 16. Frases cortas para la exposición

- *"Es un sistema que junta ventas, compras, inventario y finanzas en un solo lugar."*
- *"Cada usuario tiene un rol, y el rol decide qué puede ver y hacer."*
- *"Los documentos siguen un camino con estados: borrador, confirmado, y luego solo se anulan."*
- *"Lo que se hace en un módulo actualiza a los demás, por ejemplo una venta baja el stock."*
- *"Por ahora funciona con datos de prueba; el siguiente paso es conectarlo a un servidor real en la nube con AWS."*

---

## 17. Posibles preguntas del público (y respuestas simples)

**¿Por qué no se pueden editar los documentos confirmados?**
Para que haya orden y confianza: lo que ya se confirmó no cambia a escondidas. Si hay un error, se anula con motivo y queda registrado.

**¿Por qué el almacenero no ve Ventas ni Finanzas?**
Por seguridad: cada persona solo accede a lo que necesita para su trabajo.

**¿Por qué no se pueden borrar clientes o productos que ya se usaron?**
Porque se perdería el historial. Por eso se desactivan: ya no se usan en operaciones nuevas, pero el historial se conserva.

**¿Por qué la persona que pide una compra no la puede aprobar?**
Para evitar fraudes o errores: una persona pide y otra revisa.

**¿Qué pasa si recargo la página?**
Los datos de prueba vuelven al inicio. Cuando exista el servidor real, los datos se guardarán de forma permanente.

**¿Qué falta por hacer?**
Conectar el sistema al servidor real (FastAPI + PostgreSQL en AWS). Ahí se hará de verdad cosas como descontar el stock y registrar todo en Auditoría.
