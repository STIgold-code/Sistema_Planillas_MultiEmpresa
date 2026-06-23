"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";
import { hasPermission } from "@/lib/auth";
import { useUser } from "@/contexts/user-context";
import { toDateString } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/errors";
import type { SolicitudAnulacionPendiente } from "@/types/solicitudes-anulacion";
import type {
  SolicitudDescuento,
  SolicitudBaja,
  RequerimientoPendienteAprobacion,
} from "@/types/inventario";

// ─── Constants ──────────────────────────────────────────────────────────────

export const TIPOS_CONTRATO = [
  { value: "SUJETO_A_MODALIDAD", label: "Sujeto a Modalidad" },
  { value: "INDEFINIDO", label: "Indefinido" },
  { value: "LOCACION", label: "Locación de Servicios" },
  { value: "OBRA_SERVICIO", label: "Obra o Servicio" },
  { value: "TIEMPO_PARCIAL", label: "Tiempo Parcial" },
];

export const MODALIDADES = [
  { value: "PRESENCIAL", label: "Presencial" },
  { value: "REMOTO", label: "Remoto" },
  { value: "HIBRIDO", label: "Híbrido" },
];

const moduleRoutes = [
  { url: "/rrhh/empleados", permiso: "empleados:leer" },
  { url: "/rrhh/contratos", permiso: "contratos:leer" },
  { url: "/rrhh/seleccion", permiso: "seleccion:leer" },
  { url: "/rrhh/vacaciones", permiso: "vacaciones:leer" },
  { url: "/operaciones/tareo", permiso: "tareo:leer" },
  { url: "/planilla", permiso: "planilla:leer" },
  { url: "/configuracion/usuarios", permiso: "usuarios:leer" },
  { url: "/configuracion/roles", permiso: "roles:leer" },
  { url: "/rrhh/maestros", permiso: "maestros:leer" },
];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalEmpleados: number;
  empleadosCesados: number;
  empleadosPendientes: number;
  contratosPorVencer: number;
  contratosVencidos: number;
  ausenciasHoy: number;
  ausenciasMes: number;
  planillaMes: number;
  solicitudesCesePendientes: number;
  mesActual: string;
}

export interface ContratoPorVencer {
  id: number;
  tipo_contrato: string;
  modalidad: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  remuneracion: number | null;
  cliente_id: number | null;
  lugar_trabajo: string | null;
  diasRestantes: number;
  nombreCompleto: string;
  empleado: {
    id: number;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    numero_documento: string;
    sueldo_base: number | null;
    cargo: { id: number; nombre: string } | null;
    area: { nombre: string } | null;
    sede: { id: number; nombre: string; cliente_id: number } | null;
  };
  cliente: { id: number; razon_social: string } | null;
}

export interface EmpleadoPendiente {
  id: number;
  tipo_contrato: string;
  modalidad: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  remuneracion: number | null;
  cliente_id: number | null;
  lugar_trabajo: string | null;
  diasPendiente: number;
  nombreCompleto: string;
  empleado: {
    id: number;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    numero_documento: string;
    sueldo_base: number | null;
    cargo: { id: number; nombre: string } | null;
    area: { nombre: string } | null;
    sede: { id: number; nombre: string; cliente_id: number } | null;
  };
  cliente: { id: number; razon_social: string } | null;
}

export interface EmpleadoCesado {
  id: number;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  numero_documento: string;
  fecha_cese: string | null;
  nombreCompleto: string;
  cargo: { nombre: string } | null;
  sede: { nombre: string } | null;
}

export interface SolicitudCeseArchivoDashboard {
  id: number;
  archivo_url: string;
  archivo_nombre: string;
  archivo_tipo?: string | null;
  archivo_tamano?: number | null;
}

export interface SolicitudCesePendiente {
  id: number;
  tipo_cese: { id: number; nombre: string } | null;
  motivo: string | null;
  fecha_efectiva: string;
  created_at: string;
  archivos?: SolicitudCeseArchivoDashboard[];
  empleado: {
    id: number;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    numero_documento: string;
    cargo: { nombre: string } | null;
  };
  solicitado_por: {
    id: number;
    nombre_completo: string;
    email: string;
  };
}

export interface Cliente {
  id: number;
  ruc: string;
  razon_social: string;
}

export interface Sede {
  id: number;
  nombre: string;
  cliente_id: number;
}

export interface PlantillaContrato {
  id: number;
  nombre: string;
  tipo_contrato: string;
  es_predeterminada: boolean;
  archivo_base_url: string | null;
}

export interface Cargo {
  id: number;
  nombre: string;
}

export interface RenovarForm {
  tipo_contrato: string;
  modalidad: string;
  fecha_inicio: string;
  fecha_fin: string;
  remuneracion: string;
  cliente_id: string;
  sede_id: string;
  lugar_trabajo: string;
  plantilla_id: string;
  generar_documento: boolean;
  cargo_id: string;
}

export const initialRenovarForm: RenovarForm = {
  tipo_contrato: "SUJETO_A_MODALIDAD",
  modalidad: "PRESENCIAL",
  fecha_inicio: "",
  fecha_fin: "",
  remuneracion: "",
  cliente_id: "",
  sede_id: "",
  lugar_trabajo: "",
  plantilla_id: "",
  generar_documento: true,
  cargo_id: "",
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useDashboard() {
  const router = useRouter();
  const usuario = useUser();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [contratosPorVencer, setContratosPorVencer] = useState<
    ContratoPorVencer[]
  >([]);
  const [empleadosPendientes, setEmpleadosPendientes] = useState<
    EmpleadoPendiente[]
  >([]);
  const [empleadosCesados, setEmpleadosCesados] = useState<EmpleadoCesado[]>(
    [],
  );
  const [solicitudesCese, setSolicitudesCese] = useState<
    SolicitudCesePendiente[]
  >([]);
  const [solicitudesAnulacion, setSolicitudesAnulacion] = useState<
    SolicitudAnulacionPendiente[]
  >([]);
  const [descuentosPendientes, setDescuentosPendientes] = useState<
    SolicitudDescuento[]
  >([]);
  const [bajasPendientes, setBajasPendientes] = useState<SolicitudBaja[]>([]);
  const [requerimientosPendientes, setRequerimientosPendientes] = useState<
    RequerimientoPendienteAprobacion[]
  >([]);
  const [procesandoBaja, setProcesandoBaja] = useState(false);
  const [aprobarAnulacionId, setAprobarAnulacionId] = useState<number | null>(
    null,
  );
  const [rechazarAnulacionId, setRechazarAnulacionId] = useState<number | null>(
    null,
  );
  const [observacionesRechazoAnulacion, setObservacionesRechazoAnulacion] =
    useState("");
  const [procesandoAnulacion, setProcesandoAnulacion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const [expandedSections, setExpandedSections] = useState({
    vencidos: true,
    cesePendiente: true,
    anulacionPendiente: true,
    descuentos: true,
    bajas: true,
    requerimientos: true,
    cesados: true,
    porVencer: true,
  });

  // Cese modals
  const [aprobarSolicitudId, setAprobarSolicitudId] = useState<number | null>(
    null,
  );
  const [rechazarSolicitudId, setRechazarSolicitudId] = useState<number | null>(
    null,
  );
  const [observacionesRechazo, setObservacionesRechazo] = useState("");
  const [procesandoCese, setProcesandoCese] = useState(false);

  // Renovación
  const [showRenovarModal, setShowRenovarModal] = useState(false);
  const [contratoARenovar, setContratoARenovar] = useState<
    EmpleadoPendiente | ContratoPorVencer | null
  >(null);
  const [renovarForm, setRenovarForm] =
    useState<RenovarForm>(initialRenovarForm);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [sedesFiltradas, setSedesFiltradas] = useState<Sede[]>([]);
  const [plantillas, setPlantillas] = useState<PlantillaContrato[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [renovando, setRenovando] = useState(false);

  // Solicitar cese
  const [showSolicitarCeseModal, setShowSolicitarCeseModal] = useState(false);
  const [empleadoACesar, setEmpleadoACesar] = useState<{
    id: number;
    nombreCompleto: string;
  } | null>(null);
  const [ceseForm, setCeseForm] = useState({
    tipo_cese_id: "",
    motivo: "",
    fecha_efectiva: "",
  });
  const [ceseFiles, setCeseFiles] = useState<File[]>([]);
  const [tiposCese, setTiposCese] = useState<{ id: number; nombre: string }[]>(
    [],
  );
  const [solicitandoCese, setSolicitandoCese] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [
        statsRes,
        contratosRes,
        pendientesRes,
        cesadosRes,
        ceseRes,
        anulacionRes,
        tiposCeseRes,
        descuentosRes,
        bajasRes,
        requerimientosRes,
      ] = await Promise.all([
        api.get<DashboardStats>("/dashboard/stats"),
        api.get<ContratoPorVencer[]>("/dashboard/contratos-por-vencer"),
        api.get<EmpleadoPendiente[]>("/dashboard/empleados-pendientes"),
        api.get<EmpleadoCesado[]>("/dashboard/empleados-cesados"),
        api.get<SolicitudCesePendiente[]>(
          "/dashboard/solicitudes-cese-pendientes",
        ),
        api
          .get<
            SolicitudAnulacionPendiente[]
          >("/dashboard/solicitudes-anulacion-pendientes")
          .catch(() => [] as SolicitudAnulacionPendiente[]),
        api.get<{ id: number; nombre: string; activo: boolean }[]>(
          "/masters/tipos-cese",
        ),
        api
          .get<SolicitudDescuento[]>("/inventario/descuentos/pendientes")
          .catch(() => [] as SolicitudDescuento[]),
        api
          .get<SolicitudBaja[]>("/inventario/bajas/pendientes")
          .catch(() => [] as SolicitudBaja[]),
        api
          .get<
            RequerimientoPendienteAprobacion[]
          >("/inventario/requerimientos/pendientes-aprobacion")
          .catch(() => [] as RequerimientoPendienteAprobacion[]),
      ]);
      setStats(statsRes);
      setContratosPorVencer(Array.isArray(contratosRes) ? contratosRes : []);
      setEmpleadosPendientes(Array.isArray(pendientesRes) ? pendientesRes : []);
      setEmpleadosCesados(Array.isArray(cesadosRes) ? cesadosRes : []);
      setSolicitudesCese(Array.isArray(ceseRes) ? ceseRes : []);
      setSolicitudesAnulacion(Array.isArray(anulacionRes) ? anulacionRes : []);
      setTiposCese(
        Array.isArray(tiposCeseRes) ? tiposCeseRes.filter((t) => t.activo) : [],
      );
      setDescuentosPendientes(
        Array.isArray(descuentosRes) ? descuentosRes : [],
      );
      setBajasPendientes(Array.isArray(bajasRes) ? bajasRes : []);
      setRequerimientosPendientes(
        Array.isArray(requerimientosRes) ? requerimientosRes : [],
      );
    } catch (err) {
      setError("Error al cargar las estadisticas");
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasPermission(usuario, "dashboard:leer")) {
      const firstAllowed = moduleRoutes.find((r) =>
        hasPermission(usuario, r.permiso),
      );
      if (firstAllowed) {
        setRedirecting(true);
        router.replace(firstAllowed.url);
        return;
      }
    }
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, router]);

  // ── Cese handlers ────────────────────────────────────────────────────────

  const handleAprobarCese = async () => {
    if (!aprobarSolicitudId) return;
    setProcesandoCese(true);
    try {
      await api.patch(`/solicitudes-cese/${aprobarSolicitudId}/aprobar`, {});
      toast.success("Solicitud de cese aprobada correctamente");
      await fetchDashboardData();
    } catch {
      toast.error("Error al aprobar la solicitud de cese");
    } finally {
      setProcesandoCese(false);
      setAprobarSolicitudId(null);
    }
  };

  const handleRechazarCese = async () => {
    if (!rechazarSolicitudId) return;
    setProcesandoCese(true);
    try {
      await api.patch(`/solicitudes-cese/${rechazarSolicitudId}/rechazar`, {
        observaciones_admin: observacionesRechazo || undefined,
      });
      toast.success("Solicitud de cese rechazada");
      await fetchDashboardData();
    } catch {
      toast.error("Error al rechazar la solicitud de cese");
    } finally {
      setProcesandoCese(false);
      setRechazarSolicitudId(null);
      setObservacionesRechazo("");
    }
  };

  // ── Anulación handlers ───────────────────────────────────────────────────

  const handleAprobarAnulacion = async () => {
    if (!aprobarAnulacionId) return;
    setProcesandoAnulacion(true);
    try {
      await api.patch(
        `/solicitudes-anulacion/${aprobarAnulacionId}/aprobar`,
        {},
      );
      toast.success("Anulación aprobada correctamente");
      await fetchDashboardData();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Error al aprobar la anulación"));
    } finally {
      setProcesandoAnulacion(false);
      setAprobarAnulacionId(null);
    }
  };

  const handleRechazarAnulacion = async () => {
    if (!rechazarAnulacionId) return;
    setProcesandoAnulacion(true);
    try {
      await api.patch(
        `/solicitudes-anulacion/${rechazarAnulacionId}/rechazar`,
        {
          observaciones_admin: observacionesRechazoAnulacion || undefined,
        },
      );
      toast.success("Anulación rechazada");
      await fetchDashboardData();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Error al rechazar la anulación"));
    } finally {
      setProcesandoAnulacion(false);
      setRechazarAnulacionId(null);
      setObservacionesRechazoAnulacion("");
    }
  };

  // ── Baja de prendas handlers ─────────────────────────────────────────────

  const handleAprobarBaja = async (id: number) => {
    setProcesandoBaja(true);
    try {
      await api.patch(`/inventario/bajas/${id}/aprobar`, {});
      toast.success("Baja aprobada; la prenda salió del stock");
      await fetchDashboardData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al aprobar la baja",
      );
    } finally {
      setProcesandoBaja(false);
    }
  };

  const handleRechazarBaja = async (id: number) => {
    setProcesandoBaja(true);
    try {
      await api.patch(`/inventario/bajas/${id}/rechazar`, {});
      toast.success("Solicitud de baja rechazada");
      await fetchDashboardData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al rechazar la baja",
      );
    } finally {
      setProcesandoBaja(false);
    }
  };

  // ── Renovación handlers ──────────────────────────────────────────────────

  const fetchRenovacionData = async (): Promise<{
    clientes: Cliente[];
    sedes: Sede[];
    plantillas: PlantillaContrato[];
    cargos: Cargo[];
  }> => {
    try {
      const [clientesRes, sedesRes, plantillasRes, cargosRes] =
        await Promise.all([
          api.get<{ data: Cliente[] }>("/clientes?limit=200&activo=true"),
          api.get<{ data: Sede[] }>("/sedes?limit=500&activo=true"),
          api.get<{ data: PlantillaContrato[] }>("/plantillas-contrato"),
          api.get<Cargo[]>("/masters/cargos"),
        ]);
      const clientesData = clientesRes?.data || [];
      const sedesData = sedesRes?.data || [];
      const plantillasData = plantillasRes?.data || [];
      const cargosData = Array.isArray(cargosRes) ? cargosRes : [];
      setClientes(clientesData);
      setSedes(sedesData);
      setPlantillas(plantillasData);
      setCargos(cargosData);
      return {
        clientes: clientesData,
        sedes: sedesData,
        plantillas: plantillasData,
        cargos: cargosData,
      };
    } catch (err) {
      console.error("Error cargando datos de renovación:", err);
      return { clientes: [], sedes: [], plantillas: [], cargos: [] };
    }
  };

  const handleAbrirRenovar = async (
    contrato: EmpleadoPendiente | ContratoPorVencer,
  ) => {
    setContratoARenovar(contrato);

    let sedesActuales = sedes;
    let plantillasActuales = plantillas;

    if (clientes.length === 0) {
      const data = await fetchRenovacionData();
      sedesActuales = data.sedes;
      plantillasActuales = data.plantillas;
    }

    const fechaFinActual = contrato.fecha_fin
      ? new Date(contrato.fecha_fin)
      : new Date();
    const nuevaFechaInicio = new Date(fechaFinActual);
    nuevaFechaInicio.setDate(nuevaFechaInicio.getDate() + 1);
    const nuevaFechaFin = new Date(nuevaFechaInicio);
    nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + 6);

    const clienteId = contrato.cliente_id || contrato.empleado.sede?.cliente_id;
    if (clienteId) {
      setSedesFiltradas(
        sedesActuales.filter((s) => s.cliente_id === clienteId),
      );
    } else {
      setSedesFiltradas([]);
    }

    const plantillaDefault =
      plantillasActuales.find(
        (p) =>
          p.tipo_contrato === contrato.tipo_contrato &&
          p.es_predeterminada &&
          p.archivo_base_url,
      ) || plantillasActuales.find((p) => p.archivo_base_url);

    setRenovarForm({
      tipo_contrato: contrato.tipo_contrato,
      modalidad: contrato.modalidad || "PRESENCIAL",
      fecha_inicio: toDateString(nuevaFechaInicio),
      fecha_fin: toDateString(nuevaFechaFin),
      remuneracion:
        contrato.remuneracion?.toString() ||
        contrato.empleado.sueldo_base?.toString() ||
        "",
      cliente_id: clienteId?.toString() || "",
      sede_id: contrato.empleado.sede?.id?.toString() || "",
      lugar_trabajo: contrato.lugar_trabajo || "",
      plantilla_id: plantillaDefault?.id.toString() || "",
      generar_documento: !!plantillaDefault,
      cargo_id: contrato.empleado.cargo?.id?.toString() || "",
    });

    setShowRenovarModal(true);
  };

  const handleClienteChange = (clienteId: string) => {
    setRenovarForm((prev) => ({ ...prev, cliente_id: clienteId, sede_id: "" }));
    if (clienteId) {
      setSedesFiltradas(
        sedes.filter((s) => s.cliente_id === parseInt(clienteId)),
      );
    } else {
      setSedesFiltradas([]);
    }
  };

  const handleRenovarContrato = async () => {
    if (!contratoARenovar || !renovarForm.fecha_inicio) {
      toast.error("Complete los campos requeridos");
      return;
    }
    if (renovarForm.generar_documento && !renovarForm.plantilla_id) {
      toast.error("Seleccione una plantilla para generar el documento");
      return;
    }

    setRenovando(true);
    try {
      await api.post(`/contratos/${contratoARenovar.id}/renovar`, {
        empleado_id: contratoARenovar.empleado.id,
        tipo_contrato: renovarForm.tipo_contrato,
        fecha_inicio: renovarForm.fecha_inicio,
        fecha_fin: renovarForm.fecha_fin || undefined,
        remuneracion: renovarForm.remuneracion
          ? parseFloat(renovarForm.remuneracion)
          : undefined,
        cliente_id: renovarForm.cliente_id
          ? parseInt(renovarForm.cliente_id)
          : undefined,
        lugar_trabajo: renovarForm.lugar_trabajo || undefined,
        plantilla_id: renovarForm.plantilla_id
          ? parseInt(renovarForm.plantilla_id)
          : undefined,
        cargo_id: renovarForm.cargo_id
          ? parseInt(renovarForm.cargo_id)
          : undefined,
      });
      toast.success("Contrato renovado correctamente");
      setShowRenovarModal(false);
      setContratoARenovar(null);
      setRenovarForm(initialRenovarForm);
      await fetchDashboardData();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Error al renovar contrato"));
    } finally {
      setRenovando(false);
    }
  };

  // ── Solicitar cese handlers ──────────────────────────────────────────────

  const handleAbrirSolicitarCese = (
    empleadoId: number,
    nombreCompleto: string,
  ) => {
    setEmpleadoACesar({ id: empleadoId, nombreCompleto });
    setCeseForm({
      tipo_cese_id: "",
      motivo: "",
      fecha_efectiva: toDateString(new Date()),
    });
    setCeseFiles([]);
    setShowSolicitarCeseModal(true);
  };

  const handleSolicitarCese = async () => {
    if (!empleadoACesar || !ceseForm.tipo_cese_id || !ceseForm.fecha_efectiva) {
      toast.error("Complete los campos requeridos");
      return;
    }
    if (ceseFiles.length === 0) {
      toast.error("Adjunte al menos un documento de respaldo");
      return;
    }

    setSolicitandoCese(true);
    try {
      const formData = new FormData();
      formData.append("empleado_id", String(empleadoACesar.id));
      formData.append("tipo_cese_id", ceseForm.tipo_cese_id);
      formData.append("fecha_efectiva", ceseForm.fecha_efectiva);
      if (ceseForm.motivo) formData.append("motivo", ceseForm.motivo);
      for (const f of ceseFiles) {
        formData.append("files", f);
      }
      await api.upload("/solicitudes-cese", formData);
      toast.success("Solicitud de cese creada, pendiente de aprobacion");
      setShowSolicitarCeseModal(false);
      setEmpleadoACesar(null);
      setCeseForm({ tipo_cese_id: "", motivo: "", fecha_efectiva: "" });
      setCeseFiles([]);
      await fetchDashboardData();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Error al crear solicitud de cese"));
    } finally {
      setSolicitandoCese(false);
    }
  };

  // ── Computed ─────────────────────────────────────────────────────────────

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buen dia";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const formattedDate = new Date().toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const userName = usuario?.nombre_completo?.split(" ")[0] || "";

  return {
    // Data
    stats,
    contratosPorVencer,
    empleadosPendientes,
    empleadosCesados,
    solicitudesCese,
    loading,
    error,
    redirecting,
    // Sections
    expandedSections,
    setExpandedSections,
    // Cese modals
    aprobarSolicitudId,
    setAprobarSolicitudId,
    rechazarSolicitudId,
    setRechazarSolicitudId,
    observacionesRechazo,
    setObservacionesRechazo,
    procesandoCese,
    handleAprobarCese,
    handleRechazarCese,
    // Descuentos de uniforme pendientes (solo visibilidad; se aprueban en su módulo)
    descuentosPendientes,
    // Bajas de prenda pendientes (se aprueban/rechazan desde el dashboard)
    bajasPendientes,
    procesandoBaja,
    handleAprobarBaja,
    handleRechazarBaja,
    puedeAprobarBaja: hasPermission(usuario, "inventarios:baja_aprobar"),
    // Requerimientos pendientes de aprobación (la aprobación se hace en el detalle)
    requerimientosPendientes,
    puedeAprobarRequerimientos: hasPermission(
      usuario,
      "inventarios:requerimientos_aprobar",
    ),
    // Anulación de contrato
    solicitudesAnulacion,
    aprobarAnulacionId,
    setAprobarAnulacionId,
    rechazarAnulacionId,
    setRechazarAnulacionId,
    observacionesRechazoAnulacion,
    setObservacionesRechazoAnulacion,
    procesandoAnulacion,
    handleAprobarAnulacion,
    handleRechazarAnulacion,
    // Renovación
    showRenovarModal,
    setShowRenovarModal,
    contratoARenovar,
    setContratoARenovar,
    renovarForm,
    setRenovarForm,
    clientes,
    sedes,
    sedesFiltradas,
    plantillas,
    cargos,
    renovando,
    handleAbrirRenovar,
    handleClienteChange,
    handleRenovarContrato,
    // Solicitar cese
    showSolicitarCeseModal,
    setShowSolicitarCeseModal,
    empleadoACesar,
    setEmpleadoACesar,
    ceseForm,
    setCeseForm,
    ceseFiles,
    setCeseFiles,
    tiposCese,
    solicitandoCese,
    handleAbrirSolicitarCese,
    handleSolicitarCese,
    // Computed
    getGreeting,
    formattedDate,
    userName,
    initialRenovarForm,
  };
}
