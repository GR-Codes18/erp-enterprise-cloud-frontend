/** Respuesta de cualquier listado con paginación. */
export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

/** Parámetros comunes de los listados (?page=1&size=20&search=...). */
export interface PageParams {
  page?: number
  size?: number
  search?: string
  /** Rango de fechas en formato AAAA-MM-DD, ambos extremos incluidos */
  date_from?: string
  date_to?: string
  /** Filtros exactos por campo, ej. { status: "active", warehouse_id: "..." } */
  filters?: Record<string, string | undefined>
}

export interface FieldError {
  field: string
  message: string
}

/** Cuerpo de error que devuelve el backend. */
export interface ApiErrorBody {
  code: string
  message: string
  errors?: FieldError[]
}
