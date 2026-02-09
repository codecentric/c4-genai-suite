import { Alert, Badge, Card, Group, Radio, Skeleton, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconRocket } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useEvalApi } from 'src/api/state/apiEvalClient';
import { useWizardStore } from '../../state/zustand/wizardState';

export function EndpointSelectionStep() {
  const { endpointId, setEndpointId } = useWizardStore();
  const evalApi = useEvalApi();

  // Fetch available LLM endpoints
  const {
    data: endpoints = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['llmEndpoints', 'all'],
    queryFn: () => evalApi.llmEndpoints.llmEndpointsGetAll(undefined, undefined, 0, 100),
  });

  if (isLoading) {
    return (
      <Stack gap="lg">
        <Text size="lg" fw={500}>
          Select LLM Endpoint
        </Text>
        <Stack gap="sm">
          <Skeleton height={80} />
          <Skeleton height={80} />
          <Skeleton height={80} />
        </Stack>
      </Stack>
    );
  }

  if (isError || endpoints.length === 0) {
    return (
      <Stack gap="lg">
        <Text size="lg" fw={500}>
          Select LLM Endpoint
        </Text>
        <Alert icon={<IconAlertCircle size={16} />} color="red" title="No Endpoints Available">
          No LLM endpoints found. Please create at least one LLM endpoint before creating an evaluation.
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Text size="lg" fw={500}>
        Select LLM Endpoint
      </Text>
      <Text size="sm" c="dimmed">
        Choose the LLM endpoint that will be evaluated. The evaluation will send test case questions to this endpoint and measure
        its responses.
      </Text>

      {!endpointId && (
        <Alert icon={<IconAlertCircle size={16} />} color="blue">
          Select an LLM endpoint to proceed.
        </Alert>
      )}

      <Radio.Group value={endpointId || ''} onChange={(value) => setEndpointId(value)}>
        <Stack gap="md">
          {endpoints.map((endpoint) => (
            <Card
              key={endpoint.id}
              padding="md"
              withBorder
              className={`cursor-pointer transition-all ${
                endpointId === endpoint.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => setEndpointId(endpoint.id)}
            >
              <Group wrap="nowrap" align="flex-start">
                <Radio value={endpoint.id} />
                <Stack gap="xs" className="flex-1">
                  <Group gap="xs">
                    <IconRocket size={18} className="text-purple-600" />
                    <Text fw={600}>{endpoint.name}</Text>
                  </Group>
                  <Group gap="xs">
                    <Badge variant="light" size="sm" color="purple">
                      {endpoint._configuration.type}
                    </Badge>
                    {endpoint.supportedFeatures.map((feature) => (
                      <Badge key={feature} variant="outline" size="sm">
                        {feature}
                      </Badge>
                    ))}
                  </Group>
                  <Text size="xs" c="dimmed">
                    Created: {new Date(endpoint.createdAt).toLocaleDateString()}
                  </Text>
                </Stack>
              </Group>
            </Card>
          ))}
        </Stack>
      </Radio.Group>
    </Stack>
  );
}
