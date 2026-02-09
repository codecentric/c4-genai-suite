import { ActionIcon, Badge, Group, Skeleton, Stack, Table, Text, Tooltip } from '@mantine/core';
import {
  IconArrowsSort,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconSortAscending,
  IconSortDescending,
  IconX,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import type { EvaluationDetailSummaryMetric, GroupedEvaluationResult } from 'src/api/generated-eval';

interface TestCaseResultsTableProps {
  results: GroupedEvaluationResult[];
  metrics: EvaluationDetailSummaryMetric[];
  isFetching: boolean;
  isFetched: boolean;
}

// Processed QA pair row for display
interface QaPairRow {
  key: string;
  input: string;
  expectedOutput: string;
  allPassed: boolean;
  testCaseCount: number;
  passedCount: number;
  failedCount: number;
  testCases: TestCaseDetail[];
}

// Detail for each test case iteration
interface TestCaseDetail {
  id: string;
  index: number;
  status: string;
  allPassed: boolean;
  metricResults: MetricResultDetail[];
}

// Individual metric result
interface MetricResultDetail {
  metricId: string;
  metricName: string;
  score: number | null;
  threshold: number | null;
  success: boolean;
}

type SortOrder = 'none' | 'passed-first' | 'failed-first';

export function TestCaseResultsTable({ results, metrics, isFetching, isFetched }: TestCaseResultsTableProps) {
  // Expanded rows state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Sort state
  const [sortOrder, setSortOrder] = useState<SortOrder>('none');

  // Create a map of metric ID to metric name
  const metricMap = useMemo(() => new Map(metrics.map((m) => [m.id, m.name])), [metrics]);

  // Process results into QA pair rows with nested test cases
  const qaPairRows: QaPairRow[] = useMemo(() => {
    return results.map((result, resultIndex) => {
      const key = result.groupingKey || `result-${resultIndex}`;

      const testCases: TestCaseDetail[] = result.testCases.map((tc) => {
        const metricResults: MetricResultDetail[] = tc.results.map((mr) => ({
          metricId: mr.metricId,
          metricName: metricMap.get(mr.metricId) || mr.metricId,
          score: mr.score,
          threshold: mr.threashold, // API has typo
          success: mr.success,
        }));

        const allMetricsPassed = metricResults.every((mr) => mr.success);

        return {
          id: tc.id,
          index: tc.index,
          status: tc.testCaseStatus,
          allPassed: allMetricsPassed,
          metricResults,
        };
      });

      const passedCount = testCases.filter((tc) => tc.allPassed).length;
      const failedCount = testCases.length - passedCount;
      const allPassed = failedCount === 0;

      return {
        key,
        input: result.input,
        expectedOutput: result.expectedOutput,
        allPassed,
        testCaseCount: testCases.length,
        passedCount,
        failedCount,
        testCases,
      };
    });
  }, [results, metricMap]);

  // Sort QA pair rows based on sort order
  const sortedRows = useMemo(() => {
    if (sortOrder === 'none') return qaPairRows;

    return [...qaPairRows].sort((a, b) => {
      if (sortOrder === 'passed-first') {
        if (a.allPassed && !b.allPassed) return -1;
        if (!a.allPassed && b.allPassed) return 1;
      } else if (sortOrder === 'failed-first') {
        if (!a.allPassed && b.allPassed) return -1;
        if (a.allPassed && !b.allPassed) return 1;
      }
      return 0;
    });
  }, [qaPairRows, sortOrder]);

  // Get score color based on value
  const getScoreColor = (score: number | null): 'red' | 'orange' | 'teal' | 'gray' => {
    if (score === null) return 'gray';
    if (score < 0.5) return 'red';
    if (score < 0.8) return 'orange';
    return 'teal';
  };

  // Cycle through sort orders: none -> passed-first -> failed-first -> none
  const cycleSortOrder = () => {
    setSortOrder((prev) => {
      if (prev === 'none') return 'passed-first';
      if (prev === 'passed-first') return 'failed-first';
      return 'none';
    });
  };

  const getSortIcon = () => {
    if (sortOrder === 'none') return <IconArrowsSort size={14} />;
    if (sortOrder === 'passed-first') return <IconSortAscending size={14} />;
    return <IconSortDescending size={14} />;
  };

  const getSortTooltip = () => {
    if (sortOrder === 'none') return 'Sort by status';
    if (sortOrder === 'passed-first') return 'Passed first';
    return 'Failed first';
  };

  const toggleRow = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <Stack gap="md">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table w-full text-base">
          <thead>
            <tr>
              <th className="w-10"></th>
              <th>
                <Group gap="xs" wrap="nowrap">
                  <span>Status</span>
                  <Tooltip label={getSortTooltip()} withArrow>
                    <ActionIcon
                      variant={sortOrder !== 'none' ? 'light' : 'subtle'}
                      color={sortOrder !== 'none' ? 'blue' : 'gray'}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        cycleSortOrder();
                      }}
                    >
                      {getSortIcon()}
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </th>
              <th>Question</th>
              <th>Expected Output</th>
              <th>Iterations</th>
            </tr>
          </thead>
          <tbody>
            {/* Loading state */}
            {isFetching && !isFetched && (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td>
                      <Skeleton height={20} width={24} />
                    </td>
                    <td>
                      <Skeleton height={20} width={70} />
                    </td>
                    <td>
                      <Skeleton height={20} />
                    </td>
                    <td>
                      <Skeleton height={20} />
                    </td>
                    <td>
                      <Skeleton height={20} width={80} />
                    </td>
                  </tr>
                ))}
              </>
            )}

            {/* Data rows */}
            {isFetched &&
              sortedRows.map((row) => {
                const isExpanded = expandedRows.has(row.key);

                return (
                  <>
                    {/* Main QA pair row */}
                    <tr key={row.key} className="cursor-pointer hover:bg-gray-50" onClick={() => toggleRow(row.key)}>
                      <td>
                        <ActionIcon variant="subtle" size="sm">
                          {isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                        </ActionIcon>
                      </td>
                      <td>
                        <Badge
                          variant={row.allPassed ? 'light' : 'filled'}
                          color={row.allPassed ? 'teal' : 'red'}
                          leftSection={row.allPassed ? <IconCheck size={12} /> : <IconX size={12} />}
                          size="sm"
                        >
                          {row.allPassed ? 'Passed' : 'Failed'}
                        </Badge>
                      </td>
                      <td>
                        <Tooltip label={row.input} multiline maw={400} withArrow>
                          <Text size="sm" className="line-clamp-2 cursor-help">
                            {row.input}
                          </Text>
                        </Tooltip>
                      </td>
                      <td>
                        <Tooltip label={row.expectedOutput} multiline maw={400} withArrow>
                          <Text size="sm" className="line-clamp-2 cursor-help">
                            {row.expectedOutput}
                          </Text>
                        </Tooltip>
                      </td>
                      <td>
                        <Group gap="xs">
                          <Badge variant="light" color="teal" size="sm">
                            {row.passedCount} passed
                          </Badge>
                          {row.failedCount > 0 && (
                            <Badge variant="light" color="red" size="sm">
                              {row.failedCount} failed
                            </Badge>
                          )}
                        </Group>
                      </td>
                    </tr>

                    {/* Expanded details row */}
                    {isExpanded && (
                      <tr key={`${row.key}-expanded`}>
                        <td colSpan={5} className="bg-gray-50 p-0">
                          <div className="p-4">
                            <Stack gap="md">
                              {row.testCases.map((tc) => (
                                <div key={tc.id} className="rounded-lg border bg-white p-3">
                                  <Group justify="space-between" mb="sm">
                                    <Group gap="sm">
                                      <Text size="sm" fw={500}>
                                        Iteration {tc.index + 1}
                                      </Text>
                                      <Badge
                                        variant={tc.allPassed ? 'light' : 'filled'}
                                        color={tc.allPassed ? 'teal' : 'red'}
                                        size="xs"
                                      >
                                        {tc.allPassed ? 'All Passed' : 'Has Failures'}
                                      </Badge>
                                    </Group>
                                  </Group>

                                  <Table withTableBorder={false} verticalSpacing="xs" horizontalSpacing="sm">
                                    <Table.Thead>
                                      <Table.Tr>
                                        <Table.Th>Metric</Table.Th>
                                        <Table.Th>Score</Table.Th>
                                        <Table.Th>Threshold</Table.Th>
                                        <Table.Th>Status</Table.Th>
                                      </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                      {tc.metricResults.map((mr) => (
                                        <Table.Tr key={mr.metricId}>
                                          <Table.Td>
                                            <Badge variant="default" size="sm">
                                              {mr.metricName}
                                            </Badge>
                                          </Table.Td>
                                          <Table.Td>
                                            <Badge variant="light" color={getScoreColor(mr.score)} size="sm">
                                              {mr.score !== null ? mr.score.toFixed(3) : 'N/A'}
                                            </Badge>
                                          </Table.Td>
                                          <Table.Td>
                                            <Text size="sm" c="dimmed">
                                              {mr.threshold !== null ? mr.threshold.toFixed(3) : '-'}
                                            </Text>
                                          </Table.Td>
                                          <Table.Td>
                                            <Badge
                                              variant={mr.success ? 'light' : 'filled'}
                                              color={mr.success ? 'teal' : 'red'}
                                              leftSection={mr.success ? <IconCheck size={10} /> : <IconX size={10} />}
                                              size="xs"
                                            >
                                              {mr.success ? 'Passed' : 'Failed'}
                                            </Badge>
                                          </Table.Td>
                                        </Table.Tr>
                                      ))}
                                    </Table.Tbody>
                                  </Table>
                                </div>
                              ))}
                            </Stack>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}

            {/* Empty state */}
            {isFetched && qaPairRows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center">
                  <div className="text-gray-500">
                    <p className="mb-2">No results found for this evaluation.</p>
                    <p className="text-sm">Results will appear here once the evaluation completes.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Stack>
  );
}
