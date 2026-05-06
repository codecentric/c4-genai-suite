import { Card, Group, Radio, Stack, Text } from '@mantine/core';
import { IconDatabase, IconEdit } from '@tabler/icons-react';
import { type EvaluationMode, useWizardStore } from '../../state/zustand/wizardState';

export function ModeSelectionStep() {
  const { mode, setMode } = useWizardStore();

  return (
    <Stack gap="lg">
      <Text size="lg" fw={500}>
        Select Evaluation Mode
      </Text>
      <Text size="sm" c="dimmed">
        Choose how you want to create your evaluation
      </Text>

      <Radio.Group value={mode || ''} onChange={(value) => setMode(value as EvaluationMode)}>
        <Stack gap="md">
          <Card
            padding="md"
            withBorder
            className={`cursor-pointer transition-all ${mode === 'catalog' ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
            onClick={() => setMode('catalog')}
          >
            <Group wrap="nowrap" align="flex-start">
              <Radio value="catalog" />
              <Stack gap="xs" className="flex-1">
                <Group gap="xs">
                  <IconDatabase size={20} className="text-blue-600" />
                  <Text fw={600}>By QA Catalog</Text>
                </Group>
                <Text size="sm" c="dimmed">
                  Use an existing QA catalog to run evaluations. Test cases will be automatically generated from the
                  catalog&apos;s Q&A pairs.
                </Text>
              </Stack>
            </Group>
          </Card>

          <Card
            padding="md"
            withBorder
            className={`cursor-pointer transition-all ${mode === 'manual' ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
            onClick={() => setMode('manual')}
          >
            <Group wrap="nowrap" align="flex-start">
              <Radio value="manual" />
              <Stack gap="xs" className="flex-1">
                <Group gap="xs">
                  <IconEdit size={20} className="text-green-600" />
                  <Text fw={600}>Manual Test Cases</Text>
                </Group>
                <Text size="sm" c="dimmed">
                  Create an evaluation by manually defining test cases. Useful for custom scenarios or when you don&apos;t have a
                  QA catalog yet.
                </Text>
              </Stack>
            </Group>
          </Card>
        </Stack>
      </Radio.Group>
    </Stack>
  );
}
