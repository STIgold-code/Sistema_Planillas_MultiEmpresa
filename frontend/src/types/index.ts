// Barrel de tipos del sistema RRHH.
// Cada dominio tiene su propio archivo con sus interfaces y type aliases.
// Mantener este barrel garantiza que `import { X } from '@/types'` siga
// funcionando para todos los consumidores externos.

export * from './core';
export * from './contratos';
export * from './empleados';
export * from './tareo';
export * from './justificaciones';
export * from './asistencia';
export * from './auth';
export * from './api';
export * from './seleccion';
export * from './planillas';
export * from './solicitudes-cese';
export * from './sbs';
export * from './movimientos';
