// Respuestas de API y navegacion

import type * as React from 'react';

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

// Tipos para navegacion del sidebar
export interface NavItem {
  titulo: string;
  url: string;
  icono?: React.ComponentType<{ className?: string }>;
  subItems?: NavItem[];
  permiso?: string;
}
