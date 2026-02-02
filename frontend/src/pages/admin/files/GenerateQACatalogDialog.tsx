import { Button, Modal, Select, TextInput } from '@mantine/core';
import { useState } from 'react';
import { FileDto } from 'src/api';
import { useEvalApi } from 'src/api';
import { useLlmEndpoints } from 'src/pages/admin/evals/llm-endpoints/hooks/useLlmEndpointQueries';

interface GenerateQACatalogDialogProps {
  bucketId: number;
  selectedFiles: FileDto[];
  opened: boolean;
  onClose: () => void;
}

export function GenerateQACatalogDialog({ bucketId, selectedFiles, opened, onClose }: GenerateQACatalogDialogProps) {
  const evalApi = useEvalApi();
  const [catalogName, setCatalogName] = useState('');
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch available LLM endpoints
  const { data: endpoints, isFetching: isLoadingEndpoints } = useLlmEndpoints(0, undefined);

  const handleGenerate = async () => {
    if (!catalogName.trim()) {
      setError('Please enter a catalog name');
      return;
    }

    if (!selectedEndpointId) {
      setError('Please select an LLM endpoint');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      await evalApi.qaCatalog.qaCatalogGenerateFromC4Bucket({
        bucketId,
        fileIds: selectedFiles.map((f) => f.id),
        name: catalogName,
        type: 'RAGAS',
        config: {
          sampleCount: 10,
          queryDistribution: ['SINGLE_HOP_SPECIFIC', 'MULTI_HOP_SPECIFIC', 'MULTI_HOP_ABSTRACT'],
          personas: [],
          type: 'RAGAS',
          knowledgeGraphLocation: null,
        },
        modelConfigSchema: {
          type: 'RAGAS',
          llmEndpoint: selectedEndpointId,
        },
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setCatalogName('');
      }, 2000);
    } catch (err: unknown) {
      console.error('Failed to generate catalog:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate QA catalog');
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    if (!generating) {
      onClose();
      setCatalogName('');
      setSelectedEndpointId(null);
      setError(null);
      setSuccess(false);
    }
  };

  // Prepare endpoint options for Select component
  const endpointOptions =
    endpoints?.map((endpoint) => ({
      value: endpoint.id,
      label: `${endpoint.name} (${endpoint._configuration.type})`,
    })) ?? [];

  return (
    <Modal opened={opened} onClose={handleClose} title="Generate QA Catalog from Files" size="lg">
      <div className="flex flex-col gap-4">
        <div className="text-sm text-gray-600">
          Selected {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} from bucket ID {bucketId}
        </div>

        <TextInput
          label="Catalog Name"
          placeholder="Enter a name for the QA catalog"
          value={catalogName}
          onChange={(e) => setCatalogName(e.currentTarget.value)}
          required
          disabled={generating || success}
        />

        <Select
          label="LLM Endpoint"
          placeholder="Select an LLM endpoint for generation"
          value={selectedEndpointId}
          onChange={setSelectedEndpointId}
          data={endpointOptions}
          searchable
          required
          disabled={generating || success || isLoadingEndpoints}
          error={error && !catalogName.trim() ? undefined : error}
        />

        <div className="text-sm text-gray-500">
          <p>This will create a QA catalog using the RAGAS generator with the following settings:</p>
          <ul className="mt-2 list-inside list-disc">
            <li>Sample count: 10</li>
            <li>Query distributions: Single-hop, Multi-hop specific, Multi-hop abstract</li>
            <li>Selected LLM endpoint will be used for generation</li>
          </ul>
        </div>

        {success && <div className="rounded bg-green-100 p-2 text-green-700">✓ Catalog generation started successfully!</div>}

        <div className="flex justify-end gap-2">
          <Button variant="subtle" onClick={handleClose} disabled={generating || success}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            loading={generating}
            disabled={!catalogName.trim() || !selectedEndpointId || generating || success}
          >
            {success ? 'Done!' : 'Generate Catalog'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
