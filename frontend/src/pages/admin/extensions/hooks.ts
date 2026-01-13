import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useMemo } from 'react';
import { z } from 'zod';
import {
  BucketDto,
  type ExtensionArgumentObjectSpecDto,
  ExtensionArgumentObjectSpecDtoPropertiesValue,
  ExtensionDto,
  ExtensionSpecDto,
  ExtensionUserInfoDto,
} from 'src/api';
import { texts } from 'src/texts';

type ExtensionUserInfoDtoUserArgumentsValue = ExtensionArgumentObjectSpecDtoPropertiesValue;

export function useListValues(spec: ExtensionSpecDto, buckets: BucketDto[], extension?: ExtensionDto) {
  return useMemo(() => {
    const result: string[] = [];

    if (!extension) {
      return result;
    }

    for (const [name, arg] of Object.entries(spec.arguments)) {
      if (!arg.showInList) {
        continue;
      }

      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      const value = extension.values[name];

      if (value) {
        if (arg.type === 'number' && arg.format === 'bucket') {
          const bucket = buckets.find((x) => x.id === value);

          if (bucket) {
            result.push(`${bucket.name}`);
          }
        } else if (arg.type === 'boolean') {
          result.push(`${arg.title}: ${value ? texts.common.yes : texts.common.no}`);
        } else {
          result.push(`${value}`);
        }
      }
    }

    return result;
  }, [extension, buckets, spec.arguments]);
}

function getType(arg: ExtensionUserInfoDtoUserArgumentsValue): z.ZodTypeAny | undefined {
  if (arg.type === 'number') {
    const defaultValue = typeof arg._default === 'number' ? arg._default : undefined;
    let baseType = z.number();

    if (arg.minimum != null && typeof arg.minimum === 'number') {
      baseType = baseType.min(arg.minimum);
    }

    if (arg.maximum != null && typeof arg.maximum === 'number') {
      baseType = baseType.max(arg.maximum);
    }

    const type = defaultValue !== undefined ? baseType.default(defaultValue) : baseType;

    if (!arg.required) {
      return type.optional().or(z.literal('').transform(() => undefined));
    }

    return type;
  } else if (arg.type === 'boolean') {
    const defaultValue = typeof arg._default === 'boolean' ? arg._default : undefined;
    const type = defaultValue !== undefined ? z.boolean().default(defaultValue) : z.boolean();

    if (!arg.required) {
      return type.optional();
    }

    return type;
  } else if (arg.type === 'string') {
    const defaultValue = typeof arg._default === 'string' ? arg._default : undefined;
    let baseType = z.string();

    if (arg.format === 'email') {
      baseType = baseType.email();
    }

    const type = defaultValue !== undefined ? baseType.default(defaultValue) : baseType;

    if (arg.format === 'date' || arg.format === 'select') {
      if (!arg.required) {
        return type.optional().or(z.literal('').transform(() => undefined));
      }
    }

    if (!arg.required) {
      return type.optional();
    }

    return type;
  } else if (arg.type === 'array') {
    const itemType = getType(arg.items);
    if (!itemType) {
      return;
    }

    const defaultValue = Array.isArray(arg._default) ? arg._default : undefined;
    const arrayType = defaultValue !== undefined ? z.array(itemType).default(defaultValue) : z.array(itemType);

    if (!arg.required) {
      return arrayType.optional();
    }

    return arrayType;
  } else if (arg.type === 'object') {
    const values: Record<string, z.ZodTypeAny> = {};
    for (const [name, value] of Object.entries(arg.properties)) {
      const type = getType(value);
      if (type != null) {
        values[name] = type;
      }
    }
    const schema = z.object(values);

    if (!arg.required) {
      return schema.optional();
    }

    return schema;
  }
}

function getSchema(args?: Record<string, ExtensionUserInfoDtoUserArgumentsValue>) {
  const extensionValues: Record<string, z.ZodTypeAny> = {};
  for (const [name, arg] of Object.entries(args || {})) {
    const type = getType(arg);
    if (type != null) {
      extensionValues[name] = type;
    }
  }

  return z.object(extensionValues);
}

export function useArgumentObjectSpecResolver(argumentObject: ExtensionArgumentObjectSpecDto | undefined) {
  return useMemo(() => {
    const schema = getSchema(argumentObject?.properties);
    return zod4Resolver(schema);
  }, [argumentObject]);
}

export function useUserArgumentsSpecResolver(extensions: ExtensionUserInfoDto[]) {
  return useMemo(() => {
    const values: Record<string, z.ZodTypeAny> = {};

    for (const extension of extensions) {
      values[extension.id] = getSchema(extension.userArguments ?? {});
    }

    const schema = z.object(values);
    return zod4Resolver(schema);
  }, [extensions]);
}

export function useSpecResolver(spec?: ExtensionSpecDto) {
  return useMemo(() => {
    const schema = getSchema(spec?.arguments ?? {});

    return zod4Resolver(
      z.object({
        enabled: z.boolean(),
        values: schema,
      }),
    );
  }, [spec]);
}
