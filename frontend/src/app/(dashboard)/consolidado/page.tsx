"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Users,
  FileClock,
  FileWarning,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useEmpresaActiva } from "@/contexts/empresa-activa-context";

interface TotalesConsolidado {
  empresas: number;
  empresasActivas: number;
  empleadosActivos: number;
  contratosPorVencer: number;
  contratosVencidos: number;
}

interface ResumenEmpresa {
  id: number;
  nombre: string;
  activo: boolean;
  empleadosActivos: number;
  contratosPorVencer: number;
  contratosVencidos: number;
}

interface ContratoPorVencer {
  contratoId: number;
  empresaId: number;
  empresaNombre: string;
  empleadoNombre: string;
  fechaFin: string;
  diasRestantes: number;
}

interface ResumenConsolidado {
  totales: TotalesConsolidado;
  empresas: ResumenEmpresa[];
  contratosPorVencer: ContratoPorVencer[];
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Color del badge de días restantes según urgencia. */
function urgenciaBadge(dias: number): string {
  if (dias <= 7) return "bg-red-100 text-red-700 hover:bg-red-100";
  if (dias <= 15) return "bg-amber-100 text-amber-700 hover:bg-amber-100";
  return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100";
}

export default function ConsolidadoPage() {
  const { setEmpresaActivaId } = useEmpresaActiva();
  const [data, setData] = useState<ResumenConsolidado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        const resumen = await api.get<ResumenConsolidado>(
          "/consolidado/resumen",
        );
        if (activo) setData(resumen);
      } catch {
        if (activo)
          setError("No se pudo cargar el panorama consolidado del estudio.");
      } finally {
        if (activo) setCargando(false);
      }
    };
    cargar();
    return () => {
      activo = false;
    };
  }, []);

  // Cambia la empresa activa y entra a su dashboard. Recarga completa para que
  // todas las vistas refetcheen con la nueva empresa (mismo patrón del selector).
  const irAEmpresa = (id: number) => {
    setEmpresaActivaId(String(id));
    window.location.href = "/";
  };

  return (
    <div className="space-y-5 md:space-y-7">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Vista Consolidada
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Panorama de todas las empresas del estudio en una sola pantalla.
        </p>
      </div>

      {cargando ? (
        <ConsolidadoSkeleton />
      ) : error ? (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="py-8 text-center text-sm text-red-700">
            {error}
          </CardContent>
        </Card>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <KpiCard
              titulo="Empresas"
              valor={`${data.totales.empresasActivas}/${data.totales.empresas}`}
              detalle="activas / totales"
              icono={<Building2 className="h-4 w-4" />}
            />
            <KpiCard
              titulo="Empleados activos"
              valor={data.totales.empleadosActivos.toLocaleString("es-PE")}
              detalle="en todo el estudio"
              icono={<Users className="h-4 w-4" />}
            />
            <KpiCard
              titulo="Contratos por vencer"
              valor={data.totales.contratosPorVencer.toLocaleString("es-PE")}
              detalle="próximos 30 días"
              icono={<FileClock className="h-4 w-4" />}
              acento={data.totales.contratosPorVencer > 0}
            />
            <KpiCard
              titulo="Contratos vencidos"
              valor={data.totales.contratosVencidos.toLocaleString("es-PE")}
              detalle="requieren acción"
              icono={<FileWarning className="h-4 w-4" />}
              acento={data.totales.contratosVencidos > 0}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">
                Contratos por vencer (próximos 30 días)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.contratosPorVencer.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No hay contratos por vencer en los próximos 30 días.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Trabajador</TableHead>
                        <TableHead>Vence</TableHead>
                        <TableHead className="text-center">Días</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.contratosPorVencer.map((contrato) => (
                        <TableRow key={contrato.contratoId}>
                          <TableCell className="font-medium">
                            {contrato.empresaNombre}
                          </TableCell>
                          <TableCell>{contrato.empleadoNombre}</TableCell>
                          <TableCell>
                            {formatearFecha(contrato.fechaFin)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="secondary"
                              className={urgenciaBadge(contrato.diasRestantes)}
                            >
                              {contrato.diasRestantes}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => irAEmpresa(contrato.empresaId)}
                            >
                              Ir
                              <ArrowRight className="ml-1 h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">
                Resumen por empresa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead className="text-center">Empleados</TableHead>
                      <TableHead className="text-center">Por vencer</TableHead>
                      <TableHead className="text-center">Vencidos</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.empresas.map((empresa) => (
                      <TableRow key={empresa.id}>
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-2">
                            {empresa.nombre}
                            {!empresa.activo && (
                              <Badge variant="outline" className="text-xs">
                                Inactiva
                              </Badge>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {empresa.empleadosActivos}
                        </TableCell>
                        <TableCell className="text-center">
                          {empresa.contratosPorVencer > 0 ? (
                            <span className="font-semibold text-amber-600">
                              {empresa.contratosPorVencer}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {empresa.contratosVencidos > 0 ? (
                            <span className="font-semibold text-red-600">
                              {empresa.contratosVencidos}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => irAEmpresa(empresa.id)}
                          >
                            Ir
                            <ArrowRight className="ml-1 h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

interface KpiCardProps {
  titulo: string;
  valor: string;
  detalle: string;
  icono: React.ReactNode;
  acento?: boolean;
}

function KpiCard({ titulo, valor, detalle, icono, acento }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
          {titulo}
        </CardTitle>
        <span className="text-muted-foreground">{icono}</span>
      </CardHeader>
      <CardContent>
        <div
          className={
            acento
              ? "text-2xl font-bold text-amber-600"
              : "text-2xl font-bold"
          }
        >
          {valor}
        </div>
        <p className="text-xs text-muted-foreground">{detalle}</p>
      </CardContent>
    </Card>
  );
}

function ConsolidadoSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
