import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BUSINESS_RULES,
  BUSINESS_ERROR_MESSAGES,
  calcularEdad,
  validarEdadMinima,
  validarSueldoMinimo,
} from '../../common/constants/business-rules';
import { OnboardingService } from '../onboarding/onboarding.service';
import { ConvertirEmpleadoDto } from './dto';
import { Prisma } from '@prisma/client';
import {
  parsearFechaISOenPeru,
  leerFechaPrisma,
} from '../../common/utils/datetime.util';

/**
 * Postulante tal como lo retorna PostulantesService.findOne: incluye la vacante
 * con sus campos de área/cargo/sede para resolver los valores por defecto en la
 * conversión a empleado.
 */
type PostulanteConVacante = Prisma.PostulanteGetPayload<{
  include: {
    vacante: {
      select: {
        id: true;
        codigo: true;
        titulo: true;
        area_id: true;
        cargo_id: true;
        sede_id: true;
        requisitos: true;
      };
    };
  };
}>;

@Injectable()
export class PostulanteConversionService {
  private readonly logger = new Logger(PostulanteConversionService.name);

  constructor(
    private prisma: PrismaService,
    private onboardingService: OnboardingService,
  ) {}

  async convertirAEmpleado(
    id: number,
    empresaId: number,
    usuarioId: number,
    dto: ConvertirEmpleadoDto,
    postulante: PostulanteConVacante,
  ) {
    // Validación: Edad mínima (18 años)
    if (postulante.fecha_nacimiento) {
      if (!validarEdadMinima(postulante.fecha_nacimiento)) {
        const edad = calcularEdad(
          leerFechaPrisma(postulante.fecha_nacimiento).toJSDate(),
        );
        throw new BadRequestException(
          `${BUSINESS_ERROR_MESSAGES.EDAD_MENOR_MINIMA}. Edad actual: ${edad} años.`,
        );
      }
    } else {
      throw new BadRequestException(
        'La fecha de nacimiento es obligatoria para convertir a empleado.',
      );
    }

    // Validación: Sexo obligatorio en empleado
    if (!postulante.sexo) {
      throw new BadRequestException(
        'El sexo es obligatorio para convertir a empleado. Complete este campo en la ficha del postulante.',
      );
    }

    // Validación: Sueldo mínimo legal
    const sueldoFinal = dto.sueldo_base || BUSINESS_RULES.SUELDO_DEFAULT;
    if (!validarSueldoMinimo(sueldoFinal)) {
      throw new BadRequestException(
        `${BUSINESS_ERROR_MESSAGES.SUELDO_MENOR_MINIMO}. Sueldo ingresado: S/. ${sueldoFinal}`,
      );
    }

    // Obtener tipos de documento obligatorios para establecer estado inicial
    const tiposObligatorios = await this.prisma.tipoDocumentoEmpleado.findMany({
      where: {
        empresa_id: empresaId,
        es_obligatorio: true,
        activo: true,
      },
      select: { nombre: true },
    });

    // Determinar estado inicial de documentación
    const estadoDocumentacion =
      tiposObligatorios.length > 0 ? 'PENDIENTE' : 'COMPLETO';

    // TRANSACCIÓN: Todas las validaciones críticas DENTRO para evitar race conditions
    const empleado = await this.prisma.$transaction(async (tx) => {
      // Re-verificar estado del postulante dentro de la transacción
      const postulanteActual = await tx.postulante.findUnique({
        where: { id },
        select: { estado: true, empleado_id: true, numero_documento: true },
      });

      if (!postulanteActual) {
        throw new NotFoundException('Postulante no encontrado');
      }

      if (postulanteActual.estado !== 'APROBADO') {
        throw new ConflictException(
          'Solo se pueden convertir postulantes con estado APROBADO',
        );
      }

      if (postulanteActual.empleado_id) {
        throw new ConflictException(
          'Este postulante ya fue convertido a empleado',
        );
      }

      // Validar que area_id, cargo_id y sede_id pertenezcan a la empresa
      const areaId = dto.area_id || postulante.vacante?.area_id;
      const cargoId = dto.cargo_id || postulante.vacante?.cargo_id;
      const sedeId = dto.sede_id || postulante.vacante?.sede_id;

      if (areaId) {
        const area = await tx.area.findFirst({
          where: { id: areaId, empresa_id: empresaId },
        });
        if (!area) {
          throw new BadRequestException(
            'El área seleccionada no pertenece a esta empresa',
          );
        }
      }

      if (cargoId) {
        const cargo = await tx.cargo.findFirst({
          where: { id: cargoId, empresa_id: empresaId },
        });
        if (!cargo) {
          throw new BadRequestException(
            'El cargo seleccionado no pertenece a esta empresa',
          );
        }
      }

      if (sedeId) {
        const sede = await tx.sede.findFirst({
          where: { id: sedeId, empresa_id: empresaId },
        });
        if (!sede) {
          throw new BadRequestException(
            'La sede seleccionada no pertenece a esta empresa',
          );
        }
      }

      // Validar DNI duplicado global dentro de transacción
      const empleadoActivoGlobal = await tx.empleado.findFirst({
        where: {
          numero_documento: postulante.numero_documento,
          estado: 'ACTIVO',
        },
        include: { empresa: { select: { razon_social: true } } },
      });

      if (empleadoActivoGlobal) {
        throw new ConflictException(
          `${BUSINESS_ERROR_MESSAGES.DNI_DUPLICADO_GLOBAL}. El documento ${postulante.numero_documento} está activo en: ${empleadoActivoGlobal.empresa?.razon_social || 'otra empresa'}`,
        );
      }

      // Validar DNI duplicado en empresa dentro de transacción
      const empleadoExistenteEmpresa = await tx.empleado.findFirst({
        where: {
          numero_documento: postulante.numero_documento,
          empresa_id: empresaId,
        },
      });

      if (empleadoExistenteEmpresa) {
        throw new ConflictException(
          `${BUSINESS_ERROR_MESSAGES.DNI_DUPLICADO_EMPRESA}. Considere reactivar al empleado existente.`,
        );
      }
      const nuevoEmpleado = await tx.empleado.create({
        data: {
          // Datos personales del postulante
          tipo_documento: postulante.tipo_documento,
          numero_documento: postulante.numero_documento,
          apellido_paterno: postulante.apellido_paterno,
          apellido_materno: postulante.apellido_materno,
          nombres: postulante.nombres,
          fecha_nacimiento: postulante.fecha_nacimiento,
          sexo: postulante.sexo,
          estado_civil: postulante.estado_civil,
          nacionalidad: postulante.nacionalidad,
          celular: postulante.celular,
          telefono: postulante.telefono,
          email: postulante.email,
          foto_url: postulante.foto_url,
          // Dirección
          direccion: postulante.direccion,
          referencia: postulante.referencia,
          distrito_id: postulante.distrito_id,
          // Datos físicos
          estatura: postulante.estatura,
          peso: postulante.peso,
          categoria_licencia: postulante.categoria_licencia,
          // Datos del CV
          estudios: postulante.estudios as Prisma.InputJsonValue,
          experiencias: postulante.experiencias as Prisma.InputJsonValue,
          capacitaciones: postulante.capacitaciones as Prisma.InputJsonValue,
          fecha_ingreso: parsearFechaISOenPeru(dto.fecha_ingreso),
          area_id: areaId,
          cargo_id: cargoId,
          sede_id: sedeId,
          sueldo_base: sueldoFinal,
          tipo_pago: dto.tipo_pago || 'PLANILLA',
          turno: dto.turno || 'DIA',
          // Estado de documentación según documentos obligatorios configurados
          estado_documentacion: estadoDocumentacion,
          // Datos pensionarios
          regimen_pensionario_id: dto.regimen_pensionario_id,
          cuspp: dto.cuspp,
          // Beneficios
          asignacion_familiar: dto.asignacion_familiar || false,
          // Bonos y asignaciones
          bono_productividad: dto.bono_productividad,
          bono_desempeno: dto.bono_desempeno,
          bono_movilidad: dto.bono_movilidad,
          bono_refrigerio: dto.bono_refrigerio,
          bono_armado: dto.bono_armado,
          asignacion_cliente: dto.asignacion_cliente,
          // Beneficios adicionales
          sctr: dto.sctr || false,
          // Fecha planilla = fecha inicio del contrato
          fecha_planilla: parsearFechaISOenPeru(dto.fecha_inicio_contrato),
          // Datos bancarios - Haberes
          banco_haberes_id: dto.banco_haberes_id,
          nro_cuenta_haberes: dto.nro_cuenta_haberes,
          cci_haberes: dto.cci_haberes,
          // Datos bancarios - CTS
          banco_cts_id: dto.banco_cts_id,
          nro_cuenta_cts: dto.nro_cuenta_cts,
          cci_cts: dto.cci_cts,
          // Contacto corporativo
          celular_asignado: dto.celular_asignado,
          email_asignado: dto.email_asignado,
          empresa_id: empresaId,
        },
      });

      await tx.postulante.update({
        where: { id },
        data: { empleado_id: nuevoEmpleado.id },
      });

      await tx.empleadoMovimiento.create({
        data: {
          empleado_id: nuevoEmpleado.id,
          tipo_movimiento: 'ALTA',
          fecha_movimiento: parsearFechaISOenPeru(dto.fecha_ingreso),
          motivo: `Ingreso por proceso de seleccion - Vacante: ${postulante.vacante?.codigo}`,
          usuario_id: usuarioId,
        },
      });

      // Crear contrato con las fechas que el usuario definió
      await tx.contrato.create({
        data: {
          empleado_id: nuevoEmpleado.id,
          tipo_contrato: dto.tipo_contrato,
          modalidad: dto.modalidad_contrato,
          fecha_inicio: parsearFechaISOenPeru(dto.fecha_inicio_contrato),
          fecha_fin: parsearFechaISOenPeru(dto.fecha_fin_contrato),
          estado: 'ACTIVO',
          remuneracion: sueldoFinal,
          cliente_id: dto.cliente_id,
          lugar_trabajo: dto.lugar_trabajo,
          observaciones: `Contrato inicial por proceso de selección - Vacante: ${postulante.vacante?.codigo}`,
          usuario_id: usuarioId,
        },
      });

      // Migrate postulante documents to empleado with origen SELECCION
      // Solo transfiere versiones vigentes y no eliminadas
      const postulanteDocumentos = await tx.postulanteDocumento.findMany({
        where: {
          postulante_id: id,
          es_version_vigente: true,
          eliminado: false,
        },
      });

      if (postulanteDocumentos.length > 0) {
        this.logger.log(
          `Transfiriendo ${postulanteDocumentos.length} documentos del postulante ${id} al empleado ${nuevoEmpleado.id}`,
        );

        await tx.empleadoDocumento.createMany({
          data: postulanteDocumentos.map((doc) => ({
            empleado_id: nuevoEmpleado.id,
            descripcion: doc.descripcion,
            tipo_documento_empleado_id: doc.tipo_documento_empleado_id,
            archivo_url: doc.archivo_url,
            archivo_nombre: doc.archivo_nombre,
            fecha_carga: doc.fecha_carga,
            fecha_emision: doc.fecha_emision,
            fecha_vencimiento: doc.fecha_vencimiento,
            origen: 'SELECCION' as const,
            subido_por_id: doc.subido_por_id,
          })),
        });
      }

      const vacante = await tx.vacante.findUnique({
        where: { id: postulante.vacante_id },
        include: {
          postulantes: { where: { empleado_id: { not: null } } },
        },
      });

      if (vacante && vacante.postulantes.length >= vacante.cantidad_puestos) {
        await tx.vacante.update({
          where: { id: vacante.id },
          data: { estado: 'CERRADA' },
        });
      }

      return nuevoEmpleado;
    });

    // Después de la transacción, iniciar onboarding si se solicitó
    if (dto.iniciar_onboarding) {
      try {
        let plantillaId = dto.plantilla_onboarding_id;

        // Si no se especifica plantilla, buscar una sugerida
        if (!plantillaId) {
          const sugerida =
            await this.onboardingService.buscarPlantillaParaEmpleado(
              empleado.id,
              empresaId,
            );
          plantillaId = sugerida?.id;
        }

        if (plantillaId) {
          await this.onboardingService.iniciarOnboarding(
            empleado.id,
            empresaId,
            {
              plantilla_id: plantillaId,
              responsable_rrhh_id: usuarioId,
              mentor_id: dto.mentor_id,
              observaciones: `Onboarding iniciado automáticamente desde conversión de postulante - Vacante: ${postulante.vacante?.codigo}`,
            },
            usuarioId,
          );
        }
      } catch {
        // Si falla el onboarding, no afectar la conversión del empleado
        // El onboarding se puede iniciar manualmente después
      }
    }

    return empleado;
  }
}
