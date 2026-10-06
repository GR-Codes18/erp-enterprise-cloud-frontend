import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "@/app/App"
import { enableMocking } from "@/mocks/enable"

enableMocking()
  .catch((error) => {
    console.error("No se pudieron iniciar los datos simulados (MSW):", error)
  })
  .finally(() => {
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
