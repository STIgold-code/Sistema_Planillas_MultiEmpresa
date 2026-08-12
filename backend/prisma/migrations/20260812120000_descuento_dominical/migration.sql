-- Descuento proporcional del descanso semanal obligatorio (dominical) por
-- ausencias sin goce: D.L. 713 art. 4 — "La remuneracion por el dia de descanso
-- semanal obligatorio ... se abonara en forma directamente proporcional al
-- numero de dias efectivamente trabajados en dicha semana".
--
-- Se agrega como columna propia (y no como desglose de descuento_faltas) para
-- poder cuadrar el concepto por separado con la planilla de la contadora.
-- Las planillas ya calculadas quedan en 0: el recalculo las repuebla.
ALTER TABLE "planilla_detalles"
  ADD COLUMN "descuento_dominical" DECIMAL(10,2) NOT NULL DEFAULT 0;
