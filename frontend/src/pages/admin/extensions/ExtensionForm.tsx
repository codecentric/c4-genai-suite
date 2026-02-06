import {
  Autocomplete,
  Checkbox,
  Fieldset,
  MultiSelect,
  NumberInput,
  PasswordInput,
  Select,
  Slider,
  TagsInput,
  Textarea,
  TextInput,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { UseFormReturnType } from '@mantine/form';
import {
  BucketDto,
  CreateExtensionDto,
  ExtensionArgumentObjectSpecDto,
  ExtensionArgumentObjectSpecDtoPropertiesValue,
  ExtensionSpecDto,
} from 'src/api';
import { Icon, Markdown } from 'src/components';
import { texts } from 'src/texts';

type ExtensionUserInfoDtoUserArgumentsValue = ExtensionArgumentObjectSpecDtoPropertiesValue;

function formatDateOnly(date: Date | null): string | null {
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setNestedFieldValue(form: UseFormReturnType<any>, path: string, value: unknown) {
  const parts = path.split('.');
  if (parts.length === 1) {
    form.setFieldValue(path, value);
    return;
  }
  const formValues = form.getValues() as Record<string, unknown>;
  const setAtPath = (obj: Record<string, unknown>, keys: string[]): void => {
    const [key, ...rest] = keys;
    if (rest.length === 0) {
      obj[key] = value;
    } else {
      obj[key] = obj[key] ?? {};
      setAtPath(obj[key] as Record<string, unknown>, rest);
    }
  };
  setAtPath(formValues, parts);
  form.setValues(formValues);
}

interface ExtensionFormProps {
  // The buckets.
  buckets: BucketDto[];

  // The extension spec.
  spec: ExtensionSpecDto;

  // The form instance.
  form: UseFormReturnType<CreateExtensionDto>;
}

export function ExtensionForm(props: ExtensionFormProps) {
  let { buckets } = props;
  const { spec, form } = props;

  if (spec.type === 'tool') {
    if (spec.name === 'files-conversation') {
      buckets = buckets?.filter((bucket) => bucket.type === 'conversation');
    } else if (spec.name === 'files-42') {
      buckets = buckets?.filter((bucket) => bucket.type !== 'conversation');
    } else if (spec.name === 'files-whole') {
      buckets = buckets?.filter((bucket) => bucket.type === 'conversation');
    }
  }

  const userConfigurableArgumentOptions = Object.entries(spec.arguments).map(([key, value]) => ({
    value: key,
    label: value.title,
  }));

  return (
    <div className="flex flex-col">
      {Object.keys(spec.arguments).length > 0 && (
        <>
          <Fieldset
            legend={
              <div className="flex items-center">
                <h4 className="mr-2.5 font-bold">{spec.title}</h4>
                <p className="text-xs">{spec.description}</p>
              </div>
            }
            className="mb-4"
          >
            {Object.entries(spec.arguments).map(([name, argumentSpec]) => (
              <Argument namePrefix={'values.'} key={name} buckets={buckets} name={name} argument={argumentSpec} form={form} />
            ))}
          </Fieldset>
        </>
      )}
      <FormRow name="enabled" label={texts.common.enabled}>
        <Checkbox id="enabled" key={form.key('enabled')} {...form.getInputProps('enabled', { type: 'checkbox' })} />
      </FormRow>
      <FormRow name="configurableArguments" label={texts.common.configurableArguments}>
        <MultiSelect
          id="configurableArguments"
          data={userConfigurableArgumentOptions}
          key={form.key('configurableArguments')}
          value={Object.keys(form.getValues().configurableArguments?.properties ?? {})}
          onChange={(v: string[]) => {
            const value = v.length
              ? {
                  type: 'object' as const,
                  title: spec.title,
                  properties: Object.fromEntries(
                    Object.entries(spec.arguments)
                      .filter(([key]) => v.includes(key))
                      .map(([key, value]) => [key, { ...value, required: false }]),
                  ),
                }
              : undefined;
            form.setFieldValue('configurableArguments', value as ExtensionArgumentObjectSpecDto | undefined);
          }}
        />
      </FormRow>
    </div>
  );
}

export function Argument({
  buckets,
  name,
  argument,
  namePrefix = '',
  form,
}: {
  buckets: BucketDto[];
  name: string;
  argument: ExtensionUserInfoDtoUserArgumentsValue;
  namePrefix?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturnType<any>;
}) {
  const { title, type, description, required } = argument;
  const fieldName = `${namePrefix}${name}`;

  const hints = ({
    description,
    documentationUrl,
  }: Pick<ExtensionArgumentObjectSpecDtoPropertiesValue, 'description' | 'documentationUrl'> = argument) => {
    if (!description) {
      return undefined;
    }

    return (
      <>
        <Markdown>{description}</Markdown>

        {documentationUrl && (
          <div className="mt-1">
            <span>{texts.common.documentationLabel}&nbsp;</span>

            <a className="text-primary hover:underline" href={documentationUrl} rel="noopener noreferrer" target="_blank">
              <Icon icon="external-link" className="inline-block align-baseline" size={12} /> {texts.common.documentation}
            </a>
          </div>
        )}
      </>
    );
  };

  if (type === 'string' && argument.format === 'date') {
    const { value } = form.getInputProps(fieldName) as { value: string | undefined };
    return (
      <FormRow name={fieldName} label={title} hints={hints()}>
        <DateInput
          id={fieldName}
          required={required}
          key={form.key(fieldName)}
          {...form.getInputProps(fieldName)}
          value={value ? new Date(value) : null}
          onChange={(date) => setNestedFieldValue(form, fieldName, formatDateOnly(date))}
        />
      </FormRow>
    );
  }

  if (type === 'object' && argument.properties) {
    return (
      <Fieldset
        legend={
          <div className="flex items-center">
            <h4 className="mr-2.5 font-bold">{title}</h4>
            <p className="text-xs">{description}</p>
          </div>
        }
      >
        {Object.entries(argument.properties).map(([itemName, spec]) => (
          <Argument
            namePrefix={`${namePrefix}`}
            key={`${namePrefix}${name}.${itemName}`}
            buckets={[]}
            name={`${name}.${itemName}`}
            argument={spec}
            form={form}
          />
        ))}
      </Fieldset>
    );
  }

  if (type === 'string' && argument.format === 'password') {
    return (
      <FormRow name={fieldName} label={title} hints={hints()}>
        <PasswordInput id={fieldName} required={required} key={form.key(fieldName)} {...form.getInputProps(fieldName)} />
      </FormRow>
    );
  }

  if (type === 'string' && argument._enum?.length) {
    const options = argument._enum.map((x) => ({ value: x, label: x }));

    return (
      <FormRow name={fieldName} label={title} hints={hints()}>
        <Select id={fieldName} data={options} required={required} key={form.key(fieldName)} {...form.getInputProps(fieldName)} />
      </FormRow>
    );
  }

  if (type === 'string' && argument.examples?.length) {
    return (
      <FormRow name={fieldName} label={title} hints={hints()}>
        <Autocomplete
          id={fieldName}
          data={argument.examples}
          required={required}
          key={form.key(fieldName)}
          {...form.getInputProps(fieldName)}
        />
      </FormRow>
    );
  }

  if (type === 'array' && argument.items && argument.items.type === 'string') {
    if (argument.items._enum) {
      const options = argument.items._enum.map((x) => ({ value: x, label: x }));
      return (
        <FormRow name={fieldName} label={title} hints={hints()}>
          <MultiSelect
            id={fieldName}
            data={options}
            required={required}
            key={form.key(fieldName)}
            {...form.getInputProps(fieldName)}
          />
        </FormRow>
      );
    } else {
      return (
        <FormRow name={fieldName} label={title} hints={hints()}>
          <TagsInput id={fieldName} required={required} key={form.key(fieldName)} {...form.getInputProps(fieldName)} />
        </FormRow>
      );
    }
  }

  if (type === 'string' && argument.format === 'textarea') {
    return (
      <FormRow name={fieldName} label={title} hints={hints()}>
        <Textarea
          id={fieldName}
          required={required}
          autosize
          minRows={3}
          key={form.key(fieldName)}
          {...form.getInputProps(fieldName)}
        />
      </FormRow>
    );
  }

  if (type === 'string') {
    return (
      <FormRow name={fieldName} label={title} hints={hints()}>
        <TextInput id={fieldName} required={required} key={form.key(fieldName)} {...form.getInputProps(fieldName)} />
      </FormRow>
    );
  }

  if (type === 'number' && argument.format === 'slider') {
    const min = argument.minimum;
    const max = argument.maximum;
    const step = argument.multipleOf ?? ((max || 100) - (min || 0)) / 100;

    return (
      <FormRow name={fieldName} label={title} hints={hints()}>
        <Slider id={fieldName} min={min} max={max} step={step} key={form.key(fieldName)} {...form.getInputProps(fieldName)} />
      </FormRow>
    );
  }

  if (type === 'number' && argument.format === 'bucket') {
    const options = buckets.map((x) => ({ value: String(x.id), label: x.name }));
    const { value } = form.getInputProps(fieldName) as { value: number | null | undefined };

    return (
      <FormRow name={fieldName} label={title} hints={hints()}>
        <Select
          id={fieldName}
          data={options}
          required={required}
          key={form.key(fieldName)}
          value={value != null ? String(value) : undefined}
          onChange={(v) => form.setFieldValue(fieldName, v != null ? +v : v)}
        />
      </FormRow>
    );
  }

  if (type === 'number') {
    const min = argument.minimum;
    const max = argument.maximum;
    const step = argument.multipleOf;

    return (
      <FormRow name={fieldName} label={title} hints={hints()}>
        <NumberInput
          id={fieldName}
          required={required}
          min={min}
          max={max}
          step={step}
          key={form.key(fieldName)}
          {...form.getInputProps(fieldName)}
        />
      </FormRow>
    );
  }

  if (type === 'boolean') {
    return (
      <FormRow name={fieldName} label={title} hints={hints()}>
        <Checkbox
          id={fieldName}
          required={required}
          key={form.key(fieldName)}
          {...form.getInputProps(fieldName, { type: 'checkbox' })}
        />
      </FormRow>
    );
  }

  return null;
}

function FormRow({
  name,
  label,
  hints,
  children,
}: {
  name?: string;
  label?: string;
  hints?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="form-row mb-4 flex flex-row" data-testid={name}>
      {label && (
        <label htmlFor={name} className="w-48 shrink-0 pt-1 text-sm font-semibold">
          {label}
        </label>
      )}
      <div className="min-w-0 grow">
        {children}
        {hints && <div className="text-sm leading-6 text-slate-500">{hints}</div>}
      </div>
    </div>
  );
}
