'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { FileUpload, UploadedFile } from '@/components/ui/file-upload';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  TareoJustificacion,
  TipoJustificacion,
  CreateJustificacionDto,
  UpdateJustificacionDto,
} from '@/types';
import {
  Stethoscope,
  BedDouble,
  UserCheck,
  Briefcase,
  Baby,
  Heart,
  Palmtree,
  MoreHorizontal,
  Loader2,
  CalendarIcon,
  Hash,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Configuración de tipos de justificación
const TIPOS_JUSTIFICACION: {
  value: TipoJustificacion;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  { value: 'CERTIFICADO_MEDICO', label: 'Certificado Médico', icon: <Stethoscope className="h-4 w-4" />, color: 'text-red-500' },
  { value: 'DESCANSO_MEDICO', label: 'Descanso Médico', icon: <BedDouble className="h-4 w-4" />, color: 'text-orange-500' },
  { value: 'PERMISO_PERSONAL', label: 'Permiso Personal', icon: <UserCheck className="h-4 w-4" />, color: 'text-blue-500' },
  { value: 'PERMISO_LABORAL', label: 'Permiso Laboral', icon: <Briefcase className="h-4 w-4" />, color: 'text-purple-500' },
  { value: 'LICENCIA_MATERNIDAD', label: 'Licencia Maternidad', icon: <Baby className="h-4 w-4" />, color: 'text-pink-500' },
  { value: 'LICENCIA_PATERNIDAD', label: 'Licencia Paternidad', icon: <Baby className="h-4 w-4" />, color: 'text-cyan-500' },
  { value: 'LICENCIA_FALLECIMIENTO', label: 'Licencia Fallecimiento', icon: <Heart className="h-4 w-4" />, color: 'text-gray-500' },
  { value: 'VACACIONES', label: 'Vacaciones', icon: <Palmtree className="h-4 w-4" />, color: 'text-green-500' },
  { value: 'OTRO', label: 'Otro', icon: <MoreHorizontal className="h-4 w-4" />, color: 'text-gray-400' },
];

interface JustificacionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tareoId: number;
  empleadoNombre: string;
  mes: number; // 1-12
  anio: number;
  diasDelMes: number;
  diaInicial?: number;
  diaFinal?: number;
  justificacionExistente?: TareoJustificacion;
  onSuccess: () => void;
}

export function JustificacionModal({
  open,
  onOpenChange,
  tareoId,
  empleadoNombre,
  mes,
  anio,
  diasDelMes,
  diaInicial,
  diaFinal,
  justificacionExistente,
  onSuccess,
}: JustificacionModalProps) {
  const [loading, setLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState<Date | undefined>();
  const [fechaFin, setFechaFin] = useState<Date | undefined>();
  const [tipo, setTipo] = useState<TipoJustificacion>('CERTIFICADO_MEDICO');
  const [tipoDocumento, setTipoDocumento] = useState<'CCI' | 'PRIVADO' | 'OTROS'>('CCI');
  const [codigoCertificado, setCodigoCertificado] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [archivos, setArchivos] = useState<UploadedFile[]>([]);
  const [openInicioCalendar, setOpenInicioCalendar] = useState(false);
  const [openFinCalendar, setOpenFinCalendar] = useState(false);

  // Tipos que requieren selección de tipo de documento (CCI/Privado)
  const tiposMedicos: TipoJustificacion[] = ['CERTIFICADO_MEDICO', 'DESCANSO_MEDICO'];
  const esTipoMedico = tiposMedicos.includes(tipo);

  const isEditing = !!justificacionExistente;

  // Calcular límites del calendario (solo el mes del período)
  const { minDate, maxDate } = useMemo(() => {
    const min = new Date(anio, mes - 1, 1);
    const max = new Date(anio, mes - 1, diasDelMes);
    return { minDate: min, maxDate: max };
  }, [anio, mes, diasDelMes]);

  // Helper para crear fecha desde día
  const createDateFromDay = (dia: number) => new Date(anio, mes - 1, dia);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      if (justificacionExistente) {
        setFechaInicio(createDateFromDay(justificacionExistente.dia_inicio));
        setFechaFin(createDateFromDay(justificacionExistente.dia_fin));
        setTipo(justificacionExistente.tipo);
        setTipoDocumento(justificacionExistente.tipo_documento || 'OTROS');
        setCodigoCertificado(justificacionExistente.codigo_certificado || '');
        setDescripcion(justificacionExistente.descripcion || '');
        setArchivos(
          justificacionExistente.archivos.map((a) => ({
            archivo_url: a.archivo_url,
            archivo_nombre: a.archivo_nombre,
            archivo_tipo: a.archivo_tipo,
            archivo_size: a.archivo_size,
          }))
        );
      } else {
        setFechaInicio(diaInicial ? createDateFromDay(diaInicial) : createDateFromDay(1));
        setFechaFin(diaFinal ? createDateFromDay(diaFinal) : (diaInicial ? createDateFromDay(diaInicial) : createDateFromDay(1)));
        setTipo('CERTIFICADO_MEDICO');
        setTipoDocumento('CCI');
        setCodigoCertificado('');
        setDescripcion('');
        setArchivos([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, justificacionExistente, diaInicial, diaFinal, anio, mes]);

  const handleSubmit = async () => {
    // Validar fechas
    if (!fechaInicio || !fechaFin) {
      toast.error('Debe seleccionar las fechas de inicio y fin');
      return;
    }

    const diaInicio = fechaInicio.getDate();
    const diaFin = fechaFin.getDate();

    if (diaFin < diaInicio) {
      toast.error('La fecha de fin debe ser mayor o igual a la fecha de inicio');
      return;
    }

    setLoading(true);

    try {
      if (isEditing) {
        // Actualizar justificación
        const updateDto: UpdateJustificacionDto = {
          dia_inicio: diaInicio,
          dia_fin: diaFin,
          tipo,
          tipo_documento: esTipoMedico ? tipoDocumento : 'OTROS',
          codigo_certificado: esTipoMedico && (tipoDocumento === 'CCI' || tipoDocumento === 'PRIVADO') ? codigoCertificado || undefined : undefined,
          descripcion: descripcion || undefined,
        };

        await api.patch(`/tareo/justificaciones/${justificacionExistente.id}`, updateDto);

        // Manejar archivos: eliminar los que ya no están
        const archivosNuevosUrls = archivos.map((a) => a.archivo_url);

        // Eliminar archivos que ya no están
        for (const archivo of justificacionExistente.archivos) {
          if (!archivosNuevosUrls.includes(archivo.archivo_url)) {
            await api.delete(`/tareo/justificaciones/archivos/${archivo.id}`);
          }
        }

        // Agregar archivos nuevos
        for (const archivo of archivos) {
          const existeEnOriginal = justificacionExistente.archivos.some(
            (a) => a.archivo_url === archivo.archivo_url
          );
          if (!existeEnOriginal) {
            await api.post(`/tareo/justificaciones/${justificacionExistente.id}/archivos`, archivo);
          }
        }

        toast.success('Justificación actualizada');
      } else {
        // Crear justificación
        const createDto: CreateJustificacionDto = {
          tareo_id: tareoId,
          dia_inicio: diaInicio,
          dia_fin: diaFin,
          tipo,
          tipo_documento: esTipoMedico ? tipoDocumento : 'OTROS',
          codigo_certificado: esTipoMedico && (tipoDocumento === 'CCI' || tipoDocumento === 'PRIVADO') ? codigoCertificado || undefined : undefined,
          descripcion: descripcion || undefined,
          archivos: archivos.length > 0 ? archivos : undefined,
        };

        await api.post('/tareo/justificaciones', createDto);
        toast.success('Justificación creada');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('Error al guardar justificación:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar justificación';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // Base: flex column para estructura header/content/footer
          'flex flex-col p-0 gap-0',
          // Móvil: casi pantalla completa
          'w-full h-[95vh] max-w-full rounded-t-lg rounded-b-none',
          // Tablet y superior: modal con tamaño limitado
          'sm:w-[500px] sm:h-auto sm:max-h-[90vh] sm:rounded-lg'
        )}
      >
        {/* Header - FIJO */}
        <DialogHeader className="flex-shrink-0 px-4 py-3 sm:px-6 sm:py-4 border-b bg-background space-y-1">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base sm:text-lg">
              {isEditing ? 'Editar Justificación' : 'Nueva Justificación'}
            </DialogTitle>
            {isEditing && justificacionExistente && (
              <Badge variant="outline" className="font-mono text-xs">
                <Hash className="h-3 w-3 mr-1" />
                ID: {justificacionExistente.id}
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">{empleadoNombre}</p>
        </DialogHeader>

        {/* Content - SCROLLEABLE */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 sm:px-6">
          <div className="grid gap-4">
            {/* Rango de fechas con calendario */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">Fecha inicio</Label>
                <Popover open={openInicioCalendar} onOpenChange={setOpenInicioCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal text-xs sm:text-sm h-9 sm:h-10',
                        !fechaInicio && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {fechaInicio ? format(fechaInicio, 'dd/MM/yyyy') : 'Seleccionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fechaInicio}
                      onSelect={(d) => {
                        setFechaInicio(d);
                        setOpenInicioCalendar(false);
                        // Ajustar fecha fin si es menor que inicio
                        if (d && fechaFin && d > fechaFin) {
                          setFechaFin(d);
                        }
                      }}
                      disabled={(d) => d < minDate || d > maxDate}
                      defaultMonth={minDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">Fecha fin</Label>
                <Popover open={openFinCalendar} onOpenChange={setOpenFinCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal text-xs sm:text-sm h-9 sm:h-10',
                        !fechaFin && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {fechaFin ? format(fechaFin, 'dd/MM/yyyy') : 'Seleccionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fechaFin}
                      onSelect={(d) => {
                        setFechaFin(d);
                        setOpenFinCalendar(false);
                      }}
                      disabled={(d) => d < (fechaInicio || minDate) || d > maxDate}
                      defaultMonth={fechaInicio || minDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Tipo de justificación */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Tipo de justificación</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoJustificacion)}>
                <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_JUSTIFICACION.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <span className={t.color}>{t.icon}</span>
                        <span className="text-xs sm:text-sm">{t.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Documento (solo para tipos médicos) */}
            {esTipoMedico && (
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">Tipo de Documento</Label>
                <Select value={tipoDocumento} onValueChange={(v) => setTipoDocumento(v as 'CCI' | 'PRIVADO' | 'OTROS')}>
                  <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CCI">CCI (EsSalud)</SelectItem>
                    <SelectItem value="PRIVADO">Privado (Clínica)</SelectItem>
                    <SelectItem value="OTROS">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Código del certificado (solo para CCI o PRIVADO) */}
            {esTipoMedico && (tipoDocumento === 'CCI' || tipoDocumento === 'PRIVADO') && (
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">
                  {tipoDocumento === 'CCI' ? 'Código CCI (EsSalud)' : 'Código Certificado (Clínica)'}
                </Label>
                <Input
                  value={codigoCertificado}
                  onChange={(e) => setCodigoCertificado(e.target.value)}
                  placeholder={tipoDocumento === 'CCI' ? 'Ej: 123456789' : 'Ej: CERT-2024-001'}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
            )}

            {/* Descripción */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Observaciones</Label>
              <Textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Agregar observaciones..."
                rows={3}
                className="text-xs sm:text-sm resize-none"
              />
            </div>

            {/* Archivos */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Documentos adjuntos</Label>
              <FileUpload
                value={archivos}
                onChange={setArchivos}
                maxFiles={5}
                maxSize={5 * 1024 * 1024}
                accept=".pdf,.jpg,.jpeg,.png,.docx,.doc"
              />
            </div>
          </div>
        </div>

        {/* Footer - FIJO */}
        <DialogFooter className="flex-shrink-0 px-4 py-3 sm:px-6 sm:py-4 border-t bg-background gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex-1 sm:flex-none h-9 sm:h-10 text-xs sm:text-sm"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 sm:flex-none h-9 sm:h-10 text-xs sm:text-sm"
          >
            {loading && <Loader2 className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />}
            {isEditing ? 'Actualizar' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Export helper for getting type label and icon
export function getTipoJustificacionInfo(tipo: TipoJustificacion) {
  return TIPOS_JUSTIFICACION.find((t) => t.value === tipo) || TIPOS_JUSTIFICACION[8]; // Default to "Otro"
}
