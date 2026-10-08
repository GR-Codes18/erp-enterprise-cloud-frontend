/** Descarga un archivo desde un enlace temporal sin salir de la pantalla. */
export function triggerDownload(url: string, filename: string): void {
  const link = window.document.createElement("a")
  link.href = url
  link.download = filename
  link.rel = "noopener"
  window.document.body.appendChild(link)
  link.click()
  link.remove()
}