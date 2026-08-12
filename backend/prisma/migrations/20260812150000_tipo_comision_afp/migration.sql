-- Tipo de comision AFP (Ley 29903 art. 8).
--
-- En el SPP cada afiliado elige la modalidad con la que paga la comision de su
-- AFP: sobre FLUJO (un porcentaje unico sobre la remuneracion del mes) o MIXTA
-- (un porcentaje MENOR sobre la remuneracion mas una comision anual sobre el
-- saldo del fondo, que la AFP cobra contra el fondo y NO se retiene en planilla).
-- El motor aplicaba una sola comision por AFP -la de flujo- a todos los
-- afiliados, sobredescontando a los de modalidad mixta.
--
-- Migracion NO destructiva: solo CREATE TYPE, ADD COLUMN nullable y backfill de
-- tasas sobre filas que aun no la tienen cargada.

-- CreateEnum
CREATE TYPE "TipoComisionAfp" AS ENUM ('FLUJO', 'MIXTA');

-- AlterTable: modalidad declarada por el trabajador.
-- NULL = dato aun no cargado -> el motor cae a la comision sobre FLUJO, que es
-- el comportamiento vigente hasta esta migracion (cero movimiento de planilla
-- por el solo hecho de desplegar).
ALTER TABLE "empleados"
  ADD COLUMN "tipo_comision_afp" "TipoComisionAfp";

-- AlterTable: componente sobre FLUJO de la comision MIXTA, por AFP.
-- Vive junto a "comision_flujo" (comision sobre flujo pura) y "comision_saldo"
-- (comision anual sobre el saldo, informativa) para que las tasas de una misma
-- administradora tengan una unica fuente de verdad.
ALTER TABLE "regimenes_pensionarios"
  ADD COLUMN "comision_mixta_flujo" DECIMAL(5,2) DEFAULT 0;

-- Backfill de las tasas de comision mixta vigentes 2026 publicadas por la SBS.
-- Se insertan aqui -y no solo en el seed de desarrollo- porque el seed no corre
-- en produccion: el deploy de Railway solo ejecuta "prisma migrate deploy".
-- Guarda de idempotencia: solo se escribe donde la tasa aun no fue cargada, de
-- modo que un valor corregido a mano nunca se pisa.
UPDATE "regimenes_pensionarios"
   SET "comision_mixta_flujo" = 0.38
 WHERE UPPER("nombre") = 'HABITAT'
   AND COALESCE("comision_mixta_flujo", 0) = 0;

UPDATE "regimenes_pensionarios"
   SET "comision_mixta_flujo" = 0.82
 WHERE UPPER("nombre") = 'INTEGRA'
   AND COALESCE("comision_mixta_flujo", 0) = 0;

UPDATE "regimenes_pensionarios"
   SET "comision_mixta_flujo" = 0.18
 WHERE UPPER("nombre") = 'PRIMA'
   AND COALESCE("comision_mixta_flujo", 0) = 0;

UPDATE "regimenes_pensionarios"
   SET "comision_mixta_flujo" = 0.28
 WHERE UPPER("nombre") = 'PROFUTURO'
   AND COALESCE("comision_mixta_flujo", 0) = 0;

-- La ONP no cobra comision: se deja explicita en 0 para que ninguna lectura
-- futura la confunda con "dato faltante".
UPDATE "regimenes_pensionarios"
   SET "comision_mixta_flujo" = 0
 WHERE "tipo" = 'ONP';
