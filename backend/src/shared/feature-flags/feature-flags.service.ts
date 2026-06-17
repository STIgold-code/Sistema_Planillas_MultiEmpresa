import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

/**
 * Servicio de Feature Flags simple basado en env vars.
 *
 * Cada flag se controla con 2 env vars:
 *   FF_<FLAG_NAME>            - 'true'|'false' (activar global, tiene prioridad)
 *   FF_<FLAG_NAME>_ROLLOUT    - 0-100 (porcentaje de usuarios para rollout gradual)
 *
 * Reglas:
 * - Si FF_<FLAG>=true      → activo para TODOS (ignora rollout)
 * - Si FF_<FLAG>=false     → inactivo para todos (ignora rollout)
 * - Si FF_<FLAG> no seteada → se usa FF_<FLAG>_ROLLOUT (0-100)
 * - Si ambos unset         → inactivo (default seguro)
 *
 * El rollout por userId es deterministico: un mismo user siempre recibe
 * la misma decision para un mismo porcentaje. Se basa en hash MD5 del
 * userId (mod 100).
 *
 * Uso:
 *   constructor(private readonly flags: FeatureFlagsService) {}
 *
 *   if (this.flags.isEnabled('NEW_EMPLEADOS_SERVICE')) {
 *     return this.nuevoService.handle();
 *   }
 *   return this.legacyService.handle();
 *
 *   if (this.flags.isEnabledForUser('NEW_EMPLEADOS', userId)) {
 *     // rollout gradual por usuario
 *   }
 */
@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Verifica si un flag esta activado globalmente (ignora rollout).
   * Util para flags booleanas simples (on/off).
   */
  isEnabled(flagName: string): boolean {
    const raw = this.config.get<string>(`FF_${flagName}`);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    // Si no esta seteada, usamos rollout (si existe) con un userId generico
    const rollout = this.getRolloutPercentage(flagName);
    return rollout >= 100; // solo true si rollout es 100%
  }

  /**
   * Verifica si un flag esta activado para un usuario especifico.
   * Respeta primero FF_<FLAG>, y si no esta, aplica rollout deterministico.
   */
  isEnabledForUser(flagName: string, userId: string): boolean {
    const raw = this.config.get<string>(`FF_${flagName}`);
    if (raw === 'true') return true;
    if (raw === 'false') return false;

    const rollout = this.getRolloutPercentage(flagName);
    if (rollout <= 0) return false;
    if (rollout >= 100) return true;

    const bucket = this.hashUserToBucket(userId);
    return bucket < rollout;
  }

  /**
   * Lista todas las flags activas en el entorno actual (solo las que tienen FF_*).
   * Util para endpoint de admin que muestre estado actual.
   */
  listConfiguredFlags(): Record<
    string,
    { enabled: string | null; rollout: number | null }
  > {
    const allEnv = process.env;
    const result: Record<
      string,
      { enabled: string | null; rollout: number | null }
    > = {};

    for (const key of Object.keys(allEnv)) {
      if (!key.startsWith('FF_')) continue;
      if (key.endsWith('_ROLLOUT')) continue;

      const flagName = key.substring(3);
      result[flagName] = {
        enabled: allEnv[key] ?? null,
        rollout: this.getRolloutPercentage(flagName),
      };
    }

    return result;
  }

  private getRolloutPercentage(flagName: string): number {
    const raw = this.config.get<string>(`FF_${flagName}_ROLLOUT`);
    if (!raw) return 0;
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      this.logger.warn(`FF_${flagName}_ROLLOUT no es un numero valido: ${raw}`);
      return 0;
    }
    return Math.max(0, Math.min(100, parsed));
  }

  private hashUserToBucket(userId: string): number {
    const hash = createHash('md5').update(userId).digest();
    // Usamos los primeros 4 bytes como uint32, mod 100
    const n = hash.readUInt32BE(0);
    return n % 100;
  }
}
