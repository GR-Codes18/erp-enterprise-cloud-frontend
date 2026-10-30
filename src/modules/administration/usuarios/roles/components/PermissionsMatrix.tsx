import { Fragment, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import {
  ACTION_LABELS,
  PERMISSION_ACTIONS,
  groupByModule,
  permissionKey,
  togglePermission,
  type PermissionScreen,
} from "../../../permissions/schema"

interface PermissionsMatrixProps {
  id?: string
  describedBy?: string
  /** Catálogo de pantallas y acciones disponibles */
  screens: PermissionScreen[]
  /** Permisos marcados, con formato "<pantalla>:<acción>" */
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
}

export function PermissionsMatrix({
  id,
  describedBy,
  screens,
  value,
  onChange,
  disabled = false,
}: PermissionsMatrixProps) {
  const groups = useMemo(() => groupByModule(screens), [screens])
  const selected = useMemo(() => new Set(value), [value])

  return (
    <div id={id} role="group" aria-describedby={describedBy} className="grid gap-2">
      <div className="max-h-[50vh] overflow-y-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pantalla</TableHead>
              {PERMISSION_ACTIONS.map((action) => (
                <TableHead key={action} className="text-center">
                  {ACTION_LABELS[action]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <Fragment key={group.module}>
                <TableRow>
                  <TableCell
                    colSpan={PERMISSION_ACTIONS.length + 1}
                    className="bg-muted/50 font-medium"
                  >
                    {group.module_label}
                  </TableCell>
                </TableRow>
                {group.screens.map((screen) => (
                  <TableRow key={screen.code}>
                    <TableCell className="pl-6">{screen.label}</TableCell>
                    {PERMISSION_ACTIONS.map((action) => (
                      <TableCell key={action} className="text-center">
                        {screen.actions.includes(action) ? (
                          <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            aria-label={`${ACTION_LABELS[action]} en ${screen.label} (${group.module_label})`}
                            checked={selected.has(permissionKey(screen.code, action))}
                            disabled={disabled}
                            onChange={(event) =>
                              onChange(
                                togglePermission(value, screen.code, action, event.target.checked),
                              )
                            }
                          />
                        ) : (
                          <span aria-hidden="true" className="text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">
        {value.length} {value.length === 1 ? "permiso seleccionado" : "permisos seleccionados"}
      </p>
    </div>
  )
}