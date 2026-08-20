'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeft,
  Loader2,
  Calculator,
  CheckCircle,
  DollarSign,
  XCircle,
  Download,
  FileDown,
  FileSpreadsheet,
} from 'lucide-react';
import { Planilla } from '@/types';
import { estadoBadgeVariant, estadoLabels, meses } from '../types';

interface PlanillaHeaderProps {
  planilla: Planilla;
  calculating: boolean;
  approving: boolean;
  paying: boolean;
  canceling: boolean;
  downloadingBoletas: boolean;
  exportandoAuditable: boolean;
  canCalculate: boolean;
  canApprove: boolean;
  canPay: boolean;
  canCancel: boolean;
  onCalcular: () => void;
  onExportar: () => void;
  onExportarAuditable: () => void;
  onDescargarBoletas: () => void;
  onSetConfirmAction: (action: 'aprobar' | 'pagar' | 'anular') => void;
}

export function PlanillaHeader({
  planilla,
  calculating,
  downloadingBoletas,
  exportandoAuditable,
  canCalculate,
  canApprove,
  canPay,
  canCancel,
  onCalcular,
  onExportar,
  onExportarAuditable,
  onDescargarBoletas,
  onSetConfirmAction,
}: PlanillaHeaderProps) {
  return (
    <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/planilla">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold">
              Planilla {meses[planilla.mes - 1]} {planilla.anio}
            </h1>
            <Badge variant={estadoBadgeVariant[planilla.estado]}>
              {estadoLabels[planilla.estado]}
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            {planilla.total_empleados} empleados
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {canCalculate && (
          <Button onClick={onCalcular} disabled={calculating}>
            {calculating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="mr-2 h-4 w-4" />
            )}
            {planilla.estado === 'BORRADOR' ? 'Calcular' : 'Recalcular'}
          </Button>
        )}
        {canApprove && (
          <Button variant="outline" onClick={() => onSetConfirmAction('aprobar')}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Aprobar
          </Button>
        )}
        {canPay && (
          <Button onClick={() => onSetConfirmAction('pagar')}>
            <DollarSign className="mr-2 h-4 w-4" />
            Marcar Pagada
          </Button>
        )}
        <Button variant="outline" onClick={onExportar}>
          <Download className="mr-2 h-4 w-4" />
          Exportar Excel
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={onExportarAuditable}
              disabled={exportandoAuditable}
            >
              {exportandoAuditable ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 h-4 w-4" />
              )}
              Exportar auditable
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            Excel con los montos escritos como fórmulas, las tasas legales usadas
            en el cálculo y la explicación de cada concepto. Puedes cambiar una
            tasa y ver cómo se recalcula toda la planilla.
          </TooltipContent>
        </Tooltip>
        {(planilla.estado === 'APROBADA' || planilla.estado === 'PAGADA') && (
          <Button variant="outline" onClick={onDescargarBoletas} disabled={downloadingBoletas}>
            {downloadingBoletas ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Descargar Boletas
          </Button>
        )}
        {canCancel && (
          <Button variant="destructive" onClick={() => onSetConfirmAction('anular')}>
            <XCircle className="mr-2 h-4 w-4" />
            Anular
          </Button>
        )}
      </div>
    </div>
  );
}
