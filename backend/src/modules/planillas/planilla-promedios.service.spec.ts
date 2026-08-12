/**
 * `variablesSemestre`: las remuneraciones VARIABLES que el servicio entrega al
 * dominio para decidir si son remuneración REGULAR y entran a la computable de
 * la gratificación (D.S. 005-2002-TR: al menos tres meses en el semestre, suma
 * dividida entre seis).
 *
 * Lo que se prueba aquí es la ACOTACIÓN al semestre y el conteo de meses; la
 * regla legal en sí vive en `dominio/conceptos/remuneracion-variable.ts`.
 */
import { PlanillaPromediosService } from './planilla-promedios.service';

interface FilaDetalle {
  mes: number;
  anio: number;
  horas_extras?: number;
  bonificaciones?: number;
  bonificacion_nocturna?: number;
}

function build(filas: FilaDetalle[]) {
  const findMany = jest.fn().mockResolvedValue(
    filas.map((f) => ({
      horas_extras: f.horas_extras ?? 0,
      horas_extras_25: 0,
      horas_extras_35: 0,
      bonificaciones: f.bonificaciones ?? 0,
      bonificacion_nocturna: f.bonificacion_nocturna ?? 0,
      gratificacion_monto: 0,
      dias_trabajados: 30,
      dias_falta: 0,
      dias_suspension: 0,
      dias_licencia_sin_goce: 0,
      planilla: { mes: f.mes, anio: f.anio },
    })),
  );
  const prisma = { planillaDetalle: { findMany } };
  return new PlanillaPromediosService(prisma as never);
}

const mesConHe = (mes: number, monto: number, anio = 2026): FilaDetalle => ({
  mes,
  anio,
  horas_extras: monto,
});

describe('PlanillaPromediosService — variables del semestre de gratificación', () => {
  it('julio suma enero-junio y cuenta los meses con percepción efectiva', async () => {
    const service = build([
      mesConHe(1, 200),
      mesConHe(2, 0),
      mesConHe(3, 300),
      mesConHe(4, 250),
      mesConHe(5, 0),
      mesConHe(6, 361.5),
    ]);

    const promedios = await service.obtener(1, 10, 7, 2026);

    expect(promedios.variablesSemestre?.horasExtras).toEqual({
      totalSemestre: 1111.5,
      mesesPercibidos: 4,
    });
  });

  it('diciembre excluye junio: pertenece al semestre de la grati de julio', async () => {
    const service = build([
      mesConHe(6, 500), // semestre anterior — no debe entrar
      mesConHe(7, 100),
      mesConHe(8, 100),
      mesConHe(9, 100),
    ]);

    const promedios = await service.obtener(1, 10, 12, 2026);

    expect(promedios.variablesSemestre?.horasExtras).toEqual({
      totalSemestre: 300,
      mesesPercibidos: 3,
    });
  });

  it('ignora los meses de OTRO año aunque caigan en el rango del semestre', async () => {
    const service = build([mesConHe(5, 400, 2025), mesConHe(6, 120)]);

    const promedios = await service.obtener(1, 10, 7, 2026);

    expect(promedios.variablesSemestre?.horasExtras).toEqual({
      totalSemestre: 120,
      mesesPercibidos: 1,
    });
  });

  it('las bonificaciones se siguen por separado, con su propio conteo', async () => {
    const service = build([
      { mes: 3, anio: 2026, bonificaciones: 100 },
      { mes: 4, anio: 2026, bonificacion_nocturna: 50 },
      { mes: 5, anio: 2026, horas_extras: 80 },
    ]);

    const promedios = await service.obtener(1, 10, 7, 2026);

    expect(promedios.variablesSemestre?.bonificaciones).toEqual({
      totalSemestre: 150,
      mesesPercibidos: 2,
    });
    expect(promedios.variablesSemestre?.horasExtras).toEqual({
      totalSemestre: 80,
      mesesPercibidos: 1,
    });
  });

  it('fuera de julio y diciembre no hay semestre de gratificación que informar', async () => {
    const service = build([mesConHe(4, 300)]);

    const promedios = await service.obtener(1, 10, 5, 2026);

    expect(promedios.variablesSemestre).toBeUndefined();
  });
});
