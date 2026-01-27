import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExtensionEntity } from 'src/domain/database';
import { TranscribeAudioHandler } from './use-cases';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([ExtensionEntity])],
  providers: [TranscribeAudioHandler],
})
export class TranscriptionModule {}
