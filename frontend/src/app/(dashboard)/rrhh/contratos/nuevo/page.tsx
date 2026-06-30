'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronsUpDown, Loader2, ScrollText, UserSearch } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { Empleado } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface EmpleadosResponse {
  data: Empleado[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/** Nombre completo del empleado en formato "Apellidos, Nombres". */
function nombreCompleto(empleado: Empleado): string {
  return `${empleado.apellido_paterno} ${empleado.apellido_materno}, ${empleado.nombres}`;
}

/**
 * Punto de entrada para crear un contrato.
 *
 * El alta real de contratos vive en la ficha del empleado (Tab Contratos). Esta
 * pantalla es un paso intermedio descubrible: el usuario elige al empleado con
 * un buscador y se le lleva directo a su ficha en la pestaña Contratos, donde
 * puede crear el contrato con el flujo existente.
 */
export default function NuevoContratoPage() {
  const router = useRouter();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(false);
  const [empleadoId, setEmpleadoId] = useState<string>('');

  useEffect(() => {
    let activo = true;
    const cargarEmpleados = async () => {
      try {
        // Solo empleados activos: son los que pueden recibir un contrato nuevo.
        const respuesta = await api.get<EmpleadosResponse>(
          '/empleados?estado=ACTIVO&limit=500',
        );
        if (activo) setEmpleados(respuesta.data);
      } catch (error: unknown) {
        if (activo) toast.error(getApiErrorMessage(error, 'Error al cargar empleados'));
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargarEmpleados();
    return () => {
      activo = false;
    };
  }, []);

  const empleadoSeleccionado = useMemo(
    () => empleados.find((empleado) => String(empleado.id) === empleadoId),
    [empleados, empleadoId],
  );

  const handleSeleccionar = (id: string) => {
    setEmpleadoId(id);
    setAbierto(false);
  };

  const handleContinuar = () => {
    if (!empleadoSeleccionado) return;
    // Deep-link directo a la pestaña Contratos de la ficha del empleado.
    router.push(`/rrhh/empleados/${empleadoSeleccionado.id}?tab=contratos`);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Nuevo Contrato</h1>
        <p className="text-xs text-muted-foreground md:text-sm">
          Elige al empleado para registrar su contrato.
        </p>
      </div>

      <Card>
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <UserSearch className="h-5 w-5" />
            Selecciona al empleado
          </CardTitle>
          <CardDescription>
            Busca por nombre o número de documento. Te llevaremos a su ficha, en la pestaña
            Contratos, para registrar el contrato.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-4 md:px-6">
          <div className="space-y-2">
            <Label htmlFor="selector-empleado">Empleado</Label>
            <Popover open={abierto} onOpenChange={setAbierto}>
              <PopoverTrigger asChild>
                <Button
                  id="selector-empleado"
                  variant="outline"
                  role="combobox"
                  aria-expanded={abierto}
                  aria-label="Seleccionar empleado"
                  disabled={cargando}
                  className="w-full justify-between font-normal"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate">
                      {cargando
                        ? 'Cargando empleados...'
                        : empleadoSeleccionado
                          ? nombreCompleto(empleadoSeleccionado)
                          : 'Selecciona un empleado'}
                    </span>
                  </span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[--radix-popover-trigger-width] p-0"
              >
                <Command
                  filter={(value, search) =>
                    value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                  }
                >
                  <CommandInput placeholder="Buscar por nombre o documento..." />
                  <CommandList>
                    <CommandEmpty>No se encontró ningún empleado.</CommandEmpty>
                    {empleados.map((empleado) => {
                      const id = String(empleado.id);
                      const nombre = nombreCompleto(empleado);
                      return (
                        <CommandItem
                          key={empleado.id}
                          // value se usa para el filtrado: incluimos el documento
                          // para poder buscar también por número de documento.
                          value={`${nombre} ${empleado.numero_documento}`}
                          onSelect={() => handleSeleccionar(id)}
                        >
                          <Check
                            className={cn(
                              'h-4 w-4',
                              id === empleadoId ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate">{nombre}</span>
                            <span className="truncate text-xs text-muted-foreground">
                              {empleado.numero_documento}
                            </span>
                          </span>
                        </CommandItem>
                      );
                    })}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/rrhh/contratos')}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleContinuar}
              disabled={!empleadoSeleccionado || cargando}
              className="w-full sm:w-auto"
            >
              {cargando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ScrollText className="mr-2 h-4 w-4" />
              )}
              Continuar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
