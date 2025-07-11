import { yupResolver } from '@hookform/resolvers/yup';
import { useMemo } from 'react';
import * as Yup from 'yup';
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

function getType(arg: ExtensionUserInfoDtoUserArgumentsValue): Yup.AnySchema | undefined {
  if (arg.type === 'number') {
    let type = Yup.number().label(arg.title).default(arg._default);

    if (arg.required) {
      type = type.required();
    }

    if (arg.minimum != null) {
      type = type.min(arg.minimum);
    }

    if (arg.maximum != null) {
      type = type.max(arg.maximum);
    }

    type = type.transform((value: number, originalValue: string) => (originalValue === '' ? undefined : value));

    return type;
  } else if (arg.type === 'boolean') {
    let type = Yup.boolean().label(arg.title).default(arg._default);
    if (arg.required) {
      type = type.required();
    }

    return type;
  } else if (arg.type === 'string') {
    let type = Yup.string().label(arg.title).default(arg._default);

    if (arg.required) {
      type = type.required();
    }

    if (arg.format === 'date' || arg.format === 'select') {
      type = type.transform((value: string, originalValue: string) => (originalValue === '' ? undefined : value));
    }

    if (arg.format === 'email') {
      type = type.email();
    }

    return type;
  } else if (arg.type === 'array') {
    const itemType = getType(arg.items);
    if (!itemType) {
      return;
    }

    let arrayType = Yup.array().label(arg.title).of(itemType).default(arg._default);
    if (arg.required) {
      arrayType = arrayType.required();
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
    let schema = Yup.object().label(arg.title).shape(values);
    if (arg.required) {
      schema = schema.required();
    }
    return schema;
  }
}

function getSchema(args?: Record<string, ExtensionUserInfoDtoUserArgumentsValue>) {
  const extensionValues: { [name: string]: Yup.AnySchema } = {};
  for (const [name, arg] of Object.entries(args || {})) {
    const type = getType(arg);
    if (type != null) {
      extensionValues[name] = type;
    }
  }

  return Yup.object().shape(extensionValues);
}

export function useArgumentObjectSpecResolver(argumentObject: ExtensionArgumentObjectSpecDto | undefined) {
  return useMemo(() => {
    const schema = getSchema(argumentObject?.properties);
    return yupResolver(schema);
  }, [argumentObject]);
}

export function useUserArgumentsSpecResolver(extensions: ExtensionUserInfoDto[]) {
  return useMemo(() => {
    const values: { [name: string]: Yup.AnySchema } = {};

    for (const extension of extensions) {
      values[extension.id] = getSchema(extension.userArguments ?? {});
    }

    const schema = Yup.object().shape(values);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return yupResolver<any>(schema);
  }, [extensions]);
}

export function useSpecResolver(spec?: ExtensionSpecDto) {
  return useMemo(() => {
    const schema = getSchema(spec?.arguments ?? {});

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return yupResolver<any>(
      Yup.object().shape({
        enabled: Yup.boolean().required(),
        values: schema,
      }),
    );
  }, [spec]);
}
