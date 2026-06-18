import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { seedParametrosLegales } from './seed-parametros-legales';

const prisma = new PrismaClient();

// Cache de tipos de columna por tabla
const columnTypesCache: Record<string, Record<string, string>> = {};

async function getColumnTypes(
  tableName: string,
): Promise<Record<string, string>> {
  if (columnTypesCache[tableName]) return columnTypesCache[tableName];

  const cols: { column_name: string; udt_name: string; data_type: string }[] =
    await prisma.$queryRawUnsafe(
      `SELECT column_name, udt_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`,
      tableName,
    );

  const types: Record<string, string> = {};
  for (const col of cols) {
    types[col.column_name] = col.data_type === 'USER-DEFINED' ? col.udt_name : col.data_type;
  }
  columnTypesCache[tableName] = types;
  return types;
}

/**
 * Inserta registros en una tabla preservando IDs usando SQL raw.
 */
async function insertRecords(tableName: string, records: any[]) {
  if (!records?.length) return 0;

  await prisma.$executeRawUnsafe(`DELETE FROM "${tableName}"`);

  const colTypes = await getColumnTypes(tableName);
  const validColumns = Object.keys(colTypes);

  for (const record of records) {
    // Solo usar columnas que existan en la base de datos
    const columns = Object.keys(record).filter((col) => validColumns.includes(col));
    const colNames = columns.map((c) => `"${c}"`).join(', ');

    const castParts: string[] = [];
    const values: any[] = [];

    columns.forEach((c, i) => {
      const v = record[c];
      const placeholder = `$${i + 1}`;
      const pgType = colTypes[c] || '';

      if (v === null || v === undefined) {
        castParts.push(placeholder);
        values.push(null);
      } else if (pgType === 'ARRAY' || pgType === '_text') {
        // text[] arrays
        castParts.push(`${placeholder}::text[]`);
        values.push(v);
      } else if (pgType === 'jsonb' || pgType === 'json') {
        castParts.push(`${placeholder}::jsonb`);
        values.push(typeof v === 'string' ? v : JSON.stringify(v));
      } else if (
        pgType.startsWith('timestamp') ||
        pgType === 'date'
      ) {
        castParts.push(`${placeholder}::${pgType}`);
        values.push(v);
      } else if (pgType === 'numeric') {
        // Prisma exporta Decimal como string
        castParts.push(`${placeholder}::numeric`);
        values.push(String(v));
      } else if (
        pgType !== '' &&
        pgType !== 'integer' &&
        pgType !== 'boolean' &&
        pgType !== 'text' &&
        !pgType.startsWith('character') &&
        !pgType.startsWith('double') &&
        !pgType.startsWith('bigint')
      ) {
        // Enum u otro tipo custom → cast
        castParts.push(`${placeholder}::"${pgType}"`);
        values.push(String(v));
      } else if (typeof v === 'object' && !Array.isArray(v)) {
        castParts.push(`${placeholder}::jsonb`);
        values.push(JSON.stringify(v));
      } else {
        castParts.push(placeholder);
        values.push(v);
      }
    });

    const placeholders = castParts.join(', ');

    await prisma.$executeRawUnsafe(
      `INSERT INTO "${tableName}" (${colNames}) VALUES (${placeholders})`,
      ...values,
    );
  }

  // Resetear secuencia
  const maxId = Math.max(...records.map((r) => r.id || 0));
  if (maxId > 0) {
    try {
      await prisma.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), ${maxId}, true)`,
      );
    } catch {
      // Algunas tablas pueden no tener secuencia
    }
  }

  return records.length;
}

async function main() {
  console.log('==============================================');
  console.log('SEED - Importando datos desde data-export.json');
  console.log('==============================================\n');

  const dataPath = path.join(__dirname, 'data-export.json');
  if (!fs.existsSync(dataPath)) {
    throw new Error(
      'No se encontró data-export.json. Ejecuta primero: npx ts-node prisma/export-data.ts',
    );
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // Desactivar constraints de FK temporalmente
  await prisma.$executeRawUnsafe('SET session_replication_role = replica');

  // Orden de inserción (respeta dependencias)
  const tables: [string, string][] = [
    // [tableName, dataKey]
    // 1. Maestras sin dependencias
    ['bancos', 'bancos'],
    ['regimenes_pensionarios', 'regimenesPensionarios'],
    ['tipos_marcacion', 'tiposMarcacion'],
    // 2. Ubigeos
    ['departamentos', 'departamentos'],
    ['provincias', 'provincias'],
    ['distritos', 'distritos'],
    // 3. Empresas y dependientes
    ['empresas', 'empresas'],
    ['roles', 'roles'],
    ['usuarios', 'usuarios'],
    ['areas', 'areas'],
    ['cargos', 'cargos'],
    ['clientes', 'clientes'],
    ['sedes', 'sedes'],
    ['sede_contactos', 'sedeContactos'],
    ['procedencias', 'procedencias'],
    ['tipos_documento_empleado', 'tiposDocumentoEmpleado'],
    ['tipos_evaluacion', 'tiposEvaluacion'],
    ['plantillas_contrato', 'plantillasContrato'],
    ['plantillas_documento', 'plantillasDocumento'],
    // 4. Empleados y relacionados
    ['empleados', 'empleados'],
    ['empleados_familiares', 'empleadosFamiliares'],
    ['empleados_documentos', 'empleadosDocumentos'],
    ['empleados_movimientos', 'empleadosMovimientos'],
    ['contratos', 'contratos'],
    ['documentos_generados', 'documentosGenerados'],
    // 5. Selección
    ['vacantes', 'vacantes'],
    ['postulantes', 'postulantes'],
    ['postulante_evaluaciones', 'postulanteEvaluaciones'],
    // 6. Tareo
    ['periodos_tareo', 'periodosTareo'],
    ['tareos', 'tareos'],
    ['tareo_detalles', 'tareoDetalles'],
    ['tareo_detalle_audits', 'tareoDetalleAudits'],
    ['tareo_justificaciones', 'tareoJustificaciones'],
    ['tareo_justificacion_archivos', 'tareoJustificacionArchivos'],
    ['configuracion_tareo', 'configuracionTareo'],
    ['sesiones_tareo', 'sesionesTareo'],
    ['solicitudes_extension_tareo', 'solicitudesExtension'],
    // 7. Planillas
    ['planillas', 'planillas'],
    ['planilla_detalles', 'planillaDetalles'],
    ['boletas', 'boletas'],
    // 8. Vacaciones
    ['configuracion_vacaciones', 'configuracionVacaciones'],
    ['periodos_vacacionales', 'periodosVacacionales'],
    ['solicitudes_vacaciones', 'solicitudesVacaciones'],
    ['movimientos_vacacionales', 'movimientosVacacionales'],
    // 9. Onboarding
    ['plantillas_onboarding', 'plantillasOnboarding'],
    ['tareas_onboarding', 'tareasOnboarding'],
    ['procesos_onboarding', 'procesosOnboarding'],
    ['tareas_empleado_onboarding', 'tareasEmpleadoOnboarding'],
    // 10. Documentos y logs
    ['photocheck_logs', 'photocheckLogs'],
    ['solicitudes_cese', 'solicitudesCese'],
    // 11. Auditoría y tokens
    ['auditoria', 'auditoria'],
    ['tokens_revocados', 'tokensRevocados'],
  ];

  let totalRecords = 0;

  for (const [tableName, dataKey] of tables) {
    const records = data[dataKey];
    if (!records?.length) {
      console.log(`   ${tableName}: 0 (vacío)`);
      continue;
    }
    const count = await insertRecords(tableName, records);
    totalRecords += count;
    console.log(`   ${tableName}: ${count}`);
  }

  // Reactivar constraints
  await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT');

  // Parámetros legales escalares (idempotente, mismos valores que el adapter
  // in-memory para no mover ningún cálculo).
  const paramsLegales = await seedParametrosLegales(prisma);
  console.log(`   parametros_legales: ${paramsLegales} (escalares)`);

  console.log('\n==============================================');
  console.log('SEED COMPLETADO');
  console.log(`Total registros importados: ${totalRecords}`);
  console.log('==============================================\n');
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
