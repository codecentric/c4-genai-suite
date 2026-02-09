import { Badge, Card, Group, NumberInput, Select, Skeleton, Stack, Text } from '@mantine/core';
import { IconDatabase } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useEvalApi } from 'src/api/state/apiEvalClient';
import { useWizardStore } from '../../state/zustand/wizardState';

export function CatalogSelectionStep() {
  const { catalogId, setCatalogId, testCasesPerQaPair, setTestCasesPerQaPair } = useWizardStore();
  const evalApi = useEvalApi();

  // Fetch QA catalogs (only READY ones)
  const { data: catalogs = [], isLoading } = useQuery({
    queryKey: ['qaCatalogs', 'all'],
    queryFn: () => evalApi.qaCatalog.qaCatalogGetAll(undefined, 0, 100),
  });

  // Filter only READY catalogs
  const readyCatalogs = catalogs.filter((c) => c.status === 'READY');

  const selectedCatalog = readyCatalogs.find((c) => c.id === catalogId);

  return (
    <Stack gap="lg">
      <Text size="lg" fw={500}>
        Select QA Catalog
      </Text>
      <Text size="sm" c="dimmed">
        Choose a QA catalog to use as the source for your evaluation test cases
      </Text>

      {isLoading ? (
        <Stack gap="sm">
          <Skeleton height={60} />
          <Skeleton height={40} />
        </Stack>
      ) : (
        <>
          <Select
            label="QA Catalog"
            placeholder="Select a catalog"
            required
            value={catalogId}
            onChange={(value) => setCatalogId(value)}
            data={readyCatalogs.map((catalog) => ({
              value: catalog.id,
              label: `${catalog.name} (${catalog.length} Q&A pairs)`,
            }))}
            searchable
            nothingFoundMessage="No ready catalogs found"
          />

          {selectedCatalog && (
            <Card padding="md" withBorder>
              <Stack gap="xs">
                <Group gap="xs">
                  <IconDatabase size={18} className="text-blue-600" />
                  <Text fw={600}>{selectedCatalog.name}</Text>
                  <Badge variant="light" color="green">
                    Ready
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  {selectedCatalog.length} Q&A pairs • Revision {selectedCatalog.revision}
                </Text>
              </Stack>
            </Card>
          )}

          <NumberInput
            label="Test Cases per Q&A Pair"
            description="Number of test cases to generate from each Q&A pair. Higher numbers provide more thorough testing but take longer."
            placeholder="Enter number"
            required
            min={1}
            max={10}
            value={testCasesPerQaPair}
            onChange={(value) => setTestCasesPerQaPair(Number(value) || 1)}
          />

          {selectedCatalog && testCasesPerQaPair && (
            <Card padding="sm" withBorder bg="blue.0">
              <Text size="sm" c="dimmed">
                This will generate approximately{' '}
                <Text component="span" fw={700} c="blue">
                  {selectedCatalog.length * (testCasesPerQaPair || 1)}
                </Text>{' '}
                test cases for this evaluation.
              </Text>
            </Card>
          )}
        </>
      )}
    </Stack>
  );
}
