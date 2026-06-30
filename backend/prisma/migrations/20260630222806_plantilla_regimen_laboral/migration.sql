-- AlterTable
ALTER TABLE "plantillas_contrato" ADD COLUMN     "regimen_laboral" "RegimenLaboral";

-- CreateIndex
CREATE INDEX "plantillas_contrato_empresa_id_regimen_laboral_tipo_contrat_idx" ON "plantillas_contrato"("empresa_id", "regimen_laboral", "tipo_contrato");
