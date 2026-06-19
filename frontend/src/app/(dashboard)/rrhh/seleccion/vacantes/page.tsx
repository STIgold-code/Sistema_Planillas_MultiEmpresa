'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { Vacante, EstadoVacante } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Search, Eye, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface VacantesResponse {
  data: Vacante[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const estadoBadgeVariant: Record<EstadoVacante, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  BORRADOR: 'outline',
  PUBLICADA: 'default',
  EN_PROCESO: 'secondary',
  CERRADA: 'outline',
  CANCELADA: 'destructive',
};

export default function VacantesPage() {
  const router = useRouter();
  const { getFilter, setFilter, page, setPage, filterParams } = useUrlFilters();
  const [buscarInput, setBuscarInput] = useState(getFilter('buscar'));
  const debouncedSetBuscar = useDebouncedCallback(
    (v: string) => setFilter('buscar', v), 400,
  );

  const [vacantes, setVacantes] = useState<Vacante[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  const fetchVacantes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      const buscar = getFilter('buscar');
      const estado = getFilter('estado');
      if (buscar) params.append('buscar', buscar);
      if (estado) params.append('estado', estado);

      const response = await api.get<VacantesResponse>(`/vacantes?${params.toString()}`);
      setVacantes(response.data);
      setMeta(response.meta);
    } catch (error) {
      console.error('Error fetching vacantes:', error);
      toast.error('Error al cargar las vacantes');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchVacantes(); }, [filterParams]);

  return (
    <div className="flex flex-col gap-4 md:gap-6 min-h-full">
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Vacantes</h1>
          <p className="text-muted-foreground">Gestiona las vacantes de empleo</p>
        </div>
        <Button asChild>
          <Link href="/rrhh/seleccion/vacantes/nueva">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Vacante
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por codigo o titulo..."
            value={buscarInput}
            onChange={(e) => { setBuscarInput(e.target.value); debouncedSetBuscar(e.target.value); }}
            className="pl-10"
          />
        </div>
        <Select value={getFilter('estado')} onValueChange={(v) => setFilter('estado', v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="BORRADOR">Borrador</SelectItem>
            <SelectItem value="PUBLICADA">Publicada</SelectItem>
            <SelectItem value="EN_PROCESO">En Proceso</SelectItem>
            <SelectItem value="CERRADA">Cerrada</SelectItem>
            <SelectItem value="CANCELADA">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto -mx-4 md:mx-0 flex-1">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden md:rounded-lg border-0 md:border">
            <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px]">Codigo</TableHead>
              <TableHead className="min-w-[100px]">Titulo</TableHead>
              <TableHead className="min-w-[100px]">Area</TableHead>
              <TableHead className="min-w-[100px]">Sede</TableHead>
              <TableHead className="min-w-[100px]">Cargo</TableHead>
              <TableHead className="text-center min-w-[150px]">Puestos</TableHead>
              <TableHead className="text-center min-w-[150px]">Postulantes</TableHead>
              <TableHead className="text-center min-w-[150px]">Aprobados</TableHead>
              <TableHead className="min-w-[100px]">Estado</TableHead>
              <TableHead className="w-[80px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : vacantes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No hay vacantes registradas
                </TableCell>
              </TableRow>
            ) : (
              vacantes.map((vacante) => (
                <TableRow key={vacante.id}>
                  <TableCell className="font-mono text-sm">{vacante.codigo}</TableCell>
                  <TableCell className="font-medium text-sm max-w-[180px] truncate" title={vacante.titulo}>{vacante.titulo}</TableCell>
                  <TableCell className="text-sm max-w-[180px] truncate" title={vacante.area?.nombre}>{vacante.area?.nombre || '-'}</TableCell>
                  <TableCell className="text-sm max-w-[180px] truncate" title={vacante.sede?.nombre}>{vacante.sede?.nombre || '-'}</TableCell>
                  <TableCell className="text-sm max-w-[180px] truncate" title={vacante.cargo?.nombre}>{vacante.cargo?.nombre || '-'}</TableCell>
                  <TableCell className="text-center">{vacante.cantidad_puestos}</TableCell>
                  <TableCell className="text-center">
                    <Link
                      href={`/rrhh/seleccion/vacantes/${vacante.id}`}
                      className="text-primary hover:underline"
                    >
                      {vacante._count?.postulantes || 0}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-medium ${(vacante._count?.aprobados || 0) > 0 ? 'text-green-600' : ''}`}>
                      {vacante._count?.aprobados || 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <Badge variant={estadoBadgeVariant[vacante.estado]}>{vacante.estado}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/rrhh/seleccion/vacantes/${vacante.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
            </div>
          </div>
        </div>

      {meta.totalPages > 1 && (
        <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {vacantes.length} de {meta.total} vacantes
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Pagina {page} de {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(page + 1)}
              disabled={page >= meta.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
