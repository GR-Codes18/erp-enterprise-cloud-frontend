import { Link } from "react-router";
import { Button } from "@/shared/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center space-y-4">
      <h1 className="text-4xl font-bold tracking-tight">403 - Acceso Denegado</h1>
      <p className="text-muted-foreground max-w-md">
        No tienes los permisos necesarios para acceder a este recurso.
      </p>
      <Button asChild variant="default">
        <Link to="/">Volver al inicio</Link>
      </Button>
    </div>
  );
}