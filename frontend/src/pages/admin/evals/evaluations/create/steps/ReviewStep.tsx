import { Badge, Card, Divider, Group, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { IconChartBar, IconDatabase, IconEdit, IconRocket } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useEvalApi } from 'src/api/state/apiEvalClient';
import { useWizardStore } from '../../state/zustand/wizardState';

export function ReviewStep() {
  const { mode, name, description, setName, setDescription, catalogId, testCasesPerQaPair, testCases, metricIds, endpointId } =
    useWizardStore();

  const evalApi = useEvalApi();

  // Fetch selected resources for display (use preview to get length)
  const { data: catalog } = useQuery({
    queryKey: ['qaCatalogPreview', catalogId],
    queryFn: () => evalApi.qaCatalog.qaCatalogGetPreview(catalogId!),
    enabled: !!catalogId && mode === 'catalog',
  });

  const { data: metrics = [] } = useQuery({
    queryKey: ['metrics', 'all'],
    queryFn: () => evalApi.metrics.metricsGetAll(0, 100),
  });

  const { data: endpoint } = useQuery({
    queryKey: ['llmEndpoint', endpointId],
    queryFn: () => evalApi.llmEndpoints.llmEndpointsGet(endpointId!),
    enabled: !!endpointId,
  });

  const selectedMetrics = metrics.filter((m) => metricIds.includes(m.id));

  return (
    <Stack gap="lg">
      <Text size="lg" fw={500}>
        Review & Finalize
      </Text>
      <Text size="sm" c="dimmed">
        Review your evaluation configuration and provide a name
      </Text>

      {/* Evaluation Name */}
      <TextInput
        label="Evaluation Name"
        placeholder="Enter a descriptive name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <Textarea
        label="Description (Optional)"
        placeholder="Add a description for this evaluation"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        minRows={2}
      />

      <Divider />

      {/* Configuration Summary */}
      <Text fw={600} size="md">
        Configuration Summary
      </Text>

      {/* Mode & Source */}
      <Card padding="md" withBorder>
        <Stack gap="xs">
          <Group gap="xs">
            {mode === 'catalog' ? (
              <IconDatabase size={18} className="text-blue-600" />
            ) : (
              <IconEdit size={18} className="text-green-600" />
            )}
            <Text fw={600}>Source</Text>
          </Group>
          {mode === 'catalog' && catalog && (
            <>
              <Text size="sm">
                QA Catalog:{' '}
                <Text component="span" fw={600}>
                  {catalog.name}
                </Text>
              </Text>
              <Text size="sm">
                Q&A Pairs:{' '}
                <Text component="span" fw={600}>
                  {catalog.length ?? 0}
                </Text>
              </Text>
              <Text size="sm">
                Test Cases per Pair:{' '}
                <Text component="span" fw={600}>
                  {testCasesPerQaPair ?? 1}
                </Text>
              </Text>
              <Text size="sm" c="dimmed">
                Estimated total test cases:{' '}
                <Text component="span" fw={600}>
                  {(catalog.length ?? 0) * (testCasesPerQaPair || 1)}
                </Text>
              </Text>
            </>
          )}
          {mode === 'manual' && (
            <Text size="sm">
              Manual Test Cases:{' '}
              <Text component="span" fw={600}>
                {testCases.length}
              </Text>
            </Text>
          )}
        </Stack>
      </Card>

      {/* Metrics */}
      <Card padding="md" withBorder>
        <Stack gap="xs">
          <Group gap="xs">
            <IconChartBar size={18} className="text-blue-600" />
            <Text fw={600}>Metrics ({selectedMetrics.length})</Text>
          </Group>
          <Group gap="xs">
            {selectedMetrics.map((metric) => (
              <Badge key={metric.id} variant="light">
                {metric._configuration.name}
              </Badge>
            ))}
          </Group>
        </Stack>
      </Card>

      {/* Endpoint */}
      <Card padding="md" withBorder>
        <Stack gap="xs">
          <Group gap="xs">
            <IconRocket size={18} className="text-purple-600" />
            <Text fw={600}>LLM Endpoint</Text>
          </Group>
          {endpoint && (
            <>
              <Text size="sm">{endpoint.name}</Text>
              <Badge variant="light" size="sm">
                {endpoint._configuration.type}
              </Badge>
            </>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
