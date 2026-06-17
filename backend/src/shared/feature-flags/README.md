# Feature Flags

Sistema simple de feature flags basado en variables de entorno.

## Por que feature flags

Durante el refactor, necesitamos poder:
- Activar codigo nuevo en prod **gradualmente** (10% → 50% → 100% de usuarios)
- **Revertir instantaneamente** sin redeploy si algo falla (env var → OFF)
- Correr codigo nuevo en **shadow mode** (ejecuta en paralelo, compara, no afecta respuesta)
- Separar **deploy** de **release** (merge a main != activar para usuarios)

## Como funciona

Cada flag se controla con 1-2 env vars en Railway (o .env local):

\`\`\`env
# Activar global (ignora rollout)
FF_NEW_EMPLEADOS_SERVICE=true

# O rollout gradual por usuario (0-100%)
FF_NEW_EMPLEADOS_SERVICE_ROLLOUT=25
\`\`\`

### Reglas de resolucion

| \`FF_<FLAG>\` | \`FF_<FLAG>_ROLLOUT\` | Comportamiento |
|--------------|----------------------|----------------|
| \`true\` | cualquiera | **Activo para todos** |
| \`false\` | cualquiera | **Inactivo para todos** |
| unset | \`100\` | Activo para todos |
| unset | \`0\` | Inactivo para todos |
| unset | \`N\` (1-99) | Activo para ~N% de usuarios (hash determistico de userId) |
| unset | unset | **Inactivo** (default seguro) |

## API

\`\`\`ts
import { FeatureFlagsService } from '@/shared/feature-flags/feature-flags.service';

@Injectable()
export class MyController {
  constructor(private readonly flags: FeatureFlagsService) {}

  handle(userId: string) {
    // Decision simple on/off
    if (this.flags.isEnabled('DEBUG_MODE')) {
      console.log('debug');
    }

    // Rollout gradual por usuario
    if (this.flags.isEnabledForUser('NEW_EMPLEADOS', userId)) {
      return this.nuevoService.handle(userId);
    }
    return this.legacyService.handle(userId);
  }
}
\`\`\`

## Garantias

- **Determinismo**: un mismo userId + mismo porcentaje → misma respuesta siempre
- **Distribucion uniforme**: sobre muchos usuarios, ~N% recibe true si rollout=N
- **Hash determinstico**: MD5 del userId mod 100
- **Default seguro**: flag sin config = false

## Naming convention

Prefijar las flags con el contexto:

- \`FF_NEW_<MODULO>_<FUNCIONALIDAD>\` — para refactor invisible
  - \`FF_NEW_EMPLEADOS_SERVICE\`
  - \`FF_NEW_CONTRATOS_CALCULO\`
- \`FF_SHADOW_<MODULO>\` — para activar shadow mode
  - \`FF_SHADOW_EMPLEADOS\`
- \`FF_FEATURE_<NOMBRE>\` — para features nuevas experimentales
  - \`FF_FEATURE_EXPORT_PDF\`
- \`FF_DEBUG_<CONTEXTO>\` — para debugging temporal
  - \`FF_DEBUG_QUERIES\`

## Limpieza de flags

**Flags temporales deben eliminarse.** Una vez que un refactor esta 100% y estable:

1. Confirmar en Sentry que no hay errores
2. Remover el flag del codigo (borrar el \`if\`)
3. Borrar la env var de Railway
4. Documentar en el PR de limpieza

Regla: si una flag estuvo al 100% por 2 semanas sin incidentes, se puede limpiar.

## Alternativas consideradas

- **Unleash / GrowthBook**: mas features (UI, targeting, A/B), pero agregan complejidad y costo. Overkill para 1 sola empresa operando. Migrable en el futuro si crece el proyecto.
- **Firebase Remote Config**: acopla al ecosistema Google. Rechazado.
- **LaunchDarkly**: caro.

Esta implementacion minima cubre el 100% de los casos del refactor. Si crecemos, migramos.

## Performance

- Costo por check: ~0.1ms (lectura env var + hash MD5)
- Sin llamadas de red, sin cache, sin DB
- Escalable: no hay estado compartido
