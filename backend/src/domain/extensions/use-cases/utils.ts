import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ConfigurationEntity, ConfigurationStatus, ExtensionEntity } from 'src/domain/database';
import {
  ConfigurationModel,
  ConfiguredExtension,
  Extension,
  ExtensionArgument,
  ExtensionConfiguration,
  ExtensionObjectArgument,
  ExtensionSpec,
} from '../interfaces';
import { ExplorerService } from '../services';

type DynamicZodType<T extends z.ZodTypeAny> = T | z.ZodDefault<T>;

function getZodArgumentType(arg: ExtensionArgument): z.ZodType | undefined {
  if (arg.type === 'number') {
    let type: DynamicZodType<z.ZodNumber> = z.number().describe(arg.title);

    if (arg.minimum != null) {
      type = type.min(arg.minimum);
    }

    if (arg.maximum != null) {
      type = type.max(arg.maximum);
    }

    if (arg.multipleOf) {
      type = type.multipleOf(arg.multipleOf);
    }

    if (arg.default != null) {
      type = type.default(arg.default);
    }

    return !arg.required ? type.optional() : type;
  } else if (arg.type === 'boolean') {
    let type: DynamicZodType<z.ZodBoolean> = z.boolean().describe(arg.title);
    if (arg.default != null) {
      type = type.default(arg.default);
    }

    return !arg.required ? type.optional() : type;
  } else if (arg.type === 'string') {
    type EnumStringType = [string, ...string[]];
    let type: DynamicZodType<z.ZodString | z.ZodEnum<EnumStringType>> = z.string().describe(arg.title);

    if (arg.format === 'email') {
      type = type.email();
    } else if (arg.format === 'date') {
      type = type.date();
    }

    if (arg.enum?.length) {
      type = z.enum(arg.enum as EnumStringType);
    }

    if (arg.default != null) {
      type = type.default(arg.default);
    }

    return !arg.required ? type.optional() : type;
  } else if (arg.type === 'array') {
    const itemType = getZodArgumentType(arg.items);
    if (!itemType) {
      return;
    }

    let arrayType: DynamicZodType<z.ZodArray<typeof itemType>> = z.array(itemType).describe(arg.title);
    if (arg.default != null) {
      arrayType = arrayType.default(arg.default);
    }

    return !arg.required ? arrayType.optional() : arrayType;
  } else if (arg.type === 'object') {
    const values: { [name: string]: z.ZodType } = {};
    for (const [name, value] of Object.entries(arg.properties)) {
      const type = getZodArgumentType(value);
      if (type != null) {
        values[name] = type;
      }
    }

    const schema = z.object(values).describe(arg.title);
    return !arg.required ? schema.optional() : schema;
  }
}

export function validateObjectArgument(data: ExtensionConfiguration, schema: ExtensionObjectArgument) {
  try {
    const validate = getZodArgumentType(schema)!;
    return validate.parse(data) as ExtensionConfiguration;
  } catch (err) {
    const zodError = err as z.ZodError;
    throw new BadRequestException(zodError.errors.map((x) => `${x.path.join('.')}: ${x.message}`));
  }
}

export function validateConfiguration(configuration: ExtensionConfiguration, spec: ExtensionSpec) {
  const objectType: ExtensionObjectArgument = {
    type: 'object',
    title: spec.title,
    description: spec.description,
    properties: spec.arguments,
    required: true,
  };

  return validateObjectArgument(configuration, objectType);
}

const keyMask = '********************';

export function maskArgumentDefault(argument: ExtensionArgument) {
  if (argument.type === 'string' && argument.format === 'password' && argument.default) {
    argument.default = keyMask;
  }
}

export function unmaskExtensionValues(values: ExtensionConfiguration) {
  Object.entries(values).forEach(([key, value]) => {
    if (value == null) {
      return;
    }

    if (value === keyMask) {
      delete values[key];
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      unmaskExtensionValues(value as ExtensionConfiguration);
    }
  });
  return values;
}

export function maskKeyValues(extension: ConfiguredExtension) {
  Object.entries(extension.spec.arguments).forEach(([key, value]) => {
    if (value.type === 'string' && value.format === 'password') {
      extension.values[key] = keyMask;
    }
  });
}

export function buildExtension(
  source: ExtensionEntity,
  extension: Extension,
  throwOnError = false,
  forceRebuild = false,
): Promise<ConfiguredExtension> {
  source.values = source.values ?? {};
  return ConfiguredExtension.create(extension, source, throwOnError, forceRebuild);
}

export async function buildConfiguration(
  source: ConfigurationEntity,
  extensionExplorer?: ExplorerService,
  withExtensions: boolean = false,
  onlyEnabledExtensions: boolean = false,
): Promise<ConfigurationModel> {
  const { userGroupsIds, extensions: configuredExtensions, status, ...other } = source;

  const extensions =
    withExtensions && extensionExplorer && configuredExtensions
      ? await Promise.all(
          configuredExtensions.map((extensionEntity) => {
            const extensionConfiguration = extensionExplorer.getExtension(extensionEntity.name);
            if (extensionConfiguration && (!onlyEnabledExtensions || extensionEntity.enabled)) {
              return buildExtension(extensionEntity, extensionConfiguration);
            }
          }, [] as ConfiguredExtension[]),
        )
      : [];

  return {
    ...other,
    enabled: status === ConfigurationStatus.ENABLED,
    userGroupsIds: userGroupsIds || [],
    extensions: extensions.filter((x) => !!x),
  };
}
