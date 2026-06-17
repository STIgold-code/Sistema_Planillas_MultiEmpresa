import { api, setTokens, clearTokens, getRefreshToken } from './api';
import { LoginRequest, LoginResponse, Usuario } from '@/types';

// Iniciar sesión
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', credentials);
  setTokens(response.access_token, response.refresh_token);
  return response;
}

// Cerrar sesión
// SEGURIDAD: Envía el refresh_token al backend para que sea revocado
export async function logout(): Promise<void> {
  try {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await api.post('/auth/logout', { refresh_token: refreshToken });
    }
  } catch {
    // Ignorar errores al cerrar sesión
  } finally {
    clearTokens();
  }
}

// Obtener usuario actual
export async function getCurrentUser(): Promise<Usuario> {
  return api.get<Usuario>('/auth/me');
}

// Verificar si está autenticado
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('access_token');
}

// Verificar si el usuario tiene un permiso específico
export function hasPermission(usuario: Usuario | null, permiso: string): boolean {
  if (!usuario || !usuario.rol) return false;

  const permisos = usuario.rol.permisos;

  // Verificación defensiva: asegurar que permisos sea un array
  if (!Array.isArray(permisos)) return false;

  // Super admin tiene todos los permisos
  if (permisos.includes('*')) return true;

  // Verificar permiso exacto
  if (permisos.includes(permiso)) return true;

  // Verificar permisos con wildcard (ej: "empleados:*" incluye "empleados:leer")
  const [modulo] = permiso.split(':');
  if (permisos.includes(`${modulo}:*`)) return true;

  return false;
}

// Verificar múltiples permisos (OR)
export function hasAnyPermission(usuario: Usuario | null, permisos: string[]): boolean {
  return permisos.some((permiso) => hasPermission(usuario, permiso));
}

// Verificar múltiples permisos (AND)
export function hasAllPermissions(usuario: Usuario | null, permisos: string[]): boolean {
  return permisos.every((permiso) => hasPermission(usuario, permiso));
}
