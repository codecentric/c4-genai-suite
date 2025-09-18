import * as path from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MulterModule } from '@nestjs/platform-express';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthController } from './controllers/auth/auth.controller';
import { BlobsController } from './controllers/blobs/blobs.controller';
import { ConversationsController } from './controllers/conversations/conversations.controller';
import { ConfigurationsController } from './controllers/extensions/configurations.controller';
import { ExtensionsController } from './controllers/extensions/extensions.controller';
import { FilesController } from './controllers/files/files.controller';
import { UserFilesController } from './controllers/files/user-files.controller';
import { HealthController } from './controllers/health/health.controller';
import { SettingsController } from './controllers/settings/settings.controller';
import { UsagesController } from './controllers/usages/usages.controller';
import { UserGroupsController } from './controllers/users/user-groups.controller';
import { UsersController } from './controllers/users/users.controller';
import { AuthModule } from './domain/auth/module';
import { ChatModule } from './domain/chat';
import { UserEntity } from './domain/database';
import { initSchemaIfNotExistsAndMoveMigrations, schema } from './domain/database/typeorm.helper';
import { ExtensionModule } from './domain/extensions';
import { FilesModule } from './domain/files';
import { SettingsModule } from './domain/settings';
import { UsersModule } from './domain/users/module';
import { ExtensionLibraryModule } from './extensions';
import { I18nModule } from './localization/i18n.module';
import { OpenTelemetryModule } from './metrics/opentelemetry.module';
import { PrometheusModule } from './metrics/prometheus.module';

@Module({
  imports: [
    AuthModule,
    ChatModule,
    ConfigModule.forRoot(),
    CqrsModule,
    ExtensionLibraryModule.register(),
    ExtensionModule,
    FilesModule,
    I18nModule,
    MulterModule.register({
      fileFilter: (_, file, callback) => {
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        callback(null, true);
      },
    }),
    PrometheusModule.forRoot(),
    OpenTelemetryModule,
    SettingsModule,
    UsersModule,
    TerminusModule,
    TypeOrmModule.forFeature([UserEntity]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const url = config.getOrThrow<string>('DB_URL');
        await initSchemaIfNotExistsAndMoveMigrations(url, schema);
        return {
          url,
          type: 'postgres',
          retryAttempts: 10,
          retryDelay: config.get('C4_DB_RETRY_DELAY', 100),
          synchronize: false,
          migrationsRun: true,
          entities: [path.join(__dirname, 'domain', 'database', 'entities', '*{.ts,.js}')],
          migrations: [path.join(__dirname, 'migrations', '*{.ts,.js}')],
          schema,
        };
      },
      dataSourceFactory: async (options) => {
        return await new DataSource(options!).initialize();
      },
    }),
  ],
  controllers: [
    AuthController,
    BlobsController,
    HealthController,
    ConversationsController,
    ConfigurationsController,
    ExtensionsController,
    FilesController,
    SettingsController,
    UsagesController,
    UserFilesController,
    UserGroupsController,
    UsersController,
  ],
})
export class AppModule {}
