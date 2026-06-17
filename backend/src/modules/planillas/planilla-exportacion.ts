import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ahoraPeru } from '../../common/utils/datetime.util';

// Exportar a Excel (datos para el frontend)
export async function exportarPlanilla(
  prisma: PrismaService,
  id: number,
  empresaId: number,
) {
  // Obtener planilla con datos completos - optimizado con select específicos
  const planilla = await prisma.planilla.findFirst({
    where: { id, empresa_id: empresaId },
    select: {
      id: true,
      mes: true,
      anio: true,
      estado: true,
      total_empleados: true,
      total_bruto: true,
      total_descuentos: true,
      total_neto: true,
      periodo_tareo: {
        select: { id: true, mes: true, anio: true },
      },
      detalles: {
        select: {
          // Campos de días
          total_dias: true,
          dias_cesado_no_lab: true,
          dias_nuevo_no_lab: true,
          dias_sin_cobertura: true,
          dias_falta: true,
          dias_suspension: true,
          dias_vacaciones: true,
          dias_subsidio_incapacidad: true,
          dias_subsidio_maternidad: true,
          dias_descanso_medico: true,
          dias_licencia_sin_goce: true,
          dias_licencia_fallecimiento: true,
          dias_licencia_paternidad: true,
          dias_licencia_con_goce: true,
          dias_trabajados: true,
          turno_dia: true,
          turno_noche: true,
          // Estructura salarial
          rem_basica: true,
          sueldo_base: true,
          bono_productividad_base: true,
          bono_desempeno_base: true,
          bono_movilidad_base: true,
          bono_refrigerio_base: true,
          asig_fam_cliente_base: true,
          bono_armado_base: true,
          he_25_estructura: true,
          he_35_estructura: true,
          bonif_nocturna_base: true,
          vac_base: true,
          grat_base: true,
          cts_base: true,
          total_sueldo_estructura: true,
          horas_8: true,
          cantidad_feriados: true,
          // Ingresos afectos
          haber_mensual: true,
          sueldo_nocturno: true,
          pasaje_especial: true,
          horas_extras_25: true,
          horas_extras_35: true,
          feriado_trabajado: true,
          descanso_medico_monto: true,
          subsidio_incapacidad: true,
          subsidio_maternidad: true,
          asignacion_familiar: true,
          licencia_goce_monto: true,
          total_ingresos_afectos: true,
          // Ingresos no afectos
          remuneracion_vacacional: true,
          compensacion_vacacional: true,
          cts_monto: true,
          gratificacion_monto: true,
          movilidad: true,
          refrigerio: true,
          bono_desempeno_monto: true,
          asignacion_cliente: true,
          pegada_reenganche: true,
          bono_productividad_monto: true,
          bono_armado_monto: true,
          bono_referido: true,
          reintegro_dias_trab: true,
          reintegro_inafecto: true,
          ingreso_sobregiro: true,
          venta_vacaciones: true,
          total_ingresos_no_afectos: true,
          // Descuentos
          afp_aporte: true,
          afp_prima: true,
          afp_comision: true,
          onp: true,
          adelanto_quincena: true,
          adelanto_vacacional: true,
          otros_adelantos: true,
          adelanto_cts: true,
          adelanto_gratificacion: true,
          otros_descuentos: true,
          descuento_faltas: true,
          descuento_permisos: true,
          descuento_tardanzas: true,
          descuento_sobregiro: true,
          descuento_reintegro: true,
          prestamo: true,
          retencion_judicial: true,
          renta_5ta: true,
          // Totales
          total_ingresos: true,
          total_descuentos: true,
          total_descuentos_ley: true,
          total_descuentos_otros: true,
          remuneracion_afecta: true,
          neto_pagar: true,
          neto_mes: true,
          total_haberes: true,
          // Aportes empleador
          essalud_empleador: true,
          sctr_salud_empleador: true,
          sctr_pension_empleador: true,
          vida_ley_empleador: true,
          total_aportes_empleador: true,
          // Remuneración computable
          rem_computable_vacaciones: true,
          rem_computable_gratificacion: true,
          rem_computable_cts: true,
          rem_computable_afp: true,
          sexto_gratificacion: true,
          bonif_extraordinaria: true,
          treintavo_diario: true,
          // Datos bancarios de respaldo
          banco_nombre: true,
          cuenta_numero: true,
          cci: true,
          // Observaciones
          observaciones: true,
          // Empleado con solo campos necesarios
          empleado: {
            select: {
              estado: true,
              numero_documento: true,
              apellido_paterno: true,
              apellido_materno: true,
              nombres: true,
              fecha_ingreso: true,
              fecha_cese: true,
              cuspp: true,
              nro_cuenta_haberes: true,
              cci_haberes: true,
              fecha_nacimiento: true,
              cargo: {
                select: { nombre: true },
              },
              sede: {
                select: {
                  nombre: true,
                  cliente: {
                    select: { razon_social: true, nombre_comercial: true },
                  },
                },
              },
              regimen_pensionario: {
                select: { tipo: true, nombre: true },
              },
              banco_haberes: {
                select: { nombre: true },
              },
            },
          },
        },
        orderBy: {
          empleado: { apellido_paterno: 'asc' },
        },
      },
    },
  });

  if (!planilla) {
    throw new NotFoundException('Planilla no encontrada');
  }

  // Helper para obtener número seguro
  const num = (val: Prisma.Decimal | number | null | undefined): number =>
    Number(val) || 0;

  return {
    cabecera: {
      periodo: `${planilla.mes}/${planilla.anio}`,
      anio: planilla.anio,
      mes: planilla.mes,
      fecha_proceso: ahoraPeru().toJSDate(),
      estado: planilla.estado,
      total_empleados: planilla.total_empleados,
      total_bruto: planilla.total_bruto,
      total_descuentos: planilla.total_descuentos,
      total_neto: planilla.total_neto,
    },
    detalles: planilla.detalles.map((d, index) => {
      const emp = d.empleado;

      return {
        numero: index + 1,
        situacion: emp.estado === 'ACTIVO' ? 'OPERATIVO' : emp.estado,
        documento: emp.numero_documento,
        nombres_apellidos: `${emp.apellido_paterno} ${emp.apellido_materno} ${emp.nombres}`,
        cliente:
          emp.sede?.cliente?.razon_social ||
          emp.sede?.cliente?.nombre_comercial ||
          '',
        sede: emp.sede?.nombre || '',
        cargo: emp.cargo?.nombre || '',
        tipo_agente: 'TITULAR',
        fecha_ingreso: emp.fecha_ingreso,
        fecha_cese: emp.fecha_cese,
        sistema_pensionario: emp.regimen_pensionario?.tipo || '',
        nombre_sistema_pensionario: emp.regimen_pensionario?.nombre || '',
        cuspp: emp.cuspp || '',

        // =============================================
        // DÍAS DEL PERÍODO (desde PlanillaDetalle)
        // =============================================
        total_dias: num(d.total_dias),
        dias_cesado_no_lab: num(d.dias_cesado_no_lab),
        dias_nuevo_no_lab: num(d.dias_nuevo_no_lab),
        sin_cobertura: num(d.dias_sin_cobertura),
        faltas: num(d.dias_falta),
        suspension: num(d.dias_suspension),
        dias_vacaciones: num(d.dias_vacaciones),
        subsidio_incapacidad_dias: num(d.dias_subsidio_incapacidad),
        subsidio_maternidad_dias: num(d.dias_subsidio_maternidad),
        descanso_medico_dias: num(d.dias_descanso_medico),
        licencia_sin_goce: num(d.dias_licencia_sin_goce),
        licencia_fallecimiento: num(d.dias_licencia_fallecimiento),
        licencia_paternidad: num(d.dias_licencia_paternidad),
        licencia_con_goce: num(d.dias_licencia_con_goce),
        dias_trabajados: num(d.dias_trabajados),
        turno_dia: num(d.turno_dia),
        turno_noche: num(d.turno_noche),

        // =============================================
        // ESTRUCTURA SALARIAL (bases)
        // =============================================
        rem_basica: num(d.rem_basica),
        sueldo_base: num(d.sueldo_base),
        bono_productividad_base: num(d.bono_productividad_base),
        bono_productividad: num(d.bono_productividad_base), // Alias para frontend
        bono_desempeno_base: num(d.bono_desempeno_base),
        bono_desempeno: num(d.bono_desempeno_base), // Alias para frontend
        bono_movilidad_base: num(d.bono_movilidad_base),
        bono_movilidad: num(d.bono_movilidad_base), // Alias para frontend
        bono_refrigerio_base: num(d.bono_refrigerio_base),
        bono_refrigerio: num(d.bono_refrigerio_base), // Alias para frontend
        asig_fam_cliente_base: num(d.asig_fam_cliente_base),
        bono_armado_base: num(d.bono_armado_base),
        bono_armado: num(d.bono_armado_base), // Alias para frontend
        he_25_estructura: num(d.he_25_estructura),
        he_25: num(d.he_25_estructura), // Alias para frontend
        he_35_estructura: num(d.he_35_estructura),
        he_35: num(d.he_35_estructura), // Alias para frontend
        bonif_nocturna_base: num(d.bonif_nocturna_base),
        bonif_nocturna: num(d.bonif_nocturna_base), // Alias para frontend
        vac_base: num(d.vac_base),
        vac: num(d.vac_base), // Alias para frontend
        grat_base: num(d.grat_base),
        grat: num(d.grat_base), // Alias para frontend
        cts_base: num(d.cts_base),
        cts: num(d.cts_base), // Alias para frontend
        total_sueldo_estructura: num(d.total_sueldo_estructura),
        total_sueldo: num(d.total_sueldo_estructura), // Alias para frontend
        horas_8: num(d.horas_8),
        cantidad_feriados: num(d.cantidad_feriados),
        cant_feriados: num(d.cantidad_feriados), // Alias para frontend

        // =============================================
        // INGRESOS AFECTOS
        // =============================================
        haber_mensual: num(d.haber_mensual),
        sueldo_nocturno: num(d.sueldo_nocturno),
        pasaje_especial: num(d.pasaje_especial),
        horas_extras_25: num(d.horas_extras_25),
        he_25_monto: num(d.horas_extras_25), // Alias para frontend
        horas_extras_35: num(d.horas_extras_35),
        he_35_monto: num(d.horas_extras_35), // Alias para frontend
        feriado_trabajado: num(d.feriado_trabajado),
        descanso_medico_monto: num(d.descanso_medico_monto),
        descanso_medico: num(d.dias_descanso_medico), // Días para frontend
        subsidio_incapacidad_monto: num(d.subsidio_incapacidad),
        subsidio_incapacidad: num(d.dias_subsidio_incapacidad), // Días para frontend
        subsidio_maternidad_monto: num(d.subsidio_maternidad),
        subsidio_maternidad: num(d.dias_subsidio_maternidad), // Días para frontend
        asignacion_familiar: num(d.asignacion_familiar),
        asig_familiar_monto: num(d.asignacion_familiar), // Alias para frontend
        licencia_goce_monto: num(d.licencia_goce_monto),
        total_ingresos_afectos: num(d.total_ingresos_afectos),

        // =============================================
        // INGRESOS NO AFECTOS
        // =============================================
        remuneracion_vacacional: num(d.remuneracion_vacacional),
        remun_vacacional: num(d.remuneracion_vacacional), // Alias para frontend
        compensacion_vacacional: num(d.compensacion_vacacional),
        compen_vacacional: num(d.compensacion_vacacional), // Alias para frontend
        cts_monto: num(d.cts_monto),
        gratificacion_monto: num(d.gratificacion_monto),
        movilidad: num(d.movilidad),
        movilidad_monto: num(d.movilidad), // Alias para frontend
        refrigerio: num(d.refrigerio),
        refrigerio_monto: num(d.refrigerio), // Alias para frontend
        bono_desempeno_monto: num(d.bono_desempeno_monto),
        asignacion_cliente: num(d.asignacion_cliente),
        asig_cliente_monto: num(d.asignacion_cliente), // Alias para frontend
        pegada_reenganche: num(d.pegada_reenganche),
        bono_productividad_monto: num(d.bono_productividad_monto),
        bono_armado_monto: num(d.bono_armado_monto),
        bono_referido: num(d.bono_referido),
        reintegro_dias_trab: num(d.reintegro_dias_trab),
        reintegro_inafecto: num(d.reintegro_inafecto),
        ingreso_sobregiro: num(d.ingreso_sobregiro),
        venta_vacaciones: num(d.venta_vacaciones),
        total_ingresos_no_afectos: num(d.total_ingresos_no_afectos),

        // =============================================
        // DESCUENTOS
        // =============================================
        afp_aporte: num(d.afp_aporte),
        afp_prima: num(d.afp_prima),
        afp_comision: num(d.afp_comision),
        onp: num(d.onp),
        snp_onp: num(d.onp), // Alias para frontend
        adelanto_quincena: num(d.adelanto_quincena),
        adelanto_vacacional: num(d.adelanto_vacacional),
        otros_adelantos: num(d.otros_adelantos),
        adelanto_cts: num(d.adelanto_cts),
        adelanto_gratificacion: num(d.adelanto_gratificacion),
        otros_descuentos: num(d.otros_descuentos),
        descuento_faltas: num(d.descuento_faltas),
        faltas_monto: num(d.descuento_faltas), // Alias para frontend
        descuento_permisos: num(d.descuento_permisos),
        permisos_monto: num(d.descuento_permisos), // Alias para frontend
        descuento_tardanzas: num(d.descuento_tardanzas),
        tardanzas_monto: num(d.descuento_tardanzas), // Alias para frontend
        descuento_sobregiro: num(d.descuento_sobregiro),
        dcts_sobregiro: num(d.descuento_sobregiro), // Alias para frontend
        descuento_reintegro: num(d.descuento_reintegro),
        dcts_reintegro: num(d.descuento_reintegro), // Alias para frontend
        prestamo: num(d.prestamo),
        retencion_judicial: num(d.retencion_judicial),
        renta_5ta: num(d.renta_5ta),

        // =============================================
        // TOTALES
        // =============================================
        total_ingresos: num(d.total_ingresos),
        total_descuentos: num(d.total_descuentos),
        total_descuentos_ley: num(d.total_descuentos_ley),
        total_descuentos_otros: num(d.total_descuentos_otros),
        remuneracion_afecta: num(d.remuneracion_afecta),
        rem_afecta: num(d.remuneracion_afecta), // Alias para frontend
        total_rem_computable: num(d.rem_computable_afp), // Alias para frontend
        neto_pagar: num(d.neto_pagar),
        neto_mes: num(d.neto_mes),
        total_haberes: num(d.total_haberes),

        // =============================================
        // APORTES EMPLEADOR
        // =============================================
        essalud_empleador: num(d.essalud_empleador),
        essalud: num(d.essalud_empleador), // Alias para frontend
        sctr_salud_empleador: num(d.sctr_salud_empleador),
        sctr_pension_empleador: num(d.sctr_pension_empleador),
        vida_ley_empleador: num(d.vida_ley_empleador),
        total_aportes_empleador: num(d.total_aportes_empleador),

        // =============================================
        // REMUNERACIÓN COMPUTABLE
        // =============================================
        rem_computable_vacaciones: num(d.rem_computable_vacaciones),
        rem_computable_gratificacion: num(d.rem_computable_gratificacion),
        rem_computable_cts: num(d.rem_computable_cts),
        rem_computable_afp: num(d.rem_computable_afp),
        sexto_gratificacion: num(d.sexto_gratificacion),
        bonif_extraordinaria: num(d.bonif_extraordinaria),
        treintavo_diario: num(d.treintavo_diario),

        // =============================================
        // DATOS BANCARIOS
        // =============================================
        banco: emp.banco_haberes?.nombre || d.banco_nombre || '',
        cuenta: emp.nro_cuenta_haberes || d.cuenta_numero || '',
        cci: emp.cci_haberes || d.cci || '',

        // =============================================
        // DATOS ADICIONALES
        // =============================================
        edad: emp.fecha_nacimiento
          ? Math.floor(
              (ahoraPeru().toJSDate().getTime() -
                new Date(emp.fecha_nacimiento).getTime()) /
                (365.25 * 24 * 60 * 60 * 1000),
            )
          : null,
        tiene_vacaciones: num(d.dias_vacaciones) > 0 ? 'SÍ' : 'NO',
        tiene_asig_familiar: num(d.asignacion_familiar) > 0 ? 'SÍ' : 'NO',
        observaciones: d.observaciones || '',
      };
    }),
  };
}
