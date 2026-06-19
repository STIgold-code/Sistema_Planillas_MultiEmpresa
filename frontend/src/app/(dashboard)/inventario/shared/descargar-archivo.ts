import { api } from "@/lib/api";

/**
 * Descarga un archivo de un endpoint protegido por JWT (Excel/PDF), forzando
 * el guardado con el nombre indicado. Delega en `api.getBlob` para que el
 * refresh automático de token funcione cuando el access token de 30 min expire.
 */
export async function descargarArchivo(
  endpoint: string,
  filename: string,
): Promise<void> {
  const blob = await api.getBlob(endpoint);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
