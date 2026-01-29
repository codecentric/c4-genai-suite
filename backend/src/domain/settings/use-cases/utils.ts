import { SettingEntity } from 'src/domain/database';
import { Settings } from '../interfaces';

export function buildSettings(source: SettingEntity): Settings {
  // eslint-disable-next-line prefer-const
  let { name, language, primaryColor, primaryContentColor, ...other } = source;

  name ??= 'c4 GenAI Suite';
  primaryColor ||= '#555555';
  primaryContentColor ||= '#F4F4F4';

  return {
    name,
    primaryColor,
    primaryContentColor,
    language: language || 'en',
    ...other,
  };
}
