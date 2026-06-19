export interface Cliente {
  id: number;
  ruc: string;
  razon_social: string;
  nombre_comercial: string | null;
}

export interface Sede {
  id: number;
  nombre: string;
  direccion: string | null;
  cliente_id: number;
}

export interface PlantillaDocumento {
  id: number;
  nombre: string;
  activo: boolean;
  categoria: string;
}

export interface Cargo {
  id: number;
  nombre: string;
}

export interface ContratoForm {
  tipo_contrato: string;
  modalidad: string;
  fecha_inicio: string;
  fecha_fin: string;
  remuneracion: string;
  cliente_id: string;
  sede_id: string;
  lugar_trabajo: string;
  observaciones: string;
  plantilla_id: string;
  generar_documento: boolean;
  cargo_id: string;
  /** Régimen laboral del contrato. '' = heredar el default de la empresa. */
  regimen_laboral: string;
}

export const initialFormState: ContratoForm = {
  tipo_contrato: 'SUJETO_A_MODALIDAD',
  modalidad: 'PRESENCIAL',
  fecha_inicio: '',
  fecha_fin: '',
  remuneracion: '',
  cliente_id: '',
  sede_id: '',
  lugar_trabajo: '',
  observaciones: '',
  plantilla_id: '',
  generar_documento: true,
  cargo_id: '',
  regimen_laboral: '',
};
