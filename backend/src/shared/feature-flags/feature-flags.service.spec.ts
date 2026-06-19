import { ConfigService } from '@nestjs/config';
import { FeatureFlagsService } from './feature-flags.service';

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;
  let configMock: jest.Mocked<ConfigService>;

  beforeEach(() => {
    configMock = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;
    service = new FeatureFlagsService(configMock);
  });

  afterEach(() => {
    // Limpiar env vars seteadas en tests
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('FF_')) delete process.env[key];
    }
  });

  describe('isEnabled (global)', () => {
    it('retorna true si FF_<FLAG>=true', () => {
      configMock.get.mockImplementation((k: string) =>
        k === 'FF_TEST' ? 'true' : undefined,
      );
      expect(service.isEnabled('TEST')).toBe(true);
    });

    it('retorna false si FF_<FLAG>=false', () => {
      configMock.get.mockImplementation((k: string) =>
        k === 'FF_TEST' ? 'false' : undefined,
      );
      expect(service.isEnabled('TEST')).toBe(false);
    });

    it('retorna false si FF_<FLAG> esta unset y no hay rollout', () => {
      configMock.get.mockReturnValue(undefined);
      expect(service.isEnabled('TEST')).toBe(false);
    });

    it('retorna true si rollout es 100', () => {
      configMock.get.mockImplementation((k: string) =>
        k === 'FF_TEST_ROLLOUT' ? '100' : undefined,
      );
      expect(service.isEnabled('TEST')).toBe(true);
    });
  });

  describe('isEnabledForUser (rollout gradual)', () => {
    it('retorna true si FF_<FLAG>=true (ignora rollout)', () => {
      configMock.get.mockImplementation((k: string) => {
        if (k === 'FF_TEST') return 'true';
        if (k === 'FF_TEST_ROLLOUT') return '0';
        return undefined;
      });
      expect(service.isEnabledForUser('TEST', 'user-1')).toBe(true);
    });

    it('retorna false si rollout=0', () => {
      configMock.get.mockImplementation((k: string) =>
        k === 'FF_TEST_ROLLOUT' ? '0' : undefined,
      );
      expect(service.isEnabledForUser('TEST', 'user-1')).toBe(false);
    });

    it('retorna true si rollout=100', () => {
      configMock.get.mockImplementation((k: string) =>
        k === 'FF_TEST_ROLLOUT' ? '100' : undefined,
      );
      expect(service.isEnabledForUser('TEST', 'user-1')).toBe(true);
    });

    it('es deterministico: mismo userId + rollout → mismo resultado', () => {
      configMock.get.mockImplementation((k: string) =>
        k === 'FF_TEST_ROLLOUT' ? '50' : undefined,
      );
      const r1 = service.isEnabledForUser('TEST', 'user-42');
      const r2 = service.isEnabledForUser('TEST', 'user-42');
      expect(r1).toBe(r2);
    });

    it('distribuye aproximadamente el porcentaje configurado sobre muchos users', () => {
      configMock.get.mockImplementation((k: string) =>
        k === 'FF_TEST_ROLLOUT' ? '50' : undefined,
      );
      let enabled = 0;
      const total = 1000;
      for (let i = 0; i < total; i++) {
        if (service.isEnabledForUser('TEST', `user-${i}`)) enabled++;
      }
      // Esperamos ~50% con margen de 10% por variacion estadistica
      expect(enabled).toBeGreaterThan(400);
      expect(enabled).toBeLessThan(600);
    });

    it('rollout invalido (no numero) lo trata como 0', () => {
      configMock.get.mockImplementation((k: string) =>
        k === 'FF_TEST_ROLLOUT' ? 'abc' : undefined,
      );
      expect(service.isEnabledForUser('TEST', 'user-1')).toBe(false);
    });

    it('rollout negativo se clamp a 0', () => {
      configMock.get.mockImplementation((k: string) =>
        k === 'FF_TEST_ROLLOUT' ? '-10' : undefined,
      );
      expect(service.isEnabledForUser('TEST', 'user-1')).toBe(false);
    });

    it('rollout > 100 se clamp a 100', () => {
      configMock.get.mockImplementation((k: string) =>
        k === 'FF_TEST_ROLLOUT' ? '150' : undefined,
      );
      expect(service.isEnabledForUser('TEST', 'user-1')).toBe(true);
    });
  });
});
