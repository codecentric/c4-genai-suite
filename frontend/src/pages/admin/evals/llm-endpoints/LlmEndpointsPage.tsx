import { Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { Page } from 'src/components';
import { texts } from 'src/texts';

export function LlmEndpointsPage() {
  const [toCreate, setToCreate] = useState<boolean>();

  return (
    <Page>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-3xl">{texts.evals.llmEndpoints}</h2>

        <div className="flex gap-4">
          <Button leftSection={<IconPlus />} onClick={() => setToCreate(true)}>
            Create LLM Endpoint
          </Button>
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <table className="table table-fixed text-base">
            <thead>
              <tr>
                <th>{texts.common.name}</th>
                <th>{texts.common.endpoint}</th>
                <th className="w-32">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3}>No LLM endpoints found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Page>
  );
}
