-- Tiempo NO laborado del día, en minutos enteros: tardanzas (código T) y
-- permisos parciales sin goce (código P).
--
-- Columna DEDICADA a propósito. `tareo_detalles.horas` significa horas
-- EFECTIVAMENTE TRABAJADAS y alimenta el cálculo de horas extras; reutilizarla
-- para expresar tiempo descontado le daría dos significados opuestos al mismo
-- campo. Un día con 2 en `horas` es una jornada de dos horas; un día con 120 en
-- `minutos_no_laborados` es una tardanza de dos horas. Son cosas distintas.
--
-- Minutos enteros y no decimales de hora: el descuento se calcula minuto a
-- minuto (valor_minuto = sueldo / 30 / 8 / 60) y así no se arrastra ruido de
-- punto flotante en la unidad de medida.
--
-- Default 0: los registros existentes no tienen tiempo descontable, así que la
-- migración no cambia ningún cálculo ya emitido.
ALTER TABLE "tareo_detalles"
  ADD COLUMN "minutos_no_laborados" INTEGER NOT NULL DEFAULT 0;
