import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { assignDefined } from '../../../lib';
import { ExtensionEntity, ExtensionRepository } from '../../database';
import { ConfiguredExtension, ExtensionConfiguration } from '../interfaces';
import { ExplorerService } from '../services';
import { buildExtension, unmaskExtensionValues } from './utils';

export class RebuildExtension {
  constructor(
    public readonly name: string,
    public readonly configuration: ExtensionConfiguration,
    public readonly id?: number,
  ) {}
}

export class RebuildExtensionResponse {
  constructor(public readonly extension: ConfiguredExtension) {}
}

@CommandHandler(RebuildExtension)
export class RebuildExtensionHandler implements ICommandHandler<RebuildExtension, RebuildExtensionResponse> {
  constructor(
    private readonly explorer: ExplorerService,
    @InjectRepository(ExtensionEntity)
    private readonly extensions: ExtensionRepository,
  ) {}

  async execute(command: RebuildExtension): Promise<RebuildExtensionResponse> {
    const { id, configuration, name } = command;

    const extension = this.explorer.getExtension(name);
    if (!extension) {
      throw new NotFoundException('Cannot find extension.');
    }

    if (!extension.buildSpec) {
      throw new BadRequestException('Extension cannot be rebuilt.');
    }

    const entity = id ? await this.extensions.findOneBy({ id }) : undefined;
    if (id && !entity) {
      throw new NotFoundException('Cannot find extension.');
    }

    const extensionConfiguration = assignDefined(entity?.values ?? {}, unmaskExtensionValues(configuration));

    const extensionInstance = await buildExtension(
      entity ??
        this.extensions.create({
          values: extensionConfiguration,
          state: {},
          enabled: true,
        }),
      extension,
      true,
      true,
    );

    return new RebuildExtensionResponse(extensionInstance);
  }
}
