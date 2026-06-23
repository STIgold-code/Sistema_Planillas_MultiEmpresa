'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { PlantillaContrato } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Search,
  Loader2,
  Eye,
  Pencil,
  Copy,
  Trash2,
  MoreHorizontal,
  FileText,
  Star,
  FileWarning,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/errors';

interface PlantillasResponse {
  data: PlantillaContrato[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const TIPOS_CONTRATO = [
  { value: 'SUJETO_A_MODALIDAD', label: 'Sujeto a Modalidad' },
  { value: 'INDEFINIDO', label: 'Indefinido' },
  { value: 'LOCACION', label: 'Locación de Servicios' },
  { value: 'OBRA_SERVICIO', label: 'Obra o Servicio' },
  { value: 'TIEMPO_PARCIAL', label: 'Tiempo Parcial' },
];

export default function PlantillasContratoPage() {
  const router = useRouter();
  const { getFilter, setFilter, page, setPage, filterParams } = useUrlFilters();
  const [buscarInput, setBuscarInput] = useState(getFilter('buscar'));
  const debouncedSetBuscar = useDebouncedCallback(
    (v: string) => setFilter('buscar', v), 400,
  );

  const [plantillas, setPlantillas] = useState<PlantillaContrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  // Diálogos
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; plantilla: PlantillaContrato | null }>({
    open: false,
    plantilla: null,
  });
  const [duplicando, setDuplicando] = useState<number | null>(null);

  const fetchPlantillas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      const buscar = getFilter('buscar');
      const tipoContrato = getFilter('tipo_contrato');
      const activo = getFilter('activo');
      if (buscar) params.append('buscar', buscar);
      if (tipoContrato) params.append('tipo_contrato', tipoContrato);
      if (activo) params.append('activo', activo);

      const response = await api.get<PlantillasResponse>(`/plantillas-contrato?${params.toString()}`);
      setPlantillas(response.data);
      setMeta(response.meta);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al cargar plantillas'));
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchPlantillas(); }, [filterParams]);

  const handleDuplicar = async (plantilla: PlantillaContrato) => {
    setDuplicando(plantilla.id);
    try {
      await api.post(`/plantillas-contrato/${plantilla.id}/duplicar`, {
        nombre: `${plantilla.nombre} (copia)`,
      });
      toast.success('Plantilla duplicada correctamente');
      fetchPlantillas();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al duplicar plantilla'));
    } finally {
      setDuplicando(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.plantilla) return;

    try {
      await api.delete(`/plantillas-contrato/${deleteDialog.plantilla.id}`);
      toast.success('Plantilla eliminada correctamente');
      setDeleteDialog({ open: false, plantilla: null });
      fetchPlantillas();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar plantilla'));
    }
  };

  const getTipoLabel = (tipo: string) => {
    return TIPOS_CONTRATO.find((t) => t.value === tipo)?.label || tipo;
  };

  return (
    <div className="flex flex-col gap-6 min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plantillas de Contrato</h1>
          <p className="text-muted-foreground">Gestiona los modelos de contrato de la empresa</p>
        </div>
        <Button onClick={() => router.push('/rrhh/plantillas-contrato/nueva')}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Plantilla
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                value={buscarInput}
                onChange={(e) => { setBuscarInput(e.target.value); debouncedSetBuscar(e.target.value); }}
                className="pl-9"
              />
            </div>
            <Select value={getFilter('tipo_contrato')} onValueChange={(v) => setFilter('tipo_contrato', v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de contrato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {TIPOS_CONTRATO.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={getFilter('activo')} onValueChange={(v) => setFilter('activo', v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Activos</SelectItem>
                <SelectItem value="false">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : plantillas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p>No se encontraron plantillas</p>
              <Button
                variant="link"
                onClick={() => router.push('/rrhh/plantillas-contrato/nueva')}
              >
                Crear la primera plantilla
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">Nombre</TableHead>
                  <TableHead className="min-w-[100px]">Tipo</TableHead>
                  <TableHead className="min-w-[150px]">Archivo Word</TableHead>
                  <TableHead className="min-w-[150px]">Contratos</TableHead>
                  <TableHead className="min-w-[100px]">Estado</TableHead>
                  <TableHead className="text-right min-w-[150px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plantillas.map((plantilla) => (
                  <TableRow key={plantilla.id}>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {plantilla.nombre}
                            {plantilla.es_predeterminada && (
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            )}
                          </div>
                          {plantilla.descripcion && (
                            <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                              {plantilla.descripcion}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="outline">{getTipoLabel(plantilla.tipo_contrato)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {plantilla.archivo_base_url ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-xs">Disponible</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-amber-600">
                          <FileWarning className="h-4 w-4" />
                          <span className="text-xs">Sin archivo</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="text-muted-foreground">
                        {plantilla._count?.contratos || 0} contratos
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge variant={plantilla.activo ? 'default' : 'secondary'}>
                        {plantilla.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/rrhh/plantillas-contrato/${plantilla.id}`)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ver
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/rrhh/plantillas-contrato/${plantilla.id}/editar`)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicar(plantilla)}
                            disabled={duplicando === plantilla.id}
                          >
                            {duplicando === plantilla.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Copy className="mr-2 h-4 w-4" />
                            )}
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteDialog({ open: true, plantilla })}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Paginación */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {plantillas.length} de {meta.total} plantillas
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              Anterior
            </Button>
            <span className="flex items-center px-3 text-sm">
              Página {page} de {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= meta.totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, plantilla: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar plantilla</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar la plantilla &quot;{deleteDialog.plantilla?.nombre}&quot;?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
