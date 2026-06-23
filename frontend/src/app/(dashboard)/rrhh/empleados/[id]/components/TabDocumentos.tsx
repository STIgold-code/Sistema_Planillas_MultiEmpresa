'use client';

import { UseFormReturn } from 'react-hook-form';
import { Empleado, TipoDocumentoEmpleado } from '@/types';
import { DocumentoFormValues } from '../hooks/useEmpleadoDetalle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TabsContent } from '@/components/ui/tabs';
import { Lock, Upload } from 'lucide-react';
import { DocTable, DocEntry } from './DocTable';
import { DocUploadDialog } from './DocUploadDialog';

type CategoriaItem = {
  key: string;
  nombre: string;
  // null para la categoría "Sin clasificar" (documentos sin tipo asignado).
  tipoId: number | null;
  count: number;
};

interface TabDocumentosProps {
  empleado: Empleado;
  formatDate: (date: string | null | undefined) => string;
  tiposDocumento: TipoDocumentoEmpleado[];
  tipoFiltro: number | string | null;
  setTipoFiltro: (v: number | string | null) => void;
  docsSeleccion: DocEntry[];
  docsRRHH: DocEntry[];
  docsSeleccionFiltrados: DocEntry[];
  docsRRHHFiltrados: DocEntry[];
  categoriasSeleccion: CategoriaItem[];
  categoriasRRHH: CategoriaItem[];
  canEditSeleccionDocs: boolean;
  deletingDocId: number | null;
  handleVerDocumento: (url: string, nombre: string) => void;
  handleDescargarDocumento: (url: string, nombre: string) => Promise<void>;
  handleDeleteDocumento: (id: number) => Promise<void>;
  // upload dialog
  documentoDialogOpen: boolean;
  setDocumentoDialogOpen: (open: boolean) => void;
  documentoForm: UseFormReturn<DocumentoFormValues>;
  savingDocumento: boolean;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  handleOpenDocumentoDialog: () => void;
  handleSaveDocumento: (data: DocumentoFormValues) => Promise<void>;
}

export function TabDocumentos({
  empleado,
  formatDate,
  tiposDocumento,
  tipoFiltro,
  setTipoFiltro,
  docsSeleccion,
  docsRRHH,
  docsSeleccionFiltrados,
  docsRRHHFiltrados,
  categoriasSeleccion,
  categoriasRRHH,
  canEditSeleccionDocs,
  deletingDocId,
  handleVerDocumento,
  handleDescargarDocumento,
  handleDeleteDocumento,
  documentoDialogOpen,
  setDocumentoDialogOpen,
  documentoForm,
  savingDocumento,
  selectedFile,
  setSelectedFile,
  handleOpenDocumentoDialog,
  handleSaveDocumento,
}: TabDocumentosProps) {
  const docActions = { formatDate, deletingDocId, handleVerDocumento, handleDescargarDocumento, handleDeleteDocumento };

  return (
    <>
      <TabsContent value="documentos">
        <div className="flex flex-col lg:grid lg:grid-cols-[200px_1fr] gap-4">
          {/* Sidebar de categorias - Solo visible en desktop */}
          <Card className="hidden lg:block lg:h-fit lg:sticky lg:top-4">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categorias</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3 pt-0">
              <div className="flex flex-col gap-0.5">
                <button
                  className={`w-full flex items-center justify-between text-sm px-3 py-1.5 rounded-md transition-colors ${tipoFiltro === null ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}
                  onClick={() => setTipoFiltro(null)}
                >
                  <span>Todos</span>
                  <span className="text-xs opacity-60">{empleado.documentos?.length || 0}</span>
                </button>

                {categoriasSeleccion.length > 0 && (
                  <>
                    <Separator className="my-1.5" />
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground/70 tracking-wider px-3 pb-0.5">
                      Seleccion
                    </p>
                    {categoriasSeleccion.map((cat) => (
                      <button
                        key={`sel-${cat.key}`}
                        className={`w-full flex items-center justify-between text-sm px-3 py-1.5 rounded-md transition-colors ${tipoFiltro === `SEL:${cat.key}` ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}
                        onClick={() => setTipoFiltro(`SEL:${cat.key}`)}
                      >
                        <span className="truncate">{cat.nombre}</span>
                        <span className="text-xs opacity-60 ml-2 shrink-0">{cat.count}</span>
                      </button>
                    ))}
                  </>
                )}

                <Separator className="my-1.5" />
                <p className="text-[10px] font-semibold uppercase text-muted-foreground/70 tracking-wider px-3 pb-0.5">
                  RRHH
                </p>
                {categoriasRRHH.map((cat) => (
                  <button
                    key={`rrhh-${cat.key}`}
                    className={`w-full flex items-center justify-between text-sm px-3 py-1.5 rounded-md transition-colors ${tipoFiltro === `RRHH:${cat.key}` ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}
                    onClick={() => setTipoFiltro(`RRHH:${cat.key}`)}
                  >
                    <span className="truncate">{cat.nombre}</span>
                    <span className="text-xs opacity-60 ml-2 shrink-0">{cat.count}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cards de documentos */}
          <div className="space-y-4">
            {/* Card Seleccion */}
            <Card>
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
                <div>
                  <CardTitle className="text-base sm:text-lg">Seleccion</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Adjuntados durante el proceso de seleccion
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {docsSeleccion.length} {docsSeleccion.length === 1 ? 'doc' : 'docs'}
                  </Badge>
                  {!canEditSeleccionDocs && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Lock className="h-3 w-3" />
                      Solo lectura
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <DocTable
                  docs={docsSeleccionFiltrados}
                  canDelete={canEditSeleccionDocs}
                  emptyMessage={`No hay documentos de seleccion${tipoFiltro ? ' en esta categoria' : ''}`}
                  {...docActions}
                />
              </CardContent>
            </Card>

            {/* Card RRHH */}
            <Card>
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
                <div>
                  <CardTitle className="text-base sm:text-lg">
                    RRHH
                    {typeof tipoFiltro === 'string' && tipoFiltro.startsWith('RRHH:') && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        - {categoriasRRHH.find(c => `RRHH:${c.key}` === tipoFiltro)?.nombre}
                      </span>
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Documentos gestionados por Recursos Humanos
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {docsRRHH.length} {docsRRHH.length === 1 ? 'doc' : 'docs'}
                  </Badge>
                  <Button size="sm" onClick={handleOpenDocumentoDialog} className="w-full sm:w-auto">
                    <Upload className="mr-2 h-4 w-4" />
                    Subir Documento
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <DocTable
                  docs={docsRRHHFiltrados}
                  canDelete={true}
                  emptyMessage={`No hay documentos${tipoFiltro ? ' en esta categoria' : ' cargados'}`}
                  {...docActions}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      <DocUploadDialog
        open={documentoDialogOpen}
        onOpenChange={setDocumentoDialogOpen}
        tiposDocumento={tiposDocumento}
        documentoForm={documentoForm}
        savingDocumento={savingDocumento}
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
        handleSaveDocumento={handleSaveDocumento}
      />
    </>
  );
}
