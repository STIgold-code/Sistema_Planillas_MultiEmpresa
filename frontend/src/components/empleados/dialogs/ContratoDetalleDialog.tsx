'use client';

import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Contrato, EstadoContrato } from '@/types';

const TIPOS_CONTRATO = [
  { value: 'SUJETO_A_MODALIDAD', label: 'Sujeto a Modalidad' },
  { value: 'INDEFINIDO', label: 'Indefinido' },
  { value: 'LOCACION', label: 'Locación de Servicios' },
  { value: 'OBRA_SERVICIO', label: 'Obra o Servicio' },
  { value: 'TIEMPO_PARCIAL', label: 'Tiempo Parcial' },
];

const MODALIDADES = [
  { value: 'PRESENCIAL', label: 'Presencial' },
  { value: 'REMOTO', label: 'Remoto' },
  { value: 'HIBRIDO', label: 'Híbrido' },
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

export interface ContratoDetalleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedContrato: Contrato | null;
  formatDate: (date: string | undefined) => string;
  formatCurrency: (amount: number | undefined) => string;
  handleGenerarDocClick: (contrato: Contrato) => void;
}

export function ContratoDetalleDialog({
  open,
  onOpenChange,
  selectedContrato,
  formatDate,
  formatCurrency,
  handleGenerarDocClick,
}: ContratoDetalleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalle del Contrato</DialogTitle>
        </DialogHeader>
        {selectedContrato && (
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">
                  {TIPOS_CONTRATO.find((t) => t.value === selectedContrato.tipo_contrato)?.label ||
                    selectedContrato.tipo_contrato}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge variant={estadoBadgeVariant[selectedContrato.estado]} className={cn(estadoBadgeClass[selectedContrato.estado])}>
                  {selectedContrato.estado}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha Inicio</p>
                <p className="font-medium">{formatDate(selectedContrato.fecha_inicio)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha Fin</p>
                <p className="font-medium">
                  {selectedContrato.fecha_fin ? formatDate(selectedContrato.fecha_fin) : 'Indefinido'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Remuneración</p>
                <p className="font-medium">{formatCurrency(selectedContrato.remuneracion)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Modalidad</p>
                <p className="font-medium">
                  {MODALIDADES.find((m) => m.value === selectedContrato.modalidad)?.label ||
                    selectedContrato.modalidad ||
                    '-'}
                </p>
              </div>
            </div>
            {(selectedContrato.cliente || selectedContrato.empresa_cliente) && (
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">
                  {selectedContrato.cliente?.razon_social || selectedContrato.empresa_cliente}
                </p>
              </div>
            )}
            {selectedContrato.lugar_trabajo && (
              <div>
                <p className="text-sm text-muted-foreground">Lugar de Trabajo</p>
                <p className="font-medium">{selectedContrato.lugar_trabajo}</p>
              </div>
            )}
            {selectedContrato.observaciones && (
              <div>
                <p className="text-sm text-muted-foreground">Observaciones</p>
                <p className="font-medium">{selectedContrato.observaciones}</p>
              </div>
            )}
            {selectedContrato.estado === 'CESADO' && (
              <div className="pt-4 border-t space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Información de Cese</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de Cese</p>
                    <p className="font-medium">
                      {selectedContrato.fecha_cese ? formatDate(selectedContrato.fecha_cese) : '-'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Creado: {formatDate(selectedContrato.created_at)}
                {selectedContrato.usuario && ` por ${selectedContrato.usuario.nombre_completo}`}
              </p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {selectedContrato && (
            <Button onClick={() => handleGenerarDocClick(selectedContrato)}>
              <FileText className="mr-2 h-4 w-4" />
              Generar Documento
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
