-- Módulo de Préstamos y Adelantos.
-- Convierte los descuentos de préstamo/adelanto (hoy números sueltos en
-- planilla_detalle que el recálculo borra) en entidades que el cálculo consulta.

-- CreateEnum
CREATE TYPE "TipoPrestamo" AS ENUM ('PRESTAMO', 'ADELANTO_SUELDO', 'ADELANTO_GRATIFICACION');

-- CreateEnum
CREATE TYPE "EstadoPrestamo" AS ENUM ('ACTIVO', 'PAGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoMovimientoPrestamo" AS ENUM ('CARGO_PLANILLA', 'ABONO_MANUAL', 'AJUSTE');

-- CreateTable
CREATE TABLE "prestamos" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "tipo" "TipoPrestamo" NOT NULL,
    "monto_total" DECIMAL(10,2),
    "cuota_mensual" DECIMAL(10,2) NOT NULL,
    "saldo" DECIMAL(10,2),
    "estado" "EstadoPrestamo" NOT NULL DEFAULT 'ACTIVO',
    "fecha_otorgado" DATE NOT NULL,
    "observaciones" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prestamos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prestamos_movimientos" (
    "id" SERIAL NOT NULL,
    "prestamo_id" INTEGER NOT NULL,
    "planilla_id" INTEGER,
    "monto" DECIMAL(10,2) NOT NULL,
    "tipo" "TipoMovimientoPrestamo" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prestamos_movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prestamos_empresa_id_idx" ON "prestamos"("empresa_id");

-- CreateIndex
CREATE INDEX "prestamos_empleado_id_idx" ON "prestamos"("empleado_id");

-- CreateIndex
CREATE INDEX "prestamos_estado_idx" ON "prestamos"("estado");

-- CreateIndex
CREATE INDEX "prestamos_empresa_id_estado_idx" ON "prestamos"("empresa_id", "estado");

-- CreateIndex
CREATE INDEX "prestamos_movimientos_prestamo_id_idx" ON "prestamos_movimientos"("prestamo_id");

-- CreateIndex
CREATE INDEX "prestamos_movimientos_planilla_id_idx" ON "prestamos_movimientos"("planilla_id");

-- CreateIndex: idempotencia del cargo por planilla (re-aprobar no duplica el cargo)
CREATE UNIQUE INDEX "prestamos_movimientos_prestamo_id_planilla_id_tipo_key" ON "prestamos_movimientos"("prestamo_id", "planilla_id", "tipo");

-- AddForeignKey
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamos_movimientos" ADD CONSTRAINT "prestamos_movimientos_prestamo_id_fkey" FOREIGN KEY ("prestamo_id") REFERENCES "prestamos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamos_movimientos" ADD CONSTRAINT "prestamos_movimientos_planilla_id_fkey" FOREIGN KEY ("planilla_id") REFERENCES "planillas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
