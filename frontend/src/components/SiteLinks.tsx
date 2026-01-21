import { TextInput } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { texts } from 'src/texts';
import { Icon } from './Icon';

interface SiteLink {
  text: string;
  link: string;
}

interface SiteLinkProps {
  // The name of the form element.
  name: string;
  // The Mantine form instance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturnType<any>;
}

export function SiteLinks(props: SiteLinkProps) {
  const { name, form } = props;
  const fields = ((form.getValues() as Record<string, unknown>)[name] as SiteLink[] | undefined) ?? [];

  const addItem = () => {
    form.setFieldValue(name, [...fields, { text: '', link: '' }]);
  };

  const removeItem = (index: number) => form.removeListItem(name, index);

  return (
    <div className="grid gap-6">
      {fields.map((_item: SiteLink, index: number) => (
        <div className="flex flex-row gap-2" key={index}>
          <div className="flex w-full flex-col gap-2">
            <div className="flex flex-row gap-2">
              <div className="w-1/2">
                <TextInput
                  placeholder={texts.common.text}
                  key={form.key(`${name}.${index}.text`)}
                  {...form.getInputProps(`${name}.${index}.text`)}
                />
              </div>
              <div className="w-1/2">
                <TextInput
                  placeholder={texts.common.link}
                  key={form.key(`${name}.${index}.link`)}
                  {...form.getInputProps(`${name}.${index}.link`)}
                />
              </div>
            </div>
          </div>

          <div>
            <button type="button" className="btn btn-ghost text-error font-bold" onClick={() => removeItem(index)}>
              <Icon size={16} icon="close" />
            </button>
          </div>
        </div>
      ))}

      {fields.length < 12 && (
        <div>
          <button type="button" className="btn w-auto" onClick={addItem}>
            <Icon size={16} icon="plus" />
            <span>{texts.theme.linksAdd}</span>
          </button>
        </div>
      )}
    </div>
  );
}
