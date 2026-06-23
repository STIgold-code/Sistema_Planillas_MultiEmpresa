'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Loader2,
  FileSpreadsheet,
  Users,
  DollarSign,
  Calendar,
  FileText,
  Palmtree,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

interface FiltroConfig {
  id: string;
  label: string;
  tipo: 'select' | 'date' | 'number';
  opciones?: { value: string; label: string }[];
  placeholder?: string;
}

interface ReporteConfig {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  formatos: string[];
  filtros: FiltroConfig[];
}

interface CatalogoResponse {
  reportes: ReporteConfig[];
  categorias: { id: string; nombre: string; icono: string }[];
  total: number;
}

interface HistorialItem {
  id: number;
  codigo_reporte: string;
  nombre_reporte: string;
  categoria: string;
  formato: 'EXCEL' | 'PDF';
  total_registros: number;
  tiempo_generacion_ms: number | null;
  created_at: string;
  usuario: {
    id: number;
    nombre_completo: string;
    email: string;
  };
}

interface HistorialResponse {
  data: HistorialItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const categoriaIconos: Record<string, React.ComponentType<{ className?: string }>> = {
  Empleados: Users,
  Planilla: DollarSign,
  Tareo: Calendar,
  Contratos: FileText,
  Vacaciones: Palmtree,
};

const categoriaBadgeColors: Record<string, string> = {
  Empleados: 'bg-blue-100 text-blue-800',
  Planilla: 'bg-green-100 text-green-800',
  Tareo: 'bg-orange-100 text-orange-800',
  Contratos: 'bg-purple-100 text-purple-800',
  Vacaciones: 'bg-teal-100 text-teal-800',
};

export default function ReportesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('catalogo');
  const [loading, setLoading] = useState(true);
  const [catalogo, setCatalogo] = useState<ReporteConfig[]>([]);
  const [categorias, setCategorias] = useState<{ id: string; nombre: string }[]>([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('');
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [historialMeta, setHistorialMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [historialPage, setHistorialPage] = useState(1);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const fetchCatalogo = async () => {
    setLoading(true);
    try {
      const response = await api.get<CatalogoResponse>('/reportes/catalogo');
      setCatalogo(response.reportes);
      setCategorias(response.categorias);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar catálogo';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorial = async (page: number = 1) => {
    setLoadingHistorial(true);
    try {
      const response = await api.get<HistorialResponse>(`/reportes/historial?page=${page}&limit=20`);
      setHistorial(response.data);
      setHistorialMeta(response.meta);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar historial';
      toast.error(errorMessage);
    } finally {
      setLoadingHistorial(false);
    }
  };

  useEffect(() => {
    fetchCatalogo();
  }, []);

  useEffect(() => {
    if (activeTab === 'historial') {
      fetchHistorial(historialPage);
    }
  }, [activeTab, historialPage]);

  const reportesFiltrados = categoriaFiltro
    ? catalogo.filter(r => r.categoria === categoriaFiltro)
    : catalogo;

  const reportesPorCategoria = categorias.map(cat => ({
    ...cat,
    reportes: reportesFiltrados.filter(r => r.categoria === cat.id),
  })).filter(cat => cat.reportes.length > 0);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 min-h-full">
      {/* Header */}
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Reportes</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Genera y descarga reportes de la empresa
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        {/* Catálogo Tab */}
        <TabsContent value="catalogo" className="flex-1 flex flex-col gap-4 mt-4">
          {/* Filtro por categoría */}
          <div className="flex items-center gap-4">
            <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categorias.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {reportesFiltrados.length} reportes disponibles
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-6">
              {reportesPorCategoria.map(categoria => {
                const IconComponent = categoriaIconos[categoria.id] || FileSpreadsheet;
                return (
                  <div key={categoria.id} className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <IconComponent className="h-5 w-5 text-muted-foreground" />
                      <h2 className="font-semibold text-lg">{categoria.nombre}</h2>
                      <Badge variant="secondary" className="ml-2">
                        {categoria.reportes.length}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoria.reportes.map(reporte => (
                        <Card
                          key={reporte.id}
                          className="hover:shadow-md transition-shadow cursor-pointer group"
                          onClick={() => router.push(`/configuracion/reportes/${reporte.id}`)}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-base group-hover:text-primary transition-colors">
                                {reporte.nombre}
                              </CardTitle>
                              <div className="flex gap-1">
                                {reporte.formatos.includes('excel') && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    Excel
                                  </Badge>
                                )}
                                {reporte.formatos.includes('pdf') && (
                                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                    PDF
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <CardDescription className="text-xs line-clamp-2">
                              {reporte.descripcion}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {reporte.filtros.length} filtro{reporte.filtros.length !== 1 ? 's' : ''}
                              </span>
                              <Button variant="ghost" size="sm" className="h-7 text-xs">
                                Generar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Historial Tab */}
        <TabsContent value="historial" className="flex-1 flex flex-col mt-4">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardContent className="p-0 flex-1 flex flex-col">
              {loadingHistorial ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : historial.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mb-4 opacity-50" />
                  <p>No hay reportes generados aún</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <div className="overflow-x-auto flex-1">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[150px]">Fecha</TableHead>
                          <TableHead className="min-w-[200px]">Reporte</TableHead>
                          <TableHead className="min-w-[120px]">Categoría</TableHead>
                          <TableHead className="min-w-[80px]">Formato</TableHead>
                          <TableHead className="min-w-[100px] text-right">Registros</TableHead>
                          <TableHead className="min-w-[80px] text-right">Tiempo</TableHead>
                          <TableHead className="min-w-[150px]">Usuario</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historial.map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="text-sm">
                              {formatDate(item.created_at)}
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              {item.nombre_reporte}
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${categoriaBadgeColors[item.categoria] || 'bg-gray-100 text-gray-800'}`}>
                                {item.categoria}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={item.formato === 'EXCEL' ? 'default' : 'secondary'} className="text-xs">
                                {item.formato}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {item.total_registros.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {formatDuration(item.tiempo_generacion_ms)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]" title={item.usuario.nombre_completo}>
                              {item.usuario.nombre_completo}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Paginación */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-4 border-t mt-auto">
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Mostrando {historial.length} de {historialMeta.total} registros
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistorialPage(p => p - 1)}
                        disabled={historialPage <= 1}
                        className="h-9"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs md:text-sm whitespace-nowrap">
                        Página {historialPage} de {historialMeta.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistorialPage(p => p + 1)}
                        disabled={historialPage >= historialMeta.totalPages}
                        className="h-9"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
