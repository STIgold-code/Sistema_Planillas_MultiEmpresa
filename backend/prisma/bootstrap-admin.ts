/**
 * Bootstrap mínimo para un entorno nuevo: crea una empresa, un rol de
 * administrador con acceso total y un usuario admin para poder iniciar sesión.
 *
 * Idempotente (upserts). Pensado para correr una vez tras el primer deploy,
 * cuando la BD está migrada pero sin usuarios. Cambiá los datos demo luego
 * desde la propia aplicación.
 *
 *   npx ts-node prisma/bootstrap-admin.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PERMISO_TOTAL } from '../src/common/constants/permissions';

const prisma = new PrismaClient();

// Datos demo — CAMBIAR la contraseña tras el primer login.
const EMPRESA = {
  ruc: '20100000001',
  razon_social: 'Empresa Demo S.A.C.',
};
const ADMIN = {
  email: 'admin@demo.pe',
  password: 'Admin123!',
  nombre_completo: 'Administrador',
};

async function main() {
  const empresa = await prisma.empresa.upsert({
    where: { ruc: EMPRESA.ruc },
    update: {},
    create: {
      ruc: EMPRESA.ruc,
      razon_social: EMPRESA.razon_social,
      regimen_laboral_default: 'GENERAL',
    },
  });

  const rol = await prisma.rol.upsert({
    where: { nombre_empresa_id: { nombre: 'Administrador', empresa_id: empresa.id } },
    update: { permisos: [PERMISO_TOTAL] },
    create: {
      nombre: 'Administrador',
      descripcion: 'Acceso total al sistema',
      permisos: [PERMISO_TOTAL],
      empresa_id: empresa.id,
    },
  });

  const password = await bcrypt.hash(ADMIN.password, 10);
  const usuario = await prisma.usuario.upsert({
    where: { email: ADMIN.email },
    update: { rol_id: rol.id, empresa_id: empresa.id },
    create: {
      email: ADMIN.email,
      password,
      nombre_completo: ADMIN.nombre_completo,
      empresa_id: empresa.id,
      rol_id: rol.id,
    },
  });

  console.log('Bootstrap OK');
  console.log('  Empresa:', empresa.razon_social, `(RUC ${empresa.ruc})`);
  console.log('  Rol    :', rol.nombre, '(acceso total)');
  console.log('  Login  :', usuario.email, '/', ADMIN.password);
}

main()
  .catch((e) => {
    console.error('Error en bootstrap:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
