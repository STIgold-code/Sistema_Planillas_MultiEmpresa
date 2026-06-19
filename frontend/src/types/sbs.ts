// Consulta SBS (afiliacion AFP/ONP)

export interface SbsConsultaResult {
  afp: string | null;
  cuspp: string | null;
  regimen_pensionario_id: number | null;
  mensaje: string;
}
