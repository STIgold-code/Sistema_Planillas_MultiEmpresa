'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import type { ImportPreview } from '../useTareoDetalle';

interface ImportDialogProps {
  open: boolean;
  importFile: File | null;
  importPreview: ImportPreview | null;
  importLoading: boolean;
  applying: boolean;
  onClose: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAplicar: () => void;
  onDescargarErrores: () => void;
}

export function ImportDialog({
  open,
  importFile,
  importPreview,
  importLoading,
  applying,
  onClose,
  onFileSelect,
  onAplicar,
  onDescargarErrores,
}: ImportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] max-w-[95vw] flex flex-col">
        {/* Header fijo */}
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Tareo desde Excel
          </DialogTitle>
          <DialogDescription className="text-sm">
            Sube un archivo Excel con el formato de tareo para actualizar las marcaciones
          </DialogDescription>
        </DialogHeader>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Dropzone */}
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
              <p className="mb-1 text-sm text-muted-foreground text-center px-2">
                {importFile ? importFile.name : 'Click para seleccionar archivo'}
              </p>
              <p className="text-xs text-muted-foreground">.xlsx</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={onFileSelect}
            />
          </label>

          {/* Loading */}
          {importLoading && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Procesando archivo...</span>
            </div>
          )}

          {/* Preview */}
          {importPreview && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2 rounded bg-green-50 text-green-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="text-sm">{importPreview.preview.empleadosEncontrados} empleados</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-blue-50 text-blue-700">
                  <FileSpreadsheet className="h-4 w-4 shrink-0" />
                  <span className="text-sm">{importPreview.preview.celdasActualizar} celdas</span>
                </div>
              </div>

              {importPreview.preview.codigosNoReconocidos.length > 0 && (
                <div className="flex items-start gap-2 p-2 rounded bg-yellow-50 text-yellow-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="text-sm min-w-0">
                    <p className="font-medium">Códigos no reconocidos:</p>
                    <p className="truncate">{importPreview.preview.codigosNoReconocidos.join(', ')}</p>
                  </div>
                </div>
              )}

              {importPreview.preview.dnisNoEncontrados.length > 0 && (
                <div className="flex items-start gap-2 p-2 rounded bg-red-50 text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="text-sm min-w-0">
                    <p className="font-medium">{importPreview.preview.dnisNoEncontrados.length} DNI no encontrados</p>
                    <p className="truncate">
                      {importPreview.preview.dnisNoEncontrados.slice(0, 5).join(', ')}
                      {importPreview.preview.dnisNoEncontrados.length > 5 ? '...' : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* Preview de cambios */}
              {importPreview.cambios.length > 0 && (
                <div className="border rounded max-h-40 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-2 py-1 text-left">Empleado</th>
                        <th className="px-2 py-1 text-center">Día</th>
                        <th className="px-2 py-1 text-center">Actual</th>
                        <th className="px-2 py-1 text-center">Nuevo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.cambios.slice(0, 20).map((c, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-2 py-1 truncate max-w-[100px] sm:max-w-[150px]">{c.nombre}</td>
                          <td className="px-2 py-1 text-center">{c.dia}</td>
                          <td className="px-2 py-1 text-center font-mono">{c.codigoActual || '-'}</td>
                          <td className="px-2 py-1 text-center font-mono font-bold">{c.codigoNuevo || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importPreview.cambios.length > 20 && (
                    <p className="text-center text-xs text-muted-foreground py-1">
                      ... y {importPreview.cambios.length - 20} más
                    </p>
                  )}
                </div>
              )}

              {/* Errores detallados */}
              {importPreview.errores && importPreview.errores.length > 0 && (
                <div className="border border-red-200 rounded bg-red-50/50">
                  <div className="flex items-center justify-between gap-2 p-2 border-b border-red-200 bg-red-100">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                      <span className="text-sm font-medium text-red-700">
                        {importPreview.errores.length} error{importPreview.errores.length > 1 ? 'es' : ''} encontrado{importPreview.errores.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onDescargarErrores}
                      className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Descargar Excel
                    </Button>
                  </div>
                  <div className="max-h-40 overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-red-100 sticky top-0">
                        <tr>
                          <th className="px-2 py-1 text-center text-red-700">Fila</th>
                          <th className="px-2 py-1 text-center text-red-700">Col</th>
                          <th className="px-2 py-1 text-center text-red-700">Día</th>
                          <th className="px-2 py-1 text-left text-red-700">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.errores.slice(0, 50).map((err, i) => (
                          <tr key={i} className="border-t border-red-100 hover:bg-red-50">
                            <td className="px-2 py-1 text-center font-mono text-red-600">{err.fila}</td>
                            <td className="px-2 py-1 text-center font-mono text-red-600">{err.columna}</td>
                            <td className="px-2 py-1 text-center font-mono text-red-600">{err.dia || '-'}</td>
                            <td className="px-2 py-1 text-red-700">
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {err.tipo === 'DNI_NO_ENCONTRADO' && 'DNI no encontrado'}
                                  {err.tipo === 'CODIGO_NO_RECONOCIDO' && 'Código inválido'}
                                  {err.tipo === 'DIA_FUERA_CONTRATO' && 'Fuera de contrato'}
                                  {err.tipo === 'DNI_INVALIDO' && 'DNI inválido'}
                                  {err.tipo === 'CELDA_VACIA' && 'Celda vacía'}
                                </span>
                                <span className="text-red-600/80 truncate max-w-[200px]" title={err.mensaje}>
                                  {err.valor && <span className="font-mono bg-red-100 px-1 rounded mr-1">"{err.valor}"</span>}
                                  {err.empleado && <span className="text-red-500">({err.empleado.split(',')[0]})</span>}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importPreview.errores.length > 50 && (
                      <p className="text-center text-xs text-red-600 py-1 bg-red-100">
                        ... y {importPreview.errores.length - 50} errores más
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer fijo */}
        <DialogFooter className="shrink-0 flex-col sm:flex-row gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button
            onClick={onAplicar}
            disabled={!importPreview || importPreview.cambios.length === 0 || applying}
            className="w-full sm:w-auto"
          >
            {applying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Importar {importPreview?.cambios.length || 0} cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
