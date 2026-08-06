-- Día de corte del período de tareo por empresa (NULL = mes calendario).
ALTER TABLE "empresas" ADD COLUMN "dia_corte_tareo" INTEGER;
