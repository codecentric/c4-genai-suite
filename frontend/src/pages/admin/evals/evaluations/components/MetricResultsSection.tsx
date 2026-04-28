import { Card, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconChartBar } from '@tabler/icons-react';
import type { MetricResult } from 'src/api/generated-eval';
import { MetricDonutChart } from './MetricDonutChart';

interface MetricResultsSectionProps {
  metricResults: MetricResult[];
}

/**
 * Displays metric results as a grid of donut charts.
 * Each chart shows the success/failure distribution for a specific metric.
 */
export function MetricResultsSection({ metricResults }: MetricResultsSectionProps) {
  if (metricResults.length === 0) {
    return null;
  }

  return (
    <Card padding="lg" radius="md" withBorder>
      <Stack gap="lg">
        {/* Section Header */}
        <Group gap="xs">
          <IconChartBar size={20} className="text-gray-600" />
          <Text fw={600} size="lg">
            Metric Results
          </Text>
        </Group>

        {/* Donut Charts Grid */}
        <SimpleGrid cols={{ base: 2, xs: 2, sm: 3, md: 4 }} spacing="md">
          {metricResults.map((result) => (
            <MetricDonutChart
              key={result.id}
              name={result.name}
              successes={result.successes}
              failures={result.failures}
              errors={result.errors}
            />
          ))}
        </SimpleGrid>
      </Stack>
    </Card>
  );
}
