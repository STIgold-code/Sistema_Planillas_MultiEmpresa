/**
 * Tipos relacionados con la autenticación y el usuario actual
 * Reemplaza los tipos `any` en decoradores y guards
 */

/**
 * Datos básicos del rol incluido en el usuario autenticado
 */
export interface AuthenticatedUserRol {
  id: number;
  nombre: string;
  descripcion: string | null;
  permisos: string[];
  empresa_id: number;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Datos básicos de la empresa incluida en el usuario autenticado
 */
export interface AuthenticatedUserEmpresa {
  id: number;
  ruc: string;
  razon_social: string;
  nombre_comercial: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  representante_legal: string | null;
  dni_representante: string | null;
  cargo_representante: string | null;
  partida_electronica: string | null;
  logo_url: string | null;
  firma_representante_url: string | null;
  activo: boolean;
  created_at: Date;
}

/**
 * Usuario autenticado sin password (retornado por JWT strategy)
 * Este es el tipo que se inyecta en req.user y está disponible via @CurrentUser()
 */
export interface AuthenticatedUser {
  id: number;
  email: string;
  nombre_completo: string;
  activo: boolean;
  empresa_id: number;
  rol_id: number;
  ultimo_acceso: Date | null;
  tokens_revocados_at: Date | null;
  created_at: Date;
  updated_at: Date;
  rol: AuthenticatedUserRol;
  empresa: AuthenticatedUserEmpresa;
}

/**
 * Payload del JWT (sub contiene el userId como string)
 */
export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp?: number;
}

/**
 * Campos disponibles para extraer con @CurrentUser('field')
 */
export type AuthenticatedUserField = keyof AuthenticatedUser;
