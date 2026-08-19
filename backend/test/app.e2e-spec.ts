import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { BackupService } from './../src/modules/backup/backup.service';
import { PensionRatesSchedulerService } from './../src/modules/masters/services/pension-rates-scheduler.service';

/**
 * Smoke test de arranque. No valida reglas de negocio: valida lo único que el
 * CI no podía ver hasta ahora — que la aplicación levanta de verdad contra una
 * base migrada.
 *
 * El arranque en produccion es `prisma migrate deploy && node dist/main`. Un
 * modulo mal cableado o una migracion incompleta se manifestaban como crash
 * loop en Railway con el PR en verde. Este test necesita DATABASE_URL apuntando
 * a una base ya migrada y JWT_SECRET definido (ver el job de CI).
 */
describe('Arranque de la aplicacion (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // El backup de inicio hace spawn de pg_dump y sube a Wasabi: queda fuera
      // del alcance de este test y no hay credenciales de storage en CI.
      .overrideProvider(BackupService)
      .useValue({})
      // Este scheduler levanta un Chromium en onModuleInit y scrapea la web de
      // la SBS. Dejarlo correr ata el CI a una red externa (minutos de espera y
      // handles abiertos). El smoke test valida el cableado de la app, no el
      // scraping.
      .overrideProvider(PensionRatesSchedulerService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    // Mismo prefijo global que main.ts: sin esto el test probaria rutas que no
    // existen en produccion.
    app.setGlobalPrefix('api');
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app?.close();
  });

  it('responde el health check en GET /api', async () => {
    const respuesta = await request(app.getHttpServer())
      .get('/api')
      .expect(200);

    expect(respuesta.body).toMatchObject({ status: 'ok' });
  });

  it('deja las rutas privadas cerradas sin token', async () => {
    // Verifica que el JwtAuthGuard global quedo efectivamente registrado: si
    // el cableado de guards se rompe, esto responderia 200 en vez de 401.
    await request(app.getHttpServer()).get('/api/empleados').expect(401);
  });
});
