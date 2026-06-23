import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword123'),
}));

// Mocks tipados por inferencia del literal: evitan `any` sin chocar con los
// tipos recursivos de Prisma (que rompen mockDeep con referencias circulares).
const crearPrismaMock = () => ({
  usuario: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  rol: {
    findUnique: jest.fn(),
  },
});

const crearAuthMock = () => ({
  revokeAllUserTokens: jest.fn(),
});

const crearAuditoriaMock = () => ({
  registrarAccion: jest.fn(),
  registrarCambiosCampos: jest.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: ReturnType<typeof crearPrismaMock>;
  let authService: ReturnType<typeof crearAuthMock>;

  // Mock data
  const mockEmpresaId = 1;
  const mockUserId = 1;
  const mockCurrentUserId = 2;

  const mockRol = {
    id: 1,
    nombre: 'Admin',
    descripcion: 'Administrador',
    permisos: ['usuarios:leer', 'usuarios:crear', 'usuarios:editar'],
    empresa_id: mockEmpresaId,
    activo: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockEmpresa = {
    id: mockEmpresaId,
    ruc: '12345678901',
    razon_social: 'Test Company',
    nombre_comercial: 'Test',
    direccion: null,
    telefono: null,
    email: null,
    representante_legal: null,
    dni_representante: null,
    cargo_representante: null,
    partida_electronica: null,
    logo_url: null,
    firma_representante_url: null,
    activo: true,
    created_at: new Date(),
  };

  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    password: 'hashedPassword',
    nombre_completo: 'Test User',
    activo: true,
    empresa_id: mockEmpresaId,
    rol_id: 1,
    ultimo_acceso: null,
    tokens_revocados_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    rol: mockRol,
    empresa: mockEmpresa,
  };

  const mockCreateUserDto = {
    email: 'new@example.com',
    password: 'Password123!',
    nombre_completo: 'New User',
    rol_id: 1,
  };

  const mockUpdateUserDto = {
    nombre_completo: 'Updated User',
  };

  beforeEach(async () => {
    const mockPrismaService = crearPrismaMock();
    const mockAuthService = crearAuthMock();
    const mockAuditoriaService = crearAuditoriaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: AuditoriaService, useValue: mockAuditoriaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = mockPrismaService;
    authService = mockAuthService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated users without passwords', async () => {
      const mockUsers = [mockUser];
      prismaService.usuario.findMany.mockResolvedValue(mockUsers);
      prismaService.usuario.count.mockResolvedValue(1);

      const result = await service.findAll(mockEmpresaId);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).not.toHaveProperty('password');
      expect(result.meta.total).toBe(1);
      expect(prismaService.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { empresa_id: mockEmpresaId },
        }),
      );
    });

    it('should validate pagination parameters', async () => {
      prismaService.usuario.findMany.mockResolvedValue([]);
      prismaService.usuario.count.mockResolvedValue(0);

      // Test with invalid page (negative)
      const result = await service.findAll(mockEmpresaId, -1, 50);
      expect(result.meta.page).toBe(1); // Should be normalized to 1

      // Test with excessive limit
      const result2 = await service.findAll(mockEmpresaId, 1, 500);
      expect(result2.meta.limit).toBe(100); // Should be capped at 100
    });
  });

  describe('findOne', () => {
    it('should return user without password', async () => {
      prismaService.usuario.findFirst.mockResolvedValue(mockUser);

      const result = await service.findOne(mockUserId, mockEmpresaId);

      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe(mockUser.email);
    });

    it('should throw NotFoundException when user not found', async () => {
      prismaService.usuario.findFirst.mockResolvedValue(null);

      await expect(service.findOne(999, mockEmpresaId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should filter by empresa_id for multi-tenant isolation', async () => {
      prismaService.usuario.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockUserId, 999)).rejects.toThrow(
        NotFoundException,
      );

      expect(prismaService.usuario.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUserId, empresa_id: 999 },
        }),
      );
    });
  });

  describe('create', () => {
    beforeEach(() => {
      prismaService.rol.findUnique.mockResolvedValue(mockRol);
      prismaService.usuario.findFirst.mockResolvedValue(null);
      prismaService.usuario.create.mockResolvedValue(mockUser);
    });

    it('should create user and hash password', async () => {
      const result = await service.create(mockCreateUserDto, mockEmpresaId, [
        '*',
      ]);

      expect(result).not.toHaveProperty('password');
      expect(bcrypt.hash).toHaveBeenCalledWith(mockCreateUserDto.password, 10);
      expect(prismaService.usuario.create).toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      prismaService.usuario.findFirst.mockResolvedValue(mockUser);

      await expect(
        service.create(mockCreateUserDto, mockEmpresaId, ['*']),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when rol does not exist', async () => {
      prismaService.rol.findUnique.mockResolvedValue(null);

      await expect(
        service.create(mockCreateUserDto, mockEmpresaId, ['*']),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when rol belongs to different empresa', async () => {
      prismaService.rol.findUnique.mockResolvedValue({
        ...mockRol,
        empresa_id: 999, // Different empresa
      });

      await expect(
        service.create(mockCreateUserDto, mockEmpresaId, ['*']),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when rol is inactive', async () => {
      prismaService.rol.findUnique.mockResolvedValue({
        ...mockRol,
        activo: false,
      });

      await expect(
        service.create(mockCreateUserDto, mockEmpresaId, ['*']),
      ).rejects.toThrow(BadRequestException);
    });

    // SECURITY: Privilege escalation prevention
    it('should throw ForbiddenException when trying to assign rol with more permissions', async () => {
      const rolWithSuperAdmin = {
        ...mockRol,
        permisos: ['*'], // Superadmin permissions
      };
      prismaService.rol.findUnique.mockResolvedValue(rolWithSuperAdmin);

      // User only has limited permissions
      const userPermisos = ['usuarios:leer', 'usuarios:crear'];

      await expect(
        service.create(mockCreateUserDto, mockEmpresaId, userPermisos),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow superadmin to assign any rol', async () => {
      const rolWithSuperAdmin = {
        ...mockRol,
        permisos: ['*'],
      };
      prismaService.rol.findUnique.mockResolvedValue(rolWithSuperAdmin);

      // Superadmin user
      const userPermisos = ['*'];

      const result = await service.create(
        mockCreateUserDto,
        mockEmpresaId,
        userPermisos,
      );

      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    beforeEach(() => {
      prismaService.usuario.findFirst.mockResolvedValue(mockUser);
      prismaService.usuario.update.mockResolvedValue({
        ...mockUser,
        nombre_completo: 'Updated User',
      });
      prismaService.rol.findUnique.mockResolvedValue(mockRol);
    });

    it('should update user and return without password', async () => {
      const result = await service.update(
        mockUserId,
        mockUpdateUserDto,
        mockEmpresaId,
        mockCurrentUserId,
        ['*'],
      );

      expect(result).not.toHaveProperty('password');
      expect(prismaService.usuario.update).toHaveBeenCalled();
    });

    it('should hash password when updating password', async () => {
      const updateWithPassword = { password: 'NewPassword123!' };

      await service.update(
        mockUserId,
        updateWithPassword,
        mockEmpresaId,
        mockCurrentUserId,
        ['*'],
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 10);
    });

    it('should revoke tokens when password changes', async () => {
      const updateWithPassword = { password: 'NewPassword123!' };

      await service.update(
        mockUserId,
        updateWithPassword,
        mockEmpresaId,
        mockCurrentUserId,
        ['*'],
      );

      expect(authService.revokeAllUserTokens).toHaveBeenCalledWith(mockUserId);
    });

    it('should not fail if revokeAllUserTokens throws error', async () => {
      authService.revokeAllUserTokens.mockRejectedValue(
        new Error('Token revocation failed'),
      );
      const updateWithPassword = { password: 'NewPassword123!' };

      // Should not throw
      const result = await service.update(
        mockUserId,
        updateWithPassword,
        mockEmpresaId,
        mockCurrentUserId,
        ['*'],
      );

      expect(result).toBeDefined();
    });

    it('should throw ConflictException when updating to existing email', async () => {
      prismaService.usuario.findFirst
        .mockResolvedValueOnce(mockUser) // First call for findOne
        .mockResolvedValueOnce({ ...mockUser, id: 999 }); // Second call for email check

      await expect(
        service.update(
          mockUserId,
          { email: 'existing@example.com' },
          mockEmpresaId,
          mockCurrentUserId,
          ['*'],
        ),
      ).rejects.toThrow(ConflictException);
    });

    // SECURITY: Self-deactivation prevention
    it('should throw ForbiddenException when user tries to deactivate themselves', async () => {
      await expect(
        service.update(
          mockUserId,
          { activo: false },
          mockEmpresaId,
          mockUserId, // Same as target user
          ['*'],
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    // SECURITY: Last admin protection
    it('should throw ForbiddenException when deactivating last admin', async () => {
      prismaService.usuario.count.mockResolvedValue(0); // No other admins

      await expect(
        service.update(
          mockUserId,
          { activo: false },
          mockEmpresaId,
          mockCurrentUserId,
          ['*'],
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow deactivation when other admins exist', async () => {
      prismaService.usuario.count.mockResolvedValue(1); // Other admin exists

      const result = await service.update(
        mockUserId,
        { activo: false },
        mockEmpresaId,
        mockCurrentUserId,
        ['*'],
      );

      expect(result).toBeDefined();
    });

    // SECURITY: Privilege escalation on rol update
    it('should throw ForbiddenException when updating to rol with more permissions', async () => {
      const superAdminRol = {
        ...mockRol,
        id: 2,
        permisos: ['*'],
      };
      prismaService.rol.findUnique.mockResolvedValue(superAdminRol);

      await expect(
        service.update(
          mockUserId,
          { rol_id: 2 },
          mockEmpresaId,
          mockCurrentUserId,
          ['usuarios:leer'], // Limited permissions
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      prismaService.usuario.findFirst.mockResolvedValue(mockUser);
      prismaService.usuario.update.mockResolvedValue({
        ...mockUser,
        activo: false,
      });
      prismaService.usuario.count.mockResolvedValue(1); // Other admins exist
    });

    it('should soft delete user (set activo to false)', async () => {
      const result = await service.remove(
        mockUserId,
        mockEmpresaId,
        mockCurrentUserId,
      );

      expect(result.message).toBe('Usuario eliminado correctamente');
      expect(prismaService.usuario.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { activo: false },
      });
      // Should NOT call delete
      expect(prismaService.usuario.delete).not.toHaveBeenCalled();
    });

    it('should revoke tokens on remove', async () => {
      await service.remove(mockUserId, mockEmpresaId, mockCurrentUserId);

      expect(authService.revokeAllUserTokens).toHaveBeenCalledWith(mockUserId);
    });

    // SECURITY: Self-deletion prevention
    it('should throw ForbiddenException when user tries to delete themselves', async () => {
      await expect(
        service.remove(
          mockUserId,
          mockEmpresaId,
          mockUserId, // Same as target user
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    // SECURITY: Last admin protection
    it('should throw ForbiddenException when deleting last admin', async () => {
      prismaService.usuario.count.mockResolvedValue(0); // No other admins

      await expect(
        service.remove(mockUserId, mockEmpresaId, mockCurrentUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should not fail if revokeAllUserTokens throws error', async () => {
      authService.revokeAllUserTokens.mockRejectedValue(
        new Error('Token revocation failed'),
      );

      // Should not throw
      const result = await service.remove(
        mockUserId,
        mockEmpresaId,
        mockCurrentUserId,
      );

      expect(result.message).toBe('Usuario eliminado correctamente');
    });
  });

  describe('Multi-tenant isolation', () => {
    it('findAll should always filter by empresa_id', async () => {
      prismaService.usuario.findMany.mockResolvedValue([]);
      prismaService.usuario.count.mockResolvedValue(0);

      await service.findAll(mockEmpresaId);

      expect(prismaService.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { empresa_id: mockEmpresaId },
        }),
      );
    });

    it('findOne should always filter by empresa_id', async () => {
      prismaService.usuario.findFirst.mockResolvedValue(null);

      await expect(service.findOne(1, mockEmpresaId)).rejects.toThrow();

      expect(prismaService.usuario.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, empresa_id: mockEmpresaId },
        }),
      );
    });
  });

  describe('Password never exposed', () => {
    it('findAll should not return password', async () => {
      prismaService.usuario.findMany.mockResolvedValue([mockUser]);
      prismaService.usuario.count.mockResolvedValue(1);

      const result = await service.findAll(mockEmpresaId);

      result.data.forEach((user) => {
        expect(user).not.toHaveProperty('password');
      });
    });

    it('findOne should not return password', async () => {
      prismaService.usuario.findFirst.mockResolvedValue(mockUser);

      const result = await service.findOne(mockUserId, mockEmpresaId);

      expect(result).not.toHaveProperty('password');
    });

    it('create should not return password', async () => {
      prismaService.rol.findUnique.mockResolvedValue(mockRol);
      prismaService.usuario.findFirst.mockResolvedValue(null);
      prismaService.usuario.create.mockResolvedValue(mockUser);

      const result = await service.create(mockCreateUserDto, mockEmpresaId, [
        '*',
      ]);

      expect(result).not.toHaveProperty('password');
    });

    it('update should not return password', async () => {
      prismaService.usuario.findFirst.mockResolvedValue(mockUser);
      prismaService.usuario.update.mockResolvedValue(mockUser);

      const result = await service.update(
        mockUserId,
        mockUpdateUserDto,
        mockEmpresaId,
        mockCurrentUserId,
        ['*'],
      );

      expect(result).not.toHaveProperty('password');
    });
  });
});
