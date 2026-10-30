/** UUID fijos con el prefijo de roles (8011). Archivo aparte para que otros mocks los usen sin ciclos. */
export const roleId = (n: number) => `00000000-0000-4000-8011-${String(n).padStart(12, "0")}`

/** El rol Administrador (de sistema) de los datos semilla */
export const ADMIN_ROLE_ID = roleId(1)
