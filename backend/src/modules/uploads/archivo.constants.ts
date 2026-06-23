/**
 * Constantes y reglas de clasificacion de archivos.
 *
 * La autorizacion al servir un archivo se basa en el registro `Archivo`
 * (campo `publico` + `empresa_id`), NUNCA en el prefijo de la key. Estas
 * constantes definen la categoria logica y la visibilidad por defecto al
 * momento de subir.
 */

/**
 * Categorias logicas de archivos. Mapean (aproximadamente) a las carpetas/
 * prefijos usados al subir, pero la fuente de verdad de autorizacion es el
 * registro `Archivo`, no la carpeta.
 */
export const CATEGORIA_ARCHIVO = {
  LOGOS: 'logos',
  FIRMAS: 'firmas',
  ASSETS: 'assets',
  DOCUMENTOS: 'documentos',
  CONTRATOS: 'contratos',
  PLANTILLAS: 'plantillas',
  EVALUACIONES: 'evaluaciones',
  FOTOS: 'fotos',
  EMPRESAS: 'empresas',
  TAREO: 'tareo',
  BOLETAS: 'boletas',
  ONBOARDING: 'onboarding',
  CESES: 'ceses',
  ANULACIONES: 'anulaciones',
  REPORTES: 'reportes',
  TEMP: 'temp',
} as const;

export type CategoriaArchivo =
  (typeof CATEGORIA_ARCHIVO)[keyof typeof CATEGORIA_ARCHIVO];

/**
 * Categorias genuinamente publicas: logos y assets de marca.
 *
 * IMPORTANTE: la categoria 'empresas' NO es publica por defecto porque bajo
 * ese prefijo conviven logos (publicos) y firmas del representante legal
 * (privadas, PII legal). Un archivo subido como 'empresas' queda privado y
 * solo se marca publico cuando se confirma que es un logo (al asociarse a
 * Empresa.logo_url).
 */
const CATEGORIAS_PUBLICAS = new Set<string>([
  CATEGORIA_ARCHIVO.LOGOS,
  CATEGORIA_ARCHIVO.ASSETS,
]);

/**
 * Determina la visibilidad publica por defecto de una categoria al subir.
 * Por seguridad, todo es privado salvo categorias explicitamente publicas.
 */
export function esCategoriaPublica(categoria: string): boolean {
  return CATEGORIAS_PUBLICAS.has(categoria);
}
