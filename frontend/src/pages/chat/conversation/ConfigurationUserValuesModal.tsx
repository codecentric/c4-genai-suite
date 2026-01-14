import { Button, Fieldset, Portal } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PropsWithChildren, useEffect } from 'react';
import { ConfigurationDto, ExtensionArgumentObjectSpecDto, ExtensionArgumentObjectSpecDtoPropertiesValue, useApi } from 'src/api';
import { Modal } from 'src/components';
import { ExtensionContext } from 'src/hooks';
import { Argument } from 'src/pages/admin/extensions/ExtensionForm';
import { useArgumentObjectSpecResolver } from 'src/pages/admin/extensions/hooks';
import { texts } from 'src/texts';

type JSONValue = string | number | boolean | object | unknown[] | undefined;

function getDefault(spec: ExtensionArgumentObjectSpecDtoPropertiesValue): JSONValue {
  switch (spec.type) {
    case 'array':
      return spec._default ?? [];
    case 'string':
      return spec._default ?? '';
    case 'number':
    case 'boolean':
      return spec._default;
    case 'object':
      return getInitialValuesFromSpec(spec);
  }
}

function getInitialValuesFromSpec(spec?: ExtensionArgumentObjectSpecDto): Record<string, JSONValue> {
  if (!spec?.properties) {
    return {};
  }

  const initialValues: Record<string, JSONValue> = {};

  for (const [key, property] of Object.entries(spec.properties)) {
    initialValues[key] = getDefault(property);
  }

  return initialValues;
}

interface JsonFormProps {
  configuration: ConfigurationDto;
  onClose: () => void;
  onSubmit: () => void;
}

export function ConfigurationUserValuesModal(props: JsonFormProps & PropsWithChildren) {
  const { configuration, onClose, onSubmit } = props;
  const api = useApi();

  const { data: fetchedValues } = useQuery({
    queryKey: [`configuration:${configuration.id}:user-values:default`],
    queryFn: () => api.extensions.getConfigurationUserValues(configuration.id),
    enabled: !!configuration.configurableArguments,
  });

  const form = useForm<ExtensionContext>({
    mode: 'controlled',
    initialValues: getInitialValuesFromSpec(configuration.configurableArguments) as ExtensionContext,
    validate: useArgumentObjectSpecResolver(configuration.configurableArguments),
  });

  const updateValues = useMutation({
    mutationFn: (values: ExtensionContext) => {
      return api.extensions.updateConfigurationUserValues(configuration.id, { values });
    },
    onSuccess: (data) => {
      form.setValues(data.values);
      onSubmit();
    },
  });

  useEffect(() => {
    if (fetchedValues) {
      form.setValues(fetchedValues.values);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchedValues]);

  return (
    <>
      {configuration.configurableArguments && (
        <Portal>
          <form onSubmit={form.onSubmit((v) => updateValues.mutate(v))}>
            <Modal
              onClose={onClose}
              header={configuration.name}
              footer={
                <fieldset>
                  <div className="flex flex-row justify-end">
                    <div className="flex gap-2">
                      <Button type="button" variant="subtle" onClick={onClose}>
                        {texts.common.cancel}
                      </Button>
                      <Button type="submit">{texts.common.save}</Button>
                    </div>
                  </div>
                </fieldset>
              }
            >
              <div className="flex flex-col">
                {Object.entries(configuration.configurableArguments?.properties ?? {}).map(([id, x]) => (
                  <div key={id}>
                    {x.type === 'object' && (
                      <Fieldset
                        legend={
                          <div className="flex items-center">
                            <h4 className="mr-2.5 font-bold">{x.title}</h4>
                            <p className="text-xs">{x.description}</p>
                          </div>
                        }
                      >
                        {Object.entries(x.properties).map(([name, spec]) => (
                          <Argument
                            namePrefix={`${id}.`}
                            key={`${id}-${name}`}
                            buckets={[]}
                            name={name}
                            argument={spec}
                            form={form}
                          />
                        ))}
                      </Fieldset>
                    )}
                  </div>
                ))}
              </div>
            </Modal>
          </form>
        </Portal>
      )}
    </>
  );
}
