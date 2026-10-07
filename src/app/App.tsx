import { RouterProvider } from "react-router"
import { AppProviders } from "@/app/providers"
import { router } from "@/app/router"
import { AuthProvider } from "@/modules/auth/AuthContext"

export default function App() {
  return (
    <AppProviders>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </AppProviders>
  );
}