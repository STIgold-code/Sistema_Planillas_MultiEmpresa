'use client';

import { useState } from 'react';
import { EstadoContrato } from '@/types';
import { Button } from '@/components/ui/button';
import { SolicitarAnulacionDialog } from '@/components/solicitudes-anulacion/SolicitarAnulacionDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Plus,
  FileText,
  Download,
  RefreshCw,
  XCircle,
  Eye,
  Calendar,
  Building2,
  MapPin,
  Banknote,
  AlertTriangle,
  UserCheck,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmpleadoContratos } from './useEmpleadoContratos';
import { ContratoNuevoDialog } from './dialogs/ContratoNuevoDialog';
import { ContratoRenovarDialog } from './dialogs/ContratoRenovarDialog';
import { ContratoCeseDialog } from './dialogs/ContratoCeseDialog';
import { ContratoReingresoDialog } from './dialogs/ContratoReingresoDialog';
import { ContratoDetalleDialog } from './dialogs/ContratoDetalleDialog';
import { ContratoGenerarBancoDialog } from './dialogs/ContratoGenerarBancoDialog';

const TIPOS_CONTRATO = [
  { value: 'SUJETO_A_MODALIDAD', label: 'Sujeto a Modalidad' },
  { value: 'INDEFINIDO', label: 'Indefinido' },
  { value: 'LOCACION', label: 'Locación de Servicios' },
  { value: 'OBRA_SERVICIO', label: 'Obra o Servicio' },
  { value: 'TIEMPO_PARCIAL', label: 'Tiempo Parcial' },
];

const estadoBadgeVariant: Record<EstadoContrato, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVO: 'default',
  PENDIENTE: 'secondary',
  RENOVADO: 'secondary',
  CESADO: 'destructive',
  ANULADO: 'outline',
};

const estadoBadgeClass: Record<EstadoContrato, string> = {
  ACTIVO: '',
  PENDIENTE: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100/80',
  RENOVADO: '',
  CESADO: '',
  ANULADO: 'bg-red-50 text-red-700 border-red-200 line-through hover:bg-red-50/80',
};

interface EmpleadoContratosProps {
  empleadoId: number;
  sueldoBase?: number;
  estadoEmpleado?: string;
  fechaCese?: string;
  clienteId?: number;
  sedeId?: number;
  cargoId?: number;
  onEmpleadoUpdate?: () => void;
}

export function EmpleadoContratos({ empleadoId, sueldoBase, estadoEmpleado, fechaCese, clienteId, sedeId, cargoId, onEmpleadoUpdate }: EmpleadoContratosProps) {
  const [contratoAAnular, setContratoAAnular] = useState<{
    id: number;
    tipo_contrato: string;
    fecha_inicio: string;
    fecha_fin?: string | null;
    estado: string;
    numero_renovacion?: number | null;
  } | null>(null);

  const {
    contratos, loading, plantillas, clientes, sedes, sedesFiltradas,
    plantillasBanco, cargos, tiposCese,
    showNuevoModal, setShowNuevoModal,
    showRenovarModal, setShowRenovarModal,
    showReingresoModal, setShowReingresoModal,
    showSolicitarCeseModal, setShowSolicitarCeseModal,
    showDetalleModal, setShowDetalleModal,
    showGenerarBancoModal, setShowGenerarBancoModal,
    form, setForm, initialFormState,
    selectedContrato, setSelectedContrato,
    selectedPlantilla, setSelectedPlantilla,
    selectedPlantillaBanco, setSelectedPlantillaBanco,
    activeTab, setActiveTab,
    ceseForm, setCeseForm, ceseFiles, setCeseFiles,
    saving, generating, downloadingContratoId,
    contratoVigente, ultimoContratoVencido, esCesado, historial,
    expandedVinculos, vinculosAgrupados,
    diasParaVencer, proximoAVencer,
    toggleVinculo, fetchContratos,
    handleClienteChange, handleSedeChange,
    formatDate, formatCurrency, getDiasParaVencer,
    handleNuevoContrato, generarDocumentoParaContrato,
    handleDescargarContrato, handleCrearContrato,
    handleRenovarClick, handleRenovarVencidoClick,
    handleRenovarVencido, handleReingresoClick, handleReingreso,
    handleRenovarContrato, handleSolicitarCese,
    handleGenerarUnificado, handleVerDetalle, handleGenerarDocClick,
    calcularDuracionVinculo,
  } = useEmpleadoContratos({ empleadoId, sueldoBase, estadoEmpleado, fechaCese, clienteId, sedeId, cargoId, onEmpleadoUpdate });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Contratos</h3>
          {contratoVigente ? (
            <Badge variant="default">Contrato Vigente</Badge>
          ) : esCesado ? (
            <Badge variant="destructive">Empleado en BAJA</Badge>
          ) : (
            <Badge variant="destructive">Sin Contrato</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowGenerarBancoModal(true)}>
            <FileText className="mr-2 h-4 w-4" />
            Emitir Documento
          </Button>
          {esCesado ? (
            <Button onClick={handleReingresoClick}>
              <UserCheck className="mr-2 h-4 w-4" />
              Reingreso
            </Button>
          ) : !contratoVigente && ultimoContratoVencido ? (
            <Button onClick={handleRenovarVencidoClick}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Renovacion
            </Button>
          ) : !contratoVigente ? (
            <Button onClick={handleNuevoContrato}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Contrato
            </Button>
          ) : null}
        </div>
      </div>

      {/* Alerta si próximo a vencer */}
      {proximoAVencer && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Contrato próximo a vencer
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                El contrato vence en {diasParaVencer} días ({formatDate(contratoVigente?.fecha_fin)})
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={handleRenovarClick}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Renovar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Contrato Vigente */}
      {contratoVigente ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Contrato Vigente</CardTitle>
                <CardDescription>
                  {TIPOS_CONTRATO.find((t) => t.value === contratoVigente.tipo_contrato)?.label ||
                    contratoVigente.tipo_contrato}
                </CardDescription>
              </div>
              <Badge variant={estadoBadgeVariant[contratoVigente.estado]} className={cn(estadoBadgeClass[contratoVigente.estado])}>
                {contratoVigente.estado}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Período</p>
                  <p className="text-sm font-medium">
                    {formatDate(contratoVigente.fecha_inicio)} -{' '}
                    {contratoVigente.fecha_fin ? formatDate(contratoVigente.fecha_fin) : 'Indefinido'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Remuneración</p>
                  <p className="text-sm font-medium">{formatCurrency(contratoVigente.remuneracion)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Nº Renovación</p>
                  <p className="text-sm font-medium">{contratoVigente.numero_renovacion || 1}</p>
                </div>
              </div>
              {(contratoVigente.cliente || contratoVigente.empresa_cliente) && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="text-sm font-medium">
                      {contratoVigente.cliente?.razon_social || contratoVigente.empresa_cliente}
                    </p>
                  </div>
                </div>
              )}
              {contratoVigente.lugar_trabajo && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Lugar</p>
                    <p className="text-sm font-medium">{contratoVigente.lugar_trabajo}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => handleVerDetalle(contratoVigente)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Detalles
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerarDocClick(contratoVigente)}
              >
                <FileText className="mr-2 h-4 w-4" />
                Generar Documento
              </Button>
              {!proximoAVencer && (
                <Button variant="outline" size="sm" onClick={handleRenovarClick}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Renovar
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setShowSolicitarCeseModal(true)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Solicitar Cese
              </Button>
            </div>

            {/* Archivo descargable */}
            {contratoVigente.archivo_url && (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Documento de contrato</p>
                  <p className="text-xs text-muted-foreground">
                    {contratoVigente.archivo_url.split('/').pop()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDescargarContrato(contratoVigente.id)}
                  disabled={downloadingContratoId === contratoVigente.id}
                >
                  {downloadingContratoId === contratoVigente.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Descargar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Sin contrato vigente</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Este empleado no tiene un contrato activo. Cree uno nuevo para formalizar la relación
              laboral.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={handleNuevoContrato}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Contrato
              </Button>
              {/* Permitir cese si el empleado está ACTIVO aunque no tenga contrato vigente */}
              {estadoEmpleado === 'ACTIVO' && (
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowSolicitarCeseModal(true)}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Solicitar Cese
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de Contratos - Tabla Agrupada por Vínculos */}
      {contratos.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Historial de Contratos
            </CardTitle>
            <CardDescription>
              {vinculosAgrupados.length} vínculo(s) laboral(es) - {contratos.length} contrato(s) total
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-muted/50 text-left text-xs font-semibold text-muted-foreground border-y">
                    <th className="px-3 py-2.5 w-10">#</th>
                    <th className="px-3 py-2.5">Vínculo / Contrato</th>
                    <th className="px-3 py-2.5">Tipo</th>
                    <th className="px-3 py-2.5">Fecha Inicio</th>
                    <th className="px-3 py-2.5">Fecha Fin</th>
                    <th className="px-3 py-2.5">Duración</th>
                    <th className="px-3 py-2.5">Estado</th>
                    <th className="px-3 py-2.5 bg-amber-50/70">F. Cese</th>
                    <th className="px-3 py-2.5 bg-amber-50/70">Motivo</th>
                    <th className="px-3 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {vinculosAgrupados.map((vinculo, vIndex) => {
                    const isExpanded = expandedVinculos.has(vinculo.id);
                    const isActivo = vinculo.estado === 'ACTIVO';

                    return (
                      <>
                        {/* Separador visual entre vínculos */}
                        {vIndex > 0 && (
                          <tr key={`sep-${vinculo.id}`}>
                            <td colSpan={10} className="h-1.5 bg-muted/30"></td>
                          </tr>
                        )}

                        {/* Fila del Vínculo (Header) */}
                        <tr
                          key={`vinculo-${vinculo.id}`}
                          className={`font-medium cursor-pointer transition-colors ${
                            isActivo
                              ? 'bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50'
                              : 'bg-muted/30 hover:bg-muted/50 opacity-70'
                          }`}
                          onClick={() => toggleVinculo(vinculo.id)}
                        >
                          <td className="px-3 py-2.5">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                                isActivo ? 'bg-green-500' : 'bg-muted-foreground'
                              }`}
                            >
                              {vinculo.numero}
                            </div>
                          </td>
                          <td className="px-3 py-2.5" colSpan={4}>
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                              <span className={isActivo ? 'text-green-800 dark:text-green-200' : 'text-muted-foreground'}>
                                VÍNCULO LABORAL #{vinculo.id} — {vinculo.descripcion}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({vinculo.contratos.length} {vinculo.contratos.length === 1 ? 'contrato' : 'contratos'})
                              </span>
                            </div>
                          </td>
                          <td className={`px-3 py-2.5 ${isActivo ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                            {vinculo.duracion}
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge
                              variant={isActivo ? 'default' : 'secondary'}
                              className={`text-xs ${isActivo ? 'bg-green-500 hover:bg-green-600' : 'bg-muted-foreground'}`}
                            >
                              {vinculo.estado}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 bg-amber-50/40 text-sm">
                            {vinculo.fechaFin ? (
                              <span className="font-medium text-amber-900">{formatDate(vinculo.fechaFin)}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 bg-amber-50/40 text-sm">
                            {vinculo.motivoCierre ? (
                              <span className="text-foreground" title={vinculo.motivoCierre}>
                                {vinculo.motivoCierre.length > 30
                                  ? vinculo.motivoCierre.slice(0, 30) + '…'
                                  : vinculo.motivoCierre}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5"></td>
                        </tr>

                        {/* Filas de Contratos (colapsables) */}
                        {isExpanded &&
                          vinculo.contratos.map((contrato) => {
                            const isVigente = contrato.estado === 'ACTIVO';
                            const isAnulado = contrato.estado === 'ANULADO';
                            const renovacionLabel = contrato.numero_renovacion === 1
                              ? '(original)'
                              : `(${(contrato.numero_renovacion || 1) - 1}° renovación)`;

                            return (
                              <tr
                                key={`contrato-${contrato.id}`}
                                className={`transition-colors ${
                                  isVigente
                                    ? 'hover:bg-blue-50 dark:hover:bg-blue-950/30'
                                    : 'hover:bg-muted/30'
                                } ${!isActivo ? 'opacity-60' : ''} ${isAnulado ? 'bg-red-50/40 dark:bg-red-950/20' : ''}`}
                              >
                                <td className="px-3 py-2.5 text-muted-foreground text-sm pl-7">
                                  └
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className={`flex items-center gap-2 ${isAnulado ? 'line-through text-muted-foreground' : ''}`}>
                                    <span className={`font-medium ${isVigente ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>
                                      Contrato #{contrato.id}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {renovacionLabel}
                                    </span>
                                    {contrato.plantilla?.nombre?.toLowerCase().includes('adenda') && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                                        Adenda N° {(contrato.numero_renovacion || 1) - 1}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-sm text-muted-foreground">
                                  {TIPOS_CONTRATO.find(t => t.value === contrato.tipo_contrato)?.label || contrato.tipo_contrato}
                                </td>
                                <td className="px-3 py-2.5 text-sm">
                                  {formatDate(contrato.fecha_inicio)}
                                </td>
                                <td className="px-3 py-2.5 text-sm">
                                  {contrato.fecha_fin ? formatDate(contrato.fecha_fin) : 'Indefinido'}
                                </td>
                                <td className="px-3 py-2.5 text-sm text-muted-foreground">
                                  {calcularDuracionVinculo(contrato.fecha_inicio, contrato.fecha_fin || undefined)}
                                </td>
                                <td className="px-3 py-2.5">
                                  <Badge variant={estadoBadgeVariant[contrato.estado]} className={cn("text-xs", estadoBadgeClass[contrato.estado])}>
                                    {contrato.estado}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2.5 bg-amber-50/20 text-sm">
                                  {contrato.fecha_cese ? (
                                    <span className="text-muted-foreground text-xs">{formatDate(contrato.fecha_cese)}</span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 bg-amber-50/20 text-sm">
                                  {contrato.motivo_cese ? (
                                    <span className="text-muted-foreground text-xs" title={contrato.motivo_cese}>
                                      {contrato.motivo_cese.length > 25
                                        ? contrato.motivo_cese.slice(0, 25) + '…'
                                        : contrato.motivo_cese}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleVerDetalle(contrato);
                                      }}
                                      title="Ver detalle"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    {!isAnulado && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setContratoAAnular(contrato);
                                        }}
                                        title="Solicitar anulación"
                                      >
                                        <XCircle className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Leyenda */}
            <div className="flex flex-wrap items-center gap-4 p-4 border-t text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span> Vínculo Activo
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-muted-foreground rounded-full"></span> Vínculo Cerrado
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded"></span> Contrato Vigente
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-muted-foreground rounded"></span> Contrato Renovado
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <ContratoNuevoDialog
        open={showNuevoModal}
        onOpenChange={setShowNuevoModal}
        form={form}
        setForm={setForm}
        clientes={clientes}
        sedesFiltradas={sedesFiltradas}
        plantillas={plantillas}
        saving={saving}
        handleClienteChange={handleClienteChange}
        handleSedeChange={handleSedeChange}
        handleCrearContrato={handleCrearContrato}
      />

      <ContratoRenovarDialog
        open={showRenovarModal}
        onOpenChange={setShowRenovarModal}
        form={form}
        setForm={setForm}
        clientes={clientes}
        sedesFiltradas={sedesFiltradas}
        cargos={cargos}
        plantillas={plantillas}
        saving={saving}
        handleClienteChange={handleClienteChange}
        handleSedeChange={handleSedeChange}
        handleRenovarContrato={handleRenovarContrato}
      />

      <ContratoCeseDialog
        open={showSolicitarCeseModal}
        onOpenChange={setShowSolicitarCeseModal}
        ceseForm={ceseForm}
        setCeseForm={setCeseForm}
        ceseFiles={ceseFiles}
        setCeseFiles={setCeseFiles}
        tiposCese={tiposCese}
        saving={saving}
        handleSolicitarCese={handleSolicitarCese}
        empleadoId={empleadoId}
      />

      <ContratoReingresoDialog
        open={showReingresoModal}
        onOpenChange={setShowReingresoModal}
        form={form}
        setForm={setForm}
        clientes={clientes}
        sedesFiltradas={sedesFiltradas}
        plantillas={plantillas}
        saving={saving}
        handleClienteChange={handleClienteChange}
        handleSedeChange={handleSedeChange}
        handleReingreso={handleReingreso}
      />

      <ContratoDetalleDialog
        open={showDetalleModal}
        onOpenChange={setShowDetalleModal}
        selectedContrato={selectedContrato}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
        handleGenerarDocClick={handleGenerarDocClick}
      />

      <ContratoGenerarBancoDialog
        open={showGenerarBancoModal}
        onOpenChange={setShowGenerarBancoModal}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        plantillas={plantillas}
        plantillasBanco={plantillasBanco}
        selectedPlantilla={selectedPlantilla}
        setSelectedPlantilla={setSelectedPlantilla}
        selectedPlantillaBanco={selectedPlantillaBanco}
        setSelectedPlantillaBanco={setSelectedPlantillaBanco}
        generating={generating}
        handleGenerarUnificado={handleGenerarUnificado}
      />

      <SolicitarAnulacionDialog
        open={contratoAAnular !== null}
        contrato={contratoAAnular}
        onOpenChange={(open) => { if (!open) setContratoAAnular(null); }}
        onSuccess={() => {
          setContratoAAnular(null);
          fetchContratos();
        }}
      />
    </div>
  );
}
