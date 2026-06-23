-- Eliminar modulo SUCAMEC (oculto por decision de producto - Fase 3).
-- Tablas y enums recuperables desde git si el modulo se reactiva.

-- DropForeignKey
ALTER TABLE "carnets_sucamec" DROP CONSTRAINT "carnets_sucamec_documento_id_fkey";

-- DropForeignKey
ALTER TABLE "carnets_sucamec" DROP CONSTRAINT "carnets_sucamec_empleado_id_fkey";

-- DropForeignKey
ALTER TABLE "carnets_sucamec" DROP CONSTRAINT "carnets_sucamec_usuario_id_fkey";

-- DropTable
DROP TABLE "carnets_sucamec";

-- DropEnum
DROP TYPE "EstadoCarnetSucamec";

-- DropEnum
DROP TYPE "CategoriaSucamec";
