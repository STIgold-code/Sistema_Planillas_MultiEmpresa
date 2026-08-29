'use client';

import { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Download,
  Loader2,
  Upload,
} from 'lucide-react';
import { usePlantillaCierre } from './usePlantillaCierre';
import { ETIQUETA_ACCION } from './plantilla-cierre-tipos';
import type { PreviewCierre } from './plantilla-cierre-tipos';

interface Props {
  open: boolean;
  onOpenChange: (abierto: boolean) => void;
  /** Se llama tras aplicar, para refrescar el listado de planillas. */
  onAplicado?: () => void;
}

const soles = (valor: number) =>
  `S/ ${valor.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

/**
 * Diálogo de la plantilla de cierre del período.
 *
 * Dos pasos: se descarga el Excel prellenado, y cuando el área contable lo
 * devuelve lleno se sube para revisar QUÉ cambiaría antes de aplicarlo. No hay
 * forma de aplicar sin haber visto esa lista.
 */
export function PlantillaCierreDialog({
  open,
  onOpenChange,
  onAplicado,
}: Props) {
  const cierre = usePlantillaCierre(onAplicado);
  const inputArchivo = useRef<HTMLInputElement>(null);
  const anios = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i,
  );

  const cerrar = (abierto: boolean) => {
    if (!abierto) cierre.reiniciar();
    onOpenChange(abierto);
  };

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="sm:max-w-[860px] max-w-[95vw]">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl">
            Plantilla de cierre del período
          </DialogTitle>
          <DialogDescription className="text-sm">
            {cierre.paso === 'descargar'
              ? 'Descarga el Excel prellenado para que el área contable confirme los saldos de préstamos, los adelantos, las vacaciones y los bonos del período. Cuando te lo devuelvan lleno, súbelo aquí mismo.'
              : 'Esto es lo que va a cambiar en el sistema. Revísalo antes de aplicar.'}
          </DialogDescription>
        </DialogHeader>

        {cierre.paso === 'descargar' ? (
          <PasoDescargar cierre={cierre} anios={anios} />
        ) : (
          cierre.preview && <PasoRevisar preview={cierre.preview} />
        )}

        <input
          ref={inputArchivo}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            if (archivo) void cierre.revisar(archivo);
            e.target.value = '';
          }}
        />

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {cierre.paso === 'revisar' ? (
            <>
              <Button variant="outline" onClick={() => cierre.setPaso('descargar')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
              <Button
                onClick={() => void cierre.aplicar()}
                disabled={cierre.aplicando || !cierre.preview?.aplicable}
              >
                {cierre.aplicando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Aplicar al sistema
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => void cierre.descargar()}
                disabled={cierre.descargando}
              >
                {cierre.descargando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Descargar plantilla
              </Button>
              <Button
                onClick={() => inputArchivo.current?.click()}
                disabled={cierre.revisando}
              >
                {cierre.revisando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Subir plantilla llena
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasoDescargar({
  cierre,
  anios,
}: {
  cierre: ReturnType<typeof usePlantillaCierre>;
  anios: number[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 py-4">
      <div className="space-y-2">
        <Label>Año</Label>
        <Select
          value={cierre.anio.toString()}
          onValueChange={(v) => cierre.setAnio(parseInt(v, 10))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {anios.map((anio) => (
              <SelectItem key={anio} value={anio.toString()}>
                {anio}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Mes</Label>
        <Select
          value={cierre.mes.toString()}
          onValueChange={(v) => cierre.setMes(parseInt(v, 10))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {cierre.meses.map((mes, i) => (
              <SelectItem key={mes} value={(i + 1).toString()}>
                {mes}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function PasoRevisar({ preview }: { preview: PreviewCierre }) {
  const conCambio = preview.deudas.filter(
    (d) => d.accion === 'ACTUALIZAR' || d.accion === 'CERRAR',
  );
  const sinCambio = preview.deudas.length - conCambio.length;

  return (
    <ScrollArea className="max-h-[55vh] pr-3">
      <div className="space-y-4 py-2">
        {preview.errores.length > 0 && (
          <Aviso
            tono="error"
            titulo={`${preview.errores.length} error(es): corrige la plantilla y vuelve a subirla`}
          >
            <ul className="space-y-1">
              {preview.errores.map((e, i) => (
                <li key={i}>
                  <span className="font-medium">
                    {e.hoja}, fila {e.fila}:
                  </span>{' '}
                  {e.motivo}
                </li>
              ))}
            </ul>
          </Aviso>
        )}

        {preview.advertencias.length > 0 && (
          <Aviso tono="aviso" titulo="Revisa esto antes de aplicar">
            <ul className="space-y-1">
              {preview.advertencias.map((a, i) => (
                <li key={i}>
                  <span className="font-medium">
                    {a.hoja}, fila {a.fila}:
                  </span>{' '}
                  {a.motivo}
                </li>
              ))}
            </ul>
          </Aviso>
        )}

        {preview.deudas.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">
              Préstamos y adelantos
              {sinCambio > 0 && (
                <span className="ml-2 font-normal text-muted-foreground">
                  ({sinCambio} ya coinciden con el sistema)
                </span>
              )}
            </h3>
            <div className="rounded-md border divide-y">
              {preview.deudas.map((d) => {
                const etiqueta = ETIQUETA_ACCION[d.accion];
                return (
                  <div
                    key={`${d.tipo}-${d.fila}`}
                    className="p-3 flex flex-col sm:flex-row sm:items-start gap-2"
                  >
                    <span
                      className={`shrink-0 self-start rounded border px-2 py-0.5 text-xs font-medium ${etiqueta.clase}`}
                    >
                      {etiqueta.texto}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {d.trabajador}
                        <span className="ml-2 font-normal text-muted-foreground">
                          {d.tipo === 'PRESTAMO' ? 'Préstamo' : 'Adelanto'} ·{' '}
                          {soles(d.monto)}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {d.detalle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {preview.empleados.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Trabajadores a reactivar</h3>
            <div className="rounded-md border divide-y">
              {preview.empleados.map((e) => (
                <div key={e.empleado_id} className="p-3">
                  <p className="text-sm font-medium">{e.trabajador}</p>
                  <p className="text-xs text-muted-foreground">{e.detalle}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {preview.soloInformativo.map((bloque) => (
          <Aviso
            key={bloque.concepto}
            tono="aviso"
            titulo={`${bloque.concepto}: ${bloque.filas} fila(s) que esta carga NO aplica`}
          >
            <p className="mb-1">{bloque.motivo}</p>
            <ul className="space-y-0.5">
              {bloque.detalle.map((linea, i) => (
                <li key={i} className="truncate">
                  {linea}
                </li>
              ))}
            </ul>
          </Aviso>
        ))}

        {preview.errores.length === 0 && conCambio.length === 0 && (
          <Aviso tono="ok" titulo="No hay nada que cambiar">
            Todo lo que trae la plantilla ya coincide con el sistema.
          </Aviso>
        )}
      </div>
    </ScrollArea>
  );
}

const TONOS = {
  error: {
    caja: 'border-red-200 bg-red-50 text-red-900',
    icono: AlertTriangle,
  },
  aviso: {
    caja: 'border-amber-200 bg-amber-50 text-amber-900',
    icono: AlertTriangle,
  },
  ok: {
    caja: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icono: CheckCircle2,
  },
} as const;

function Aviso({
  tono,
  titulo,
  children,
}: {
  tono: keyof typeof TONOS;
  titulo: string;
  children: React.ReactNode;
}) {
  const { caja, icono: Icono } = TONOS[tono];
  return (
    <div className={`rounded-md border p-3 text-xs ${caja}`}>
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Icono className="h-4 w-4 shrink-0" aria-hidden />
        {titulo}
      </p>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}

/** Icono del disparador, para que la página no importe lucide solo por esto. */
export { ClipboardList as IconoPlantillaCierre };
