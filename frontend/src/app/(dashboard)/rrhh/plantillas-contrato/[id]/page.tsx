'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlantillaContrato, Empleado } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  ArrowLeft,
  Loader2,
  Pencil,
  Trash2,
  Star,
  FileText,
  Calendar,
  Copy,
  Download,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/errors';
import { getAccessToken } from '@/lib/api';

const TIPOS_CONTRATO: Record<string, string> = {
  SUJETO_A_MODALIDAD: 'Sujeto a Modalidad',
  INDEFINIDO: 'Indefinido',
  LOCACION: 'Locación de Servicios',
  OBRA_SERVICIO: 'Obra o Servicio',
  TIEMPO_PARCIAL: 'Tiempo Parcial',
};

interface EmpleadosResponse {
  data: Empleado[];
  meta: { total: number };
}

export default function VerPlantillaPage() {
  const router = useRouter();
  const params = useParams();
  const plantillaId = params.id as string;

  const [plantilla, setPlantilla] = useState<PlantillaContrato | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [duplicarDialog, setDuplicarDialog] = useState(false);
  const [duplicarNombre, setDuplicarNombre] = useState('');
  const [duplicando, setDuplicando] = useState(false);

  // Estado para generar contrato
  const [generateDialog, setGenerateDialog] = useState(false);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [searchEmpleado, setSearchEmpleado] = useState('');
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);
  const [searchingEmpleados, setSearchingEmpleados] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchPlantilla = async () => {
      setLoading(true);
      try {
        const response = await api.get<PlantillaContrato>(`/plantillas-contrato/${plantillaId}`);
        setPlantilla(response);
      } catch (error: unknown) {
        toast.error(getApiErrorMessage(error, 'Error al cargar la plantilla'));
        router.push('/rrhh/plantillas-contrato');
      } finally {
        setLoading(false);
      }
    };

    fetchPlantilla();
  }, [plantillaId, router]);

  const openDuplicarDialog = () => {
    setDuplicarNombre(plantilla ? `${plantilla.nombre} - ` : '');
    setDuplicarDialog(true);
  };

  const handleDuplicar = async () => {
    if (!plantilla || !duplicarNombre.trim()) return;
    setDuplicando(true);
    try {
      const nuevaPlantilla = await api.post<PlantillaContrato>(
        `/plantillas-contrato/${plantillaId}/duplicar`,
        { nombre: duplicarNombre.trim() },
      );
      toast.success('Plantilla duplicada. Ahora puedes editar el contenido y subir un nuevo archivo Word.');
      setDuplicarDialog(false);
      router.push(`/rrhh/plantillas-contrato/${nuevaPlantilla.id}/editar`);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al duplicar plantilla'));
    } finally {
      setDuplicando(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/plantillas-contrato/${plantillaId}`);
      toast.success('Plantilla eliminada correctamente');
      router.push('/rrhh/plantillas-contrato');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar plantilla'));
    }
  };

  const searchEmpleados = async () => {
    if (!searchEmpleado.trim()) return;

    setSearchingEmpleados(true);
    try {
      const response = await api.get<EmpleadosResponse>(
        `/empleados?buscar=${encodeURIComponent(searchEmpleado)}&limit=10`
      );
      setEmpleados(response.data);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al buscar empleados'));
    } finally {
      setSearchingEmpleados(false);
    }
  };

  const handleGenerateContract = async () => {
    if (!selectedEmpleado) {
      toast.error('Seleccione un empleado');
      return;
    }

    setGenerating(true);
    try {
      const token = getAccessToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/plantillas-contrato/${plantillaId}/generar`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            empleado_id: selectedEmpleado.id,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al generar contrato');
      }

      // Descargar archivo
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'contrato.docx';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Contrato generado y descargado');
      setGenerateDialog(false);
      setSelectedEmpleado(null);
      setEmpleados([]);
      setSearchEmpleado('');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al generar contrato'));
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!plantilla) {
    return null;
  }

  const variables = (plantilla.variables as string[]) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/rrhh/plantillas-contrato">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{plantilla.nombre}</h1>
              {plantilla.es_predeterminada && (
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              )}
            </div>
            <p className="text-muted-foreground">
              {plantilla.descripcion || 'Sin descripción'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setGenerateDialog(true)} disabled={!plantilla.archivo_base_url}>
            <Download className="mr-2 h-4 w-4" />
            Generar Contrato
          </Button>
          <Button variant="outline" onClick={openDuplicarDialog} disabled={duplicando}>
            {duplicando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            Duplicar
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/rrhh/plantillas-contrato/${plantillaId}/editar`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
          <Button variant="destructive" onClick={() => setDeleteDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Información */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tipo de contrato</span>
              <Badge variant="outline">
                {TIPOS_CONTRATO[plantilla.tipo_contrato] || plantilla.tipo_contrato}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Estado</span>
              <Badge variant={plantilla.activo ? 'default' : 'secondary'}>
                {plantilla.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Contratos generados</span>
              <span className="text-sm font-medium">{plantilla._count?.contratos || 0}</span>
            </div>
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Calendar className="h-4 w-4" />
                Creado
              </div>
              <p className="text-sm">{formatDate(plantilla.created_at)}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Calendar className="h-4 w-4" />
                Última modificación
              </div>
              <p className="text-sm">{formatDate(plantilla.updated_at)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Archivo Word */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Archivo de Plantilla</CardTitle>
            <CardDescription>
              Documento Word con las variables de contrato
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {plantilla.archivo_base_url ? (
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <FileText className="h-10 w-10 text-blue-600" />
                  <div>
                    <p className="font-medium">Plantilla Word</p>
                    <p className="text-sm text-muted-foreground">
                      {plantilla.archivo_base_url.split('/').pop()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const token = getAccessToken();
                      const res = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL}/plantillas-contrato/${plantillaId}/descargar`,
                        { headers: { 'Authorization': `Bearer ${token}` } }
                      );
                      if (!res.ok) throw new Error('Error al descargar');
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = plantilla.archivo_base_url?.split('/').pop() || 'plantilla.docx';
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch {
                      toast.error('Error al descargar el archivo');
                    }
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay archivo Word asociado</p>
              </div>
            )}

            {/* Variables detectadas */}
            {variables.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Variables en el documento ({variables.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {variables.map((v) => (
                    <code
                      key={v}
                      className="text-xs bg-muted px-2 py-1 rounded"
                    >
                      {v}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog para generar contrato */}
      <Dialog open={generateDialog} onOpenChange={setGenerateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generar Contrato</DialogTitle>
            <DialogDescription>
              Selecciona un empleado para generar su contrato con esta plantilla.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Buscar Empleado</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Nombre o documento..."
                  value={searchEmpleado}
                  onChange={(e) => setSearchEmpleado(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchEmpleados()}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={searchEmpleados}
                  disabled={searchingEmpleados}
                >
                  {searchingEmpleados ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {empleados.length > 0 && (
              <div className="space-y-2">
                <Label>Resultados</Label>
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {empleados.map((emp) => (
                    <div
                      key={emp.id}
                      className={`p-3 cursor-pointer hover:bg-muted border-b last:border-b-0 ${
                        selectedEmpleado?.id === emp.id ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => setSelectedEmpleado(emp)}
                    >
                      <p className="font-medium text-sm">
                        {emp.apellido_paterno} {emp.apellido_materno}, {emp.nombres}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {emp.tipo_documento}: {emp.numero_documento}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedEmpleado && (
              <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-950">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Empleado seleccionado:
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {selectedEmpleado.apellido_paterno} {selectedEmpleado.apellido_materno}, {selectedEmpleado.nombres}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleGenerateContract}
              disabled={!selectedEmpleado || generating}
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Generar y Descargar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar plantilla</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar la plantilla &quot;{plantilla.nombre}&quot;?
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

      {/* Dialog de Duplicar */}
      <Dialog open={duplicarDialog} onOpenChange={setDuplicarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicar Plantilla</DialogTitle>
            <DialogDescription>
              Se creará una copia de esta plantilla con el mismo archivo Word. Después podrás editar el nombre, las cláusulas y subir un Word modificado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="duplicar-nombre">Nombre de la nueva plantilla *</Label>
            <Input
              id="duplicar-nombre"
              value={duplicarNombre}
              onChange={(e) => setDuplicarNombre(e.target.value)}
              placeholder="Ej: Sujeto a Modalidad - Supervisor"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicarDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDuplicar} disabled={duplicando || !duplicarNombre.trim()}>
              {duplicando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Duplicando...
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicar y Editar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
