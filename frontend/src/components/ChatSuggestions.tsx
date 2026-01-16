import { Textarea, TextInput } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { MAX_SUGGESTIONS } from 'src/components';
import { texts } from 'src/texts';
import { Icon } from './Icon';

interface ChatSuggestion {
  title: string;
  subtitle: string;
  text: string;
}

interface ChatSuggestionsProps {
  // The name of the form element.
  name: string;
  // The Mantine form instance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturnType<any>;
}

export function ChatSuggestions(props: ChatSuggestionsProps) {
  const { name, form } = props;
  const fields = ((form.getValues() as Record<string, unknown>)[name] as ChatSuggestion[] | undefined) ?? [];

  const addItem = () => {
    form.setFieldValue(name, [...fields, { title: '', subtitle: '', text: '' }]);
  };

  const removeItem = (index: number) => {
    form.setFieldValue(
      name,
      fields.filter((_, i) => i !== index),
    );
  };

  return (
    <div className="grid gap-6">
      {fields.map((_item: ChatSuggestion, index: number) => (
        <div className="flex flex-row gap-2" key={index}>
          <div className="flex w-full flex-col gap-2">
            <div className="flex flex-row gap-2">
              <div className="w-1/2">
                <TextInput
                  placeholder={texts.common.title}
                  key={form.key(`${name}.${index}.title`)}
                  {...form.getInputProps(`${name}.${index}.title`)}
                />
              </div>
              <div className="w-1/2">
                <TextInput
                  placeholder={texts.common.subtitle}
                  key={form.key(`${name}.${index}.subtitle`)}
                  {...form.getInputProps(`${name}.${index}.subtitle`)}
                />
              </div>
            </div>

            <div className="flex flex-row gap-2">
              <div className="w-full">
                <Textarea
                  placeholder={texts.common.text}
                  autosize
                  minRows={2}
                  key={form.key(`${name}.${index}.text`)}
                  {...form.getInputProps(`${name}.${index}.text`)}
                />
              </div>
            </div>
          </div>

          <div>
            <button type="button" className="btn text-error font-bold" onClick={() => removeItem(index)}>
              <Icon size={16} icon="close" />
            </button>
          </div>
        </div>
      ))}

      {fields.length < MAX_SUGGESTIONS && (
        <div>
          <button type="button" className="btn w-auto" onClick={addItem}>
            <Icon size={16} icon="plus" />
            <span>{texts.theme.suggestionsAdd}</span>
          </button>
        </div>
      )}
    </div>
  );
}
