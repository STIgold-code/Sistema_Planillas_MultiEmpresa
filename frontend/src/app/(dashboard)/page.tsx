"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Building2, AlertTriangle } from "lucide-react";
import {
  useDashboard,
  SECCION_ESTADISTICAS,
  type SolicitudCesePendiente,
} from "./useDashboard";
import { useEmpresa } from "@/hooks/useEmpresa";
import { DashboardSkeleton } from "./components/dashboard-skeleton";
import { DashboardStatCards } from "./components/dashboard-stat-cards";
import { DashboardEmpleadosPendientes } from "./components/dashboard-empleados-pendientes";
import { DashboardContratosPorVencer } from "./components/dashboard-contratos-por-vencer";
import { DashboardSolicitudesCese } from "./components/dashboard-solicitudes-cese";
import { DashboardSolicitudesAnulacion } from "./components/dashboard-solicitudes-anulacion";
import { DashboardCorreccionesFechas } from "./components/dashboard-correcciones-fechas";
import { DashboardDescuentosPendientes } from "./components/dashboard-descuentos-pendientes";
import { DashboardBajasPendientes } from "./components/dashboard-bajas-pendientes";
import { DashboardRequerimientosPendientes } from "./components/dashboard-requerimientos-pendientes";
import { DashboardEmpleadosCesados } from "./components/dashboard-empleados-cesados";
import { DashboardRenovarDialog } from "./components/dashboard-renovar-dialog";
import {
  DashboardAprobarCeseDialog,
  DashboardRechazarCeseDialog,
  DashboardSolicitarCeseDialog,
} from "./components/dashboard-cese-dialogs";
import { SolicitudCeseDetalleDialog } from "@/components/solicitudes-cese/SolicitudCeseDetalleDialog";
import { SolicitudAnulacionDetalleDialog } from "@/components/solicitudes-anulacion/SolicitudAnulacionDetalleDialog";
import type { SolicitudAnulacionPendiente } from "@/types/solicitudes-anulacion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function DashboardPage() {
  const db = useDashboard();
  const { empresa } = useEmpresa();
  const [solicitudDetalle, setSolicitudDetalle] =
    useState<SolicitudCesePendiente | null>(null);
  const [solicitudAnulacionDetalle, setSolicitudAnulacionDetalle] =
    useState<SolicitudAnulacionPendiente | null>(null);

  if (db.loading || db.redirecting) return <DashboardSkeleton />;

  // Las tarjetas de estadísticas avisan su propia falla en sitio, así que no se
  // repiten en el aviso general.
  const seccionesFallidas = db.seccionesConError.filter(
    (seccion) => seccion !== SECCION_ESTADISTICAS,
  );

  // Con secciones caídas no se puede afirmar que no haya alertas: lo que se ve
  // vacío puede ser solo lo que no cargó.
  const noAlerts =
    db.seccionesConError.length === 0 &&
    db.empleadosPendientes.length === 0 &&
    db.solicitudesCese.length === 0 &&
    db.solicitudesAnulacion.length === 0 &&
    db.correccionesFechas.length === 0 &&
    db.descuentosPendientes.length === 0 &&
    db.bajasPendientes.length === 0 &&
    db.requerimientosPendientes.length === 0 &&
    db.empleadosCesados.length === 0 &&
    db.contratosPorVencer.length === 0;

  return (
    <div className="space-y-5 md:space-y-7">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          {db.getGreeting()}
          {db.userName ? `, ${db.userName}` : ""}
        </h2>
        <p className="text-sm md:text-base text-muted-foreground capitalize">
          {db.formattedDate}
        </p>
        {empresa && (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Building2 className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
            <span className="text-base md:text-lg font-semibold">
              {empresa.razon_social}
            </span>
            <span className="text-xs md:text-sm text-muted-foreground">
              RUC {empresa.ruc}
            </span>
          </div>
        )}
      </div>

      {db.error && (
        <Alert
          variant="destructive"
          className="border-red-200 bg-red-50 text-red-800"
        >
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>No se pudo cargar el dashboard</AlertTitle>
          <AlertDescription className="text-red-800/90">
            {db.error}
          </AlertDescription>
        </Alert>
      )}

      {seccionesFallidas.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Algunas secciones no se pudieron cargar</AlertTitle>
          <AlertDescription className="text-amber-900/90">
            <p>
              No cargaron: {seccionesFallidas.join(", ")}. Lo que ves de esas
              secciones puede estar incompleto. Recarga la página para
              reintentar; el resto del dashboard sigue disponible.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {db.stats && <DashboardStatCards stats={db.stats} />}

      {/* Solo cuando falló el endpoint de estadísticas; si cayó el dashboard
          entero ya se avisó arriba y repetirlo sería ruido. */}
      {!db.stats && !db.error && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Estadísticas no disponibles</AlertTitle>
          <AlertDescription className="text-amber-900/90">
            <p>
              No se pudieron cargar los indicadores. Recarga la página para
              reintentar; el resto del dashboard sigue disponible.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <DashboardEmpleadosPendientes
        empleadosPendientes={db.empleadosPendientes}
        expanded={db.expandedSections.vencidos}
        onExpandChange={(open) =>
          db.setExpandedSections((prev) => ({ ...prev, vencidos: open }))
        }
        onRenovar={db.handleAbrirRenovar}
        onSolicitarCese={db.handleAbrirSolicitarCese}
      />

      <DashboardContratosPorVencer
        contratosPorVencer={db.contratosPorVencer}
        expanded={db.expandedSections.porVencer}
        onExpandChange={(open) =>
          db.setExpandedSections((prev) => ({ ...prev, porVencer: open }))
        }
        onRenovar={db.handleAbrirRenovar}
        onSolicitarCese={db.handleAbrirSolicitarCese}
      />

      <DashboardSolicitudesCese
        solicitudesCese={db.solicitudesCese}
        expanded={db.expandedSections.cesePendiente}
        onExpandChange={(open) =>
          db.setExpandedSections((prev) => ({ ...prev, cesePendiente: open }))
        }
        onAprobar={db.setAprobarSolicitudId}
        onRechazar={db.setRechazarSolicitudId}
        onVerDetalle={setSolicitudDetalle}
      />

      <DashboardSolicitudesAnulacion
        solicitudes={db.solicitudesAnulacion}
        expanded={db.expandedSections.anulacionPendiente}
        onExpandChange={(open) =>
          db.setExpandedSections((prev) => ({
            ...prev,
            anulacionPendiente: open,
          }))
        }
        onAprobar={db.setAprobarAnulacionId}
        onRechazar={db.setRechazarAnulacionId}
        onVerDetalle={setSolicitudAnulacionDetalle}
      />

      <DashboardCorreccionesFechas
        solicitudes={db.correccionesFechas}
        expanded={db.expandedSections.correccionFechaPendiente}
        onExpandChange={(open) =>
          db.setExpandedSections((prev) => ({
            ...prev,
            correccionFechaPendiente: open,
          }))
        }
        onAprobar={db.setAprobarCorreccionId}
        onRechazar={db.setRechazarCorreccionId}
        puedeAprobar={db.puedeAprobarCorreccion}
      />

      <DashboardDescuentosPendientes
        descuentos={db.descuentosPendientes}
        expanded={db.expandedSections.descuentos}
        onExpandChange={(open) =>
          db.setExpandedSections((prev) => ({ ...prev, descuentos: open }))
        }
      />

      <DashboardBajasPendientes
        bajas={db.bajasPendientes}
        expanded={db.expandedSections.bajas}
        onExpandChange={(open) =>
          db.setExpandedSections((prev) => ({ ...prev, bajas: open }))
        }
        puedeAprobar={db.puedeAprobarBaja}
        procesando={db.procesandoBaja}
        onAprobar={db.handleAprobarBaja}
        onRechazar={db.handleRechazarBaja}
      />

      {db.puedeAprobarRequerimientos && (
        <DashboardRequerimientosPendientes
          requerimientos={db.requerimientosPendientes}
          expanded={db.expandedSections.requerimientos}
          onExpandChange={(open) =>
            db.setExpandedSections((prev) => ({
              ...prev,
              requerimientos: open,
            }))
          }
        />
      )}

      <DashboardEmpleadosCesados
        empleadosCesados={db.empleadosCesados}
        expanded={db.expandedSections.cesados}
        onExpandChange={(open) =>
          db.setExpandedSections((prev) => ({ ...prev, cesados: open }))
        }
      />

      {noAlerts && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="flex items-center justify-center gap-3 py-8">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-800 font-medium">
              Sin alertas pendientes. Todo esta en orden.
            </p>
          </CardContent>
        </Card>
      )}

      <DashboardRenovarDialog
        open={db.showRenovarModal}
        onOpenChange={db.setShowRenovarModal}
        contratoARenovar={db.contratoARenovar}
        renovarForm={db.renovarForm}
        setRenovarForm={db.setRenovarForm}
        clientes={db.clientes}
        sedesFiltradas={db.sedesFiltradas}
        plantillas={db.plantillas}
        cargos={db.cargos}
        renovando={db.renovando}
        onClienteChange={db.handleClienteChange}
        onRenovar={db.handleRenovarContrato}
        onClose={() => {
          db.setShowRenovarModal(false);
          db.setContratoARenovar(null);
          db.setRenovarForm(db.initialRenovarForm);
        }}
      />

      <DashboardAprobarCeseDialog
        open={db.aprobarSolicitudId !== null}
        procesando={db.procesandoCese}
        onOpenChange={() => db.setAprobarSolicitudId(null)}
        onConfirm={db.handleAprobarCese}
      />

      <DashboardRechazarCeseDialog
        open={db.rechazarSolicitudId !== null}
        procesando={db.procesandoCese}
        observaciones={db.observacionesRechazo}
        onObservacionesChange={db.setObservacionesRechazo}
        onOpenChange={() => db.setRechazarSolicitudId(null)}
        onConfirm={db.handleRechazarCese}
        onCancel={() => {
          db.setRechazarSolicitudId(null);
          db.setObservacionesRechazo("");
        }}
      />

      <DashboardSolicitarCeseDialog
        open={db.showSolicitarCeseModal}
        empleadoACesar={db.empleadoACesar}
        ceseForm={db.ceseForm}
        ceseFiles={db.ceseFiles}
        tiposCese={db.tiposCese}
        solicitando={db.solicitandoCese}
        onCeseFormChange={db.setCeseForm}
        onCeseFilesChange={db.setCeseFiles}
        onOpenChange={db.setShowSolicitarCeseModal}
        onConfirm={db.handleSolicitarCese}
        onCancel={() => {
          db.setShowSolicitarCeseModal(false);
          db.setEmpleadoACesar(null);
          db.setCeseForm({ tipo_cese_id: "", motivo: "", fecha_efectiva: "" });
          db.setCeseFiles([]);
        }}
      />

      <SolicitudCeseDetalleDialog
        open={solicitudDetalle !== null}
        solicitud={solicitudDetalle}
        onOpenChange={(open) => {
          if (!open) setSolicitudDetalle(null);
        }}
        onAprobar={() => {
          if (solicitudDetalle) {
            db.setAprobarSolicitudId(solicitudDetalle.id);
            setSolicitudDetalle(null);
          }
        }}
        onRechazar={() => {
          if (solicitudDetalle) {
            db.setRechazarSolicitudId(solicitudDetalle.id);
            setSolicitudDetalle(null);
          }
        }}
      />

      <SolicitudAnulacionDetalleDialog
        open={solicitudAnulacionDetalle !== null}
        solicitud={solicitudAnulacionDetalle}
        onOpenChange={(open) => {
          if (!open) setSolicitudAnulacionDetalle(null);
        }}
        onAprobar={() => {
          if (solicitudAnulacionDetalle) {
            db.setAprobarAnulacionId(solicitudAnulacionDetalle.id);
            setSolicitudAnulacionDetalle(null);
          }
        }}
        onRechazar={() => {
          if (solicitudAnulacionDetalle) {
            db.setRechazarAnulacionId(solicitudAnulacionDetalle.id);
            setSolicitudAnulacionDetalle(null);
          }
        }}
      />

      <AlertDialog
        open={db.aprobarAnulacionId !== null}
        onOpenChange={(v) => !v && db.setAprobarAnulacionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprobar Anulación de Contrato</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará el contrato como ANULADO. Si el contrato
              estaba CESADO, el cese se revierte (empleado y vínculo vuelven a
              ACTIVO). Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={db.procesandoAnulacion}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={db.handleAprobarAnulacion}
              disabled={db.procesandoAnulacion}
              className="bg-green-600 hover:bg-green-700"
            >
              {db.procesandoAnulacion ? "Procesando..." : "Aprobar Anulación"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={db.rechazarAnulacionId !== null}
        onOpenChange={(v) => {
          if (!v) {
            db.setRechazarAnulacionId(null);
            db.setObservacionesRechazoAnulacion("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Solicitud de Anulación</DialogTitle>
            <DialogDescription>
              Indique el motivo del rechazo (opcional). El contrato no se
              anulará.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Observaciones del rechazo..."
            value={db.observacionesRechazoAnulacion}
            onChange={(e) =>
              db.setObservacionesRechazoAnulacion(e.target.value)
            }
            maxLength={500}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                db.setRechazarAnulacionId(null);
                db.setObservacionesRechazoAnulacion("");
              }}
              disabled={db.procesandoAnulacion}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={db.handleRechazarAnulacion}
              disabled={db.procesandoAnulacion}
            >
              {db.procesandoAnulacion ? "Procesando..." : "Rechazar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={db.aprobarCorreccionId !== null}
        onOpenChange={(v) => !v && db.setAprobarCorreccionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprobar Corrección de Fechas</AlertDialogTitle>
            <AlertDialogDescription>
              Se aplicarán las fechas propuestas al contrato y el sustento
              quedará archivado en el legajo del trabajador. Si el cambio toca
              períodos con planilla aprobada o pagada, se te avisará: esos
              cálculos no se recalculan automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={db.procesandoCorreccion}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={db.handleAprobarCorreccion}
              disabled={db.procesandoCorreccion}
              className="bg-green-600 hover:bg-green-700"
            >
              {db.procesandoCorreccion ? "Procesando..." : "Aprobar Corrección"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={db.rechazarCorreccionId !== null}
        onOpenChange={(v) => {
          if (!v) {
            db.setRechazarCorreccionId(null);
            db.setObservacionesRechazoCorreccion("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Corrección de Fechas</DialogTitle>
            <DialogDescription>
              Indica el motivo del rechazo (opcional). El contrato no se
              modificará.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Observaciones del rechazo..."
            value={db.observacionesRechazoCorreccion}
            onChange={(e) =>
              db.setObservacionesRechazoCorreccion(e.target.value)
            }
            maxLength={500}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                db.setRechazarCorreccionId(null);
                db.setObservacionesRechazoCorreccion("");
              }}
              disabled={db.procesandoCorreccion}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={db.handleRechazarCorreccion}
              disabled={db.procesandoCorreccion}
            >
              {db.procesandoCorreccion ? "Procesando..." : "Rechazar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
