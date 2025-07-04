import { Format, TransformableInfo } from 'logform';
import * as winston from 'winston';
import { is } from './types';

export function prettyFormat(): Format {
  return {
    transform(info: TransformableInfo): TransformableInfo {
      const message = info.message as string;

      if (!message) {
        return info;
      }

      info.message = message.replace(/{([^{}]*)}/g, (match, placeholder: string) => {
        return (info[placeholder] as string) || placeholder;
      });

      return info;
    },
  };
}

export function prettyJson() {
  return winston.format.json({
    replacer: (_, value) => {
      if (is(value, Error)) {
        const { message, stack, ...other } = value;

        return { message, stack, ...other };
      } else {
        return value;
      }
    },
  });
}
