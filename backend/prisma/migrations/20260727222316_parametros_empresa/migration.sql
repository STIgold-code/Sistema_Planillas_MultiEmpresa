-- CreateTable
CREATE TABLE "parametros_empresa" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "clave" VARCHAR(50) NOT NULL,
    "valor" DECIMAL(14,6) NOT NULL,
    "descripcion" VARCHAR(200),
    "vigencia_desde" DATE NOT NULL,
    "vigencia_hasta" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parametros_empresa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "parametros_empresa_empresa_id_idx" ON "parametros_empresa"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "parametros_empresa_empresa_id_clave_vigencia_desde_key" ON "parametros_empresa"("empresa_id", "clave", "vigencia_desde");

-- AddForeignKey
ALTER TABLE "parametros_empresa" ADD CONSTRAINT "parametros_empresa_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
