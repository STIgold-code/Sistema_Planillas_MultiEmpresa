-- Documento de respaldo del préstamo (convenio de descuento firmado).
-- Obligatorio al otorgar: descontar de la remuneración exige autorización escrita
-- del trabajador. Tabla aparte para admitir varios adjuntos y para que los
-- préstamos creados antes de esta regla sigan siendo válidos (cero filas).

-- CreateTable
CREATE TABLE "prestamos_archivos" (
    "id" SERIAL NOT NULL,
    "prestamo_id" INTEGER NOT NULL,
    "archivo_url" VARCHAR(500) NOT NULL,
    "archivo_nombre" VARCHAR(200) NOT NULL,
    "archivo_tipo" VARCHAR(100),
    "archivo_tamano" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prestamos_archivos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prestamos_archivos_prestamo_id_idx" ON "prestamos_archivos"("prestamo_id");

-- AddForeignKey
ALTER TABLE "prestamos_archivos" ADD CONSTRAINT "prestamos_archivos_prestamo_id_fkey" FOREIGN KEY ("prestamo_id") REFERENCES "prestamos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
