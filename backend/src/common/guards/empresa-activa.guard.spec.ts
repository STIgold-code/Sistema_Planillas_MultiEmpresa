import { ExecutionContext, BadRequestException } from '@nestjs/common';
import { EmpresaActivaGuard } from './empresa-activa.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../types/auth.types';

const crearPrismaMock = () => ({
  empresa: { findUnique: jest.fn() },
});

type PrismaMock = ReturnType<typeof crearPrismaMock>;

function crearContext(req: {
  user?: Partial<AuthenticatedUser>;
  headers: Record<string, string | string[] | undefined>;
}): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

const superadmin = (): Partial<AuthenticatedUser> => ({
  empresa_id: 1,
  rol: { permisos: ['*'] } as AuthenticatedUser['rol'],
});

const usuarioNormal = (): Partial<AuthenticatedUser> => ({
  empresa_id: 1,
  rol: { permisos: ['empleados:leer'] } as AuthenticatedUser['rol'],
});

describe('EmpresaActivaGuard', () => {
  let prisma: PrismaMock;
  let guard: EmpresaActivaGuard;

  beforeEach(() => {
    prisma = crearPrismaMock();
    guard = new EmpresaActivaGuard(prisma as unknown as PrismaService);
  });

  it('sin usuario autenticado, deja pasar (otro guard decide)', async () => {
    const ctx = crearContext({ headers: {} });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('sin header, mantiene la empresa propia (R5)', async () => {
    const user = superadmin();
    const ctx = crearContext({ user, headers: {} });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(user.empresa_id).toBe(1);
    expect(prisma.empresa.findUnique).not.toHaveBeenCalled();
  });

  it('superadmin con empresa válida, sobrescribe la empresa activa (R1, R2)', async () => {
    const user = superadmin();
    prisma.empresa.findUnique.mockResolvedValue({
      id: 7,
      razon_social: 'Empresa B',
    });
    const ctx = crearContext({ user, headers: { 'x-empresa-activa': '7' } });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(user.empresa_id).toBe(7);
  });

  it('usuario NO superadmin, ignora el header y mantiene su empresa (R3)', async () => {
    const user = usuarioNormal();
    const ctx = crearContext({ user, headers: { 'x-empresa-activa': '7' } });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(user.empresa_id).toBe(1);
    expect(prisma.empresa.findUnique).not.toHaveBeenCalled();
  });

  it('superadmin con empresa inexistente, mantiene la empresa propia (R4)', async () => {
    const user = superadmin();
    prisma.empresa.findUnique.mockResolvedValue(null);
    const ctx = crearContext({ user, headers: { 'x-empresa-activa': '999' } });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(user.empresa_id).toBe(1);
  });

  it('header no numérico, lanza BadRequest (R4)', async () => {
    const user = superadmin();
    const ctx = crearContext({ user, headers: { 'x-empresa-activa': 'abc' } });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
