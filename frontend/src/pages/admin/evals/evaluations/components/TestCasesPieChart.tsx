import { Group, Stack, Text } from '@mantine/core';
import { Cell, Pie, PieChart } from 'recharts';

interface TestCasesPieChartProps {
  passed: number;
  failed: number;
}

/**
 * A simple pie chart showing passing vs failing test cases.
 * Matches the existing Mantine-based UI style.
 */
export function TestCasesPieChart({ passed, failed }: TestCasesPieChartProps) {
  const total = passed + failed;

  const data = [
    { name: 'Passed', value: passed, color: 'var(--mantine-color-green-6)' },
    { name: 'Failed', value: failed, color: 'var(--mantine-color-red-6)' },
  ].filter((d) => d.value > 0);

  // If no data, show empty state
  if (total === 0) {
    return (
      <Stack align="center" gap="xs">
        <Text size="sm" c="dimmed">
          No results yet
        </Text>
      </Stack>
    );
  }

  return (
    <Stack align="center" gap="xs">
      {/* Chart with centered ratio */}
      <div style={{ width: 160, height: 160, position: 'relative' }}>
        <PieChart width={160} height={160}>
          <Pie
            data={data}
            cx={80}
            cy={80}
            innerRadius={45}
            outerRadius={70}
            paddingAngle={data.length > 1 ? 2 : 0}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>

        {/* Center ratio text */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <Text size="xl" fw={700} lh={1}>
            {passed}/{total}
          </Text>
        </div>
      </div>

      {/* Legend */}
      <Group gap="md" justify="center">
        {passed > 0 && (
          <Group gap={6}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                backgroundColor: 'var(--mantine-color-green-6)',
              }}
            />
            <Text size="xs" c="dimmed">
              Passed
            </Text>
          </Group>
        )}
        {failed > 0 && (
          <Group gap={6}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                backgroundColor: 'var(--mantine-color-red-6)',
              }}
            />
            <Text size="xs" c="dimmed">
              Failed
            </Text>
          </Group>
        )}
      </Group>
    </Stack>
  );
}
