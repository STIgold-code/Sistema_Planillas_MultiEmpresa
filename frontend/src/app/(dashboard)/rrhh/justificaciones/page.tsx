'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Loader2,
  Search,
  FileText,
  Eye,
  Paperclip,
  Calendar,
  User,
  Download,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  BedDouble,
  UserCheck,
  Briefcase,
  Baby,
  Heart,
  Palmtree,
  MoreHorizontal,
  Image,
  File,
} from 'lucide-react';
import { toast } from 'sonner';
import { TareoJustificacion, TipoJustificacion } from '@/types';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';

// Configuración de tipos de justificación
const TIPOS_JUSTIFICACION: {
  value: TipoJustificacion;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}[] = [
  { value: 'CERTIFICADO_MEDICO', label: 'Certificado Médico', icon: <Stethoscope className="h-4 w-4" />, color: 'text-red-600', bgColor: 'bg-red-100' },
  { value: 'DESCANSO_MEDICO', label: 'Descanso Médico', icon: <BedDouble className="h-4 w-4" />, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  { value: 'PERMISO_PERSONAL', label: 'Permiso Personal', icon: <UserCheck className="h-4 w-4" />, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { value: 'PERMISO_LABORAL', label: 'Permiso Laboral', icon: <Briefcase className="h-4 w-4" />, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  { value: 'LICENCIA_MATERNIDAD', label: 'Licencia Maternidad', icon: <Baby className="h-4 w-4" />, color: 'text-pink-600', bgColor: 'bg-pink-100' },
  { value: 'LICENCIA_PATERNIDAD', label: 'Licencia Paternidad', icon: <Baby className="h-4 w-4" />, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  { value: 'LICENCIA_FALLECIMIENTO', label: 'Licencia Fallecimiento', icon: <Heart className="h-4 w-4" />, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  { value: 'VACACIONES', label: 'Vacaciones', icon: <Palmtree className="h-4 w-4" />, color: 'text-green-600', bgColor: 'bg-green-100' },
  { value: 'OTRO', label: 'Otro', icon: <MoreHorizontal className="h-4 w-4" />, color: 'text-gray-500', bgColor: 'bg-gray-50' },
];

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

interface JustificacionesResponse {
  data: TareoJustificacion[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface Sede {
  id: number;
  nombre: string;
}

interface Area {
  id: number;
  nombre: string;
}

function getTipoInfo(tipo: TipoJustificacion) {
  return TIPOS_JUSTIFICACION.find((t) => t.value === tipo) || TIPOS_JUSTIFICACION[8];
}

function getFileIcon(tipo: string) {
  if (tipo.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
  if (tipo.includes('image') || tipo.includes('jpg') || tipo.includes('jpeg') || tipo.includes('png')) {
    // Image es el icono de lucide-react, no un elemento <img>; la regla de alt-text no aplica.
    // eslint-disable-next-line jsx-a11y/alt-text
    return <Image className="h-5 w-5 text-blue-500" />;
  }
  if (tipo.includes('doc')) return <FileText className="h-5 w-5 text-blue-700" />;
  return <File className="h-5 w-5 text-gray-500" />;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function JustificacionesPage() {
  const [justificaciones, setJustificaciones] = useState<TareoJustificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  void areas;

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState<string>('all');
  const [anio, setAnio] = useState<number>(new Date().getFullYear());
  const [mes, setMes] = useState<string>('all');
  const [sedeId, setSedeId] = useState<string>('all');
  const [areaId, setAreaId] = useState<string>('all');
  void setAreaId;

  // Paginación
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  // Modal de detalle/archivos
  const [selectedJustificacion, setSelectedJustificacion] = useState<TareoJustificacion | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Modal de vista previa de archivos
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<{ archivo_url: string; archivo_nombre: string; archivo_tipo?: string }[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  // Generar años para el select (últimos 5 años)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const fetchJustificaciones = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      params.append('anio', anio.toString());

      if (busqueda) params.append('busqueda', busqueda);
      if (tipo !== 'all') params.append('tipo', tipo);
      if (mes !== 'all') params.append('mes', mes);
      if (sedeId !== 'all') params.append('sede_id', sedeId);
      if (areaId !== 'all') params.append('area_id', areaId);

      const response = await api.get<JustificacionesResponse>(
        `/tareo/justificaciones?${params.toString()}`
      );

      setJustificaciones(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch (error) {
      console.error('Error fetching justificaciones:', error);
      toast.error('Error al cargar justificaciones');
    } finally {
      setLoading(false);
    }
  }, [page, limit, anio, busqueda, tipo, mes, sedeId, areaId]);

  const fetchSedes = async () => {
    try {
      const data = await api.get<Sede[]>('/tareo/sedes');
      setSedes(data);
    } catch (error) {
      console.error('Error fetching sedes:', error);
    }
  };

  const fetchAreas = async () => {
    try {
      const data = await api.get<Area[]>('/masters/areas');
      setAreas(data);
    } catch (error) {
      console.error('Error fetching areas:', error);
    }
  };

  useEffect(() => {
    fetchSedes();
    fetchAreas();
  }, []);

  useEffect(() => {
    fetchJustificaciones();
  }, [fetchJustificaciones]);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [busqueda]);

  const handleFilterChange = () => {
    setPage(1);
  };

  const openDetail = (j: TareoJustificacion) => {
    setSelectedJustificacion(j);
    setDetailOpen(true);
  };

  const getEmpleadoNombre = (j: TareoJustificacion) => {
    if (!j.tareo?.empleado) return 'N/A';
    const emp = j.tareo.empleado;
    return `${emp.apellido_paterno} ${emp.apellido_materno}, ${emp.nombres}`;
  };

  const getEmpleadoInitials = (j: TareoJustificacion) => {
    if (!j.tareo?.empleado) return 'NA';
    const emp = j.tareo.empleado;
    return `${emp.nombres[0]}${emp.apellido_paterno[0]}`.toUpperCase();
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 min-h-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Banco de Justificaciones</h1>
            <p className="text-muted-foreground">
              Consulta todas las justificaciones y documentos adjuntos de los empleados
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o documento..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Select value={anio.toString()} onValueChange={(v) => { setAnio(parseInt(v)); handleFilterChange(); }}>
            <SelectTrigger>
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={mes} onValueChange={(v) => { setMes(v); handleFilterChange(); }}>
            <SelectTrigger>
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los meses</SelectItem>
              {MESES.map((m, i) => (
                <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tipo} onValueChange={(v) => { setTipo(v); handleFilterChange(); }}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {TIPOS_JUSTIFICACION.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <div className="flex items-center gap-2">
                    <span className={t.color}>{t.icon}</span>
                    <span>{t.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sedeId} onValueChange={(v) => { setSedeId(v); handleFilterChange(); }}>
            <SelectTrigger>
              <SelectValue placeholder="Sede" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sedes</SelectItem>
              {sedes.map((s) => (
                <SelectItem key={s.id} value={s.id.toString()}>{s.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Estadísticas */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Total: <strong className="text-foreground">{total}</strong> justificaciones</span>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden md:rounded-lg border-0 md:border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[250px]">Empleado</TableHead>
                    <TableHead className="min-w-[150px]">Tipo</TableHead>
                    <TableHead className="min-w-[120px]">Período</TableHead>
                    <TableHead className="min-w-[100px]">Días</TableHead>
                    <TableHead className="text-center min-w-[80px]">Archivos</TableHead>
                    <TableHead className="min-w-[150px]">Registrado por</TableHead>
                    <TableHead className="w-[80px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : justificaciones.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No hay justificaciones registradas
                      </TableCell>
                    </TableRow>
                  ) : (
                    justificaciones.map((j) => {
                      const tipoInfo = getTipoInfo(j.tipo);
                      return (
                        <TableRow key={j.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={j.tareo?.empleado?.foto_url} />
                                <AvatarFallback className="text-xs">
                                  {getEmpleadoInitials(j)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{getEmpleadoNombre(j)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {j.tareo?.empleado?.numero_documento}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`${tipoInfo.bgColor} ${tipoInfo.color} border-0`}>
                              <span className="mr-1">{tipoInfo.icon}</span>
                              {tipoInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {j.tareo?.periodo ? (
                                <span>{MESES[j.tareo.periodo.mes - 1]} {j.tareo.periodo.anio}</span>
                              ) : 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {j.dia_inicio === j.dia_fin
                                ? `Día ${j.dia_inicio}`
                                : `${j.dia_inicio} - ${j.dia_fin}`}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium">{j.archivos.length}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <User className="h-3.5 w-3.5" />
                              <span className="truncate max-w-[120px]">
                                {j.usuario?.nombre_completo || 'N/A'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openDetail(j)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver detalle</TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Modal de Detalle */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detalle de Justificación
              </DialogTitle>
            </DialogHeader>

            {selectedJustificacion && (
              <div className="space-y-6">
                {/* Info del empleado */}
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedJustificacion.tareo?.empleado?.foto_url} />
                    <AvatarFallback>
                      {getEmpleadoInitials(selectedJustificacion)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{getEmpleadoNombre(selectedJustificacion)}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedJustificacion.tareo?.empleado?.numero_documento}
                    </p>
                  </div>
                </div>

                {/* Info de la justificación */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <Badge
                      variant="secondary"
                      className={`mt-1 ${getTipoInfo(selectedJustificacion.tipo).bgColor} ${getTipoInfo(selectedJustificacion.tipo).color} border-0`}
                    >
                      <span className="mr-1">{getTipoInfo(selectedJustificacion.tipo).icon}</span>
                      {getTipoInfo(selectedJustificacion.tipo).label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Período</p>
                    <p className="font-medium mt-1">
                      {selectedJustificacion.tareo?.periodo ? (
                        `${MESES[selectedJustificacion.tareo.periodo.mes - 1]} ${selectedJustificacion.tareo.periodo.anio}`
                      ) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Días</p>
                    <p className="font-medium mt-1">
                      {selectedJustificacion.dia_inicio === selectedJustificacion.dia_fin
                        ? `Día ${selectedJustificacion.dia_inicio}`
                        : `Del día ${selectedJustificacion.dia_inicio} al ${selectedJustificacion.dia_fin}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Registrado por</p>
                    <p className="font-medium mt-1">
                      {selectedJustificacion.usuario?.nombre_completo || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Descripción */}
                {selectedJustificacion.descripcion && (
                  <div>
                    <p className="text-sm text-muted-foreground">Observaciones</p>
                    <p className="mt-1 text-sm bg-muted/50 p-3 rounded-lg">
                      {selectedJustificacion.descripcion}
                    </p>
                  </div>
                )}

                {/* Archivos adjuntos */}
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Archivos adjuntos ({selectedJustificacion.archivos.length})
                  </p>
                  {selectedJustificacion.archivos.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      No hay archivos adjuntos
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedJustificacion.archivos.map((archivo) => (
                        <div
                          key={archivo.id}
                          className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border hover:border-primary/50 transition-colors"
                        >
                          {getFileIcon(archivo.archivo_tipo)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {archivo.archivo_nombre}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(archivo.archivo_size)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const archivos = selectedJustificacion?.archivos || [];
                                    const index = archivos.findIndex(a => a.id === archivo.id);
                                    setPreviewFiles(archivos.map(a => ({
                                      archivo_url: a.archivo_url,
                                      archivo_nombre: a.archivo_nombre,
                                      archivo_tipo: a.archivo_tipo,
                                    })));
                                    setPreviewIndex(index >= 0 ? index : 0);
                                    setPreviewOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Vista previa</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                >
                                  <a
                                    href={archivo.archivo_url}
                                    download={archivo.archivo_nombre}
                                  >
                                    <Download className="h-4 w-4" />
                                  </a>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Descargar</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de vista previa de archivos */}
        <FilePreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          files={previewFiles}
          initialIndex={previewIndex}
        />
      </div>
    </TooltipProvider>
  );
}
