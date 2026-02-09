import { Alert, Badge, Card, Checkbox, Group, SimpleGrid, Skeleton, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconChartBar } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useEvalApi } from 'src/api/state/apiEvalClient';
import { useWizardStore } from '../../state/zustand/wizardState';

export function MetricsSelectionStep() {
  const { metricIds, addMetricId, removeMetricId } = useWizardStore();
  const evalApi = useEvalApi();

  // Fetch available metrics
  const {
    data: metrics = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['metrics', 'all'],
    queryFn: () => evalApi.metrics.metricsGetAll(0, 100),
  });

  const handleToggleMetric = (metricId: string) => {
    if (metricIds.includes(metricId)) {
      removeMetricId(metricId);
    } else {
      addMetricId(metricId);
    }
  };

  if (isLoading) {
    return (
      <Stack gap="lg">
        <Text size="lg" fw={500}>
          Select Metrics
        </Text>
        <Stack gap="sm">
          <Skeleton height={80} />
          <Skeleton height={80} />
          <Skeleton height={80} />
        </Stack>
      </Stack>
    );
  }

  if (isError || metrics.length === 0) {
    return (
      <Stack gap="lg">
        <Text size="lg" fw={500}>
          Select Metrics
        </Text>
        <Alert icon={<IconAlertCircle size={16} />} color="red" title="No Metrics Available">
          No metrics found. Please create at least one metric before creating an evaluation.
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Text size="lg" fw={500}>
        Select Metrics
      </Text>
      <Text size="sm" c="dimmed">
        Choose one or more metrics to evaluate your test cases. Each metric will score the LLM&apos;s responses according to
        different criteria.
      </Text>

      {metricIds.length === 0 && (
        <Alert icon={<IconAlertCircle size={16} />} color="blue">
          Select at least one metric to proceed.
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {metrics.map((metric) => {
          const isSelected = metricIds.includes(metric.id);

          return (
            <Card
              key={metric.id}
              padding="md"
              withBorder
              className={`cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
              onClick={() => handleToggleMetric(metric.id)}
            >
              <Group wrap="nowrap" align="flex-start">
                <Checkbox
                  checked={isSelected}
                  onChange={() => handleToggleMetric(metric.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <Stack gap="xs" className="flex-1">
                  <Group gap="xs">
                    <IconChartBar size={18} className="text-blue-600" />
                    <Text fw={600}>{metric._configuration.name}</Text>
                  </Group>
                  <Badge variant="light" size="sm" color="gray">
                    {metric._configuration.type}
                  </Badge>
                  <Text size="sm" c="dimmed">
                    Threshold: {metric._configuration.threshold?.toFixed(2) || 'N/A'}
                  </Text>
                </Stack>
              </Group>
            </Card>
          );
        })}
      </SimpleGrid>

      {metricIds.length > 0 && (
        <Card padding="sm" withBorder bg="blue.0">
          <Text size="sm" c="dimmed">
            <Text component="span" fw={700} c="blue">
              {metricIds.length}
            </Text>{' '}
            metric{metricIds.length !== 1 ? 's' : ''} selected
          </Text>
        </Card>
      )}
    </Stack>
  );
}
