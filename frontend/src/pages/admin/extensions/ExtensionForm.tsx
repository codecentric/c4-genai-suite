import { Fieldset } from '@mantine/core';
import { BucketDto, ExtensionArgumentObjectSpecDtoPropertiesValue, ExtensionSpecDto } from 'src/api';
import { Forms, Icon, Markdown } from 'src/components';
import { texts } from 'src/texts';

type ExtensionUserInfoDtoUserArgumentsValue = ExtensionArgumentObjectSpecDtoPropertiesValue;

interface ExtensionFormProps {
  // The buckets.
  buckets: BucketDto[];

  // The extension spec.
  spec: ExtensionSpecDto;
}

export function ExtensionForm(props: ExtensionFormProps) {
  let { buckets } = props;
  const { spec } = props;

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
          >
            {Object.entries(spec.arguments).map(([name, spec]) => (
              <Argument key={name} buckets={buckets} name={name} argument={spec} />
            ))}
          </Fieldset>
        </>
      )}
      <Forms.Boolean name="enabled" label={texts.common.enabled} />
      <Forms.MultiSelect
        name="configurableArguments"
        options={userConfigurableArgumentOptions}
        serialize={(v) => Object.keys(v?.properties ?? {})}
        deserialize={(v: string[]) =>
          v.length
            ? {
                type: 'object',
                title: spec.title,
                properties: Object.fromEntries(
                  Object.entries(spec.arguments)
                    .filter(([key]) => v.includes(key))
                    .map(([key, value]) => [key, { ...value, required: false }]),
                ),
              }
            : null
        }
        label={texts.common.configurableArguments}
      />
    </div>
  );
}

export function Argument({
  buckets,
  name,
  argument,
  namePrefix = 'values.',
  vertical,
  refreshable,
}: {
  buckets: BucketDto[];
  name: string;
  argument: ExtensionUserInfoDtoUserArgumentsValue;
  namePrefix?: string;
  vertical?: boolean;
  refreshable?: boolean;
}) {
  const { title, type, description, required } = argument;

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
    return (
      <Forms.Date
        refreshable={refreshable}
        required={required}
        name={`${namePrefix}${name}`}
        label={title}
        hints={hints()}
        vertical={vertical}
        defaultValue={argument._default}
      />
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
            refreshable={refreshable}
            namePrefix={`${namePrefix}`}
            key={`${namePrefix}${name}.${itemName}`}
            buckets={[]}
            name={`${name}.${itemName}`}
            argument={spec}
            vertical={vertical}
          />
        ))}
      </Fieldset>
    );
  }

  if (type === 'string' && argument.format === 'password') {
    return (
      <Forms.Password
        refreshable={refreshable}
        required={required}
        name={`${namePrefix}${name}`}
        label={title}
        hints={hints()}
        vertical={vertical}
        defaultValue={argument._default}
      />
    );
  }

  if (type === 'string' && (argument._enum?.length || argument.examples?.length)) {
    const options = (argument._enum?.length ? argument._enum : (argument.examples ?? [])).map((x) => ({ value: x, label: x }));

    return (
      <Forms.Select
        refreshable={refreshable}
        required={required}
        name={`${namePrefix}${name}`}
        options={options}
        multiple={false}
        label={title}
        hints={hints()}
        vertical={vertical}
        defaultValue={argument._default}
        autocomplete={!!argument.examples?.length}
      />
    );
  }

  if (type === 'array' && argument.items && argument.items.type === 'string') {
    if (argument.items._enum) {
      const options = argument.items._enum.map((x) => ({ value: x, label: x }));
      return (
        <Forms.Select
          refreshable={refreshable}
          required={required}
          name={`${namePrefix}${name}`}
          options={options}
          multiple={true}
          label={title}
          hints={hints()}
          vertical={vertical}
          defaultValue={argument._default?.filter((x) => typeof x === 'string')}
        />
      );
    } else {
      return (
        <Forms.Tags
          refreshable={refreshable}
          required={required}
          name={`${namePrefix}${name}`}
          label={title}
          hints={hints()}
          vertical={vertical}
        />
      );
    }
  }

  if (type === 'string' && argument.format === 'textarea') {
    return (
      <Forms.Textarea
        refreshable={refreshable}
        required={required}
        name={`${namePrefix}${name}`}
        label={title}
        hints={hints()}
        vertical={vertical}
        defaultValue={argument._default}
      />
    );
  }

  if (type === 'string') {
    return (
      <Forms.Text
        refreshable={refreshable}
        required={required}
        name={`${namePrefix}${name}`}
        label={title}
        hints={hints()}
        vertical={vertical}
        defaultValue={argument._default}
      />
    );
  }

  if (type === 'number' && argument.format === 'slider') {
    const min = argument.minimum;
    const max = argument.maximum;
    const step = argument.multipleOf ?? ((max || 100) - (min || 0)) / 100;

    return (
      <Forms.Range
        refreshable={refreshable}
        required={required}
        name={`${namePrefix}${name}`}
        max={max}
        min={min}
        step={step}
        label={title}
        hints={hints()}
        vertical={vertical}
        defaultValue={argument._default}
      />
    );
  }

  if (type === 'number' && argument.format === 'bucket') {
    const options = buckets.map((x) => ({ value: x.id, label: x.name }));

    return (
      <Forms.Select
        refreshable={refreshable}
        required={required}
        name={`${namePrefix}${name}`}
        options={options}
        multiple={false}
        label={title}
        hints={hints()}
        vertical={vertical}
        defaultValue={argument._default}
      />
    );
  }

  if (type === 'number') {
    const min = argument.minimum;
    const max = argument.maximum;
    const step = argument.multipleOf ?? ((max || 100) - (min || 0)) / 100;

    return (
      <Forms.Number
        refreshable={refreshable}
        required={required}
        name={`${namePrefix}${name}`}
        max={max}
        min={min}
        step={step}
        label={title}
        hints={hints()}
        vertical={vertical}
        defaultValue={argument._default}
      />
    );
  }

  if (type === 'boolean') {
    return (
      <Forms.Boolean
        refreshable={refreshable}
        required={required}
        name={`${namePrefix}${name}`}
        label={title}
        hints={hints()}
        vertical={vertical}
      />
    );
  }

  return null;
}
