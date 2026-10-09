import { useHasPermission } from "@/modules/auth"
import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { getErrorMessage } from "@/shared/lib/api/errors"
import { SettingsForm } from "../settings/components/SettingsForm"
import { useSettings } from "../settings/hooks"

export default function SettingsPage() {
  const settings = useSettings()
  const canEdit = useHasPermission("administration.settings:edit")

  return (
    <>
      <PageHeader
        title="Parámetros"
        description="Datos de la empresa y reglas generales del sistema."
      />

      {settings.isError ? (
        <ErrorState
          message={getErrorMessage(settings.error)}
          onRetry={() => void settings.refetch()}
        />
      ) : settings.isPending ? (
        <div className="grid max-w-3xl gap-6" aria-busy="true">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <SettingsForm settings={settings.data} readOnly={!canEdit} />
      )}
    </>
  )
}