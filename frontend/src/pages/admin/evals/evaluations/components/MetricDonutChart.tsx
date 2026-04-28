import { Badge, Group, Stack, Text } from '@mantine/core';
import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

interface MetricDonutChartProps {
  name: string;
  successes: number;
  failures: number;
  errors?: number;
}

/**
 * A donut chart visualization for individual metric results.
 * No container - meant to be used inside a parent Card.
 */
/* eslint-disable react/prop-types */
export function MetricDonutChart({ name, successes, failures, errors = 0 }: MetricDonutChartProps) {
  const total = successes + failures + errors;
  const hasFailures = failures > 0 || errors > 0;

  const data = useMemo(() => {
    const result = [];
    if (successes > 0) {
      result.push({ name: 'Success', value: successes, color: 'var(--mantine-color-green-6)' });
    }
    if (failures > 0) {
      result.push({ name: 'Failure', value: failures, color: 'var(--mantine-color-red-6)' });
    }
    if (errors > 0) {
      result.push({ name: 'Error', value: errors, color: 'var(--mantine-color-yellow-6)' });
    }
    // If no data, show empty state
    if (result.length === 0) {
      result.push({ name: 'Empty', value: 1, color: 'var(--mantine-color-gray-3)' });
    }
    return result;
  }, [successes, failures, errors]);

  // Custom label renderer for showing failure count on the chart

  const renderCustomLabel = (props: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    value?: number;
    name?: string;
  }) => {
    const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, value = 0, name: labelName } = props;

    // Only show label for failures/errors if they exist and are significant
    if (labelName === 'Success' || value === 0) return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '12px', fontWeight: 600 }}>
        {value}
      </text>
    );
  };

  const passPercentage = total > 0 ? Math.round((successes / total) * 100) : 0;

  return (
    <Stack gap="xs" align="center">
      {/* Metric Name */}
      <Text
        size="sm"
        fw={600}
        ta="center"
        style={{
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </Text>

      {/* Donut Chart */}
      <div style={{ width: 120, height: 120, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={55}
              paddingAngle={hasFailures ? 2 : 0}
              dataKey="value"
              strokeWidth={0}
              labelLine={false}
              label={renderCustomLabel}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center count */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <Text size="lg" fw={700} lh={1}>
            {total}
          </Text>
        </div>
      </div>

      {/* Pass rate badge */}
      <Badge variant="light" color={passPercentage >= 70 ? 'green' : passPercentage >= 50 ? 'yellow' : 'red'} size="sm">
        {passPercentage}% passed
      </Badge>

      {/* Legend */}
      <Group gap="xs" justify="center" wrap="wrap">
        {successes > 0 && (
          <Group gap={4}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                backgroundColor: 'var(--mantine-color-green-6)',
              }}
            />
            <Text size="xs" c="dimmed">
              {successes}
            </Text>
          </Group>
        )}
        {failures > 0 && (
          <Group gap={4}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                backgroundColor: 'var(--mantine-color-red-6)',
              }}
            />
            <Text size="xs" c="dimmed">
              {failures}
            </Text>
          </Group>
        )}
        {errors > 0 && (
          <Group gap={4}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                backgroundColor: 'var(--mantine-color-yellow-6)',
              }}
            />
            <Text size="xs" c="dimmed">
              {errors}
            </Text>
          </Group>
        )}
      </Group>
    </Stack>
  );
}
