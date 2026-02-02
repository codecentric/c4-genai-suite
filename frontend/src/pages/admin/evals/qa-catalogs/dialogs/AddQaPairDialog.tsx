import { Button, Portal, Textarea, ActionIcon, Tooltip } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconX } from '@tabler/icons-react';
import { z } from 'zod';
import { Modal } from 'src/components';
import { typedZodResolver } from 'src/lib';
import { texts } from 'src/texts';

interface AddQaPairDialogProps {
  onClose: () => void;
  onAdd: (data: { question: string; expectedOutput: string; contexts: string[] }) => void;
}

const schema = z.object({
  question: z.string().min(1, texts.evals.qaCatalog.questionRequired),
  expectedOutput: z.string().min(1, texts.evals.qaCatalog.expectedOutputRequired),
  contexts: z.array(z.string()),
});

type FormValues = z.infer<typeof schema>;

export function AddQaPairDialog({ onClose, onAdd }: AddQaPairDialogProps) {
  const form = useForm<FormValues>({
    validate: typedZodResolver(schema),
    initialValues: {
      question: '',
      expectedOutput: '',
      contexts: [],
    },
    mode: 'controlled',
  });

  const handleSubmit = form.onSubmit((values) => {
    onAdd({
      question: values.question,
      expectedOutput: values.expectedOutput,
      contexts: values.contexts.filter((c) => c.trim() !== ''),
    });
  });

  const addContext = () => {
    form.insertListItem('contexts', '');
  };

  const removeContext = (index: number) => {
    form.removeListItem('contexts', index);
  };

  return (
    <Portal>
      <form noValidate onSubmit={handleSubmit}>
        <Modal
          onClose={onClose}
          header={texts.evals.qaCatalog.addNewQaPair}
          footer={
            <div className="flex flex-row justify-end gap-4">
              <Button type="button" variant="subtle" onClick={onClose}>
                {texts.common.cancel}
              </Button>
              <Button type="submit">{texts.evals.qaCatalog.addQaPair}</Button>
            </div>
          }
        >
          <Textarea
            id="question"
            withAsterisk
            label={texts.evals.qaCatalog.questionLabel}
            placeholder={texts.evals.qaCatalog.questionPlaceholder}
            minRows={3}
            className="mb-4"
            key={form.key('question')}
            {...form.getInputProps('question')}
          />

          <Textarea
            id="expectedOutput"
            withAsterisk
            label={texts.evals.qaCatalog.expectedOutputLabel}
            placeholder={texts.evals.qaCatalog.expectedOutputPlaceholder}
            minRows={3}
            className="mb-4"
            key={form.key('expectedOutput')}
            {...form.getInputProps('expectedOutput')}
          />

          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">{texts.evals.qaCatalog.contextsLabel}</label>
              <Tooltip label={texts.evals.qaCatalog.addContext}>
                <ActionIcon variant="light" size="sm" onClick={addContext}>
                  <IconPlus size={16} />
                </ActionIcon>
              </Tooltip>
            </div>
            <p className="mb-2 text-xs text-gray-500">{texts.evals.qaCatalog.contextsHint}</p>

            {form.values.contexts.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No contexts added</p>
            ) : (
              <div className="space-y-2">
                {form.values.contexts.map((_, index) => (
                  <div key={index} className="flex gap-2">
                    <Textarea
                      className="flex-1"
                      placeholder={texts.evals.qaCatalog.contextsPlaceholder}
                      minRows={2}
                      key={form.key(`contexts.${index}`)}
                      {...form.getInputProps(`contexts.${index}`)}
                    />
                    <Tooltip label={texts.evals.qaCatalog.removeContext}>
                      <ActionIcon variant="subtle" color="red" className="mt-1" onClick={() => removeContext(index)}>
                        <IconX size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      </form>
    </Portal>
  );
}
