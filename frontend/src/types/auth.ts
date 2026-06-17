// Autenticacion

import type { Usuario } from './core';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  usuario: Usuario;
}

export interface AuthState {
  usuario: Usuario | null;
  access_token: string | null;
  isAuthenticated: boolean;
}
