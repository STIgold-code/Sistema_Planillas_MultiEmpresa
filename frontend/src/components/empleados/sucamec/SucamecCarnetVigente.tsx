'use client';

import { CarnetSucamec, EstadoCarnetSucamec, CategoriaSucamec } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Eye, RefreshCw, Ban, Trash2, Link2, Link2Off, ExternalLink,
  IdCard, Calendar, AlertTriangle, FileText,
} from 'lucide-react';
import { formatDateSafe } from '@/lib/utils';

const estadoBadgeVariant: Record<EstadoCarnetSucamec, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  VIGENTE: 'default',
  VENCIDO: 'destructive',
  SUSPENDIDO: 'secondary',
  ANULADO: 'outline',
};

interface Props {
  carnet: CarnetSucamec;
  proximoAVencer: boolean;
  yaVencido: boolean;
  getDiasParaVencer: (fecha: string) => number;
  getCategoriaLabel: (cat: CategoriaSucamec) => string;
  onVerDetalle: (c: CarnetSucamec) => void;
  onRenovar: (c: CarnetSucamec) => void;
  onSuspender: (c: CarnetSucamec) => void;
  onAnular: (c: CarnetSucamec) => void;
  onVincular: (c: CarnetSucamec) => void;
  onDesvincular: (c: CarnetSucamec) => void;
}

export function SucamecCarnetVigente({
  carnet,
  proximoAVencer,
  yaVencido,
  getDiasParaVencer,
  getCategoriaLabel,
  onVerDetalle,
  onRenovar,
  onSuspender,
  onAnular,
  onVincular,
  onDesvincular,
}: Props) {
  const dias = getDiasParaVencer(carnet.fecha_vencimiento);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IdCard className="h-5 w-5" />
              Carnet SUCAMEC Vigente
            </CardTitle>
            <CardDescription>N {carnet.numero_carnet}</CardDescription>
          </div>
          <Badge variant={estadoBadgeVariant[carnet.estado]}>{carnet.estado}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="flex items-start gap-2">
            <IdCard className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Categoria</p>
              <p className="text-sm font-medium">{getCategoriaLabel(carnet.categoria)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Emision</p>
              <p className="text-sm font-medium">{formatDateSafe(carnet.fecha_emision)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Vencimiento</p>
              <p className="text-sm font-medium">{formatDateSafe(carnet.fecha_vencimiento)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Dias restantes</p>
              <p className={`text-sm font-medium ${
                dias <= 0 ? 'text-red-600' : dias <= 30 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {dias} dias
              </p>
            </div>
          </div>
        </div>

        {carnet.documento ? (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md mb-4">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm flex-1 truncate">{carnet.documento.archivo_nombre || 'Documento adjunto'}</span>
            <a href={carnet.documento.archivo_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              <ExternalLink className="h-4 w-4" />
            </a>
            <Button variant="ghost" size="sm" onClick={() => onDesvincular(carnet)} title="Desvincular documento">
              <Link2Off className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md mb-4">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground flex-1">Sin documento vinculado</span>
            <Button variant="ghost" size="sm" onClick={() => onVincular(carnet)} title="Vincular documento">
              <Link2 className="h-4 w-4 text-primary" />
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onVerDetalle(carnet)}>
            <Eye className="h-4 w-4 mr-1" />
            Ver Detalles
          </Button>
          {!proximoAVencer && !yaVencido && (
            <Button variant="outline" size="sm" onClick={() => onRenovar(carnet)}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Renovar
            </Button>
          )}
          <Button variant="outline" size="sm" className="text-yellow-600" onClick={() => onSuspender(carnet)}>
            <Ban className="h-4 w-4 mr-1" />
            Suspender
          </Button>
          <Button variant="outline" size="sm" className="text-red-600" onClick={() => onAnular(carnet)}>
            <Trash2 className="h-4 w-4 mr-1" />
            Anular
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
