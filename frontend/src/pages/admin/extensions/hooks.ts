import { zodResolver } from '@hookform/resolvers/zod';
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
    let type = z.number().default(arg._default as number);

    if (arg.minimum != null) {
      type = type.min(arg.minimum);
    }

    if (arg.maximum != null) {
      type = type.max(arg.maximum);
    }

    if (!arg.required) {
      return type.optional().or(z.literal('').transform(() => undefined));
    }

    return type;
  } else if (arg.type === 'boolean') {
    let type = z.boolean().default(arg._default as boolean);

    if (!arg.required) {
      return type.optional();
    }

    return type;
  } else if (arg.type === 'string') {
    let type = z.string().default(arg._default as string);

    if (arg.format === 'email') {
      type = type.email();
    }

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

    let arrayType = z.array(itemType).default(arg._default as unknown[]);

    if (!arg.required) {
      return arrayType.optional();
    }

    return arrayType;
  } else if (arg.type === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values: { [name: string]: any } = {};
    for (const [name, value] of Object.entries(arg.properties)) {
      const type = getType(value);
      if (type != null) {
        values[name] = type;
      }
    }
    let schema = z.object(values);

    if (!arg.required) {
      return schema.optional();
    }

    return schema;
  }
}

function getSchema(args?: Record<string, ExtensionUserInfoDtoUserArgumentsValue>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extensionValues: { [name: string]: any } = {};
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return zodResolver(schema) as any;
  }, [argumentObject]);
}

export function useUserArgumentsSpecResolver(extensions: ExtensionUserInfoDto[]) {
  return useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values: { [name: string]: any } = {};

    for (const extension of extensions) {
      values[extension.id] = getSchema(extension.userArguments ?? {});
    }

    const schema = z.object(values);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return zodResolver(schema) as any;
  }, [extensions]);
}

export function useSpecResolver(spec?: ExtensionSpecDto) {
  return useMemo(() => {
    const schema = getSchema(spec?.arguments ?? {});

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return zodResolver(
      z.object({
        enabled: z.boolean(),
        values: schema,
      }),
    ) as any;
  }, [spec]);
}
