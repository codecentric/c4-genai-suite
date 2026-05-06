import { Badge, Card, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconChartBar } from '@tabler/icons-react';
import type { EvaluationDetailSummary } from 'src/api/generated-eval';
import { texts } from 'src/texts';

interface MetricsDisplayProps {
  evaluation: EvaluationDetailSummary;
}

export function MetricsDisplay({ evaluation }: MetricsDisplayProps) {
  // Fallback: Display metrics from evaluation data without full metrics API
  const metrics = evaluation.metrics || [];
  const metricResults = evaluation.metricResults || [];

  if (metrics.length === 0) {
    return (
      <Card padding="lg" radius="md" withBorder>
        <Stack gap="sm">
          <Group gap="xs">
            <IconChartBar size={20} className="text-gray-600" />
            <Text fw={600} size="lg">
              {texts.evals.evaluations.metrics}
            </Text>
          </Group>
          <Text size="sm" c="dimmed">
            No metrics configured for this evaluation.
          </Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Card padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group gap="xs">
          <IconChartBar size={20} className="text-gray-600" />
          <Text fw={600} size="lg">
            {texts.evals.evaluations.metrics}
          </Text>
          <Badge variant="light" color="blue">
            {metrics.length} metric{metrics.length !== 1 ? 's' : ''}
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {metrics.map((metric) => {
            // Find corresponding metric result for pass/fail counts
            const metricResult = metricResults.find((mr) => mr.id === metric.id);
            const passRate =
              metricResult && metricResult.total > 0
                ? Math.round((metricResult.successes / metricResult.total) * 100)
                : undefined;

            return (
              <Card key={metric.id} padding="sm" withBorder>
                <Stack gap="xs">
                  <Text fw={500} size="sm">
                    {metric.name}
                  </Text>
                  <Badge variant="light" size="sm" color="gray">
                    {metric.type}
                  </Badge>
                  {typeof passRate === 'number' && (
                    <Text size="xs" c="dimmed">
                      Pass Rate: {passRate}%
                    </Text>
                  )}
                </Stack>
              </Card>
            );
          })}
        </SimpleGrid>
      </Stack>
    </Card>
  );
}
