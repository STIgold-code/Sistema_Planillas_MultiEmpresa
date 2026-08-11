-- CreateEnum
CREATE TYPE "EstadoSolicitudCorreccionFecha" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "solicitudes_correccion_fecha" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "contrato_id" INTEGER NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "fecha_inicio_actual" DATE NOT NULL,
    "fecha_fin_actual" DATE,
    "fecha_inicio_propuesta" DATE NOT NULL,
    "fecha_fin_propuesta" DATE,
    "motivo" VARCHAR(2000) NOT NULL,
    "estado" "EstadoSolicitudCorreccionFecha" NOT NULL DEFAULT 'PENDIENTE',
    "solicitado_por_id" INTEGER NOT NULL,
    "resuelto_por_id" INTEGER,
    "fecha_resolucion" TIMESTAMP(3),
    "observaciones_admin" VARCHAR(500),
    "advertencia_planillas" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_correccion_fecha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_correccion_fecha_archivos" (
    "id" SERIAL NOT NULL,
    "solicitud_correccion_id" INTEGER NOT NULL,
    "archivo_url" VARCHAR(500) NOT NULL,
    "archivo_nombre" VARCHAR(200) NOT NULL,
    "archivo_tipo" VARCHAR(100),
    "archivo_tamano" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitudes_correccion_fecha_archivos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solicitudes_correccion_fecha_empresa_id_idx" ON "solicitudes_correccion_fecha"("empresa_id");

-- CreateIndex
CREATE INDEX "solicitudes_correccion_fecha_empleado_id_idx" ON "solicitudes_correccion_fecha"("empleado_id");

-- CreateIndex
CREATE INDEX "solicitudes_correccion_fecha_contrato_id_idx" ON "solicitudes_correccion_fecha"("contrato_id");

-- CreateIndex
CREATE INDEX "solicitudes_correccion_fecha_estado_idx" ON "solicitudes_correccion_fecha"("estado");

-- CreateIndex
CREATE INDEX "solicitudes_correccion_fecha_empresa_id_estado_idx" ON "solicitudes_correccion_fecha"("empresa_id", "estado");

-- CreateIndex
CREATE INDEX "solicitudes_correccion_fecha_archivos_solicitud_idx" ON "solicitudes_correccion_fecha_archivos"("solicitud_correccion_id");

-- AddForeignKey
ALTER TABLE "solicitudes_correccion_fecha" ADD CONSTRAINT "solicitudes_correccion_fecha_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_correccion_fecha" ADD CONSTRAINT "solicitudes_correccion_fecha_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_correccion_fecha" ADD CONSTRAINT "solicitudes_correccion_fecha_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_correccion_fecha" ADD CONSTRAINT "solicitudes_correccion_fecha_resuelto_por_id_fkey" FOREIGN KEY ("resuelto_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_correccion_fecha" ADD CONSTRAINT "solicitudes_correccion_fecha_solicitado_por_id_fkey" FOREIGN KEY ("solicitado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_correccion_fecha_archivos" ADD CONSTRAINT "solicitudes_correccion_fecha_archivos_solicitud_fkey" FOREIGN KEY ("solicitud_correccion_id") REFERENCES "solicitudes_correccion_fecha"("id") ON DELETE CASCADE ON UPDATE CASCADE;
