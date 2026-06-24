import { ApiError } from '@/types';
import { getEmpresaActivaId } from '@/contexts/empresa-activa-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Nombre del header que el backend lee para cambiar la empresa activa (solo superadmins)
const EMPRESA_ACTIVA_HEADER = 'X-Empresa-Activa';

// Agrega el header de empresa activa si hay una seleccionada en localStorage.
// Se lee directo de localStorage (igual que el token) para no acoplar al contexto de React.
function aplicarEmpresaActiva(headers: Record<string, string>): void {
  const empresaActivaId = getEmpresaActivaId();
  if (empresaActivaId) {
    headers[EMPRESA_ACTIVA_HEADER] = empresaActivaId;
  }
}

if (!API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL no está definida en las variables de entorno');
}

// Obtener token del localStorage
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

// Obtener refresh token del localStorage
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token');
}

// Guardar tokens
export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
}

// Limpiar tokens
export function clearTokens(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

// SEGURIDAD: Singleton para prevenir race conditions en refresh de tokens
// Si múltiples requests fallan con 401 simultáneamente, solo se hace un refresh
let refreshPromise: Promise<boolean> | null = null;

// Cliente HTTP base
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const accessToken = getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }

  aplicarEmpresaActiva(headers as Record<string, string>);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Si es 401, intentar refrescar token
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Reintentar la petición original
      const newAccessToken = getAccessToken();
      (headers as Record<string, string>)['Authorization'] = `Bearer ${newAccessToken}`;
      const retryResponse = await fetch(url, { ...options, headers });

      if (!retryResponse.ok) {
        const error: ApiError = await retryResponse.json();
        throw error;
      }
      return retryResponse.json();
    } else {
      // No se pudo refrescar, redirigir a login
      clearTokens();
      window.location.href = '/login';
      // Retornar una promesa que nunca se resuelve para evitar que el código continúe
      // mientras se procesa la redirección
      return new Promise(() => { }) as T;
    }
  }

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw error;
  }

  // Si es 204 No Content, retornar vacío
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Refrescar access token con protección contra race conditions
async function refreshAccessToken(): Promise<boolean> {
  // Si ya hay un refresh en progreso, esperar a que termine
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return false;

  // Crear nueva promesa de refresh
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      // Limpiar la promesa para permitir futuros refreshes
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Función para upload con FormData
async function fetchUpload<T>(endpoint: string, formData: FormData, method: string = 'POST'): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const accessToken = getAccessToken();

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  aplicarEmpresaActiva(headers);

  const response = await fetch(url, {
    method,
    headers,
    body: formData,
  });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newAccessToken = getAccessToken();
      headers['Authorization'] = `Bearer ${newAccessToken}`;
      const retryResponse = await fetch(url, {
        method,
        headers,
        body: formData,
      });

      if (!retryResponse.ok) {
        const error: ApiError = await retryResponse.json();
        throw error;
      }
      return retryResponse.json();
    } else {
      clearTokens();
      window.location.href = '/login';
      // Retornar una promesa que nunca se resuelve para evitar que el código continúe
      return new Promise(() => { }) as T;
    }
  }

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw error;
  }

  return response.json();
}

// Función para descargar archivos binarios (Excel, PDF, etc.)
async function fetchBlob(endpoint: string): Promise<Blob> {
  const url = `${API_URL}${endpoint}`;
  const accessToken = getAccessToken();

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  aplicarEmpresaActiva(headers);

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newAccessToken = getAccessToken();
      headers['Authorization'] = `Bearer ${newAccessToken}`;
      const retryResponse = await fetch(url, { method: 'GET', headers });

      if (!retryResponse.ok) {
        throw { message: 'Error al descargar archivo', statusCode: retryResponse.status };
      }
      return retryResponse.blob();
    } else {
      clearTokens();
      window.location.href = '/login';
      // Retornar una promesa que nunca se resuelve para evitar que el código continúe
      return new Promise(() => { });
    }
  }

  if (!response.ok) {
    throw { message: 'Error al descargar archivo', statusCode: response.status };
  }

  return response.blob();
}

// Helper para asegurar que la respuesta sea un array
export async function fetchArray<T>(endpoint: string): Promise<T[]> {
  const response = await fetchApi<T[]>(endpoint, { method: 'GET' });
  return Array.isArray(response) ? response : [];
}

// Métodos HTTP
export const api = {
  get: <T>(endpoint: string) => fetchApi<T>(endpoint, { method: 'GET' }),

  // Versión segura para endpoints que devuelven arrays
  getArray: <T>(endpoint: string) => fetchArray<T>(endpoint),

  post: <T>(endpoint: string, data?: unknown) =>
    fetchApi<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data: unknown) =>
    fetchApi<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  put: <T>(endpoint: string, data: unknown) =>
    fetchApi<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: <T>(endpoint: string, data?: unknown) =>
    fetchApi<T>(endpoint, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
    }),

  upload: <T>(endpoint: string, formData: FormData, method: string = 'POST') =>
    fetchUpload<T>(endpoint, formData, method),

  getBlob: (endpoint: string) => fetchBlob(endpoint),
};

// Subir archivos (multipart/form-data)
export async function uploadFile(
  endpoint: string,
  file: File,
  fieldName: string = 'file'
): Promise<{ url: string }> {
  const url = `${API_URL}${endpoint}`;
  const accessToken = getAccessToken();

  const formData = new FormData();
  formData.append(fieldName, file);

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  aplicarEmpresaActiva(headers);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw error;
  }

  return response.json();
}

export default api;
