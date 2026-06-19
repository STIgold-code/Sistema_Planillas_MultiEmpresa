import { Prisma } from '@prisma/client';

/**
 * Deriva un prefijo de código a partir del nombre del tipo cuando no se
 * definió uno explícito. Toma las primeras 3 letras alfabéticas, en
 * mayúsculas y sin acentos. Ej: "Camisa" -> "CAM", "Pantalón" -> "PAN".
 */
export function derivarPrefijo(nombre: string): string {
  const limpio = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
    .replace(/[^a-zA-Z]/g, '') // solo letras
    .toUpperCase();
  return (limpio.slice(0, 3) || 'ITM').padEnd(3, 'X');
}

/**
 * Crea un asignador de códigos correlativos por prefijo, con estado, para usar
 * dentro de una transacción que crea varios items.
 *
 * Formato: {PREFIJO}-{NNNN} (4 dígitos con padding). Soporta hasta 9999 por
 * prefijo, suficiente para el volumen de uniformes. El correlativo es por
 * prefijo (no por tipo), así dos tipos que comparten prefijo comparten la
 * secuencia sin colisionar.
 *
 * IMPORTANTE: cachea el próximo correlativo por prefijo EN MEMORIA. Esto es
 * necesario porque los items aún no están persistidos entre llamadas dentro de
 * la misma transacción: consultar la BD en cada línea devolvería el mismo
 * "último código" y generaría duplicados (violando el unique (codigo,
 * empresa_id)). La BD se consulta una sola vez por prefijo, como punto de
 * partida; el resto avanza en memoria.
 */
export function crearAsignadorCodigos(
  tx: Prisma.TransactionClient,
  empresaId: number,
) {
  const siguientePorPrefijo = new Map<string, number>();

  return async function asignarCodigos(
    prefijo: string,
    cantidad: number,
  ): Promise<string[]> {
    let siguiente = siguientePorPrefijo.get(prefijo);
    if (siguiente === undefined) {
      const ultimo = await tx.itemInventario.findFirst({
        where: { empresa_id: empresaId, codigo: { startsWith: `${prefijo}-` } },
        orderBy: { codigo: 'desc' },
        select: { codigo: true },
      });
      siguiente = 1;
      if (ultimo) {
        const match = ultimo.codigo.match(/-(\d+)$/);
        if (match) siguiente = parseInt(match[1], 10) + 1;
      }
    }

    const codigos: string[] = [];
    for (let i = 0; i < cantidad; i++) {
      codigos.push(`${prefijo}-${String(siguiente + i).padStart(4, '0')}`);
    }
    siguientePorPrefijo.set(prefijo, siguiente + cantidad);
    return codigos;
  };
}
