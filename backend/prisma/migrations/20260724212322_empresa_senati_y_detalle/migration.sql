-- AlterTable
ALTER TABLE "empresas" ADD COLUMN     "aporta_senati" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "planilla_detalles" ADD COLUMN     "senati_empleador" DECIMAL(10,2) NOT NULL DEFAULT 0;
