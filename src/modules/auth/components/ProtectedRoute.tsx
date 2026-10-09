import { Navigate, useLocation } from "react-router";
import { useAuth } from "../useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Mientras se recupera la sesión (F5) no se decide nada: evita mandar al login a quien ya entró
  if (isLoading) {
    return (
      <div role="status" className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Cargando sesión…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
