import { Button, Flex, Portal, Switch, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import z from 'zod';
import { ConfigurationDto, UpsertConfigurationDto, useApi } from 'src/api';
import { FormAlert, MAX_SUGGESTIONS, Modal } from 'src/components';
import { ChatSuggestionsInput } from 'src/components/ChatSuggestionsInput';
import { UserGroupTagsInput } from 'src/components/UserGroupTagsInput';
import { typedZodResolver } from 'src/lib';
import { texts } from 'src/texts';

const chatSuggestionScheme = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  text: z.string().min(1),
});

const schema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  enabled: z.boolean(),
  executorEndpoint: z.string().optional(),
  executorHeaders: z.string().optional(),
  chatFooter: z.string().optional(),
  userGroupIds: z.array(z.string()).optional(),
  chatSuggestions: z.array(chatSuggestionScheme).max(MAX_SUGGESTIONS).optional(),
});

interface UpsertConfigurationDialogProps {
  target?: ConfigurationDto | null;
  onClose: () => void;
  onCreate: (configuration: ConfigurationDto) => void;
  onUpdate: (configuration: ConfigurationDto) => void;
}

export function UpsertConfigurationDialog(props: UpsertConfigurationDialogProps) {
  const { onCreate, onUpdate, onClose, target } = props;

  const api = useApi();

  const creating = useMutation({
    mutationFn: (request: UpsertConfigurationDto) => api.extensions.postConfiguration(request),
    onSuccess: (response) => {
      onCreate(response);
      onClose();
    },
  });

  const updating = useMutation({
    mutationFn: (request: UpsertConfigurationDto) => api.extensions.putConfiguration(target!.id, request),
    onSuccess: (response) => {
      onUpdate(response);
      onClose();
    },
  });

  const form = useForm<UpsertConfigurationDto>({
    mode: 'controlled',
    initialValues: target ?? {
      name: '',
      description: '',
      enabled: true,
      chatSuggestions: [],
      userGroupIds: [],
      executorEndpoint: undefined,
      executorHeaders: undefined,
      chatFooter: undefined,
    },
    validate: typedZodResolver(schema),
  });

  useEffect(() => {
    if (target) {
      form.setValues(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return (
    <Portal>
      <Modal onClose={onClose} title={target ? texts.extensions.updateConfiguration : texts.extensions.createConfiguration}>
        <form onSubmit={form.onSubmit((v) => (target ? updating.mutate(v) : creating.mutate(v)))}>
          <fieldset disabled={creating.isPending || updating.isPending} className="flex flex-col gap-4">
            {target ? (
              <FormAlert common={texts.extensions.updateConfigurationFailed} error={updating.error} />
            ) : (
              <FormAlert common={texts.extensions.createConfigurationFailed} error={creating.error} />
            )}
            <TextInput
              id="name"
              withAsterisk
              label={texts.common.name}
              key={form.key('name')}
              {...form.getInputProps('name')}
              autoFocus
            />
            <TextInput
              id="description"
              withAsterisk
              label={texts.common.description}
              key={form.key('description')}
              {...form.getInputProps('description')}
            />
            <Switch
              id="enabled"
              label={texts.common.enabled}
              key={form.key('enabled')}
              {...form.getInputProps('enabled', { type: 'checkbox' })}
            />
            <UserGroupTagsInput form={form} />
            <TextInput
              id="executorEndpoint"
              classNames={{ input: 'font-mono' }}
              label={texts.extensions.executorEndpoint}
              description={texts.extensions.executorEndpointHints}
              key={form.key('executorEndpoint')}
              {...form.getInputProps('executorEndpoint')}
            />
            <Textarea
              id="executorHeaders"
              classNames={{ input: 'font-mono' }}
              label={texts.extensions.executorHeaders}
              key={form.key('executorHeaders')}
              {...form.getInputProps('executorHeaders')}
              resize="vertical"
            />
            <TextInput
              id="chatFooter"
              label={texts.theme.footer}
              description={texts.theme.footerHints}
              key={form.key('chatFooter')}
              {...form.getInputProps('chatFooter')}
            />
            <ChatSuggestionsInput form={form} description={texts.theme.suggestionsHints(MAX_SUGGESTIONS)} />
          </fieldset>
          <Flex gap="sm" pt="sm" justify={'end'}>
            <Button onClick={onClose} variant="subtle">
              {texts.common.cancel}
            </Button>
            <Button type="submit">{texts.common.save}</Button>
          </Flex>
        </form>
      </Modal>
    </Portal>
  );
}
