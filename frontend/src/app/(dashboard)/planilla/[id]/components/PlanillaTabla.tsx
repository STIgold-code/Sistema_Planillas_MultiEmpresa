'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil } from 'lucide-react';
import { Planilla, PlanillaDetalle } from '@/types';
import { formatDateSafe } from '@/lib/utils';
import { IndicadorTasasSBS } from '@/components/planilla/IndicadorTasasSBS';
import { RegimenBadge } from '@/components/RegimenBadge';

interface PlanillaTablaProps {
  planilla: Planilla;
  canEdit: boolean;
  getNombreCompleto: (empleado: PlanillaDetalle['empleado']) => string;
  onOpenEditModal: (detalle: PlanillaDetalle) => void;
}

export function PlanillaTabla({ planilla, canEdit, getNombreCompleto, onOpenEditModal }: PlanillaTablaProps) {
  const fmt = (val: number | string | null | undefined) => {
    const num = Number(val) || 0;
    return num === 0 ? '-' : num.toFixed(2);
  };
  const fmtInt = (val: number | string | null | undefined) => {
    const num = Number(val) || 0;
    return num === 0 ? '-' : String(num);
  };
  const fmtBold = (val: number | string | null | undefined) => {
    const num = Number(val) || 0;
    return num.toFixed(2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalle por Empleado</CardTitle>
        <CardDescription>
          {canEdit ? 'Puede editar bonificaciones, adelantos y otros conceptos variables' : 'Vista completa de la planilla con todos los conceptos'}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto relative max-h-[70vh] border rounded-md">
          <Table className="min-w-[7500px] text-xs">
            <TableHeader className="sticky top-0 z-40 bg-white shadow-sm">
              {/* Fila de grupos */}
              <TableRow className="border-b-0 bg-white">
                <TableHead colSpan={3} className="sticky left-0 z-50 bg-slate-200 min-w-[270px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]"></TableHead>
                <TableHead colSpan={12} className="text-center bg-slate-100 border-x text-[10px] font-semibold">DATOS EMPLEADO</TableHead>
                <TableHead colSpan={16} className="text-center bg-amber-100 border-r text-[10px] font-semibold text-amber-700">DÍAS DEL PERÍODO</TableHead>
                <TableHead colSpan={16} className="text-center bg-cyan-100 border-r text-[10px] font-semibold text-cyan-700">ESTRUCTURA SALARIAL</TableHead>
                <TableHead colSpan={28} className="text-center bg-green-100 border-r text-[10px] font-semibold text-green-700">INGRESOS</TableHead>
                <TableHead colSpan={17} className="text-center bg-red-100 border-r text-[10px] font-semibold text-red-700">DESCUENTOS</TableHead>
                <TableHead colSpan={2} className="text-center bg-blue-100 border-r text-[10px] font-semibold text-blue-700">APORTES EMP.</TableHead>
                <TableHead colSpan={6} className="text-center bg-indigo-100 border-r text-[10px] font-semibold text-indigo-700">RESULTADO</TableHead>
                <TableHead colSpan={4} className="text-center bg-purple-100 text-[10px] font-semibold text-purple-700">ADICIONALES</TableHead>
                {canEdit && <TableHead className="w-[50px] bg-slate-100"></TableHead>}
              </TableRow>
              {/* Fila de columnas */}
              <TableRow className="text-[10px] border-b-2 border-gray-300 bg-white">
                {/* N°, ID y Empleado - STICKY horizontal */}
                <TableHead className="sticky left-0 z-50 bg-slate-200 min-w-[35px] text-center border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">N°</TableHead>
                <TableHead className="sticky left-[35px] z-50 bg-slate-200 min-w-[55px] text-center border-r text-slate-700 font-semibold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">ID</TableHead>
                <TableHead className="sticky left-[90px] z-50 bg-slate-200 min-w-[180px] border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">Empleado</TableHead>
                {/* DATOS EMPLEADO */}
                <TableHead className="min-w-[110px] bg-slate-100">Régimen</TableHead>
                <TableHead className="min-w-[55px] bg-slate-100">Situac.</TableHead>
                <TableHead className="min-w-[75px] bg-slate-100">D.N.I.</TableHead>
                <TableHead className="min-w-[80px] bg-slate-100">Cliente</TableHead>
                <TableHead className="min-w-[70px] bg-slate-100">Sede</TableHead>
                <TableHead className="min-w-[80px] bg-slate-100">Cargo</TableHead>
                <TableHead className="min-w-[60px] bg-slate-100">T.Agente</TableHead>
                <TableHead className="min-w-[70px] bg-slate-100">F.Ingreso</TableHead>
                <TableHead className="min-w-[70px] bg-slate-100">F.Cese</TableHead>
                <TableHead className="min-w-[55px] bg-slate-100">Sist.Pens.</TableHead>
                <TableHead className="min-w-[80px] bg-slate-100">Nombre Pens.</TableHead>
                <TableHead className="min-w-[80px] bg-slate-100 border-r">CUSPP</TableHead>
                {/* DÍAS DEL PERÍODO */}
                <TableHead className="min-w-[45px] text-center bg-amber-100">Vta.Vac</TableHead>
                <TableHead className="min-w-[45px] text-center bg-amber-100">Tot.Días</TableHead>
                <TableHead className="min-w-[50px] text-center bg-amber-100">Ces.NoLab</TableHead>
                <TableHead className="min-w-[50px] text-center bg-amber-100">Nvo.NoLab</TableHead>
                <TableHead className="min-w-[45px] text-center bg-amber-100">Sin Cob.</TableHead>
                <TableHead className="min-w-[40px] text-center bg-amber-100">Faltas</TableHead>
                <TableHead className="min-w-[45px] text-center bg-amber-100">Susp.</TableHead>
                <TableHead className="min-w-[45px] text-center bg-amber-100">D.Vac</TableHead>
                <TableHead className="min-w-[45px] text-center bg-amber-100">Sub.Inc.</TableHead>
                <TableHead className="min-w-[45px] text-center bg-amber-100">Sub.Mat.</TableHead>
                <TableHead className="min-w-[45px] text-center bg-amber-100">D.Med.</TableHead>
                <TableHead className="min-w-[50px] text-center bg-amber-100">Lic.S/G</TableHead>
                <TableHead className="min-w-[45px] text-center bg-amber-100">Lic.Fall.</TableHead>
                <TableHead className="min-w-[45px] text-center bg-amber-100">Lic.Pat.</TableHead>
                <TableHead className="min-w-[45px] text-center bg-amber-100">Lic.C/G</TableHead>
                <TableHead className="min-w-[45px] text-center bg-amber-100 font-semibold border-r">D.Trab</TableHead>
                {/* ESTRUCTURA SALARIAL */}
                <TableHead className="min-w-[65px] text-right bg-cyan-100">Rem.Bas.</TableHead>
                <TableHead className="min-w-[60px] text-right bg-cyan-100">Bon.Prod.</TableHead>
                <TableHead className="min-w-[60px] text-right bg-cyan-100">Bon.Desp.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-cyan-100">Bon.Mov.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-cyan-100">Bon.Ref.</TableHead>
                <TableHead className="min-w-[60px] text-right bg-cyan-100">Asig.F/C</TableHead>
                <TableHead className="min-w-[45px] text-right bg-cyan-100">HE25</TableHead>
                <TableHead className="min-w-[45px] text-right bg-cyan-100">HE35</TableHead>
                <TableHead className="min-w-[55px] text-right bg-cyan-100">Bon.Noct.</TableHead>
                <TableHead className="min-w-[45px] text-right bg-cyan-100">VAC</TableHead>
                <TableHead className="min-w-[50px] text-right bg-cyan-100">GRAT</TableHead>
                <TableHead className="min-w-[50px] text-right bg-cyan-100">CTS</TableHead>
                <TableHead className="min-w-[55px] text-right bg-cyan-100">Bon.Arm.</TableHead>
                <TableHead className="min-w-[65px] text-right bg-cyan-100 font-semibold">Tot.Sueldo</TableHead>
                <TableHead className="min-w-[45px] text-center bg-cyan-100">T.Día</TableHead>
                <TableHead className="min-w-[50px] text-center bg-cyan-100 border-r">T.Noche</TableHead>
                {/* INGRESOS */}
                <TableHead className="min-w-[50px] text-right bg-green-100">8 Horas</TableHead>
                <TableHead className="min-w-[55px] text-right bg-green-100">S.Noct.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-green-100">Pas.Esp.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-green-100">H.E.25%</TableHead>
                <TableHead className="min-w-[55px] text-right bg-green-100">H.E.35%</TableHead>
                <TableHead className="min-w-[55px] text-right bg-green-100">Fer.Trab.</TableHead>
                <TableHead className="min-w-[60px] text-right bg-green-100">Hab.Mens.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-green-100">D.Med.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-green-100">Sub.Inc.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-green-100">Sub.Mat.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-green-100">Asig.Fam.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-green-100">Lic.Goce</TableHead>
                <TableHead className="min-w-[55px] text-right bg-green-100">Rem.Vac.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-green-100">Comp.Vac.</TableHead>
                <TableHead className="min-w-[50px] text-right bg-green-100">CTS</TableHead>
                <TableHead className="min-w-[50px] text-right bg-green-100">GRAT</TableHead>
                <TableHead className="min-w-[55px] text-right bg-green-100">Movilidad</TableHead>
                <TableHead className="min-w-[55px] text-right bg-green-100">Refrig.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-green-100">Bon.Desp.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-green-100">Asig.Cli.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-green-100">Peg/Reen.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-green-100">Bon.Prod.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-green-100">Bon.Arm.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-green-100">Bon.Ref.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-green-100">Reint.DT</TableHead>
                <TableHead className="min-w-[55px] text-right bg-green-100">Reint.Inaf.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-green-100">Ing.Sobr.</TableHead>
                <TableHead className="min-w-[65px] text-right bg-green-100 font-semibold border-r">Tot.Ing.</TableHead>
                {/* DESCUENTOS */}
                <TableHead className="min-w-[55px] text-right bg-red-100">Adel.Quin.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-red-100">Adel.Vac.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-red-100">AFP Aport.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-red-100">AFP Prima</TableHead>
                <TableHead className="min-w-[55px] text-right bg-red-100">AFP Com.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-red-100">Otr.Adel.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-red-100">Adel.CTS</TableHead>
                <TableHead className="min-w-[55px] text-right bg-red-100">Adel.Grat.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-red-100">Otr.Desc.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-red-100">SNP/ONP</TableHead>
                <TableHead className="min-w-[50px] text-right bg-red-100">Faltas</TableHead>
                <TableHead className="min-w-[55px] text-right bg-red-100">Dcts.Sobr.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-red-100">Dcts.Reint.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-red-100">Préstamo</TableHead>
                <TableHead className="min-w-[55px] text-right bg-red-100">Ret.Jud.</TableHead>
                <TableHead className="min-w-[55px] text-right bg-red-100">Renta 5ta</TableHead>
                <TableHead className="min-w-[65px] text-right bg-red-100 font-semibold border-r">Tot.Desc.</TableHead>
                {/* APORTES EMPLEADOR */}
                <TableHead className="min-w-[55px] text-right bg-blue-100">Essalud</TableHead>
                <TableHead className="min-w-[60px] text-right bg-blue-100 font-semibold border-r">Tot.Aport.</TableHead>
                {/* RESULTADO */}
                <TableHead className="min-w-[60px] text-right bg-indigo-100">Rem.Afec.</TableHead>
                <TableHead className="min-w-[60px] text-right bg-indigo-100">Tot.Rem.</TableHead>
                <TableHead className="min-w-[70px] text-right bg-indigo-100 font-bold">Tot.Pago</TableHead>
                <TableHead className="min-w-[70px] bg-indigo-100">Banco</TableHead>
                <TableHead className="min-w-[90px] bg-indigo-100">N° Cuenta</TableHead>
                <TableHead className="min-w-[100px] bg-indigo-100 border-r">N° CCI</TableHead>
                {/* ADICIONALES */}
                <TableHead className="min-w-[40px] text-center bg-purple-100">Edad</TableHead>
                <TableHead className="min-w-[35px] text-center bg-purple-100">VAC</TableHead>
                <TableHead className="min-w-[40px] text-center bg-purple-100">A.Fam</TableHead>
                <TableHead className="min-w-[45px] text-center bg-purple-100">Feriados</TableHead>
                {canEdit && <TableHead className="w-[50px] bg-slate-100"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {planilla.detalles?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={105} className="text-center py-8 text-muted-foreground">
                    {planilla.estado === 'BORRADOR'
                      ? 'Haga clic en "Calcular" para generar el detalle de la planilla'
                      : 'No hay empleados en esta planilla'}
                  </TableCell>
                </TableRow>
              ) : (
                planilla.detalles?.map((detalle, index) => (
                  <TableRow key={detalle.id} className="hover:bg-muted/50 text-[11px]">
                    {/* N°, ID y Empleado - STICKY horizontal */}
                    <TableCell className="sticky left-0 z-20 bg-slate-100 text-center font-mono border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{index + 1}</TableCell>
                    <TableCell className="sticky left-[35px] z-20 bg-slate-100 text-center font-mono text-sm text-slate-700 font-semibold border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{detalle.empleado_id}</TableCell>
                    <TableCell className="sticky left-[90px] z-20 bg-slate-100 font-medium border-r truncate max-w-[180px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" title={getNombreCompleto(detalle.empleado)}>
                      {getNombreCompleto(detalle.empleado)}
                    </TableCell>
                    {/* DATOS EMPLEADO */}
                    <TableCell className="bg-slate-100/30">
                      {detalle.regimen_laboral ? (
                        <RegimenBadge regimen={detalle.regimen_laboral} />
                      ) : (
                        <span className="text-muted-foreground" title="Sin régimen registrado">—</span>
                      )}
                    </TableCell>
                    <TableCell className="bg-slate-100/30">{detalle.empleado?.estado === 'ACTIVO' ? 'OPER.' : detalle.empleado?.estado || '-'}</TableCell>
                    <TableCell className="font-mono bg-slate-100/30">{detalle.empleado?.numero_documento}</TableCell>
                    <TableCell className="bg-slate-100/30 truncate max-w-[80px]" title={detalle.empleado?.sede?.cliente?.razon_social}>{detalle.empleado?.sede?.cliente?.razon_social || detalle.empleado?.sede?.cliente?.nombre_comercial || '-'}</TableCell>
                    <TableCell className="bg-slate-100/30 truncate max-w-[70px]" title={detalle.empleado?.sede?.nombre}>{detalle.empleado?.sede?.nombre || '-'}</TableCell>
                    <TableCell className="bg-slate-100/30 truncate max-w-[80px]" title={detalle.empleado?.cargo?.nombre}>{detalle.empleado?.cargo?.nombre || '-'}</TableCell>
                    <TableCell className="bg-slate-100/30">TITULAR</TableCell>
                    <TableCell className="bg-slate-100/30 text-[10px]">{formatDateSafe(detalle.empleado?.fecha_ingreso)}</TableCell>
                    <TableCell className="bg-slate-100/30 text-[10px]">{formatDateSafe(detalle.empleado?.fecha_cese)}</TableCell>
                    <TableCell className="bg-slate-100/30">{detalle.empleado?.regimen_pensionario?.tipo || '-'}</TableCell>
                    <TableCell className="bg-slate-100/30 truncate max-w-[80px]" title={detalle.empleado?.regimen_pensionario?.nombre}>{detalle.empleado?.regimen_pensionario?.nombre || '-'}</TableCell>
                    <TableCell className="bg-slate-100/30 border-r font-mono text-[9px]">{detalle.empleado?.cuspp || '-'}</TableCell>
                    {/* DÍAS DEL PERÍODO */}
                    <TableCell className="text-center bg-amber-100/20">{fmtInt(detalle.venta_vacaciones)}</TableCell>
                    <TableCell className="text-center bg-amber-100/20">{fmtInt(detalle.total_dias)}</TableCell>
                    <TableCell className="text-center bg-amber-100/20">{fmtInt(detalle.dias_cesado_no_lab)}</TableCell>
                    <TableCell className="text-center bg-amber-100/20">{fmtInt(detalle.dias_nuevo_no_lab)}</TableCell>
                    <TableCell className="text-center bg-amber-100/20">{fmtInt(detalle.dias_sin_cobertura)}</TableCell>
                    <TableCell className="text-center bg-amber-100/20">{fmtInt(detalle.dias_falta)}</TableCell>
                    <TableCell className="text-center bg-amber-100/20">{fmtInt(detalle.dias_suspension)}</TableCell>
                    <TableCell className="text-center bg-amber-100/20">{fmtInt(detalle.dias_vacaciones)}</TableCell>
                    <TableCell className="text-center bg-amber-100/20">{fmtInt(detalle.dias_subsidio_incapacidad)}</TableCell>
                    <TableCell className="text-center bg-amber-100/20">{fmtInt(detalle.dias_subsidio_maternidad)}</TableCell>
                    <TableCell className="text-center bg-amber-100/20">{fmtInt(detalle.dias_descanso_medico)}</TableCell>
                    <TableCell className="text-center bg-amber-100/20">{fmtInt(detalle.dias_licencia_sin_goce)}</TableCell>
                    <TableCell className="text-center bg-amber-100/20">{fmtInt(detalle.dias_licencia_fallecimiento)}</TableCell>
                    <TableCell className="text-center bg-amber-100/20">{fmtInt(detalle.dias_licencia_paternidad)}</TableCell>
                    <TableCell className="text-center bg-amber-100/20">{fmtInt(detalle.dias_licencia_con_goce)}</TableCell>
                    <TableCell className="text-center bg-amber-100/50 font-semibold border-r">{detalle.dias_trabajados}</TableCell>
                    {/* ESTRUCTURA SALARIAL */}
                    <TableCell className="text-right font-mono bg-cyan-100/20">{fmt(detalle.rem_basica)}</TableCell>
                    <TableCell className="text-right font-mono bg-cyan-100/20">{fmt(detalle.bono_productividad_base)}</TableCell>
                    <TableCell className="text-right font-mono bg-cyan-100/20">{fmt(detalle.bono_desempeno_base)}</TableCell>
                    <TableCell className="text-right font-mono bg-cyan-100/20">{fmt(detalle.bono_movilidad_base)}</TableCell>
                    <TableCell className="text-right font-mono bg-cyan-100/20">{fmt(detalle.bono_refrigerio_base)}</TableCell>
                    <TableCell className="text-right font-mono bg-cyan-100/20">{fmt(detalle.asig_fam_cliente_base)}</TableCell>
                    <TableCell className="text-right font-mono bg-cyan-100/20">{fmt(detalle.he_25_estructura)}</TableCell>
                    <TableCell className="text-right font-mono bg-cyan-100/20">{fmt(detalle.he_35_estructura)}</TableCell>
                    <TableCell className="text-right font-mono bg-cyan-100/20">{fmt(detalle.bonif_nocturna_base)}</TableCell>
                    <TableCell className="text-right font-mono bg-cyan-100/20">{fmt(detalle.vac_base)}</TableCell>
                    <TableCell className="text-right font-mono bg-cyan-100/20">{fmt(detalle.grat_base)}</TableCell>
                    <TableCell className="text-right font-mono bg-cyan-100/20">{fmt(detalle.cts_base)}</TableCell>
                    <TableCell className="text-right font-mono bg-cyan-100/20">{fmt(detalle.bono_armado_base)}</TableCell>
                    <TableCell className="text-right font-mono bg-cyan-100/30 font-semibold">{fmtBold(detalle.total_sueldo_estructura)}</TableCell>
                    <TableCell className="text-center bg-cyan-100/20">{fmtInt(detalle.turno_dia)}</TableCell>
                    <TableCell className="text-center bg-cyan-100/20 border-r">{fmtInt(detalle.turno_noche)}</TableCell>
                    {/* INGRESOS */}
                    <TableCell className="text-center font-mono bg-green-100/20">{fmtInt(detalle.horas_8)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.sueldo_nocturno)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.pasaje_especial)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.horas_extras_25)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.horas_extras_35)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.feriado_trabajado)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.haber_mensual)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.descanso_medico_monto)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.subsidio_incapacidad)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.subsidio_maternidad)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.asignacion_familiar)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.licencia_goce_monto)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.remuneracion_vacacional)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.compensacion_vacacional)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.cts_monto)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.gratificacion_monto)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.movilidad)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.refrigerio)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.bono_desempeno_monto)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.asignacion_cliente)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.pegada_reenganche)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.bono_productividad_monto)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.bono_armado_monto)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.bono_referido)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.reintegro_dias_trab)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.reintegro_inafecto)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/20">{fmt(detalle.ingreso_sobregiro)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-100/30 font-semibold text-green-700 border-r">{fmtBold(detalle.total_ingresos)}</TableCell>
                    {/* DESCUENTOS */}
                    <TableCell className="text-right font-mono bg-red-100/20">{fmt(detalle.adelanto_quincena)}</TableCell>
                    <TableCell className="text-right font-mono bg-red-100/20">{fmt(detalle.adelanto_vacacional)}</TableCell>
                    <TableCell className="text-right font-mono bg-red-100/20">{fmt(detalle.afp_aporte)}</TableCell>
                    <TableCell className="text-right font-mono bg-red-100/20">{fmt(detalle.afp_prima)}</TableCell>
                    <TableCell className="text-right font-mono bg-red-100/20">{fmt(detalle.afp_comision)}</TableCell>
                    <TableCell className="text-right font-mono bg-red-100/20">{fmt(detalle.otros_adelantos)}</TableCell>
                    <TableCell className="text-right font-mono bg-red-100/20">{fmt(detalle.adelanto_cts)}</TableCell>
                    <TableCell className="text-right font-mono bg-red-100/20">{fmt(detalle.adelanto_gratificacion)}</TableCell>
                    <TableCell className="text-right font-mono bg-red-100/20">{fmt(detalle.otros_descuentos)}</TableCell>
                    <TableCell className="text-right font-mono bg-red-100/20">{fmt(detalle.onp)}</TableCell>
                    <TableCell className="text-right font-mono bg-red-100/20">{fmt(detalle.descuento_faltas)}</TableCell>
                    <TableCell className="text-right font-mono bg-red-100/20">{fmt(detalle.descuento_sobregiro)}</TableCell>
                    <TableCell className="text-right font-mono bg-red-100/20">{fmt(detalle.descuento_reintegro)}</TableCell>
                    <TableCell className="text-right font-mono bg-red-100/20">{fmt(detalle.prestamo)}</TableCell>
                    <TableCell className="text-right font-mono bg-red-100/20">{fmt(detalle.retencion_judicial)}</TableCell>
                    <TableCell className="text-right font-mono bg-red-100/20">{fmt(detalle.renta_5ta)}</TableCell>
                    <TableCell className="text-right font-mono bg-red-100/30 font-semibold text-red-700 border-r">{fmtBold(detalle.total_descuentos)}</TableCell>
                    {/* APORTES EMPLEADOR */}
                    <TableCell className="text-right font-mono bg-blue-100/20">{fmt(detalle.essalud_empleador)}</TableCell>
                    <TableCell className="text-right font-mono bg-blue-100/30 font-semibold border-r">{fmt(detalle.total_aportes_empleador)}</TableCell>
                    {/* RESULTADO */}
                    <TableCell className="text-right font-mono bg-indigo-100/20">{fmtBold(detalle.remuneracion_afecta)}</TableCell>
                    <TableCell className="text-right font-mono bg-indigo-100/20">{fmtBold(detalle.total_ingresos)}</TableCell>
                    <TableCell className="text-right font-mono bg-indigo-100/30 font-bold text-indigo-700">{fmtBold(detalle.neto_pagar)}</TableCell>
                    <TableCell className="bg-indigo-100/20 truncate max-w-[70px]" title={detalle.banco_nombre || detalle.empleado?.banco_haberes?.nombre}>{detalle.banco_nombre || detalle.empleado?.banco_haberes?.nombre || '-'}</TableCell>
                    <TableCell className="font-mono bg-indigo-100/20 truncate max-w-[90px]">{detalle.cuenta_numero || detalle.empleado?.nro_cuenta_haberes || '-'}</TableCell>
                    <TableCell className="font-mono bg-indigo-100/20 border-r truncate max-w-[100px]">{detalle.cci || detalle.empleado?.cci_haberes || '-'}</TableCell>
                    {/* ADICIONALES */}
                    <TableCell className="text-center bg-purple-100/20">{detalle.empleado?.fecha_nacimiento ? Math.floor((new Date().getTime() - new Date(detalle.empleado.fecha_nacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : '-'}</TableCell>
                    <TableCell className="text-center bg-purple-100/20">{Number(detalle.dias_vacaciones) > 0 ? 'SÍ' : 'NO'}</TableCell>
                    <TableCell className="text-center bg-purple-100/20">{Number(detalle.asignacion_familiar) > 0 ? 'SÍ' : 'NO'}</TableCell>
                    <TableCell className="text-center bg-purple-100/20">{fmtInt(detalle.cantidad_feriados)}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => onOpenEditModal(detalle)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Indicador de tasas SBS */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <IndicadorTasasSBS />
        </div>
      </CardContent>
    </Card>
  );
}
