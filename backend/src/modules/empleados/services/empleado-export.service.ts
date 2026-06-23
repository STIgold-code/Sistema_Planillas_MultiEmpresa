import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UploadsService } from '../../uploads/uploads.service';
import { FilterEmpleadoDto } from '../dto';
import { OrigenDocumento } from '../dto/expediente-digital.dto';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import {
  ahoraPeru,
  sumarDiasPeru,
  formatearFechaPeru,
  leerFechaPrisma,
  fechaHoyPeruDate,
} from '../../../common/utils/datetime.util';

@Injectable()
export class EmpleadoExportService {
  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
  ) {}

  // ============================================================================
  // MÉTODOS PRIVADOS - HELPERS INTERNOS
  // ============================================================================

  /**
   * Obtiene estadísticas de documentos vencidos/por vencer para múltiples empleados
   * Principio: Single Responsibility - solo obtiene stats, no filtra
   * Optimización: Una sola query para todos los empleados en vez de N queries
   */
  async getDocumentosStatsForEmpleados(
    empleadoIds: number[],
    fechaHoy: Date,
    fechaPorVencer: Date,
  ): Promise<Map<number, { vencidos: number; porVencer: number }>> {
    if (empleadoIds.length === 0) {
      return new Map();
    }

    // Query optimizada: obtener todos los documentos con vencimiento de los empleados
    const documentos = await this.prisma.empleadoDocumento.findMany({
      where: {
        empleado_id: { in: empleadoIds },
        eliminado: false,
        es_version_vigente: true,
        fecha_vencimiento: { not: null },
      },
      select: {
        empleado_id: true,
        fecha_vencimiento: true,
      },
    });

    // Procesar y agrupar por empleado
    const statsMap = new Map<number, { vencidos: number; porVencer: number }>();

    // Inicializar todos los empleados con 0
    empleadoIds.forEach((id) =>
      statsMap.set(id, { vencidos: 0, porVencer: 0 }),
    );

    // Contar documentos vencidos y por vencer
    documentos.forEach((doc) => {
      const stats = statsMap.get(doc.empleado_id);
      if (!stats || !doc.fecha_vencimiento) return;

      const fechaVenc = new Date(doc.fecha_vencimiento);
      fechaVenc.setHours(0, 0, 0, 0);

      if (fechaVenc < fechaHoy) {
        stats.vencidos++;
      } else if (fechaVenc <= fechaPorVencer) {
        stats.porVencer++;
      }
    });

    return statsMap;
  }

  // ============================================================================
  // EXPORTAR EXCEL
  // ============================================================================

  // Exportar empleados a Excel
  async exportarExcel(
    empresaId: number,
    filters: FilterEmpleadoDto,
  ): Promise<ExcelJS.Workbook> {
    const { buscar, area_id, cargo_id, sede_id, estado } = filters;

    const where: Prisma.EmpleadoWhereInput = {
      empresa_id: empresaId,
    };

    if (buscar) {
      const orConditions: Prisma.EmpleadoWhereInput[] = [
        { numero_documento: { contains: buscar, mode: 'insensitive' } },
        { nombres: { contains: buscar, mode: 'insensitive' } },
        { apellido_paterno: { contains: buscar, mode: 'insensitive' } },
        { apellido_materno: { contains: buscar, mode: 'insensitive' } },
      ];
      const idNumerico = parseInt(buscar, 10);
      if (!isNaN(idNumerico)) {
        orConditions.push({ id: idNumerico });
      }
      where.OR = orConditions;
    }

    if (area_id) where.area_id = area_id;
    if (cargo_id) where.cargo_id = cargo_id;
    if (sede_id) where.sede_id = sede_id;
    if (estado) where.estado = estado;
    if (filters.turno) where.turno = filters.turno;

    const empleados = await this.prisma.empleado.findMany({
      where,
      orderBy: { apellido_paterno: 'asc' },
      include: {
        area: { select: { nombre: true } },
        cargo: { select: { nombre: true } },
        sede: { select: { nombre: true } },
        distrito: {
          include: {
            provincia: {
              include: { departamento: true },
            },
          },
        },
        regimen_pensionario: true,
        banco_haberes: true,
        banco_cts: true,
        contratos: {
          where: { estado: { in: ['ACTIVO', 'PENDIENTE', 'CESADO'] } },
          orderBy: { fecha_inicio: 'desc' },
          take: 1,
          select: {
            id: true,
            fecha_inicio: true,
            fecha_fin: true,
            fecha_cese: true,
            motivo_cese: true,
            estado: true,
          },
        },
        movimientos: {
          where: { tipo_movimiento: { in: ['BAJA', 'RENUNCIA'] } },
          orderBy: { fecha_movimiento: 'desc' },
          take: 1,
          select: { motivo: true, observaciones: true },
        },
        solicitudes_cese: {
          where: { estado: 'APROBADA' },
          orderBy: { created_at: 'desc' },
          take: 1,
          select: {
            tipo_cese: { select: { nombre: true } },
          },
        },
        vinculos_laborales: {
          orderBy: { fecha_inicio: 'desc' },
          select: {
            id: true,
            fecha_inicio: true,
            fecha_fin: true,
            estado: true,
            motivo_cierre: true,
          },
        },
      },
    });

    // Función para calcular edad (fecha Prisma @db.Date en UTC, hoy en Peru)
    const calcularEdadLocal = (fechaNacimiento: Date | null): number | null => {
      if (!fechaNacimiento) return null;
      const hoyPeru = ahoraPeru();
      const nacimiento = leerFechaPrisma(fechaNacimiento);
      let edad = hoyPeru.year - nacimiento.year;
      if (
        hoyPeru.month < nacimiento.month ||
        (hoyPeru.month === nacimiento.month && hoyPeru.day < nacimiento.day)
      ) {
        edad--;
      }
      return edad;
    };

    // Función para formatear fecha
    const formatFecha = (fecha: Date | null): string => {
      if (!fecha) return '';
      return formatearFechaPeru(fecha);
    };

    // Función para calcular días restantes del contrato
    const calcularDiasRestantes = (fechaFin: Date | null): number | null => {
      if (!fechaFin) return null;
      const hoyPeru = fechaHoyPeruDate();
      const fin = leerFechaPrisma(fechaFin);
      const fechaFinDate = new Date(fin.year, fin.month - 1, fin.day);
      const diffTime = fechaFinDate.getTime() - hoyPeru.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // Crear workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema RRHH';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Empleados');

    // Configurar 46 columnas según formato requerido
    sheet.columns = [
      { header: 'Id', key: 'id', width: 6 },
      { header: 'EstadoPersona', key: 'estado_persona', width: 14 },
      { header: 'TipoDocumento', key: 'tipo_documento', width: 14 },
      { header: 'NumeroDocumento', key: 'numero_documento', width: 14 },
      { header: 'ApellidoPaterno', key: 'apellido_paterno', width: 18 },
      { header: 'ApellidoMaterno', key: 'apellido_materno', width: 18 },
      { header: 'NombreCompleto', key: 'nombre_completo', width: 25 },
      { header: 'ApellidosYNombres', key: 'apellidos_y_nombres', width: 35 },
      { header: 'Area', key: 'area', width: 30 },
      { header: 'Sede', key: 'sede', width: 35 },
      { header: 'Cargo', key: 'cargo', width: 30 },
      { header: 'FechaNacimiento', key: 'fecha_nacimiento', width: 14 },
      { header: 'Edad', key: 'edad', width: 6 },
      { header: 'Sexo', key: 'sexo', width: 6 },
      { header: 'Telefono', key: 'telefono', width: 12 },
      { header: 'Celular', key: 'celular', width: 12 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Direccion', key: 'direccion', width: 45 },
      { header: 'Departamento', key: 'departamento', width: 14 },
      { header: 'Provincia', key: 'provincia', width: 14 },
      { header: 'Distrito', key: 'distrito', width: 14 },
      { header: 'FechaIngreso', key: 'fecha_ingreso', width: 14 },
      { header: 'FechaPlanilla', key: 'fecha_planilla', width: 14 },
      { header: 'FechaCese', key: 'fecha_cese', width: 14 },
      { header: 'F.InicioContrato', key: 'fecha_inicio_contrato', width: 16 },
      { header: 'F.FinContrato', key: 'fecha_fin_contrato', width: 14 },
      { header: 'DiasRestantes', key: 'dias_restantes', width: 14 },
      { header: 'TipoCese', key: 'tipo_cese', width: 25 },
      { header: 'SueldoBasico', key: 'sueldo_basico', width: 12 },
      { header: 'SueldoNeto', key: 'sueldo_neto', width: 12 },
      { header: 'RecibeNeto', key: 'recibe_neto', width: 10 },
      { header: 'TipoPago', key: 'tipo_pago', width: 12 },
      { header: 'Turno', key: 'turno', width: 8 },
      { header: 'AsignacionFamiliar', key: 'asignacion_familiar', width: 16 },
      { header: 'Sctr', key: 'sctr', width: 6 },
      { header: 'Comision', key: 'comision', width: 10 },
      { header: 'BonoProductividad', key: 'bono_productividad', width: 16 },
      { header: 'BonoDesempeno', key: 'bono_desempeno', width: 14 },
      { header: 'BonoMovilidad', key: 'bono_movilidad', width: 14 },
      { header: 'Situacion', key: 'situacion', width: 12 },
      { header: 'CelularEmpresa', key: 'celular_empresa', width: 14 },
      { header: 'MontoAdelanto', key: 'monto_adelanto', width: 14 },
      { header: 'RegimenPensionario', key: 'regimen_pensionario', width: 22 },
      { header: 'Cuspp', key: 'cuspp', width: 16 },
      { header: 'AporteObligatorioRP', key: 'aporte_obligatorio', width: 18 },
      { header: 'ComisionRP', key: 'comision_rp', width: 12 },
      { header: 'PrimaSeguroRP', key: 'prima_seguro', width: 14 },
      { header: 'BancoHaberes', key: 'banco_haberes', width: 30 },
      { header: 'NumeroCuentaHaberes', key: 'nro_cuenta_haberes', width: 18 },
      { header: 'NumeroCuentaCciHaberes', key: 'cci_haberes', width: 24 },
      { header: 'BancoCts', key: 'banco_cts', width: 30 },
      { header: 'NumeroCuentaCts', key: 'nro_cuenta_cts', width: 18 },
      { header: 'NumeroCuentaCciCts', key: 'cci_cts', width: 24 },
      { header: 'ObservacionesBaja', key: 'observaciones_baja', width: 30 },
    ];

    // Estilo del header
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.height = 22;

    // Agregar datos
    empleados.forEach((emp) => {
      const regimen = emp.regimen_pensionario;
      const sueldoBase = Number(emp.sueldo_base) || 0;

      // Estado REINGRESANTE computado: ACTIVO + al menos 1 vinculo_laboral cerrado
      const vinculosCerrados = (emp.vinculos_laborales || []).filter(
        (v) => v.fecha_fin !== null,
      );
      const ultimoCeseVinculo = vinculosCerrados
        .slice()
        .sort(
          (a, b) =>
            (b.fecha_fin?.getTime() ?? 0) - (a.fecha_fin?.getTime() ?? 0),
        )[0];
      const esReingresante =
        emp.estado === 'ACTIVO' && vinculosCerrados.length >= 1;
      const estadoPersonaComputado = esReingresante
        ? 'REINGRESANTE'
        : emp.estado;
      // Si es REINGRESANTE: mostrar fecha del cese anterior (del vinculo cerrado).
      // Si es CESADO: mantener fecha_cese del empleado.
      const fechaCeseExport = esReingresante
        ? (ultimoCeseVinculo?.fecha_fin ?? null)
        : emp.fecha_cese;

      const row = sheet.addRow({
        id: emp.id,
        estado_persona: estadoPersonaComputado,
        tipo_documento: emp.tipo_documento,
        numero_documento: emp.numero_documento,
        apellido_paterno: emp.apellido_paterno,
        apellido_materno: emp.apellido_materno,
        nombre_completo: emp.nombres,
        apellidos_y_nombres: `${emp.apellido_paterno} ${emp.apellido_materno} ${emp.nombres}`,
        area: emp.area?.nombre || '',
        sede: emp.sede?.nombre || '',
        cargo: emp.cargo?.nombre || '',
        fecha_nacimiento: formatFecha(emp.fecha_nacimiento),
        edad: calcularEdadLocal(emp.fecha_nacimiento),
        sexo: emp.sexo,
        telefono: emp.telefono || '',
        celular: emp.celular || '',
        email: emp.email || '',
        direccion: emp.direccion || '',
        departamento: emp.distrito?.provincia?.departamento?.nombre || '',
        provincia: emp.distrito?.provincia?.nombre || '',
        distrito: emp.distrito?.nombre || '',
        fecha_ingreso: formatFecha(emp.fecha_ingreso),
        fecha_planilla: formatFecha(emp.fecha_planilla),
        fecha_cese: formatFecha(fechaCeseExport),
        fecha_inicio_contrato:
          emp.estado === 'CESADO'
            ? ''
            : emp.contratos?.[0]?.fecha_inicio
              ? formatFecha(emp.contratos[0].fecha_inicio)
              : '',
        fecha_fin_contrato:
          emp.estado === 'CESADO'
            ? ''
            : emp.contratos?.[0]?.fecha_fin
              ? formatFecha(emp.contratos[0].fecha_fin)
              : '',
        dias_restantes:
          emp.estado === 'CESADO'
            ? '-'
            : emp.contratos?.[0]?.fecha_fin
              ? calcularDiasRestantes(emp.contratos[0].fecha_fin)
              : null,
        tipo_cese: emp.solicitudes_cese?.[0]?.tipo_cese?.nombre || '',
        sueldo_basico: sueldoBase,
        sueldo_neto: sueldoBase, // Se podría calcular con descuentos
        recibe_neto: 'NO',
        tipo_pago: emp.tipo_pago,
        turno: emp.turno,
        asignacion_familiar: emp.asignacion_familiar ? 'SI' : 'NO',
        sctr: emp.sctr ? 'SI' : 'NO',
        comision: regimen?.tipo || 'NO',
        bono_productividad: Number(emp.bono_productividad) || 0,
        bono_desempeno: Number(emp.bono_desempeno) || 0,
        bono_movilidad: Number(emp.bono_movilidad) || 0,
        situacion: emp.estado === 'ACTIVO' ? 'OPERATIVO' : emp.estado,
        celular_empresa: emp.celular_asignado || '',
        monto_adelanto: Number(emp.monto_adelanto) || 0,
        regimen_pensionario: regimen
          ? `${regimen.nombre} - ${regimen.tipo || 'FLUJO'}`
          : 'NO DEFINIDO',
        cuspp: emp.cuspp || '',
        aporte_obligatorio: regimen
          ? Number(regimen.aporte_obligatorio) || 0.1
          : 0,
        comision_rp: regimen ? Number(regimen.comision_flujo) || 0 : 0,
        prima_seguro: regimen ? Number(regimen.prima_seguro) || 0.0137 : 0,
        banco_haberes: emp.banco_haberes?.nombre || 'NO DEFINIDO',
        nro_cuenta_haberes: emp.nro_cuenta_haberes || '',
        cci_haberes: emp.cci_haberes || '',
        banco_cts: emp.banco_cts?.nombre || 'NO DEFINIDO',
        nro_cuenta_cts: emp.nro_cuenta_cts || '',
        cci_cts: emp.cci_cts || '',
        observaciones_baja: emp.movimientos?.[0]?.observaciones || '',
      });

      row.height = 18;

      // Color según estado
      if (emp.estado === 'CESADO') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFCE4D6' },
        };
      } else if (emp.estado === 'PENDIENTE') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF2CC' },
        };
      }
    });

    // Bordes para toda la tabla
    const lastRow = sheet.rowCount;
    const lastCol = 50;

    for (let r = 1; r <= lastRow; r++) {
      for (let c = 1; c <= lastCol; c++) {
        const cell = sheet.getCell(r, c);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    }

    // Congelar header
    sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

    return workbook;
  }

  // ============================================================================
  // EXPEDIENTE DIGITAL
  // ============================================================================

  /**
   * Obtiene el expediente digital unificado de un empleado
   * Combina: Documentos subidos + Documentos generados + Boletas
   */
  async getExpedienteDigital(
    empleadoId: number,
    empresaId: number,
    filters?: {
      categoria?: string;
      origen?: string;
      anio?: number;
      buscar?: string;
    },
  ) {
    // Verificar que el empleado existe
    const empleado = await this.prisma.empleado.findFirst({
      where: { id: empleadoId, empresa_id: empresaId },
      include: {
        cargo: { select: { nombre: true } },
        area: { select: { nombre: true } },
      },
    });

    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const hoy = ahoraPeru().toJSDate();
    const en30Dias = sumarDiasPeru(hoy, 30);

    // Obtener todas las fuentes de documentos en paralelo
    const [documentosSubidos, documentosGenerados, boletas] = await Promise.all(
      [
        // 1. Documentos subidos manualmente (solo vigentes y no eliminados)
        this.prisma.empleadoDocumento.findMany({
          where: {
            empleado_id: empleadoId,
            es_version_vigente: true,
            eliminado: false,
          },
          include: {
            tipo_documento_empleado: {
              select: { codigo: true, nombre: true },
            },
          },
          orderBy: { fecha_carga: 'desc' },
        }),

        // 2. Documentos generados desde plantillas
        this.prisma.documentoGenerado.findMany({
          where: { empleado_id: empleadoId },
          include: {
            plantilla_documento: {
              select: { codigo: true, nombre: true, categoria: true },
            },
          },
          orderBy: { fecha_generacion: 'desc' },
        }),

        // 3. Boletas de pago
        this.prisma.boleta.findMany({
          where: { empleado_id: empleadoId },
          orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
        }),
      ],
    );

    // Mapear categorías de tipo de documento a categorías del expediente
    const mapearCategoriaSubido = (codigo: string | undefined): string => {
      if (!codigo) return 'OTRO';
      const codigoUpper = codigo.toUpperCase();
      if (
        ['DNI', 'PASAPORTE', 'CARNET', 'CE'].some((c) =>
          codigoUpper.includes(c),
        )
      )
        return 'IDENTIDAD';
      if (
        ['CV', 'TITULO', 'CERTIFICADO', 'DIPLOMA'].some((c) =>
          codigoUpper.includes(c),
        )
      )
        return 'FORMACION';
      if (['CONTRATO', 'ADENDA', 'MEMO'].some((c) => codigoUpper.includes(c)))
        return 'LABORAL';
      if (['MEDICO', 'SALUD', 'EMO'].some((c) => codigoUpper.includes(c)))
        return 'MEDICO';
      if (
        ['ANTECEDENTE', 'DDJJ', 'DECLARACION'].some((c) =>
          codigoUpper.includes(c),
        )
      )
        return 'LEGAL';
      return 'OTRO';
    };

    // Mapear categoría de plantilla a categoría del expediente
    const mapearCategoriaGenerado = (categoria: string | undefined): string => {
      if (!categoria) return 'LABORAL';
      if (categoria === 'INGRESO') return 'LABORAL';
      if (categoria === 'LABORAL') return 'LABORAL';
      if (categoria === 'SALIDA') return 'LABORAL';
      return 'LABORAL';
    };

    // Determinar estado del documento
    const determinarEstado = (
      fechaVencimiento: Date | null,
      firmado?: boolean,
      estadoDoc?: string,
    ): string => {
      if (estadoDoc === 'PENDIENTE') return 'PENDIENTE_FIRMA';
      if (firmado || estadoDoc === 'FIRMADO') return 'FIRMADO';
      if (!fechaVencimiento) return 'SIN_VENCIMIENTO';
      const fechaVenc = new Date(fechaVencimiento);
      if (fechaVenc < hoy) return 'PENDIENTE';
      if (fechaVenc <= en30Dias) return 'POR_VENCER';
      return 'ACTIVO';
    };

    // Nombres de meses en español
    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    // Transformar documentos subidos
    const docsSubidos = documentosSubidos.map((doc) => ({
      id: `DOC_${doc.id}`,
      tipo: doc.tipo_documento_empleado?.nombre || 'Documento',
      categoria: mapearCategoriaSubido(doc.tipo_documento_empleado?.codigo),
      origen:
        doc.origen === 'SELECCION'
          ? OrigenDocumento.SELECCION
          : OrigenDocumento.SUBIDO,
      descripcion: doc.descripcion,
      archivo_url: doc.archivo_url
        ? this.uploadsService.getFileUrl(doc.archivo_url)
        : null,
      archivo_nombre: doc.archivo_nombre,
      fecha_documento: doc.fecha_emision || doc.fecha_carga,
      fecha_vencimiento: doc.fecha_vencimiento,
      estado: determinarEstado(doc.fecha_vencimiento),
      metadata: {
        tipo_documento_id: doc.tipo_documento_empleado_id,
      },
    }));

    // Transformar documentos generados
    const docsGenerados = documentosGenerados.map((doc) => ({
      id: `GEN_${doc.id}`,
      tipo: doc.plantilla_documento?.nombre || 'Documento Generado',
      categoria: mapearCategoriaGenerado(doc.plantilla_documento?.categoria),
      origen: 'GENERADO',
      descripcion: doc.observaciones,
      archivo_url:
        doc.archivo_firmado_url || doc.archivo_url
          ? this.uploadsService.getFileUrl(
              doc.archivo_firmado_url || doc.archivo_url,
            )
          : null,
      archivo_nombre: `${doc.plantilla_documento?.codigo || 'DOC'}_${empleado.numero_documento}.pdf`,
      fecha_documento: doc.fecha_generacion,
      fecha_vencimiento: null,
      estado: determinarEstado(null, !!doc.archivo_firmado_url, doc.estado),
      metadata: {
        plantilla: doc.plantilla_documento?.nombre,
        plantilla_categoria: doc.plantilla_documento?.categoria,
        firmado: !!doc.archivo_firmado_url,
        fecha_firma: doc.fecha_firma,
      },
    }));

    // Transformar boletas
    const docsBoletas = boletas.map((bol) => ({
      id: `BOL_${bol.id}`,
      tipo: 'Boleta de Pago',
      categoria: 'FINANCIERO',
      origen: 'BOLETA',
      descripcion: `Boleta ${meses[bol.mes - 1]} ${bol.anio}`,
      archivo_url: bol.pdf_url
        ? this.uploadsService.getFileUrl(bol.pdf_url)
        : null,
      archivo_nombre: `Boleta_${bol.anio}_${String(bol.mes).padStart(2, '0')}.pdf`,
      fecha_documento: bol.fecha_generacion,
      fecha_vencimiento: null,
      estado: 'SIN_VENCIMIENTO',
      metadata: {
        periodo: `${meses[bol.mes - 1]} ${bol.anio}`,
        anio: bol.anio,
        mes: bol.mes,
        veces_descargada: bol.veces_descargada,
        estado_boleta: bol.estado,
      },
    }));

    // Combinar todos los documentos
    let todosDocumentos = [...docsSubidos, ...docsGenerados, ...docsBoletas];

    // Aplicar filtros
    if (filters?.categoria) {
      todosDocumentos = todosDocumentos.filter(
        (d) => d.categoria === filters.categoria,
      );
    }
    if (filters?.origen) {
      todosDocumentos = todosDocumentos.filter(
        (d) => d.origen === filters.origen,
      );
    }
    if (filters?.anio) {
      todosDocumentos = todosDocumentos.filter((d) => {
        const metadata = d.metadata as Record<string, unknown>;
        if (d.origen === 'BOLETA' && metadata.anio) {
          return metadata.anio === filters.anio;
        }
        if (d.fecha_documento) {
          return leerFechaPrisma(d.fecha_documento).year === filters.anio;
        }
        return false;
      });
    }
    if (filters?.buscar) {
      const buscarLower = filters.buscar.toLowerCase();
      todosDocumentos = todosDocumentos.filter(
        (d) =>
          d.tipo.toLowerCase().includes(buscarLower) ||
          d.descripcion?.toLowerCase().includes(buscarLower) ||
          d.archivo_nombre?.toLowerCase().includes(buscarLower),
      );
    }

    // Ordenar por fecha más reciente
    todosDocumentos.sort((a, b) => {
      const fechaA = a.fecha_documento
        ? new Date(a.fecha_documento).getTime()
        : 0;
      const fechaB = b.fecha_documento
        ? new Date(b.fecha_documento).getTime()
        : 0;
      return fechaB - fechaA;
    });

    // Calcular resumen
    const porCategoria: Record<string, number> = {
      IDENTIDAD: 0,
      FORMACION: 0,
      LABORAL: 0,
      FINANCIERO: 0,
      MEDICO: 0,
      LEGAL: 0,
      OTRO: 0,
    };
    const porOrigen: Record<string, number> = {
      SUBIDO: 0,
      GENERADO: 0,
      BOLETA: 0,
      SELECCION: 0,
    };

    todosDocumentos.forEach((doc) => {
      porCategoria[doc.categoria] = (porCategoria[doc.categoria] || 0) + 1;
      porOrigen[doc.origen] = (porOrigen[doc.origen] || 0) + 1;
    });

    const vencidos = todosDocumentos.filter(
      (d) => d.estado === 'PENDIENTE',
    ).length;
    const porVencer = todosDocumentos.filter(
      (d) => d.estado === 'POR_VENCER',
    ).length;
    const ultimoDocumento =
      todosDocumentos.length > 0 ? todosDocumentos[0].fecha_documento : null;

    return {
      empleado: {
        id: empleado.id,
        numero_documento: empleado.numero_documento,
        nombre_completo: `${empleado.nombres} ${empleado.apellido_paterno} ${empleado.apellido_materno}`,
        cargo: empleado.cargo?.nombre || null,
        area: empleado.area?.nombre || null,
        fecha_ingreso: empleado.fecha_ingreso,
        estado: empleado.estado,
      },
      resumen: {
        total_documentos: todosDocumentos.length,
        por_categoria: porCategoria,
        por_origen: porOrigen,
        documentos_vencidos: vencidos,
        documentos_por_vencer: porVencer,
        ultimo_documento: ultimoDocumento,
      },
      documentos: todosDocumentos,
    };
  }

  /**
   * Obtiene las URLs de todos los documentos para descarga masiva
   */
  async getDocumentosParaDescarga(empleadoId: number, empresaId: number) {
    const expediente = await this.getExpedienteDigital(empleadoId, empresaId);

    // Filtrar solo documentos con archivo disponible
    const documentosConArchivo = expediente.documentos.filter(
      (doc) => doc.archivo_url !== null,
    );

    return {
      empleado: expediente.empleado,
      total_archivos: documentosConArchivo.length,
      archivos: documentosConArchivo.map((doc) => ({
        id: doc.id,
        nombre: doc.archivo_nombre || `${doc.tipo}.pdf`,
        url: doc.archivo_url,
        categoria: doc.categoria,
        origen: doc.origen,
      })),
    };
  }
}
