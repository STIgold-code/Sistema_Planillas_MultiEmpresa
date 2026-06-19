// Inventario de uniformes

export type GeneroUniforme = "UNISEX" | "MASCULINO" | "FEMENINO";

export interface Proveedor {
  id: number;
  nombre: string;
  ruc?: string | null;
  contacto?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface TallaUniforme {
  id: number;
  valor: string;
  orden: number;
  stock_minimo: number;
}

export interface CaracteristicaTipoUniforme {
  id: number;
  nombre: string;
  descripcion: string | null;
}

export interface TipoUniforme {
  id: number;
  nombre: string;
  descripcion?: string | null;
  genero: GeneroUniforme;
  precio_referencial?: number | string | null;
  cantidad_estandar: number;
  tallas: TallaUniforme[];
  /** Atributos descriptivos M:N (material, color, etc.). */
  caracteristicas: CaracteristicaTipoUniforme[];
  activo: boolean;
  created_at: string;
  updated_at: string;
}

/** Maestro de Característica: atributo descriptivo libre del PO. */
export interface Caracteristica {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  empresa_id: number;
  created_at: string;
  updated_at: string;
  _count?: { tipos_uniforme: number };
}

export interface CaracteristicaSelect {
  id: number;
  nombre: string;
  descripcion: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const GENERO_LABELS: Record<GeneroUniforme, string> = {
  UNISEX: "Unisex",
  MASCULINO: "Masculino",
  FEMENINO: "Femenino",
};

// ── Stock (Fase 2) ──────────────────────────────────────────────────────────

export type EstadoItemInventario = "DISPONIBLE" | "ENTREGADO" | "BAJA";

export type CondicionItem = "NUEVO" | "USADO";

export const CONDICION_ITEM_LABELS: Record<CondicionItem, string> = {
  NUEVO: "Nuevo",
  USADO: "Usado",
};

export interface ItemInventario {
  id: number;
  codigo: string;
  talla: string;
  precio: number | string;
  estado: EstadoItemInventario;
  condicion: CondicionItem;
  tipo_uniforme: { id: number; nombre: string; genero: GeneroUniforme };
  proveedor: { id: number; nombre: string };
  empleado?: {
    id: number;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
  } | null;
}

/** Movimiento del Kardex en el detalle de un item. */
export interface MovimientoItemDetalle {
  id: number;
  tipo_movimiento: "ENTRADA" | "ENTREGA" | "DEVOLUCION" | "BAJA";
  motivo: string | null;
  fecha: string;
  usuario: { id: number; nombre_completo: string };
  empleado: {
    id: number;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
  } | null;
}

/** Detalle de un item: origen (compra) + historial de movimientos (Kardex). */
export interface ItemInventarioDetalle extends ItemInventario {
  ingreso: {
    id: number;
    fecha_ingreso: string;
    numero_documento?: string | null;
  } | null;
  movimientos: MovimientoItemDetalle[];
}

export interface IngresoInventario {
  id: number;
  fecha_ingreso: string;
  numero_documento?: string | null;
  observaciones?: string | null;
  // Datos de la factura digitalizada (opcionales: el ingreso simple no los tiene).
  numero_factura?: string | null;
  fecha_factura?: string | null;
  monto_total?: number | string | null;
  archivo_url?: string | null;
  archivo_nombre?: string | null;
  proveedor: { id: number; nombre: string };
  usuario: { id: number; nombre_completo: string };
  _count?: { items: number };
}

/** Detalle de un ingreso: cabecera + prendas que ingresaron. */
export interface IngresoInventarioFull extends IngresoInventario {
  items: {
    id: number;
    codigo: string;
    talla: string;
    precio: number | string;
    estado: EstadoItemInventario;
    tipo_uniforme: { id: number; nombre: string };
  }[];
}

export interface ResumenStock {
  DISPONIBLE: number;
  ENTREGADO: number;
  BAJA: number;
}

// ── Existencias agregadas (por prenda + talla, con stock mínimo) ─────────────

export interface ExistenciaTalla {
  talla: string;
  disponibles: number;
  minimo: number;
  faltan: number;
}

export interface ExistenciaPrenda {
  tipo_uniforme_id: number;
  nombre: string;
  disponibles: number;
  faltan: number;
  tallas: ExistenciaTalla[];
}

export interface ExistenciasStock {
  totales: { disponibles: number; minimo: number; faltan: number };
  prendas: ExistenciaPrenda[];
}

// ── Plantillas de uniforme ("uniforme completo") ────────────────────────────

export interface PlantillaUniformeItem {
  tipo_uniforme_id: number;
  cantidad: number;
  tipo_uniforme: { nombre: string; genero: GeneroUniforme; activo: boolean };
}

export interface PlantillaUniforme {
  id: number;
  nombre: string;
  predeterminada: boolean;
  activo: boolean;
  items: PlantillaUniformeItem[];
}

export interface PlantillaUniformeFormData {
  nombre: string;
  predeterminada: boolean;
  items: { tipo_uniforme_id: number; cantidad: number }[];
}

export interface TipoUniformeSelect {
  id: number;
  nombre: string;
  genero: GeneroUniforme;
  cantidad_estandar: number;
  tallas: { valor: string; orden: number }[];
  caracteristicas: CaracteristicaTipoUniforme[];
}

export interface ProveedorSelect {
  id: number;
  nombre: string;
  ruc?: string | null;
}

export const ESTADO_ITEM_LABELS: Record<EstadoItemInventario, string> = {
  DISPONIBLE: "Disponible",
  ENTREGADO: "Entregado",
  BAJA: "Baja",
};

// ── Entregas (Fase 3) ───────────────────────────────────────────────────────

export interface EntregaItem {
  id: number;
  codigo: string;
  talla: string;
  precio: number | string;
  estado: EstadoItemInventario;
  tipo_uniforme: { id: number; nombre: string };
}

export interface EntregaUniforme {
  id: number;
  fecha_entrega: string;
  created_at?: string;
  observaciones?: string | null;
  empleado: {
    id: number;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    numero_documento: string;
  };
  entregado_por: { id: number; nombre_completo: string };
  items?: EntregaItem[];
  _count?: { items: number };
}

// ── Entrega masiva de dotación ───────────────────────────────────────────────

/** Talla sugerida de una prenda para un empleado candidato a entrega masiva. */
export interface TallaCandidatoEntrega {
  tipo_uniforme_id: number;
  tipo_nombre: string;
  talla: string;
  cantidad_estandar: number;
}

/** Empleado candidato para la entrega masiva (lista paginada del panel). */
export interface EmpleadoCandidatoEntrega {
  id: number;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  numero_documento: string;
  estado: string;
  sede: string | null;
  cargo: string | null;
  fecha_ingreso: string | null;
  es_nuevo: boolean;
  tallas: TallaCandidatoEntrega[];
}

/** Stock disponible por prenda + talla (clave de validación del reparto). */
export interface DisponibilidadStock {
  tipo_uniforme_id: number;
  talla: string;
  disponibles: number;
}

/** Línea de prenda dentro de la entrega masiva (prenda + talla + cantidad). */
export interface LineaEntregaMasiva {
  tipo_uniforme_id: number;
  talla: string;
  cantidad: number;
}

/** Un empleado dentro del body de la entrega masiva. */
export interface EmpleadoEntregaMasiva {
  empleado_id: number;
  lineas: LineaEntregaMasiva[];
}

/** Body del POST /inventario/entregas/masiva. */
export interface EntregaMasivaBody {
  fecha_entrega: string;
  observaciones?: string;
  empleados: EmpleadoEntregaMasiva[];
}

/** Faltante reportado: lo solicitado que el stock no pudo cubrir. */
export interface FaltanteEntregaMasiva {
  empleado_id: number;
  empleado_nombre: string;
  tipo_uniforme_id: number;
  tipo_nombre: string;
  talla: string;
  solicitado: number;
  entregado: number;
  faltante: number;
}

/** Resultado del POST de entrega masiva. */
export interface ResultadoEntregaMasiva {
  empleados_con_entrega: number;
  empleados_sin_stock: number;
  total_entregado: number;
  total_faltante: number;
  entrega_ids: number[];
  faltantes: FaltanteEntregaMasiva[];
}

/** Body del POST /inventario/entregas/entregar-todos. */
export interface EntregarTodosBody {
  fecha: string;
  dotacion_completa: boolean;
  filtros: {
    buscar?: string;
    sede_id?: number;
    solo_nuevos?: boolean;
  };
  observaciones?: string;
}

/** Body del POST /inventario/descuentos/solicitar-todos. */
export interface SolicitarTodosBody {
  motivo: string;
  filtros: {
    buscar?: string;
    sede_id?: number;
    solo_nuevos?: boolean;
  };
}

export interface ItemsPendientesEmpleado {
  total: number;
  items: {
    id: number;
    codigo: string;
    talla: string;
    precio: number | string;
    tipo_uniforme: { id: number; nombre: string };
  }[];
}

// ── Descuentos (Fase 4) ─────────────────────────────────────────────────────

export type EstadoDescuento = "PENDIENTE" | "APROBADA" | "RECHAZADA";

export interface DescuentoItem {
  id: number;
  item_id: number;
  precio_referencia: number | string;
  monto_descuento?: number | string | null;
  item: {
    id: number;
    codigo: string;
    talla: string;
    estado: EstadoItemInventario;
    tipo_uniforme: { id: number; nombre: string };
  };
}

export interface SolicitudDescuento {
  id: number;
  motivo: string;
  estado: EstadoDescuento;
  monto_total?: number | string | null;
  observaciones_admin?: string | null;
  created_at: string;
  fecha_resolucion?: string | null;
  empleado: {
    id: number;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    numero_documento: string;
  };
  solicitado_por: { id: number; nombre_completo: string };
  resuelto_por?: { id: number; nombre_completo: string } | null;
  items: DescuentoItem[];
}

export const ESTADO_DESCUENTO_LABELS: Record<EstadoDescuento, string> = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
};

// ── Descuento masivo ────────────────────────────────────────────────────────

/**
 * Empleado candidato para el descuento masivo, con el conteo de items que tiene
 * ENTREGADOS sin devolver y que aún no están en una solicitud pendiente.
 */
export interface EmpleadoCandidatoDescuento {
  id: number;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  numero_documento: string;
  estado: string;
  sede: string | null;
  cargo: string | null;
  fecha_ingreso: string | null;
  es_nuevo: boolean;
  /** Items entregados no devueltos que se descontarían (sin doble descuento). */
  items_descontables: number;
}

/** Body del POST /inventario/descuentos/masiva. */
export interface DescuentoMasivaBody {
  empleado_ids: number[];
  motivo: string;
}

/** Un empleado al que NO se le creó solicitud y por qué (descuento masivo). */
export interface OmitidoDescuentoMasivo {
  empleado_id: number;
  empleado_nombre: string;
  motivo: string;
}

/** Resultado del POST de descuento masivo. */
export interface ResultadoDescuentoMasivo {
  creadas: number;
  solicitud_ids: number[];
  total_items: number;
  omitidos: OmitidoDescuentoMasivo[];
}

// ── Solicitudes de baja de prendas (almacén) ────────────────────────────────

export type EstadoSolicitudBaja = "PENDIENTE" | "APROBADA" | "RECHAZADA";

export interface SolicitudBaja {
  id: number;
  motivo: string;
  estado: EstadoSolicitudBaja;
  observaciones_admin?: string | null;
  created_at: string;
  fecha_resolucion?: string | null;
  solicitado_por: { id: number; nombre_completo: string };
  resuelto_por?: { id: number; nombre_completo: string } | null;
  item: {
    id: number;
    codigo: string;
    talla: string;
    estado: EstadoItemInventario;
    precio: number | string;
    tipo_uniforme: { id: number; nombre: string };
  };
}

export const ESTADO_SOLICITUD_BAJA_LABELS: Record<EstadoSolicitudBaja, string> =
  {
    PENDIENTE: "Pendiente",
    APROBADA: "Aprobada",
    RECHAZADA: "Rechazada",
  };

// ── Requerimientos (Fase 5) ─────────────────────────────────────────────────

export type EstadoRequerimiento = "BORRADOR" | "APROBADO" | "FINALIZADO";

export interface Requerimiento {
  id: number;
  nombre: string;
  fecha: string;
  estado: EstadoRequerimiento;
  proveedor: { id: number; nombre: string } | null;
  usuario: { id: number; nombre_completo: string };
  aprobado_por?: { id: number; nombre_completo: string } | null;
  fecha_aprobacion?: string | null;
  _count?: { detalles: number };
}

export interface RequerimientoDetalle {
  id: number;
  /** Nulo cuando la línea es un ítem directo (lista de compra sin empleado). */
  empleado_id: number | null;
  talla: string;
  cantidad: number;
  /** Ausente cuando la línea es un ítem directo (sin empleado asociado). */
  empleado: {
    id: number;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    numero_documento: string;
  } | null;
  tipo_uniforme: { id: number; nombre: string };
}

export interface RequerimientoFull extends Requerimiento {
  detalles: RequerimientoDetalle[];
}

export interface TallaEmpleadoPrellenada {
  tipo_uniforme_id: number;
  tipo_nombre: string;
  cantidad_estandar: number;
  talla: string;
}

/** Talla sugerida por prenda para un empleado candidato (carga masiva). */
export interface TallaCandidato {
  tipo_uniforme_id: number;
  tipo_nombre: string;
  talla: string;
  cantidad_estandar: number;
}

/** Prenda ya recibida por el empleado, con la fecha de entrega. */
export interface PrendaRecibida {
  tipo_uniforme_id: number;
  fecha: string;
}

/** Empleado candidato para carga masiva de prendas a un requerimiento (endpoint A). */
export interface EmpleadoCandidato {
  id: number;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  numero_documento: string;
  estado: string;
  sede: string | null;
  cargo: string | null;
  fecha_ingreso: string | null;
  es_nuevo: boolean;
  tallas: TallaCandidato[];
  recibido: PrendaRecibida[];
}

/** Línea de prenda dentro del lote (una prenda marcada con talla y cantidad). */
export interface LineaLoteEmpleado {
  tipo_uniforme_id: number;
  talla: string;
  cantidad: number;
}

/** Empleado dentro del body del lote de carga masiva (endpoint B). */
export interface EmpleadoLote {
  empleado_id: number;
  lineas: LineaLoteEmpleado[];
}

/** Body del PUT de carga masiva (endpoint B). */
export interface CargaLoteBody {
  empleados: EmpleadoLote[];
}

/** Respuesta del PUT de carga masiva (endpoint B). */
export interface CargaLoteResultado {
  ok: true;
  empleados: number;
  lineas: number;
}

/** Línea de un ítem directo del requerimiento (prenda + talla + cantidad, sin empleado). */
export interface LineaItem {
  tipo_uniforme_id: number;
  talla: string;
  cantidad: number;
}

/** Body del PUT de ítems directos (lista de compra sin empleados). */
export interface GuardarItemsBody {
  lineas: LineaItem[];
}

export interface ConsolidadoRequerimiento {
  tipo_uniforme_id: number;
  tipo_nombre: string;
  talla: string;
  cantidad: number;
  caracteristicas: CaracteristicaTipoUniforme[];
}

export const ESTADO_REQUERIMIENTO_LABELS: Record<EstadoRequerimiento, string> =
  {
    BORRADOR: "Borrador",
    APROBADO: "Aprobado",
    FINALIZADO: "Finalizado",
  };

/** Ítem devuelto por GET /inventario/requerimientos/pendientes-aprobacion */
export interface RequerimientoPendienteAprobacion {
  id: number;
  nombre: string;
  fecha: string;
  created_at: string;
  usuario: { id: number; nombre_completo: string };
  _count: { detalles: number };
}

export interface PlanificacionCompraLinea {
  tipo_uniforme_id: number;
  tipo_nombre: string;
  talla: string;
  requerido: number;
  disponible: number;
  faltante: number;
}

// ── Movimientos / Kardex (Fase 5) ────────────────────────────────────────────

export type TipoMovimientoInventario =
  | "ENTRADA"
  | "ENTREGA"
  | "DEVOLUCION"
  | "BAJA";

export interface MovimientoInventario {
  id: number;
  tipo_movimiento: TipoMovimientoInventario;
  fecha: string;
  item: {
    id: number;
    codigo: string;
    talla: string;
    precio: number | string;
    estado: EstadoItemInventario;
    tipo_uniforme: { id: number; nombre: string };
  };
  /** N° de factura del ingreso de compra (solo en movimientos ENTRADA). */
  factura: string | null;
  empleado: {
    id: number;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
  } | null;
  motivo: string | null;
  usuario: { id: number; nombre_completo: string };
}

/** Conteo de movimientos por tipo, para las tarjetas de resumen. */
export interface ResumenMovimientos {
  ENTRADA: number;
  ENTREGA: number;
  DEVOLUCION: number;
  BAJA: number;
}

export const TIPO_MOVIMIENTO_LABELS: Record<TipoMovimientoInventario, string> =
  {
    ENTRADA: "Entrada",
    ENTREGA: "Entrega",
    DEVOLUCION: "Devolución",
    BAJA: "Baja",
  };

export const TIPO_MOVIMIENTO_BADGE: Record<TipoMovimientoInventario, string> = {
  ENTRADA: "bg-green-100 text-green-800 border-green-200",
  ENTREGA: "bg-blue-100 text-blue-800 border-blue-200",
  DEVOLUCION: "bg-amber-100 text-amber-800 border-amber-200",
  BAJA: "bg-red-100 text-red-700 border-red-200",
};

// ── Compras / Factura (Flujo 2 — digitalización de factura) ──────────────────

/** Cabecera de factura presente en un ingreso digitalizado. */
export interface IngresoFacturaCabecera {
  numero_factura?: string | null;
  fecha_factura?: string | null;
  monto_total?: number | string | null;
  archivo_url?: string | null;
  archivo_nombre?: string | null;
}

/** Línea de la factura: prenda + talla + cantidad + precio unitario. */
export interface LineaFactura {
  tipo_uniforme_id: number;
  talla: string;
  cantidad: number;
  precio_unitario: number;
}

/** Body del POST /inventario/ingresos/factura. */
export interface CrearFacturaData extends IngresoFacturaCabecera {
  proveedor_id: number;
  requerimiento_id?: number;
  numero_factura: string;
  fecha_factura: string;
  observaciones?: string;
  lineas: LineaFactura[];
}

/**
 * Fila de la comparativa pedido-vs-recibido. `delta = recibido − pedido`:
 * negativo = falta, positivo = sobra, cero = coincide.
 */
export interface ComparativaLinea {
  tipo_uniforme_id: number;
  tipo_nombre: string;
  talla: string;
  pedido: number;
  recibido: number;
  delta: number;
}
