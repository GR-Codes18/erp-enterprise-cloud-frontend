import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"

const root = document.getElementById("root")!

/** Si la app no puede arrancar (por ejemplo, falta el .env) se explica en pantalla, nunca en blanco */
function showStartupError() {
  root.innerHTML = ""
  const box = document.createElement("div")
  box.setAttribute("role", "alert")
  box.className = "mx-auto mt-24 max-w-lg space-y-2 rounded-md border p-6 text-sm"
  const title = document.createElement("p")
  title.className = "font-semibold"
  title.textContent = "No se pudo iniciar la aplicación."
  const hint = document.createElement("p")
  hint.textContent =
    "Revisa que exista el archivo .env en la carpeta del proyecto (cópialo de .env.example), reinicia npm run dev y recarga con F5. El detalle está en la consola del navegador (F12)."
  box.append(title, hint)
  root.append(box)
}

async function start() {
  // Import dinámico: si la configuración falla al cargarse, el error se puede atrapar aquí
  const [{ default: App }, { enableMocking }] = await Promise.all([import("@/app/App"), import("@/mocks/enable")])
  try {
    await enableMocking()
  } catch (error) {
    console.error("No se pudieron iniciar los datos simulados (MSW):", error)
  }
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

start().catch((error: unknown) => {
  console.error("No se pudo iniciar la aplicación:", error)
  showStartupError()
})
