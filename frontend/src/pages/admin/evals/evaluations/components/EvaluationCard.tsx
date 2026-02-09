import { Anchor, Card, Divider, Grid, Group, Stack, Text } from '@mantine/core';
import { IconCalendar, IconChartBar, IconDatabase, IconRocket } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import type { EvaluationDetailSummary } from 'src/api/generated-eval';
import { texts } from 'src/texts';
import { EvaluationProgressBar } from './EvaluationProgressBar';
import { TestCasesPieChart } from './TestCasesPieChart';

interface EvaluationCardProps {
  evaluation: EvaluationDetailSummary;
}

export function EvaluationCard({ evaluation }: EvaluationCardProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate passed/failed from metric results
  const totalSuccesses = evaluation.metricResults.reduce((sum, m) => sum + (m.successes || 0), 0);
  const totalFailures = evaluation.metricResults.reduce((sum, m) => sum + (m.failures || 0), 0);
  const totalResults = totalSuccesses + totalFailures;

  // Use metric results if available, otherwise use progress
  const passed = totalResults > 0 ? totalSuccesses : evaluation.testCaseProgress.done;
  const failed = totalResults > 0 ? totalFailures : 0;

  // Show pie chart when evaluation has results (SUCCESS or RUNNING with results)
  const showPieChart =
    evaluation.status === 'SUCCESS' || (evaluation.status === 'RUNNING' && evaluation.metricResults.length > 0);

  return (
    <Card padding="lg" radius="md" withBorder>
      <Grid gutter="lg">
        {/* Left side: Evaluation Details */}
        <Grid.Col span={{ base: 12, md: showPieChart ? 8 : 12 }}>
          <Stack gap="md">
            {/* Progress Bar for Running Evaluations */}
            {evaluation.status === 'RUNNING' && <EvaluationProgressBar progress={evaluation.testCaseProgress} showLabel={true} />}

            {/* Metadata Grid */}
            <Stack gap="sm">
              {/* QA Catalog */}
              <Group gap="xs">
                <IconDatabase size={18} className="text-gray-600" />
                <Text size="sm" fw={500}>
                  {texts.evals.evaluations.qaCatalog}:
                </Text>
                {evaluation.qaCatalog ? (
                  <Anchor
                    component={Link}
                    to={`/admin/evals/qa-catalogs/${evaluation.qaCatalog.id}`}
                    size="sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {evaluation.qaCatalog.name}
                  </Anchor>
                ) : (
                  <Text size="sm" c="dimmed">
                    {texts.evals.evaluations.manualTestCases}
                  </Text>
                )}
              </Group>

              {/* Test Cases */}
              <Group gap="xs">
                <IconRocket size={18} className="text-gray-600" />
                <Text size="sm" fw={500}>
                  Test Cases:
                </Text>
                <Text size="sm" c="dimmed">
                  {evaluation.testCaseProgress.done} / {evaluation.testCaseProgress.total}
                </Text>
              </Group>

              {/* Metrics */}
              <Group gap="xs">
                <IconChartBar size={18} className="text-gray-600" />
                <Text size="sm" fw={500}>
                  {texts.evals.evaluations.metrics}:
                </Text>
                <Text size="sm" c="dimmed">
                  {evaluation.metrics.length} metric{evaluation.metrics.length !== 1 ? 's' : ''}
                </Text>
              </Group>

              {/* Created At */}
              <Group gap="xs">
                <IconCalendar size={18} className="text-gray-600" />
                <Text size="sm" fw={500}>
                  {texts.evals.evaluations.createdAt}:
                </Text>
                <Text size="sm" c="dimmed">
                  {formatDate(evaluation.createdAt)}
                </Text>
              </Group>
            </Stack>
          </Stack>
        </Grid.Col>

        {/* Right side: Pie Chart */}
        {showPieChart && (
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack h="100%" justify="center" align="center">
              {/* Divider for mobile */}
              <Divider w="100%" hiddenFrom="md" my="sm" />
              <TestCasesPieChart passed={passed} failed={failed} />
            </Stack>
          </Grid.Col>
        )}
      </Grid>
    </Card>
  );
}
