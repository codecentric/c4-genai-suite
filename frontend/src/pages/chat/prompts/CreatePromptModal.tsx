import { Button, Group, Modal, Select, Stack, Switch, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useApi } from 'src/api';
import { CreatePromptDto } from 'src/api/prompts';
import { texts } from 'src/texts';

interface CreatePromptModalProps {
  opened: boolean;
  onClose: () => void;
  initialContent?: string;
}

export function CreatePromptModal({ opened, onClose, initialContent = '' }: CreatePromptModalProps) {
  const api = useApi();
  const queryClient = useQueryClient();

  // Fetch categories for the select
  const { data: categories = [] } = useQuery({
    queryKey: ['prompt-categories'],
    queryFn: () => api.prompts.getCategories(),
  });

  const form = useForm<CreatePromptDto>({
    initialValues: {
      title: '',
      content: initialContent,
      description: '',
      categoryId: undefined,
      isPublic: true,
    },
    validate: {
      title: (value) => (value.trim().length < 3 ? texts.chat.prompts.create.titleValidation : null),
      content: (value) => (value.trim().length < 10 ? texts.chat.prompts.create.contentValidation : null),
    },
  });

  const createPromptMutation = useMutation({
    mutationFn: (data: CreatePromptDto) => api.prompts.createPrompt(data),
    onSuccess: () => {
      toast.success(texts.chat.prompts.create.successMessage);
      void queryClient.invalidateQueries({ queryKey: ['prompts'] });
      void queryClient.invalidateQueries({ queryKey: ['popular-prompts'] });
      form.reset();
      onClose();
    },
    onError: (error) => {
      toast.error(texts.chat.prompts.create.errorMessage);
      console.error('Failed to create prompt:', error);
    },
  });

  const handleSubmit = (values: CreatePromptDto) => {
    createPromptMutation.mutate(values);
  };

  const categoryOptions = categories.map((cat) => ({
    value: cat.id.toString(),
    label: cat.name,
  }));

  return (
    <Modal opened={opened} onClose={onClose} title={texts.chat.prompts.create.title} size="lg">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label={texts.chat.prompts.create.titleLabel}
            placeholder={texts.chat.prompts.create.titlePlaceholder}
            required
            {...form.getInputProps('title')}
          />

          <Textarea
            label={texts.chat.prompts.create.contentLabel}
            placeholder={texts.chat.prompts.create.contentPlaceholder}
            required
            minRows={4}
            maxRows={8}
            autosize
            {...form.getInputProps('content')}
          />

          <Textarea
            label={texts.chat.prompts.create.descriptionLabel}
            placeholder={texts.chat.prompts.create.descriptionPlaceholder}
            minRows={2}
            maxRows={4}
            autosize
            {...form.getInputProps('description')}
          />

          <Select
            label={texts.chat.prompts.create.categoryLabel}
            placeholder={texts.chat.prompts.create.categoryPlaceholder}
            data={categoryOptions}
            value={form.values.categoryId?.toString()}
            onChange={(value) => form.setFieldValue('categoryId', value ? parseInt(value) : undefined)}
            clearable
          />

          <Switch
            label={texts.chat.prompts.create.publicLabel}
            description={texts.chat.prompts.create.publicDescription}
            {...form.getInputProps('isPublic', { type: 'checkbox' })}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose}>
              {texts.common.cancel}
            </Button>
            <Button type="submit" loading={createPromptMutation.isPending}>
              {texts.chat.prompts.create.createButton}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
