import { Link } from "react-router"

export default function NotFoundPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        La dirección que buscas no existe.
      </p>
      <Link to="/dashboard" className="mt-4 inline-block text-sm text-primary underline">
        Volver al Dashboard
      </Link>
    </section>
  )
}
