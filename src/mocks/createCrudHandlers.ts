import { http, HttpResponse } from "msw"

export interface UniqueFieldConfig<T> {
  field: keyof T
  label?: string
  normalize?: (value: any) => string
}

export interface CrudHandlerOptions<T extends Record<string, any>> {
  endpoint: string
  items: T[]
  idField?: keyof T
  searchFields?: (keyof T)[]
  filterFields?: (keyof T)[]
  uniqueFields?: UniqueFieldConfig<T>[]
  immutableFields?: (keyof T)[]
  isInUse?: (item: T) => boolean
  inUseIds?: string[]
  inUseMessage?: string
  onBeforeCreate?: (body: any, items: T[]) => Partial<T>
  onBeforeUpdate?: (current: T, body: any) => Partial<T>
}

export function createCrudHandlers<T extends Record<string, any>>(options: CrudHandlerOptions<T>) {
  const {
    endpoint,
    items,
    idField = "id" as keyof T,
    searchFields = [],
    filterFields = [],
    uniqueFields = [],
    immutableFields = [],
    isInUse,
    inUseIds = [],
    inUseMessage = "El registro está en uso y no se puede eliminar.",
    onBeforeCreate,
    onBeforeUpdate,
  } = options

  const normalizeValue = (val: any) =>
    typeof val === "string" ? val.trim().toLowerCase() : String(val ?? "").toLowerCase()

  return [
    // GET Listar paginado
    http.get(endpoint, ({ request }) => {
      const url = new URL(request.url)
      const search = url.searchParams.get("search")?.toLowerCase().trim() || ""
      const page = Number(url.searchParams.get("page") || "1")
      const size = Number(url.searchParams.get("size") || "10")

      let filtered = items

      // Filtro de búsqueda libre
      if (search && searchFields.length > 0) {
        filtered = filtered.filter((item) =>
          searchFields.some((field) => {
            const val = item[field]
            return val != null && String(val).toLowerCase().includes(search)
          })
        )
      }

      // Filtros exactos
      for (const field of filterFields) {
        const paramVal = url.searchParams.get(String(field))
        if (paramVal !== null && paramVal !== "") {
          filtered = filtered.filter((item) => String(item[field]) === paramVal)
        }
      }

      const total = filtered.length
      const pages = Math.ceil(total / size) || 1
      const start = (page - 1) * size
      const paginatedItems = filtered.slice(start, start + size)

      return HttpResponse.json({ items: paginatedItems, total, page, size, pages })
    }),

    // GET Obtener por ID
    http.get(`${endpoint}/:id`, ({ params }) => {
      const { id } = params
      const item = items.find((i) => String(i[idField]) === String(id))
      if (!item) {
        return HttpResponse.json({ message: "Registro no encontrado" }, { status: 404 })
      }
      return HttpResponse.json(item)
    }),

    // POST Crear
    http.post(endpoint, async ({ request }) => {
      const body = (await request.json()) as any

      // Validar campos únicos
      for (const config of uniqueFields) {
        const fieldName = String(config.field)
        const rawValue = body[fieldName]
        if (rawValue !== undefined && rawValue !== null) {
          const normNew = config.normalize ? config.normalize(rawValue) : normalizeValue(rawValue)
          const duplicate = items.some((item) => {
            const normExisting = config.normalize
              ? config.normalize(item[config.field])
              : normalizeValue(item[config.field])
            return normExisting === normNew
          })

          if (duplicate) {
            const label = config.label || fieldName
            const msg = `Ya existe un registro con este ${label}`
            return HttpResponse.json(
              {
                message: msg,
                fieldErrors: [{ field: fieldName, message: msg }],
              },
              { status: 409 }
            )
          }
        }
      }

      // Procesar datos adicionales o ID si aplica
      const customProps = onBeforeCreate ? onBeforeCreate(body, items) : {}
      const newItem = {
        ...body,
        ...customProps,
      } as T

      items.unshift(newItem)
      return HttpResponse.json(newItem, { status: 201 })
    }),

    // PUT Actualizar (Respetando inmutabilidad)
    http.put(`${endpoint}/:id`, async ({ request, params }) => {
      const { id } = params
      const body = (await request.json()) as any

      const index = items.findIndex((i) => String(i[idField]) === String(id))
      if (index === -1) {
        return HttpResponse.json({ message: "Registro no encontrado" }, { status: 404 })
      }

      const current = items[index]

      // Validar campos únicos excluyendo el registro actual
      for (const config of uniqueFields) {
        const fieldName = String(config.field)
        const rawValue = body[fieldName]
        if (rawValue !== undefined && rawValue !== null) {
          const normNew = config.normalize ? config.normalize(rawValue) : normalizeValue(rawValue)
          const duplicate = items.some((item, idx) => {
            if (idx === index) return false
            const normExisting = config.normalize
              ? config.normalize(item[config.field])
              : normalizeValue(item[config.field])
            return normExisting === normNew
          })

          if (duplicate) {
            const label = config.label || fieldName
            const msg = `Ya existe un registro con este ${label}`
            return HttpResponse.json(
              {
                message: msg,
                fieldErrors: [{ field: fieldName, message: msg }],
              },
              { status: 409 }
            )
          }
        }
      }

      const customProps = onBeforeUpdate ? onBeforeUpdate(current, body) : {}

      // Mantener campos inmutables del registro actual
      const preservedFields: Record<string, any> = {}
      for (const field of immutableFields) {
        preservedFields[String(field)] = current[field]
      }

      const updatedItem = {
        ...current,
        ...body,
        ...customProps,
        ...preservedFields, // Aplica al final para garantizar que no se sobreescriban
      } as T

      items[index] = updatedItem
      return HttpResponse.json(updatedItem)
    }),

    // PATCH Actualización parcial
    http.patch(`${endpoint}/:id`, async ({ request, params }) => {
      const { id } = params
      const body = (await request.json()) as Partial<T>

      const index = items.findIndex((i) => String(i[idField]) === String(id))
      if (index === -1) {
        return HttpResponse.json({ message: "Registro no encontrado" }, { status: 404 })
      }

      items[index] = { ...items[index], ...body }
      return HttpResponse.json(items[index])
    }),

    // DELETE Eliminar o advertir en uso (409)
    http.delete(`${endpoint}/:id`, ({ params }) => {
      const { id } = params
      const stringId = String(id)

      const item = items.find((i) => String(i[idField]) === stringId)
      if (!item) {
        return HttpResponse.json({ message: "Registro no encontrado" }, { status: 404 })
      }

      const checkInUse = isInUse ? isInUse(item) : inUseIds.includes(stringId)

      if (checkInUse) {
        return HttpResponse.json(
          {
            message: inUseMessage,
          },
          { status: 409 }
        )
      }

      const index = items.findIndex((i) => String(i[idField]) === stringId)
      items.splice(index, 1)
      return new HttpResponse(null, { status: 204 })
    }),
  ]
}