/**
 * Archivo centralizado de permisos del sistema RRHH-Ermir
 *
 * Convención de nombres: modulo:accion
 * - leer: Ver/listar registros
 * - crear: Crear nuevos registros
 * - editar: Modificar registros existentes
 * - eliminar: Eliminar registros
 * - aprobar: Aprobar/autorizar registros (especial)
 * - cerrar: Cerrar períodos (especial)
 * - auditoria: Ver logs de auditoría (especial)
 */

export const PERMISOS = {
  // Módulo Dashboard
  DASHBOARD: {
    LEER: 'dashboard:leer',
    EDITAR: 'dashboard:editar',
  },

  // Módulo Empresas (multi-tenant config)
  EMPRESAS: {
    LEER: 'empresas:leer',
    CREAR: 'empresas:crear',
    EDITAR: 'empresas:editar',
    ELIMINAR: 'empresas:eliminar',
  },

  // Módulo Empleados
  EMPLEADOS: {
    LEER: 'empleados:leer',
    CREAR: 'empleados:crear', // Usado internamente cuando se convierte postulante
    CREAR_DIRECTO: 'empleados:crear_directo', // Crear sin pasar por selección (restringido)
    EDITAR: 'empleados:editar',
    ELIMINAR: 'empleados:eliminar',
  },

  // Módulo Contratos
  CONTRATOS: {
    LEER: 'contratos:leer',
    CREAR: 'contratos:crear',
    EDITAR: 'contratos:editar',
    ELIMINAR: 'contratos:eliminar',
    ANULAR_SOLICITAR: 'contratos:anular_solicitar',
    ANULAR_APROBAR: 'contratos:anular_aprobar',
  },

  // Módulo Tareo (Asistencia)
  TAREO: {
    LEER: 'tareo:leer',
    CREAR: 'tareo:crear',
    EDITAR: 'tareo:editar',
    ELIMINAR: 'tareo:eliminar',
    CERRAR: 'tareo:cerrar', // Cerrar períodos de tareo
    CORREGIR: 'tareo:corregir', // Editar sin restricción de sesión (corrector)
    AUDITORIA: 'tareo:auditoria', // Ver historial de cambios
    CONFIGURAR: 'tareo:configurar', // Configurar parámetros de sesiones
  },

  // Módulo Planilla (Nómina)
  PLANILLA: {
    LEER: 'planilla:leer',
    CREAR: 'planilla:crear',
    EDITAR: 'planilla:editar',
    ELIMINAR: 'planilla:eliminar',
    APROBAR: 'planilla:aprobar', // Aprobar planillas para pago
  },

  // Módulo Boletas de Pago
  BOLETA: {
    LEER: 'boleta:leer',
    CREAR: 'boleta:crear', // Generar boletas
    EDITAR: 'boleta:editar', // Marcar como enviada
    ENVIAR: 'boleta:enviar', // Enviar por email
  },

  // Módulo Selección (Vacantes y Postulantes)
  SELECCION: {
    LEER: 'seleccion:leer',
    CREAR: 'seleccion:crear',
    EDITAR: 'seleccion:editar',
    ELIMINAR: 'seleccion:eliminar',
  },

  // Documentos de Selección (en ficha de empleado)
  DOCUMENTOS_SELECCION: {
    EDITAR: 'documentos_seleccion:editar',
  },

  // Módulo Maestros (Datos maestros)
  MAESTROS: {
    LEER: 'maestros:leer',
    CREAR: 'maestros:crear',
    EDITAR: 'maestros:editar',
    ELIMINAR: 'maestros:eliminar',
  },

  // Módulo Usuarios
  USUARIOS: {
    LEER: 'usuarios:leer',
    CREAR: 'usuarios:crear',
    EDITAR: 'usuarios:editar',
    ELIMINAR: 'usuarios:eliminar',
  },

  // Módulo Roles
  ROLES: {
    LEER: 'roles:leer',
    CREAR: 'roles:crear',
    EDITAR: 'roles:editar',
    ELIMINAR: 'roles:eliminar',
  },

  // Módulo Vacaciones
  VACACIONES: {
    LEER: 'vacaciones:leer',
    CREAR: 'vacaciones:crear',
    EDITAR: 'vacaciones:editar',
    ELIMINAR: 'vacaciones:eliminar',
    APROBAR_JEFE: 'vacaciones:aprobar_jefe',
    APROBAR_FINAL: 'vacaciones:aprobar_final',
    CONFIGURAR: 'vacaciones:configurar',
  },

  // Módulo Ceses
  CESES: {
    LEER: 'ceses:leer',
    SOLICITAR: 'ceses:solicitar',
    APROBAR: 'ceses:aprobar',
  },

  // Módulo Inventario (uniformes)
  INVENTARIOS: {
    LEER: 'inventarios:leer',
    CONFIGURAR: 'inventarios:configurar',
    GESTIONAR_STOCK: 'inventarios:gestionar_stock',
    ENTREGAR: 'inventarios:entregar',
    DESCONTAR_SOLICITAR: 'inventarios:descontar_solicitar',
    DESCONTAR_APROBAR: 'inventarios:descontar_aprobar',
    BAJA_SOLICITAR: 'inventarios:baja_solicitar',
    BAJA_APROBAR: 'inventarios:baja_aprobar',
    REQUERIMIENTOS: 'inventarios:requerimientos',
    REQUERIMIENTOS_APROBAR: 'inventarios:requerimientos_aprobar',
  },

  // Módulo Auditoría
  AUDITORIA: {
    LEER: 'auditoria:leer',
  },

  // Módulo Reportes
  REPORTES: {
    LEER: 'reportes:leer',
    GENERAR: 'reportes:generar',
  },

  // Módulo SUCAMEC
  SUCAMEC: {
    LEER: 'sucamec:leer',
    CREAR: 'sucamec:crear',
    EDITAR: 'sucamec:editar',
    ELIMINAR: 'sucamec:eliminar',
  },
} as const;

// Wildcard para superadmin
export const PERMISO_TOTAL = '*';

/**
 * Estructura de permisos por módulo para el UI de roles
 * Incluye nombre legible y descripción de cada permiso
 */
export interface PermisoGrupo {
  modulo: string;
  descripcion: string;
  permisos: {
    codigo: string;
    nombre: string;
    descripcion: string;
  }[];
}

export const PERMISOS_POR_MODULO: PermisoGrupo[] = [
  {
    modulo: 'Dashboard',
    descripcion: 'Panel principal del sistema',
    permisos: [
      {
        codigo: PERMISOS.DASHBOARD.LEER,
        nombre: 'Leer',
        descripcion: 'Ver estadísticas del dashboard',
      },
      {
        codigo: PERMISOS.DASHBOARD.EDITAR,
        nombre: 'Editar',
        descripcion:
          'Renovar contratos y aprobar/rechazar ceses desde el dashboard',
      },
    ],
  },
  {
    modulo: 'Empleados',
    descripcion: 'Gestión del personal de la empresa',
    permisos: [
      {
        codigo: PERMISOS.EMPLEADOS.LEER,
        nombre: 'Leer',
        descripcion: 'Ver lista y detalle de empleados',
      },
      {
        codigo: PERMISOS.EMPLEADOS.CREAR,
        nombre: 'Crear',
        descripcion: 'Crear empleados (vía selección)',
      },
      {
        codigo: PERMISOS.EMPLEADOS.CREAR_DIRECTO,
        nombre: 'Crear Directo',
        descripcion: 'Crear empleados sin pasar por selección (solo admin)',
      },
      {
        codigo: PERMISOS.EMPLEADOS.EDITAR,
        nombre: 'Editar',
        descripcion: 'Modificar datos de empleados',
      },
      {
        codigo: PERMISOS.EMPLEADOS.ELIMINAR,
        nombre: 'Eliminar',
        descripcion: 'Dar de baja empleados',
      },
    ],
  },
  {
    modulo: 'Contratos',
    descripcion: 'Gestión de contratos laborales',
    permisos: [
      {
        codigo: PERMISOS.CONTRATOS.LEER,
        nombre: 'Leer',
        descripcion: 'Ver contratos y plantillas',
      },
      {
        codigo: PERMISOS.CONTRATOS.CREAR,
        nombre: 'Crear',
        descripcion: 'Generar nuevos contratos',
      },
      {
        codigo: PERMISOS.CONTRATOS.EDITAR,
        nombre: 'Editar',
        descripcion: 'Modificar contratos existentes',
      },
      {
        codigo: PERMISOS.CONTRATOS.ELIMINAR,
        nombre: 'Eliminar',
        descripcion: 'Anular contratos',
      },
      {
        codigo: PERMISOS.CONTRATOS.ANULAR_SOLICITAR,
        nombre: 'Solicitar anulación',
        descripcion: 'Crear solicitudes de anulación de contrato (RRHH)',
      },
      {
        codigo: PERMISOS.CONTRATOS.ANULAR_APROBAR,
        nombre: 'Aprobar anulación',
        descripcion:
          'Aprobar o rechazar solicitudes de anulación de contrato (Admin)',
      },
    ],
  },
  {
    modulo: 'Tareo',
    descripcion: 'Control de asistencia y horas trabajadas',
    permisos: [
      {
        codigo: PERMISOS.TAREO.LEER,
        nombre: 'Leer',
        descripcion: 'Ver registros de asistencia',
      },
      {
        codigo: PERMISOS.TAREO.CREAR,
        nombre: 'Crear',
        descripcion: 'Crear períodos de tareo',
      },
      {
        codigo: PERMISOS.TAREO.EDITAR,
        nombre: 'Editar',
        descripcion: 'Modificar marcaciones',
      },
      {
        codigo: PERMISOS.TAREO.ELIMINAR,
        nombre: 'Eliminar',
        descripcion: 'Eliminar períodos',
      },
      {
        codigo: PERMISOS.TAREO.CERRAR,
        nombre: 'Cerrar',
        descripcion: 'Cerrar períodos (no modificables)',
      },
      {
        codigo: PERMISOS.TAREO.CORREGIR,
        nombre: 'Corregir',
        descripcion: 'Editar tareo sin restricción de tiempo (corrector)',
      },
      {
        codigo: PERMISOS.TAREO.AUDITORIA,
        nombre: 'Auditoría',
        descripcion: 'Ver historial de cambios',
      },
    ],
  },
  {
    modulo: 'Planilla',
    descripcion: 'Cálculo y gestión de nómina',
    permisos: [
      {
        codigo: PERMISOS.PLANILLA.LEER,
        nombre: 'Leer',
        descripcion: 'Ver planillas',
      },
      {
        codigo: PERMISOS.PLANILLA.CREAR,
        nombre: 'Crear',
        descripcion: 'Generar nuevas planillas',
      },
      {
        codigo: PERMISOS.PLANILLA.EDITAR,
        nombre: 'Editar',
        descripcion: 'Modificar conceptos',
      },
      {
        codigo: PERMISOS.PLANILLA.ELIMINAR,
        nombre: 'Eliminar',
        descripcion: 'Anular planillas',
      },
      {
        codigo: PERMISOS.PLANILLA.APROBAR,
        nombre: 'Aprobar',
        descripcion: 'Autorizar planillas para pago',
      },
    ],
  },
  {
    modulo: 'Boletas',
    descripcion: 'Gestión de boletas de pago',
    permisos: [
      {
        codigo: PERMISOS.BOLETA.LEER,
        nombre: 'Leer',
        descripcion: 'Ver historial de boletas',
      },
      {
        codigo: PERMISOS.BOLETA.CREAR,
        nombre: 'Crear',
        descripcion: 'Generar boletas desde planilla',
      },
      {
        codigo: PERMISOS.BOLETA.EDITAR,
        nombre: 'Editar',
        descripcion: 'Modificar estado de boletas',
      },
      {
        codigo: PERMISOS.BOLETA.ENVIAR,
        nombre: 'Enviar',
        descripcion: 'Enviar boletas por email',
      },
    ],
  },
  {
    modulo: 'Selección',
    descripcion: 'Reclutamiento y selección de personal',
    permisos: [
      {
        codigo: PERMISOS.SELECCION.LEER,
        nombre: 'Leer',
        descripcion: 'Ver vacantes y postulantes',
      },
      {
        codigo: PERMISOS.SELECCION.CREAR,
        nombre: 'Crear',
        descripcion: 'Crear vacantes y postulantes',
      },
      {
        codigo: PERMISOS.SELECCION.EDITAR,
        nombre: 'Editar',
        descripcion: 'Modificar procesos de selección',
      },
      {
        codigo: PERMISOS.SELECCION.ELIMINAR,
        nombre: 'Eliminar',
        descripcion: 'Eliminar vacantes/postulantes',
      },
    ],
  },
  {
    modulo: 'Documentos de Selección',
    descripcion:
      'Gestión de documentos provenientes del proceso de selección en la ficha del empleado',
    permisos: [
      {
        codigo: PERMISOS.DOCUMENTOS_SELECCION.EDITAR,
        nombre: 'Editar',
        descripcion:
          'Editar y eliminar documentos de origen Selección en la ficha del empleado',
      },
    ],
  },
  {
    modulo: 'Maestros',
    descripcion: 'Datos maestros del sistema',
    permisos: [
      {
        codigo: PERMISOS.MAESTROS.LEER,
        nombre: 'Leer',
        descripcion: 'Ver catálogos maestros',
      },
      {
        codigo: PERMISOS.MAESTROS.CREAR,
        nombre: 'Crear',
        descripcion: 'Agregar nuevos registros',
      },
      {
        codigo: PERMISOS.MAESTROS.EDITAR,
        nombre: 'Editar',
        descripcion: 'Modificar registros',
      },
      {
        codigo: PERMISOS.MAESTROS.ELIMINAR,
        nombre: 'Eliminar',
        descripcion: 'Eliminar registros',
      },
    ],
  },
  {
    modulo: 'Usuarios',
    descripcion: 'Gestión de usuarios del sistema',
    permisos: [
      {
        codigo: PERMISOS.USUARIOS.LEER,
        nombre: 'Leer',
        descripcion: 'Ver lista de usuarios',
      },
      {
        codigo: PERMISOS.USUARIOS.CREAR,
        nombre: 'Crear',
        descripcion: 'Crear nuevos usuarios',
      },
      {
        codigo: PERMISOS.USUARIOS.EDITAR,
        nombre: 'Editar',
        descripcion: 'Modificar usuarios',
      },
      {
        codigo: PERMISOS.USUARIOS.ELIMINAR,
        nombre: 'Eliminar',
        descripcion: 'Desactivar usuarios',
      },
    ],
  },
  {
    modulo: 'Roles',
    descripcion: 'Gestión de roles y permisos',
    permisos: [
      {
        codigo: PERMISOS.ROLES.LEER,
        nombre: 'Leer',
        descripcion: 'Ver roles existentes',
      },
      {
        codigo: PERMISOS.ROLES.CREAR,
        nombre: 'Crear',
        descripcion: 'Crear nuevos roles',
      },
      {
        codigo: PERMISOS.ROLES.EDITAR,
        nombre: 'Editar',
        descripcion: 'Modificar permisos de roles',
      },
      {
        codigo: PERMISOS.ROLES.ELIMINAR,
        nombre: 'Eliminar',
        descripcion: 'Eliminar roles',
      },
    ],
  },
  {
    modulo: 'Empresas',
    descripcion: 'Configuración multi-empresa',
    permisos: [
      {
        codigo: PERMISOS.EMPRESAS.LEER,
        nombre: 'Leer',
        descripcion: 'Ver empresas configuradas',
      },
      {
        codigo: PERMISOS.EMPRESAS.CREAR,
        nombre: 'Crear',
        descripcion: 'Crear nuevas empresas',
      },
      {
        codigo: PERMISOS.EMPRESAS.EDITAR,
        nombre: 'Editar',
        descripcion: 'Modificar datos de empresa',
      },
      {
        codigo: PERMISOS.EMPRESAS.ELIMINAR,
        nombre: 'Eliminar',
        descripcion: 'Eliminar empresas',
      },
    ],
  },
  {
    modulo: 'Vacaciones',
    descripcion: 'Gestión de vacaciones y períodos vacacionales',
    permisos: [
      {
        codigo: PERMISOS.VACACIONES.LEER,
        nombre: 'Leer',
        descripcion: 'Ver solicitudes y saldos de vacaciones',
      },
      {
        codigo: PERMISOS.VACACIONES.CREAR,
        nombre: 'Crear',
        descripcion: 'Registrar solicitudes de vacaciones',
      },
      {
        codigo: PERMISOS.VACACIONES.EDITAR,
        nombre: 'Editar',
        descripcion: 'Modificar solicitudes',
      },
      {
        codigo: PERMISOS.VACACIONES.ELIMINAR,
        nombre: 'Eliminar',
        descripcion: 'Eliminar solicitudes',
      },
      {
        codigo: PERMISOS.VACACIONES.APROBAR_JEFE,
        nombre: 'Aprobar (Jefe)',
        descripcion: 'Aprobar solicitudes como supervisor',
      },
      {
        codigo: PERMISOS.VACACIONES.APROBAR_FINAL,
        nombre: 'Aprobar (RRHH)',
        descripcion: 'Validación final de RRHH',
      },
      {
        codigo: PERMISOS.VACACIONES.CONFIGURAR,
        nombre: 'Configurar',
        descripcion: 'Configurar parámetros de vacaciones',
      },
    ],
  },
  {
    modulo: 'Ceses',
    descripcion: 'Solicitudes de cese de personal',
    permisos: [
      {
        codigo: PERMISOS.CESES.LEER,
        nombre: 'Leer',
        descripcion: 'Ver solicitudes de cese',
      },
      {
        codigo: PERMISOS.CESES.SOLICITAR,
        nombre: 'Solicitar',
        descripcion: 'Crear solicitudes de cese',
      },
      {
        codigo: PERMISOS.CESES.APROBAR,
        nombre: 'Aprobar',
        descripcion: 'Aprobar o rechazar solicitudes de cese',
      },
    ],
  },
  {
    modulo: 'Inventario',
    descripcion: 'Inventario de uniformes y proveedores',
    permisos: [
      {
        codigo: PERMISOS.INVENTARIOS.LEER,
        nombre: 'Leer',
        descripcion: 'Ver inventario, proveedores y tipos de uniforme',
      },
      {
        codigo: PERMISOS.INVENTARIOS.CONFIGURAR,
        nombre: 'Configurar',
        descripcion: 'Crear y editar proveedores y tipos de uniforme',
      },
      {
        codigo: PERMISOS.INVENTARIOS.GESTIONAR_STOCK,
        nombre: 'Gestionar stock',
        descripcion: 'Registrar compras (ingresos) y dar de baja items',
      },
      {
        codigo: PERMISOS.INVENTARIOS.ENTREGAR,
        nombre: 'Entregar / devolver',
        descripcion: 'Entregar uniformes a empleados y registrar devoluciones',
      },
      {
        codigo: PERMISOS.INVENTARIOS.DESCONTAR_SOLICITAR,
        nombre: 'Solicitar descuento',
        descripcion:
          'Crear solicitudes de descuento por uniformes no devueltos',
      },
      {
        codigo: PERMISOS.INVENTARIOS.DESCONTAR_APROBAR,
        nombre: 'Aprobar descuento',
        descripcion:
          'Aprobar o rechazar descuentos por uniformes (define el monto)',
      },
      {
        codigo: PERMISOS.INVENTARIOS.BAJA_SOLICITAR,
        nombre: 'Solicitar baja',
        descripcion:
          'Solicitar la baja de prendas dañadas (queda pendiente de aprobación)',
      },
      {
        codigo: PERMISOS.INVENTARIOS.BAJA_APROBAR,
        nombre: 'Aprobar baja',
        descripcion:
          'Dar de baja prendas directamente y aprobar/rechazar solicitudes de baja',
      },
      {
        codigo: PERMISOS.INVENTARIOS.REQUERIMIENTOS,
        nombre: 'Requerimientos',
        descripcion:
          'Crear y gestionar requerimientos de prendas y exportarlos',
      },
      {
        codigo: PERMISOS.INVENTARIOS.REQUERIMIENTOS_APROBAR,
        nombre: 'Aprobar requerimientos',
        descripcion: 'Aprobar o rechazar requerimientos de prendas',
      },
    ],
  },
  {
    modulo: 'Auditoría',
    descripcion: 'Trazabilidad y log de cambios del sistema',
    permisos: [
      {
        codigo: PERMISOS.AUDITORIA.LEER,
        nombre: 'Leer',
        descripcion: 'Ver historial de cambios y auditoría',
      },
    ],
  },
  {
    modulo: 'Reportes',
    descripcion: 'Generación y descarga de reportes',
    permisos: [
      {
        codigo: PERMISOS.REPORTES.LEER,
        nombre: 'Leer',
        descripcion: 'Ver catálogo de reportes e historial',
      },
      {
        codigo: PERMISOS.REPORTES.GENERAR,
        nombre: 'Generar',
        descripcion: 'Generar y descargar reportes',
      },
    ],
  },
  {
    modulo: 'SUCAMEC',
    descripcion: 'Gestión de carnets SUCAMEC para agentes de seguridad',
    permisos: [
      {
        codigo: PERMISOS.SUCAMEC.LEER,
        nombre: 'Leer',
        descripcion: 'Ver carnets SUCAMEC y vencimientos',
      },
      {
        codigo: PERMISOS.SUCAMEC.CREAR,
        nombre: 'Crear',
        descripcion: 'Registrar carnets y renovaciones',
      },
      {
        codigo: PERMISOS.SUCAMEC.EDITAR,
        nombre: 'Editar',
        descripcion: 'Modificar carnets, suspender, anular',
      },
      {
        codigo: PERMISOS.SUCAMEC.ELIMINAR,
        nombre: 'Eliminar',
        descripcion: 'Eliminar carnets no vigentes',
      },
    ],
  },
];

/**
 * Obtiene todos los códigos de permiso planos (para validación)
 */
export function getAllPermissionCodes(): string[] {
  return PERMISOS_POR_MODULO.flatMap((grupo) =>
    grupo.permisos.map((p) => p.codigo),
  );
}

/**
 * Verifica si un usuario tiene un permiso específico
 * Soporta wildcards: '*' (todos), 'modulo:*' (todo el módulo)
 */
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string,
): boolean {
  // Wildcard total
  if (userPermissions.includes(PERMISO_TOTAL)) {
    return true;
  }

  // Permiso exacto
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Wildcard de módulo (ej: 'empleados:*')
  const [modulo] = requiredPermission.split(':');
  if (userPermissions.includes(`${modulo}:*`)) {
    return true;
  }

  return false;
}
