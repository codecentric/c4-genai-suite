import { Alert, Badge, Card, Group, Radio, Skeleton, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconRobot } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import type { ConfigurationDto } from 'src/api/generated';
import { useApi } from 'src/api/state/apiAppClient';
import { useWizardStore } from '../../state/zustand/wizardState';

export function AssistantSelectionStep() {
  const { c4AssistantId, setC4Assistant } = useWizardStore();
  const api = useApi();

  // Fetch C4 configurations (assistants)
  const {
    data: configurations,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['configurations', 'all', true],
    queryFn: () => api.extensions.getConfigurations(true),
  });

  const assistants: ConfigurationDto[] = configurations?.items ?? [];

  if (isLoading) {
    return (
      <Stack gap="lg">
        <Text size="lg" fw={500}>
          Select Assistant
        </Text>
        <Stack gap="sm">
          <Skeleton height={80} />
          <Skeleton height={80} />
          <Skeleton height={80} />
        </Stack>
      </Stack>
    );
  }

  if (isError || assistants.length === 0) {
    return (
      <Stack gap="lg">
        <Text size="lg" fw={500}>
          Select Assistant
        </Text>
        <Alert icon={<IconAlertCircle size={16} />} color="red" title="No Assistants Available">
          No C4 assistants found. Please create at least one assistant (configuration) before creating an evaluation.
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Text size="lg" fw={500}>
        Select Assistant
      </Text>
      <Text size="sm" c="dimmed">
        Choose the C4 assistant that will be evaluated. The evaluation will send test case questions to this assistant and measure
        its responses.
      </Text>

      {!c4AssistantId && (
        <Alert icon={<IconAlertCircle size={16} />} color="blue">
          Select an assistant to proceed.
        </Alert>
      )}

      <Radio.Group
        value={c4AssistantId?.toString() ?? ''}
        onChange={(value) => {
          const assistant = assistants.find((a) => a.id.toString() === value);
          setC4Assistant(assistant ? assistant.id : null, assistant?.name ?? null);
        }}
      >
        <Stack gap="md">
          {assistants.map((assistant) => (
            <Card
              key={assistant.id}
              padding="md"
              withBorder
              className={`cursor-pointer transition-all ${
                c4AssistantId === assistant.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => setC4Assistant(assistant.id, assistant.name)}
            >
              <Group wrap="nowrap" align="flex-start">
                <Radio value={assistant.id.toString()} />
                <Stack gap="xs" className="flex-1">
                  <Group gap="xs">
                    <IconRobot size={18} className="text-blue-600" />
                    <Text fw={600}>{assistant.name}</Text>
                  </Group>
                  {assistant.description && (
                    <Text size="sm" c="dimmed" lineClamp={2}>
                      {assistant.description}
                    </Text>
                  )}
                  <Group gap="xs">
                    <Badge variant="light" size="sm" color="blue">
                      Assistant
                    </Badge>
                    {assistant.extensions && assistant.extensions.length > 0 && (
                      <Badge variant="outline" size="sm">
                        {assistant.extensions.length} extension{assistant.extensions.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </Group>
                </Stack>
              </Group>
            </Card>
          ))}
        </Stack>
      </Radio.Group>
    </Stack>
  );
}
