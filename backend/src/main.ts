import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as bodyParser from 'body-parser';
import { AppModule } from './app.module';
import { configureCookies, configureLogger, configureSession, configureSwagger } from './config';
import { PrometheusModule } from './metrics/prometheus.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: configureLogger() });
  app.setGlobalPrefix('api');

  configureSession(app);
  configureCookies(app);
  configureSwagger(app);

  app.useGlobalPipes(new ValidationPipe());
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  const config = app.get(ConfigService);

  await app.listen(config.get('PORT') || 3000);

  const metricsPort: string | undefined = config.get('METRICS_PORT');
  if (metricsPort !== '0') {
    const exporterApp = await NestFactory.create<NestExpressApplication>(PrometheusModule.external());
    await exporterApp.listen(metricsPort || 9100);
  }
}
void bootstrap();
